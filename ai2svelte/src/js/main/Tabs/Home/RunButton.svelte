<script lang="ts">
  import {
    settingsObject,
    stylesString,
    styles,
    ai2svelteInProgress,
    triggerWave,
    updateInProgress,
    alertObject,
  } from "../../stores";
  import { evalTS } from "../../../lib/utils/bolt";
  import { mount } from "svelte";
  import type { Scripts } from "@esTypes/index";

  import { userData } from "../../state.svelte";
  import { saveSettings, tooltipSettings, writeFile } from "../../utils/utils";
  import Toast from "../../Components/Toast.svelte";
  import { lastSnapshot, logEvent, withSnapshot } from "../../utils/debugLog";
  import { findMissingStyles } from "../../utils/cssUtils";
  import { processRasterJobs, type RasterJob } from "../../utils/rasterJobs";
  import { withWatchdog } from "../../utils/exportControl";

  import { version } from "../../../../shared/shared";
  import { tooltip } from "svooltip";
  import {
    canonicalizeTextTranslationStore,
    parseTextTranslationStore,
  } from "../../../../shared/textTranslations";
  import { canonicalizeLanguageTag } from "../../utils/languages";
  import { textPreview } from "../../utils/textPreview.svelte";

  let { refreshSettings = () => {}, minimal = false } = $props();

  function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Failed jobs keep their source PNG, so they can be re-run without a
  // full export. ponytail: retry drops `tile` so a clear tile is encoded
  // rather than patched out of the .svelte from a partial density set.
  function showImageRetry(failed: RasterJob[]) {
    $alertObject = {
      flag: true,
      message: `${failed.length} image(s) failed to convert; they were kept as PNG.`,
      action: {
        label: "Retry",
        run: async () => {
          const { failed: still } = await processRasterJobs(
            failed.map((job) => ({ ...job, tile: null })),
          );
          if (still.length) return showImageRetry(still);
          $alertObject = { flag: false, message: "" };
          mount(Toast, {
            target: document.body,
            props: {
              message: `Converted ${failed.length} image(s).`,
              duration: 3000,
            },
          });
        },
      },
    };
  }

  // true from click until the run ends: covers the delay and the missing-styles
  // gate, before the shared $ai2svelteInProgress store is set.
  let starting = $state(false);

  async function runAi2Svelte(
    event: MouseEvent & { currentTarget: HTMLButtonElement },
  ) {
    if (
      $ai2svelteInProgress ||
      starting ||
      textPreview.active ||
      textPreview.busy ||
      textPreview.blocked
    )
      return;
    starting = true;
    try {
      await runExport(event.currentTarget);
    } finally {
      starting = false;
      $ai2svelteInProgress = false; // never leave the other button stuck
    }
  }

  async function runExport(source: HTMLButtonElement) {
    // let disabled state kick in
    await delay(500);

    if (window.cep) {
      // Warn once about styles missing from the local library; a second run
      // with the same missing styles exports them as empty styles.
      const missingStyles = findMissingStyles($styles);
      if (missingStyles.length > 0) {
        const message = `Missing styles in your local library: ${missingStyles.join(", ")}. They'll export as empty styles. Run again to export anyway.`;
        if (!($alertObject.flag && $alertObject.message === message)) {
          $alertObject = { flag: true, message };
          return;
        }
      }
      $alertObject = { flag: false, message: "" };

      let missingFontFamilies = [];
      let result: Awaited<ReturnType<Scripts["runAi2Svelte"]>> | undefined;
      let engineMs = 0;
      let imagesMs = 0;
      $ai2svelteInProgress = true;

      // set show_completion_dialog_box
      // unless set by user
      try {
        // ai2svelte returns missing font families plus the errors and
        // warnings for its completion alert. deferCompletion: it keeps the
        // progress bar open and holds the alert until finishAi2Svelte, so the
        // image pass below shows in the same bar and "done" means done.
        result = await withWatchdog(
          withSnapshot(async () => {
            const t = Date.now();
            try {
              const translationDocument = (await evalTS(
                "fetchTextTranslationDocument",
              )) as { identity: string; data: unknown } | undefined;
              if (!translationDocument?.identity) {
                throw new Error(
                  "Save the active Illustrator document before exporting translations.",
                );
              }
              const textTranslations = canonicalizeTextTranslationStore(
                parseTextTranslationStore(translationDocument.data),
                canonicalizeLanguageTag,
              );
              return await evalTS(
                "runAi2Svelte",
                {
                  settings: {
                    show_completion_dialog_box: true,
                    ...$settingsObject,
                  },
                  code: {
                    css: $stylesString,
                    fontsConfig: userData.fontsConfig,
                  },
                  deferCompletion: true,
                  textTranslations,
                },
                translationDocument.identity,
              );
            } finally {
              engineMs = Date.now() - t;
            }
          }),
        );
        missingFontFamilies = result?.missingFontFamilies ?? [];
        let images = {
          failed: [] as RasterJob[],
          converted: 0,
          dropped: 0,
          keptAsPng: 0,
        };
        const imagesStart = Date.now();
        try {
          images = await processRasterJobs(
            result?.rasterJobs ?? [],
            (done, total, title) =>
              evalTS("updateExportProgress", done, total, title),
          );
        } finally {
          imagesMs = Date.now() - imagesStart; // before the completion alert
          await evalTS("finishAi2Svelte", {
            converted: images.converted,
            dropped: images.dropped,
            failed: images.failed.length,
            keptAsPng: images.keptAsPng,
          });
        }
        if (images.failed.length) showImageRetry(images.failed);
        const doc = lastSnapshot();
        logEvent("export-result", {
          summary: {
            ok: !result?.errors?.length,
            doc: doc?.name,
            artboards: doc?.artboards,
            layers: doc?.layers,
            ms: { engine: engineMs, images: imagesMs },
            images: {
              jobs: result?.rasterJobs?.length ?? 0,
              converted: images.converted,
              dropped: images.dropped,
              failed: images.failed.length,
              keptAsPng: images.keptAsPng,
            },
            errors: result?.errors?.length ?? 0,
            warnings: result?.warnings?.length ?? 0,
            missingFonts: missingFontFamilies.length,
          },
          errors: result?.errors,
          warnings: result?.warnings,
          missingFontFamilies,
        });
        if (result?.errors?.length) {
          logEvent("engine-error", {
            errors: result.errors,
            warnings: result.warnings,
          });
        }
      } catch (error) {
        const doc = lastSnapshot();
        logEvent("export-result", {
          summary: {
            ok: false,
            doc: doc?.name,
            artboards: doc?.artboards,
            layers: doc?.layers,
            ms: { engine: engineMs, images: imagesMs },
            error: error instanceof Error ? error.message : String(error),
          },
        });
        console.error("[ai2svelte] runAi2Svelte failed:", error);
        mount(Toast, {
          target: document.body,
          props: {
            message: `Error running ai2svelte: ${error instanceof Error ? error.message : String(error)}`,
            duration: 4000,
          },
        });
        $ai2svelteInProgress = false;
        return;
      }

      if (missingFontFamilies.length > 0) {
        missingFontFamilies.forEach((family: string) => {
          userData.fontsConfig[family] = "";
        });
        // update user settings file with missing font families
        writeFile("user-settings.json", userData);
      }

      const ok = !!result && !result.errors?.length;
      const saved = await saveSettings(
        $settingsObject,
        {
          styleText: $styles?.root?.toString(),
        },
        version,
      );
      if (!saved) {
        mount(Toast, {
          target: document.body,
          props: {
            message: "Settings could not be saved to the document",
            duration: 4000,
          },
        });
      }

      // fetch updated settings
      // and update the UI
      await refreshSettings();

      if (ok) $triggerWave = source;
      $ai2svelteInProgress = false;
    } else {
      $triggerWave = source;
    }
  }
