<script>
  let {
    assetsPath = "/",
    onAiMounted = null,
    onArtboardChange = null,
    engine,
    wheel,
    steering,
  } = $props();
  import { onMount, untrack } from "svelte";

  let processedPath = $derived(
    assetsPath.replace(new RegExp("/([^/.]+)$"), "/$1/") || "/",
  );

  let aiBox;
  let aiBoxWidth = $state(undefined);
  let allArtboards = $state([]);
  let activeArtboard = $state(undefined);
  onMount(() => {
    allArtboards = Array.from(aiBox.querySelectorAll(".g-artboard"));
    onAiMounted?.();
  });
  $effect(() => {
    if (aiBoxWidth && onArtboardChange) {
      const currentArtboard = allArtboards.filter((artboard) => {
        const minWidth = parseFloat(artboard.dataset.minWidth);
        const maxWidth = parseFloat(artboard.dataset.maxWidth) || Infinity;
        return minWidth <= aiBoxWidth && maxWidth >= aiBoxWidth;
      })[0];
      if (currentArtboard?.id !== activeArtboard?.id) {
        activeArtboard = untrack(() => currentArtboard);
        onArtboardChange(activeArtboard);
      }
    }
  });
</script>

<div
  id="g-3d-box"
  class="ai2svelte"
  bind:this={aiBox}
  bind:clientWidth={aiBoxWidth}
  style:--g-3d-xs-img-img="{`url("${processedPath}images/graphics/3d-xs.png")`};"
  style:--g-3d-sm-img-img="{`url("${processedPath}images/graphics/3d-sm.png")`};"
  style:--g-3d-md-img-img="{`url("${processedPath}images/graphics/3d-md.png")`};"
  style:--g-3d-lg-img-img="{`url("${processedPath}images/graphics/3d-lg.png")`};"
  style:--g-3d-xl-img-img="{`url("${processedPath}images/graphics/3d-xl.png")`};"
