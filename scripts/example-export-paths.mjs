import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The example .ai files are authored in a newsroom repo, so the export paths
 * baked into their metadata point at directories that exist only there. Anyone
 * who downloads one gets an export that fails or lands somewhere unexpected.
 *
 * Rewrite those paths to the plugin's own defaults on the way out, leaving the
 * files in public/ exactly as they were authored.
 *
 * Source of truth: ai2svelte/src/js/main/Tabs/data/default-profile.json
 */
export const DOWNLOAD_PATHS = {
  html_output_path: "../src/lib/ai2svelte/",
  image_output_path: "../src/statics/images/graphics/",
  image_source_path: "images/graphics/",
};

/** `ai-settings` is what the panel reads; `msg` is a stale copy that also carries paths. */
const SETTINGS_ATTRS = ["ai-settings", "msg"];

const PACKET_START = "<?xpacket begin";
const PACKET_END = '<?xpacket end="w"?>';

/** Values sit inside a double-quoted XML attribute, so every JSON quote is `&quot;`. */
const setPaths = (escapedJson) =>
  Object.entries(DOWNLOAD_PATHS).reduce(
    (json, [key, value]) =>
      json.replace(
        new RegExp(`(&quot;${key}&quot;:&quot;)[^&]*(&quot;)`, "g"),
        `$1${value}$2`,
      ),
    escapedJson,
  );

const rewritePacket = (packet) =>
  SETTINGS_ATTRS.reduce(
    (xmp, attr) =>
      xmp.replace(
        new RegExp(`(ai2svelte-companion:${attr}=")([^"]*)(")`),
        (_match, head, value, tail) => head + setPaths(value) + tail,
      ),
    packet,
  );

/**
 * Returns the rewritten bytes, or null when nothing needed changing.
 * Throws rather than degrading: shipping a file with the wrong paths silently
 * is worse than a failed build.
 */
export function rewriteBuffer(original, label = "buffer") {
  // latin1 keeps one byte per character, so string offsets are byte offsets
  // even though the packet itself is UTF-8.
  const binary = original.toString("latin1");
  const start = binary.indexOf(PACKET_START);
  const end = binary.indexOf(PACKET_END, start);

  if (start === -1 || end === -1) {
    throw new Error(`${label}: no writable XMP packet`);
  }

  const packet = binary.slice(start, end);
  const rewritten = rewritePacket(packet);
  if (rewritten === packet) return null;

  // An .ai file is a PDF, and its xref table holds absolute byte offsets, so
  // the file length must not move. XMP packets carry trailing whitespace
  // padding precisely so they can be rewritten in place — spend the delta
  // there. This is also why the packet is marked end="w".
  const delta = rewritten.length - packet.length;
  const padding = /[ \t\r\n]*$/.exec(rewritten)[0].length;

  if (delta > padding) {
    throw new Error(
      `${label}: needs ${delta} bytes of padding but only ${padding} available`,
    );
  }

  const balanced =
    delta >= 0
      ? rewritten.slice(0, rewritten.length - delta)
      : rewritten + " ".repeat(-delta);

  const next = Buffer.from(
    binary.slice(0, start) + balanced + binary.slice(end),
    "latin1",
  );

  if (next.length !== original.length) {
    throw new Error(
      `${label}: size changed ${original.length} -> ${next.length}`,
    );
  }

  return next;
}

async function rewriteFile(file) {
  const next = rewriteBuffer(await readFile(file), file);
  if (!next) return false;
  await writeFile(file, next);
  return true;
}

export default function exampleExportPaths() {
  let examplesDir;

  return {
    name: "ai2svelte-example-export-paths",
    hooks: {
      "astro:config:done": ({ config }) => {
        examplesDir = new URL("examples/", config.publicDir);
      },

      /**
       * The dev server streams public/ straight from disk, so without this the
       * same download would hand over the unrewritten original and the feature
       * would look like it simply does not work.
       */
      "astro:server:setup": ({ server, logger }) => {
        server.middlewares.use((req, res, next) => {
          const path = (req.url ?? "").split("?")[0];
          if (!path.endsWith(".ai") || !path.includes("/examples/")) {
            return next();
          }

          const name = basename(decodeURIComponent(path));
          readFile(fileURLToPath(new URL(name, examplesDir)))
            .then((original) => {
              const body = rewriteBuffer(original, name) ?? original;
              res.setHeader("Content-Type", "application/illustrator");
              res.setHeader("Content-Length", body.length);
              res.end(body);
            })
            .catch((error) => {
              logger.error(`${name}: ${error.message}`);
              next();
            });
        });
      },

      /** Rewrites the built copies in the output directory, not the sources in public/. */
      "astro:build:done": async ({ dir, logger }) => {
        const built = new URL("examples/", dir);

        let files;
        try {
          files = (await readdir(built)).filter((n) => n.endsWith(".ai"));
        } catch {
          logger.warn("no examples/ directory in the build output");
          return;
        }

        let changed = 0;
        for (const name of files) {
          if (await rewriteFile(fileURLToPath(new URL(name, built))))
            changed += 1;
        }

        logger.info(
          `rewrote export paths in ${changed}/${files.length} .ai files`,
        );
      },
    },
  };
}