</script>

<button
  class="cta-button"
  class:minimal
  class:running={$ai2svelteInProgress || starting}
  disabled={$updateInProgress ||
    $ai2svelteInProgress ||
    starting ||
    textPreview.active ||
    textPreview.busy ||
    textPreview.blocked}
  onclick={runAi2Svelte}
  use:tooltip={{
    ...tooltipSettings,
    content: "Run ai2svelte with current settings",
  }}>{$ai2svelteInProgress || starting ? "Running..." : "Run AI2SVELTE"}</button
>

<style lang="scss">
  @use "../../styles/variables.scss" as *;

  .cta-button {
    cursor: pointer;
    padding: 1rem;
    color: var(--color-white);
    background-color: var(--color-accent-primary);
    border: unset;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-s);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.2rem;
    margin-bottom: 1rem;
    @include animation-default;
  }

  .cta-button:hover:not(:disabled) {
    filter: brightness(1.1);
  }

  .cta-button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
    color: var(--color-white);
    background: var(--color-accent-primary);
  }

  .cta-button:disabled.running {
    $primary-clr: var(--color-accent-primary);
    $secondary-clr: rgba(0, 0, 0, 0.25);
    color: var(--color-white);
    background:
      repeating-linear-gradient(
        -45deg,
        $primary-clr,
        $primary-clr 8px,
        $secondary-clr 8px,
        $secondary-clr 16px
      ),
      $primary-clr;
    background-size: 200% 200%;
    animation: flicker 4s linear infinite;
  }

  @keyframes flicker {
    0% {
      background-position: 0% 0%;
    }
    100% {
      background-position: 100% 100%;
    }
  }

  .minimal {
    cursor: pointer;
    font-weight: 700;
    font-size: var(--font-size-base);
    text-transform: uppercase;
    padding: var(--space-2xs);
    margin: 0;
    letter-spacing: 0;
  }
</style>