>
  <!-- Artboard: xs -->
  <div
    id="g-3d-xs"
    class="g-artboard"
    style="max-width: 509px;aspect-ratio: 0.80044852481241;"
    data-aspect-ratio="0.8"
    data-min-width="0"
    data-max-width="509"
  >
    <div id="g-3d-xs-img" class="g-3d-xs-img g-aiImg" alt="" style=""></div>
    <div class="g-snippet-layer g-engine">
      <div
        class="g-aiSymbol g-aiSnippet"
        id="g-snippet-engine"
        data-name="engine"
        style="width: 34.6061%; height: 27.7004%; margin-left: -17.303%; margin-top: -17.303%; left: 22.9069%; top: 47.7306%;"
      >
        {@render engine?.()}
      </div>
    </div>

    <div class="g-snippet-layer g-wheel">
      <div
        class="g-aiSymbol g-aiSnippet"
        id="g-snippet-wheel"
        data-name="wheel"
        style="width: 34.6061%; height: 27.7004%; margin-left: -17.303%; margin-top: -17.303%; left: 77.6926%; top: 47.4262%;"
      >
        {@render wheel?.()}
      </div>
    </div>

    <div class="g-snippet-layer g-steering">
      <div
        class="g-aiSymbol g-aiSnippet"
        id="g-snippet-steering"
        data-name="steering"
        style="width: 34.6061%; height: 27.7004%; margin-left: -17.303%; margin-top: -17.303%; left: 50.883%; top: 80.7047%;"
      >
        {@render steering?.()}
      </div>
    </div>
  </div>
  <!-- Artboard: sm -->
  <div
    id="g-3d-sm"
    class="g-artboard"
    style="min-width: 510px;max-width: 659px;aspect-ratio: 1.4077942040893;"
    data-aspect-ratio="1.408"
    data-min-width="510"
    data-max-width="659"
  >
    <div id="g-3d-sm-img" class="g-3d-sm-img g-aiImg" alt="" style=""></div>
    <div class="g-snippet-layer g-engine">
      <div
        class="g-aiSymbol g-aiSnippet"
        id="g-snippet-engine"
        data-name="engine"
        style="width: 25.3137%; height: 35.6365%; margin-left: -12.6569%; margin-top: -12.6569%; left: 16.8234%; top: 74.3039%;"
      >
        {@render engine?.()}
      </div>
    </div>

    <div class="g-snippet-layer g-wheel">
      <div
        class="g-aiSymbol g-aiSnippet"
        id="g-snippet-wheel"
        data-name="wheel"
        style="width: 25.3137%; height: 35.6365%; margin-left: -12.6569%; margin-top: -12.6569%; left: 83.5755%; top: 74.382%;"
      >
        {@render wheel?.()}
      </div>
    </div>

    <div class="g-snippet-layer g-steering">
      <div
        class="g-aiSymbol g-aiSnippet"
        id="g-snippet-steering"
        data-name="steering"
        style="width: 25.3137%; height: 35.6365%; margin-left: -12.6569%; margin-top: -12.6569%; left: 49.7968%; top: 74.382%;"
      >
        {@render steering?.()}
      </div>
    </div>
  </div>
  <!-- Artboard: md -->
  <div
    id="g-3d-md"
    class="g-artboard"
    style="min-width: 660px;max-width: 929px;aspect-ratio: 1.38577189658729;"
    data-aspect-ratio="1.386"
    data-min-width="660"
    data-max-width="929"
  >
    <div id="g-3d-md-img" class="g-3d-md-img g-aiImg" alt="" style=""></div>
    <div class="g-snippet-layer g-engine">
      <div
        class="g-aiSymbol g-aiSnippet"
        id="g-snippet-engine"
        data-name="engine"
        style="width: 25.0909%; height: 34.7703%; margin-left: -12.5455%; margin-top: -12.5455%; left: 16.8541%; top: 74.3973%;"
      >
        {@render engine?.()}
      </div>
    </div>

    <div class="g-snippet-layer g-wheel">
      <div
        class="g-aiSymbol g-aiSnippet"
        id="g-snippet-wheel"
        data-name="wheel"
        style="width: 25.0909%; height: 34.7703%; margin-left: -12.5455%; margin-top: -12.5455%; left: 83.0108%; top: 74.4736%;"
      >
        {@render wheel?.()}
      </div>
    </div>

    <div class="g-snippet-layer g-steering">
      <div
        class="g-aiSymbol g-aiSnippet"
        id="g-snippet-steering"
        data-name="steering"
        style="width: 25.0909%; height: 34.7703%; margin-left: -12.5455%; margin-top: -12.5455%; left: 49.5333%; top: 74.4736%;"
      >
        {@render steering?.()}
      </div>
    </div>
  </div>
  <!-- Artboard: lg -->
  <div
    id="g-3d-lg"
    class="g-artboard"
    style="min-width: 930px;max-width: 1199px;aspect-ratio: 1.64523480326022;"
    data-aspect-ratio="1.645"
    data-min-width="930"
    data-max-width="1199"
  >
    <div id="g-3d-lg-img" class="g-3d-lg-img g-aiImg" alt="" style=""></div>
    <div class="g-snippet-layer g-engine">
      <div
        class="g-aiSymbol g-aiSnippet"
        id="g-snippet-engine"
        data-name="engine"
        style="width: 21.4624%; height: 35.3106%; margin-left: -10.7312%; margin-top: -10.7312%; left: 17.313%; top: 75.09%;"
      >
        {@render engine?.()}
      </div>
    </div>

    <div class="g-snippet-layer g-wheel">
      <div
        class="g-aiSymbol g-aiSnippet"
        id="g-snippet-wheel"
        data-name="wheel"
        style="width: 21.4624%; height: 35.3106%; margin-left: -10.7312%; margin-top: -10.7312%; left: 80.903%; top: 75.1674%;"
      >
        {@render wheel?.()}
      </div>
    </div>

    <div class="g-snippet-layer g-steering">
      <div
        class="g-aiSymbol g-aiSnippet"
        id="g-snippet-steering"
        data-name="steering"
        style="width: 21.4624%; height: 35.3106%; margin-left: -10.7312%; margin-top: -10.7312%; left: 48.8962%; top: 75.1674%;"
      >
        {@render steering?.()}
      </div>
    </div>
  </div>
  <!-- Artboard: xl -->
  <div
    id="g-3d-xl"
    class="g-artboard"
    style="min-width: 1200px;aspect-ratio: 1.96399345335516;"
    data-aspect-ratio="1.964"
    data-min-width="1200"
  >
    <div id="g-3d-xl-img" class="g-3d-xl-img g-aiImg" alt="" style=""></div>
    <div class="g-snippet-layer g-engine">
      <div
        class="g-aiSymbol g-aiSnippet"
        id="g-snippet-engine"
        data-name="engine"
        style="width: 19%; height: 37.3159%; margin-left: -9.5%; margin-top: -9.5%; left: 22.0417%; top: 75.5759%;"
      >
        {@render engine?.()}
      </div>
    </div>

    <div class="g-snippet-layer g-wheel">
      <div
        class="g-aiSymbol g-aiSnippet"
        id="g-snippet-wheel"
        data-name="wheel"
        style="width: 19%; height: 37.3159%; margin-left: -9.5%; margin-top: -9.5%; left: 78.3333%; top: 75.6578%;"
      >
        {@render wheel?.()}
      </div>
    </div>

    <div class="g-snippet-layer g-steering">
      <div
        class="g-aiSymbol g-aiSnippet"
        id="g-snippet-steering"
        data-name="steering"
        style="width: 19%; height: 37.3159%; margin-left: -9.5%; margin-top: -9.5%; left: 50%; top: 75.6578%;"
      >
        {@render steering?.()}
      </div>
    </div>
  </div>
