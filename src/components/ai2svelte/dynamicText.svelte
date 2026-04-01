<script>
  let {
    assetsPath = "/",
    onAiMounted = null,
    onArtboardChange = null,
    taggedText = { text: {}, htext: {} },
    debugTaggedText = false,
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
  id="g-dynamicText-box"
  class="ai2svelte"
  bind:this={aiBox}
  bind:clientWidth={aiBoxWidth}
  style:--debug-tagged-text={debugTaggedText ? "visible" : "hidden"}
  style:--debug-stroke={debugTaggedText ? "2px" : "0px"}
  style:--g-dynamicText-xs-img-img="{`url("${processedPath}images/graphics/dynamicText-xs.png")`};"
  style:--g-dynamicText-sm-img-img="{`url("${processedPath}images/graphics/dynamicText-sm.png")`};"
  style:--g-dynamicText-md-img-img="{`url("${processedPath}images/graphics/dynamicText-md.png")`};"
  style:--g-dynamicText-lg-img-img="{`url("${processedPath}images/graphics/dynamicText-lg.png")`};"
  style:--g-dynamicText-xl-img-img="{`url("${processedPath}images/graphics/dynamicText-xl.png")`};"
>
  <!-- Artboard: xs -->
  <div
    id="g-dynamicText-xs"
    class="g-artboard"
    style="max-width: 509px;aspect-ratio: 0.44042935462097;"
    data-aspect-ratio="0.44"
    data-min-width="0"
    data-max-width="509"
  >
    <div
      id="g-dynamicText-xs-img"
      class="g-dynamicText-xs-img g-aiImg"
      alt=""
      style=""
    ></div>
    <div
      id="g-ai0-1"
      class="g-text g-aiAbs g-aiPointText"
      style="top:8.6713%;margin-top:-26px;left:49.2956%;margin-left:-155.5px;width:311px;"
    >
      <p class="g-pstyle0">This is a static text for reference.</p>
      <p class="g-pstyle0">This gets baked during export.</p>
    </div>
    <div
      id="g-text2"
      class="g-myTag2 g-aiAbs"
      style="top:85.6835%;left:49.2956%;margin-left:-43.7879%;width:87.5758%;"
    >
      <p
        class="g-pstyle1 g-taggedText g-htext"
        data-tagged-type="HTEXT"
        data-tagged-prop="myTag2.text2"
      >
        {@html taggedText?.htext?.myTag2?.text2 || ""}
      </p>
    </div>
    <div
      id="g-text1"
      class="g-myTag g-aiAbs"
      style="top:44.7103%;left:49.2956%;margin-left:-43.7879%;width:87.5758%;"
    >
      <p
        class="g-pstyle1 g-taggedText g-text"
        data-tagged-type="TEXT"
        data-tagged-prop="myTag.text1"
      >
        {taggedText?.text?.myTag?.text1 || ""}
      </p>
    </div>
  </div>
  <!-- Artboard: sm -->
  <div
    id="g-dynamicText-sm"
    class="g-artboard"
    style="min-width: 510px;max-width: 659px;aspect-ratio: 0.57805508469061;"
    data-aspect-ratio="0.578"
    data-min-width="510"
    data-max-width="659"
  >
    <div
      id="g-dynamicText-sm-img"
      class="g-dynamicText-sm-img g-aiImg"
      alt=""
      style=""
    ></div>
    <div
      id="g-ai1-1"
      class="g-text g-aiAbs g-aiPointText"
      style="top:11.5579%;margin-top:-26px;left:50.2455%;margin-left:-155.5px;width:311px;"
    >
      <p class="g-pstyle0">This is a static text for reference.</p>
      <p class="g-pstyle0">This gets baked during export.</p>
    </div>
    <div
      id="g-text2"
      class="g-myTag2 g-aiAbs"
      style="top:81.9478%;left:50.2455%;margin-left:-28.3333%;width:56.6667%;"
    >
      <p
        class="g-pstyle1 g-taggedText g-htext"
        data-tagged-type="HTEXT"
        data-tagged-prop="myTag2.text2"
      >
        {@html taggedText?.htext?.myTag2?.text2 || ""}
      </p>
    </div>
    <div
      id="g-text1"
      class="g-myTag g-aiAbs"
      style="top:44.6576%;left:50.2455%;margin-left:-28.3333%;width:56.6667%;"
    >
      <p
        class="g-pstyle1 g-taggedText g-text"
        data-tagged-type="TEXT"
        data-tagged-prop="myTag.text1"
      >
        {taggedText?.text?.myTag?.text1 || ""}
      </p>
    </div>
  </div>
  <!-- Artboard: md -->
  <div
    id="g-dynamicText-md"
    class="g-artboard"
    style="min-width: 660px;max-width: 929px;aspect-ratio: 0.77989399349069;"
    data-aspect-ratio="0.78"
    data-min-width="660"
    data-max-width="929"
  >
    <div
      id="g-dynamicText-md-img"
      class="g-dynamicText-md-img g-aiImg"
      alt=""
      style=""
    ></div>
    <div
      id="g-ai2-1"
      class="g-text g-aiAbs g-aiPointText"
      style="top:16.8943%;margin-top:-26px;left:50.0731%;margin-left:-155.5px;width:311px;"
    >
      <p class="g-pstyle0">This is a static text for reference.</p>
      <p class="g-pstyle0">This gets baked during export.</p>
    </div>
    <div
      id="g-text2"
      class="g-myTag2 g-aiAbs"
      style="top:73.3809%;left:50.0731%;margin-left:-21.8939%;width:43.7879%;"
    >
      <p
        class="g-pstyle1 g-taggedText g-htext"
        data-tagged-type="HTEXT"
        data-tagged-prop="myTag2.text2"
      >
        {@html taggedText?.htext?.myTag2?.text2 || ""}
      </p>
    </div>
    <div
      id="g-text1"
      class="g-myTag g-aiAbs"
      style="top:42.8942%;left:50.0731%;margin-left:-21.8939%;width:43.7879%;"
    >
      <p
        class="g-pstyle1 g-taggedText g-text"
        data-tagged-type="TEXT"
        data-tagged-prop="myTag.text1"
      >
        {taggedText?.text?.myTag?.text1 || ""}
      </p>
    </div>
  </div>
  <!-- Artboard: lg -->
  <div
    id="g-dynamicText-lg"
    class="g-artboard"
    style="min-width: 930px;max-width: 1199px;aspect-ratio: 1.41065361623927;"
    data-aspect-ratio="1.411"
    data-min-width="930"
    data-max-width="1199"
  >
    <div
      id="g-dynamicText-lg-img"
      class="g-dynamicText-lg-img g-aiImg"
      alt=""
      style=""
    ></div>
    <div
      id="g-ai3-1"
      class="g-text g-aiAbs g-aiPointText"
      style="top:11.0685%;margin-top:-26px;left:49.7913%;margin-left:-155.5px;width:311px;"
    >
      <p class="g-pstyle0">This is a static text for reference.</p>
      <p class="g-pstyle0">This gets baked during export.</p>
    </div>
    <div
      id="g-text2"
      class="g-myTag2 g-aiAbs"
      style="top:83.5774%;left:49.7913%;margin-left:-15.5376%;width:31.0753%;"
    >
      <p
        class="g-pstyle1 g-taggedText g-htext"
        data-tagged-type="HTEXT"
        data-tagged-prop="myTag2.text2"
      >
        {@html taggedText?.htext?.myTag2?.text2 || ""}
      </p>
    </div>
    <div
      id="g-text1"
      class="g-myTag g-aiAbs"
      style="top:44.4432%;left:49.7913%;margin-left:-15.5376%;width:31.0753%;"
    >
      <p
        class="g-pstyle1 g-taggedText g-text"
        data-tagged-type="TEXT"
        data-tagged-prop="myTag.text1"
      >
        {taggedText?.text?.myTag?.text1 || ""}
      </p>
    </div>
  </div>
  <!-- Artboard: xl -->
  <div
    id="g-dynamicText-xl"
    class="g-artboard"
    style="min-width: 1200px;aspect-ratio: 1.46520146520147;"
    data-aspect-ratio="1.465"
    data-min-width="1200"
  >
    <div
      id="g-dynamicText-xl-img"
      class="g-dynamicText-xl-img g-aiImg"
      alt=""
      style=""
    ></div>
    <div
      id="g-ai4-1"
      class="g-text g-aiAbs g-aiPointText"
      style="top:16.7242%;margin-top:-26px;left:50.0113%;margin-left:-155.5px;width:311px;"
    >
      <p class="g-pstyle0">This is a static text for reference.</p>
      <p class="g-pstyle0">This gets baked during export.</p>
    </div>
    <div
      id="g-text2"
      class="g-myTag2 g-aiAbs"
      style="top:75.0916%;left:50.0113%;margin-left:-12.0417%;width:24.0833%;"
    >
      <p
        class="g-pstyle1 g-taggedText g-htext"
        data-tagged-type="HTEXT"
        data-tagged-prop="myTag2.text2"
      >
        {@html taggedText?.htext?.myTag2?.text2 || ""}
      </p>
    </div>
    <div
      id="g-text1"
      class="g-myTag g-aiAbs"
      style="top:43.5897%;left:50.0113%;margin-left:-12.0417%;width:24.0833%;"
    >
      <p
        class="g-pstyle1 g-taggedText g-text"
        data-tagged-type="TEXT"
        data-tagged-prop="myTag.text1"
      >
        {taggedText?.text?.myTag?.text1 || ""}
      </p>
    </div>
  </div>
</div>

<!--

TAGGED TEXT PROPS

taggedText={
{
  "text": {
    "myTag": {
      "text1": ""
    }
  },
  "htext": {
    "myTag2": {
      "text2": ""
    }
  }
}
}

-->
<!-- End ai2svelte - 2026-04-02 00:56 -->

<!-- Generated by ai2svelte v1.0.5 - 2026-04-02 00:56 -->
<!-- ai file: dynamicText.ai -->
<style lang="scss">
  #g-dynamicText-box {
    container-type: inline-size;
    container-name: g-dynamicText-box;
  }
  #g-dynamicText-box,
  #g-dynamicText-box .g-artboard {
    margin: 0 auto;
  }
  #g-dynamicText-box p {
    margin: 0;
  }
  #g-dynamicText-box .g-aiAbs {
    position: absolute;
  }
  #g-dynamicText-box .g-aiImg {
    position: absolute;
    top: 0;
    display: block;
    width: 100% !important;
    height: 100%;
    background-size: contain;
    background-repeat: no-repeat;
  }
  #g-dynamicText-box .g-aiSymbol {
    position: absolute;
    box-sizing: border-box;
  }
  #g-dynamicText-box .g-aiPointText p {
    white-space: nowrap;
  }
  #g-dynamicText-box.g-aiPointText p {
    white-space: nowrap;
  }
  #g-dynamicText-box {
    width: 100%;
    container-type: inline-size;
    @container (min-width:0px) and (max-width: 509px) {
      #g-dynamicText-xs {
        display: block !important;

        #g-dynamicText-xs-img {
          background-image: var(--g-dynamicText-xs-img-img);
        }
      }
    }
    @container (min-width:510px) and (max-width: 659px) {
      #g-dynamicText-sm {
        display: block !important;

        #g-dynamicText-sm-img {
          background-image: var(--g-dynamicText-sm-img-img);
        }
      }
    }
    @container (min-width:660px) and (max-width: 929px) {
      #g-dynamicText-md {
        display: block !important;

        #g-dynamicText-md-img {
          background-image: var(--g-dynamicText-md-img-img);
        }
      }
    }
    @container (min-width:930px) and (max-width: 1199px) {
      #g-dynamicText-lg {
        display: block !important;

        #g-dynamicText-lg-img {
          background-image: var(--g-dynamicText-lg-img-img);
        }
      }
    }
    @container (min-width:1200px) {
      #g-dynamicText-xl {
        display: block !important;

        #g-dynamicText-xl-img {
          background-image: var(--g-dynamicText-xl-img-img);
        }
      }
    }
  }
  #g-dynamicText-xs {
    position: relative;
    overflow: hidden;
    display: none;
  }
  #g-dynamicText-xs p {
    font-family: var(--theme-font-family-sans-serif), Knowledge, sans-serif;
    font-weight: regular;
    line-height: 25px;
    opacity: 1;
    letter-spacing: 0em;
    font-size: 21px;
    text-align: left;
    color: rgb(0, 129, 211);
    text-transform: none;
    padding-bottom: 0;
    padding-top: 0;
    mix-blend-mode: normal;
    font-style: normal;
    height: auto;
    position: static;
  }
  #g-dynamicText-xs .g-pstyle0 {
    font-weight: 500;
    height: 25px;
    text-align: center;
  }
  #g-dynamicText-xs .g-pstyle1 {
    font-weight: 500;
    text-align: center;
  }
  #g-dynamicText-sm {
    position: relative;
    overflow: hidden;
    display: none;
  }
  #g-dynamicText-sm p {
    font-family: var(--theme-font-family-sans-serif), Knowledge, sans-serif;
    font-weight: regular;
    line-height: 25px;
    opacity: 1;
    letter-spacing: 0em;
    font-size: 21px;
    text-align: left;
    color: rgb(0, 129, 211);
    text-transform: none;
    padding-bottom: 0;
    padding-top: 0;
    mix-blend-mode: normal;
    font-style: normal;
    height: auto;
    position: static;
  }
  #g-dynamicText-sm .g-pstyle0 {
    font-weight: 500;
    height: 25px;
    text-align: center;
  }
  #g-dynamicText-sm .g-pstyle1 {
    font-weight: 500;
    text-align: center;
  }
  #g-dynamicText-md {
    position: relative;
    overflow: hidden;
    display: none;
  }
  #g-dynamicText-md p {
    font-family: var(--theme-font-family-sans-serif), Knowledge, sans-serif;
    font-weight: regular;
    line-height: 25px;
    opacity: 1;
    letter-spacing: 0em;
    font-size: 21px;
    text-align: left;
    color: rgb(0, 129, 211);
    text-transform: none;
    padding-bottom: 0;
    padding-top: 0;
    mix-blend-mode: normal;
    font-style: normal;
    height: auto;
    position: static;
  }
  #g-dynamicText-md .g-pstyle0 {
    font-weight: 500;
    height: 25px;
    text-align: center;
  }
  #g-dynamicText-md .g-pstyle1 {
    font-weight: 500;
    text-align: center;
  }
  #g-dynamicText-lg {
    position: relative;
    overflow: hidden;
    display: none;
  }
  #g-dynamicText-lg p {
    font-family: var(--theme-font-family-sans-serif), Knowledge, sans-serif;
    font-weight: regular;
    line-height: 25px;
    opacity: 1;
    letter-spacing: 0em;
    font-size: 21px;
    text-align: left;
    color: rgb(0, 129, 211);
    text-transform: none;
    padding-bottom: 0;
    padding-top: 0;
    mix-blend-mode: normal;
    font-style: normal;
    height: auto;
    position: static;
  }
  #g-dynamicText-lg .g-pstyle0 {
    font-weight: 500;
    height: 25px;
    text-align: center;
  }
  #g-dynamicText-lg .g-pstyle1 {
    font-weight: 500;
    text-align: center;
  }
  #g-dynamicText-xl {
    position: relative;
    overflow: hidden;
    display: none;
  }
  #g-dynamicText-xl p {
    font-family: var(--theme-font-family-sans-serif), Knowledge, sans-serif;
    font-weight: regular;
    line-height: 25px;
    opacity: 1;
    letter-spacing: 0em;
    font-size: 21px;
    text-align: left;
    color: rgb(0, 129, 211);
    text-transform: none;
    padding-bottom: 0;
    padding-top: 0;
    mix-blend-mode: normal;
    font-style: normal;
    height: auto;
    position: static;
  }
  #g-dynamicText-xl .g-pstyle0 {
    font-weight: 500;
    height: 25px;
    text-align: center;
  }
  #g-dynamicText-xl .g-pstyle1 {
    font-weight: 500;
    text-align: center;
  }

  /* Custom CSS */

  .g-taggedText:empty::before {
    content: attr(data-tagged-type);
    padding: 0px 4px;
    font-size: 0.6rem;
    font-style: normal;
    color: #fff;
    background-color: #ee0000;
    display: block;
    font-weight: 800;
    visibility: var(--debug-tagged-text, hidden);
  }

  .g-taggedText:empty::after {
    content: attr(data-tagged-prop);
    padding: 0px 4px;
    font-size: 0.8rem;
    font-style: normal;
    color: #fff;
    font-weight: 500;
    visibility: var(--debug-tagged-text, hidden);
  }

  .g-taggedText:empty {
    background-color: #440000;
    outline: 2px solid #ee0000;
    visibility: var(--debug-tagged-text, hidden);
  }

  .g-taggedText:not(:empty)::before {
    content: attr(data-tagged-type);
    position: absolute;
    width: calc(100% + 4px);
    transform: translateY(-100%) translateX(-2px);
    padding: 0px 4px;
    font-size: 0.6rem;
    font-style: normal;
    color: #fff;
    background-color: black;
    display: block;
    font-weight: 800;
    visibility: var(--debug-tagged-text, hidden);
    box-sizing: border-box;
  }

  .g-taggedText {
    outline: var(--debug-stroke, 0px) solid black;
  }
</style>
