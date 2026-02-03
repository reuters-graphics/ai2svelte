#!/usr/bin/env node

const path = require("path");
const { rollup } = require("rollup");
const svelte = require("rollup-plugin-svelte");
const { nodeResolve } = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const { sveltePreprocess } = require("svelte-preprocess");
const autoprefixer = require("autoprefixer");

async function buildSvelteES() {
  console.log("🔨 Building Svelte component with Rollup (IIFE format)...");

  console.log("Script directory:", __dirname);

  const inputOptions = {
    input: process.argv[2],
    plugins: [
      svelte({
        compilerOptions: {
          dev: false,
          generate: "client",
        },
        preprocess: sveltePreprocess({
          preserve: ["ld+json"],
          scss: {
            quietDeps: true,
            api: "modern-compiler",
            logger: {
              warn: (message, { deprecation, deprecationType }) => {
                if (deprecation && deprecationType.id === "mixed-decls") return;

                console.warn(message);
              },
            },
          },
          postcss: {
            plugins: [autoprefixer],
          },
        }),
        emitCss: false, // Don't emit separate CSS file
      }),

      nodeResolve({
        browser: true,
        dedupe: ["svelte"],
        exportConditions: ["svelte"],
        preferBuiltins: false,
        rootDir: __dirname,
      }),

      commonjs({
        // Include all dependencies in the bundle
        include: ["node_modules/**"],
      }),
    ],

    // Bundle everything including svelte runtime
    external: [],

    onwarn(warning, warn) {
      if (warning.code === "THIS_IS_UNDEFINED") return;
      if (
        warning.code === "CIRCULAR_DEPENDENCY" &&
        warning.message.includes("svelte")
      )
        return;
      warn(warning);
    },

    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
    },
  };

  const outputOptions = {
    file: process.argv[3],
    format: "es",
    sourcemap: false,
    compact: false, // Keep readable for debugging
    inlineDynamicImports: true,
    exports: "default",
  };

  try {
    // Create bundle
    console.log("📦 Creating bundle...");
    const bundle = await rollup(inputOptions);
    console.log("✅ Bundle created successfully");

    // Generate output
    const { output } = await bundle.generate(outputOptions);
    console.log("✅ Output generated");

    // Write bundle to disk
    await bundle.write(outputOptions);
    console.log("✅ Bundle written to", outputOptions.file);

    // Log bundle info
    for (const chunkOrAsset of output) {
      if (chunkOrAsset.type === "chunk") {
        const sizeKB = (chunkOrAsset.code.length / 1024).toFixed(2);
        console.log(`📦 Output: ${chunkOrAsset.fileName} (${sizeKB} KB)`);

        // Log some included modules
        console.log("📁 Key modules included:");
        let moduleCount = 0;
        for (const [id, module] of Object.entries(chunkOrAsset.modules)) {
          if (module.renderedLength > 0 && moduleCount < 5) {
            const moduleName = path.basename(id);
            const moduleSize = (module.renderedLength / 1024).toFixed(2);
            console.log(`  - ${moduleName}: ${moduleSize} KB`);
            moduleCount++;
          }
        }
        if (Object.keys(chunkOrAsset.modules).length > 5) {
          console.log(
            `  ... and ${Object.keys(chunkOrAsset.modules).length - 5} more modules`
          );
        }
      }
    }

    console.log("🎉 Build complete!");
    console.log("📄 You can now use the bundle in HTML like:");
    console.log('   <script src="dist/svelte-component.iife.js"></script>');
    console.log(
      "   <script>new SvelteComponent({ target: document.body });</script>"
    );

    // Close bundle
    await bundle.close();
  } catch (error) {
    console.error("❌ Build failed:", error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const inputFile = args[0] || "inputFile";
const outputFile = args[1] || "outputFile";

// Update paths if custom arguments provided
if (args.length > 0) {
  console.log(`📥 Input: ${inputFile}`);
  console.log(`📤 Output: ${outputFile}`);
}

// Run the build
buildSvelteES().catch((error) => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
});