</div>

<!-- End ai2svelte - 2026-04-02 00:55 -->

<!-- Generated by ai2svelte v1.0.5 - 2026-04-02 00:55 -->
<!-- ai file: 3d.ai -->
<style lang="scss">
  #g-3d-box {
    container-type: inline-size;
    container-name: g-3d-box;
  }
  #g-3d-box,
  #g-3d-box .g-artboard {
    margin: 0 auto;
  }
  #g-3d-box p {
    margin: 0;
  }
  #g-3d-box .g-aiAbs {
    position: absolute;
  }
  #g-3d-box .g-aiImg {
    position: absolute;
    top: 0;
    display: block;
    width: 100% !important;
    height: 100%;
    background-size: contain;
    background-repeat: no-repeat;
  }
  #g-3d-box .g-aiSymbol {
    position: absolute;
    box-sizing: border-box;
  }
  #g-3d-box .g-aiPointText p {
    white-space: nowrap;
  }
  #g-3d-box.g-aiPointText p {
    white-space: nowrap;
  }
  #g-3d-box {
    width: 100%;
    container-type: inline-size;
    @container (min-width:0px) and (max-width: 509px) {
      #g-3d-xs {
        display: block !important;

        #g-3d-xs-img {
          background-image: var(--g-3d-xs-img-img);
        }
      }
    }
    @container (min-width:510px) and (max-width: 659px) {
      #g-3d-sm {
        display: block !important;

        #g-3d-sm-img {
          background-image: var(--g-3d-sm-img-img);
        }
      }
    }
    @container (min-width:660px) and (max-width: 929px) {
      #g-3d-md {
        display: block !important;

        #g-3d-md-img {
          background-image: var(--g-3d-md-img-img);
        }
      }
    }
    @container (min-width:930px) and (max-width: 1199px) {
      #g-3d-lg {
        display: block !important;

        #g-3d-lg-img {
          background-image: var(--g-3d-lg-img-img);
        }
      }
    }
    @container (min-width:1200px) {
      #g-3d-xl {
        display: block !important;

        #g-3d-xl-img {
          background-image: var(--g-3d-xl-img-img);
        }
      }
    }
  }
  #g-3d-xs {
    position: relative;
    overflow: hidden;
    display: none;
  }
  #g-3d-sm {
    position: relative;
    overflow: hidden;
    display: none;
  }
  #g-3d-md {
    position: relative;
    overflow: hidden;
    display: none;
  }
  #g-3d-lg {
    position: relative;
    overflow: hidden;
    display: none;
  }
  #g-3d-xl {
    position: relative;
    overflow: hidden;
    display: none;
  }

  /* Custom CSS */
</style>
