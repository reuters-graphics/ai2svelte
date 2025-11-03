<script>
  let { assetsPath = "/", onAiMounted = () => {} } = $props();
  let width = $state(100);

  import { onMount } from "svelte";
  onMount(() => {
    onAiMounted();
  });
</script>

<div id="g-fire-box" class="ai2svelte">
  <!-- Artboard: xs -->
  <div
    id="g-fire-xs"
    class="g-artboard"
    style="max-width: 659px;aspect-ratio: 0.31242045734204;"
    data-aspect-ratio="0.312"
    data-min-width="0"
    data-max-width="659"
  >
    <div
      id="g-fire-xs-img"
      class="g-fire-xs-img g-aiImg"
      alt=""
      style="background-image: url({assetsPath.replace(
        new RegExp('/([^/.]+)$'),
        '/$1/'
      ) || '/'}images/graphics/fire-xs.png);"
      loading="lazy"
    ></div>
    <div
      id="g-png-swir-xs"
      class="g-png-swir-xs g-aiImg"
      alt=""
      style="background-image: url({assetsPath.replace(
        new RegExp('/([^/.]+)$'),
        '/$1/'
      ) || '/'}images/graphics/swir-xs.png);"
      loading="lazy"
    ></div>
    <svg
      class="g-fire-xs-arrows-img g-svg-layer"
      style="position: absolute;width: 65.4545%;height: 34.8112%;top: 51.9091%;left: 16.2727%;"
      id="g-svg-arrows"
      xmlns="http://www.w3.org/2000/svg"
      baseProfile="tiny"
      version="1.2"
      viewBox="0 0 216.074 367.71"
    >
      <!-- Generator: Adobe Illustrator 29.7.1, SVG Export Plug-In . SVG Version: 2.1.1 Build 8)  -->
      <line
        x1="215.615"
        y1="70.708"
        x2="215.458"
        y2=".001"
        fill="none"
        stroke="#fff"
        stroke-miterlimit="10"
        stroke-width=".917"
      />
      <line
        x1=".615"
        y1="367.708"
        x2=".458"
        y2="297.001"
        fill="none"
        stroke="#fff"
        stroke-miterlimit="10"
        stroke-width=".917"
      />
      <style>
        #g-svg-arrows rect,
        #g-svg-arrows circle,
        #g-svg-arrows path,
        #g-svg-arrows line,
        #g-svg-arrows polyline,
        #g-svg-arrows polygon {
          vector-effect: non-scaling-stroke;
        }
      </style>
    </svg>

    <div
      id="g-ai0-1"
      class="g-text g-aiAbs g-aiPointText"
      style="top:51.3598%;margin-top:-7.5px;left:81.5368%;margin-left:-36.5px;width:73px;"
    >
      <p class="g-pstyle0">active fire</p>
    </div>
    <div
      id="g-ai0-2"
      class="g-text g-aiAbs g-aiPointText"
      style="top:68.2305%;margin-top:-14.7px;left:48.0194%;margin-left:-68px;width:136px;"
    >
      <p class="g-pstyle0">Cottonwood Peak Fire</p>
      <p class="g-pstyle1">(Burn scar)</p>
    </div>
    <div
      id="g-ai0-3"
      class="g-text g-aiAbs g-aiPointText"
      style="top:87.3355%;margin-top:-7.5px;left:16.3829%;margin-left:-39px;width:78px;"
    >
      <p class="g-pstyle0">active fires</p>
    </div>
  </div>
  <!-- Artboard: md -->
  <div
    id="g-fire-md"
    class="g-artboard"
    style="min-width: 660px;max-width: 1199px;aspect-ratio: 0.3975259768492;"
    data-aspect-ratio="0.398"
    data-min-width="660"
    data-max-width="1199"
  >
    <div
      id="g-fire-md-img"
      class="g-fire-md-img g-aiImg"
      alt=""
      style="background-image: url({assetsPath.replace(
        new RegExp('/([^/.]+)$'),
        '/$1/'
      ) || '/'}images/graphics/fire-md.png);"
      loading="lazy"
    ></div>
    <div
      id="g-png-swir-md"
      class="g-png-swir-md g-aiImg"
      alt=""
      style="background-image: url({assetsPath.replace(
        new RegExp('/([^/.]+)$'),
        '/$1/'
      ) || '/'}images/graphics/swir-md.png);"
      loading="lazy"
    ></div>
    <svg
      class="g-fire-md-arrows-img g-svg-layer"
      style="position: absolute;width: 72.2727%;height: 21.1652%;top: 58.4725%;left: 13.1667%;"
      id="g-svg-arrows"
      xmlns="http://www.w3.org/2000/svg"
      baseProfile="tiny"
      version="1.2"
      viewBox="0 0 477.46 351.44"
    >
      <!-- Generator: Adobe Illustrator 29.7.1, SVG Export Plug-In . SVG Version: 2.1.1 Build 8)  -->
      <line
        x1="404.582"
        y1=".709"
        x2="477.46"
        y2=".709"
        fill="none"
        stroke="#fff"
        stroke-miterlimit="10"
        stroke-width="1.417"
      />
      <line
        y1="350.732"
        x2="72.878"
        y2="350.732"
        fill="none"
        stroke="#fff"
        stroke-miterlimit="10"
        stroke-width="1.417"
      />
      <style>
        #g-svg-arrows rect,
        #g-svg-arrows circle,
        #g-svg-arrows path,
        #g-svg-arrows line,
        #g-svg-arrows polyline,
        #g-svg-arrows polygon {
          vector-effect: non-scaling-stroke;
        }
      </style>
    </svg>

    <div
      id="g-ai1-1"
      class="g-text g-aiAbs g-aiPointText"
      style="top:58.4894%;margin-top:-9.1px;left:86.5469%;width:81px;"
    >
      <p class="g-pstyle0">active fire</p>
    </div>
    <div
      id="g-ai1-2"
      class="g-text g-aiAbs g-aiPointText"
      style="top:67.9095%;margin-top:-17.5px;left:48.5101%;margin-left:-77.5px;width:155px;"
    >
      <p class="g-pstyle1">Cottonwood Peak Fire</p>
      <p class="g-pstyle2">(Burn scar)</p>
    </div>
    <div
      id="g-ai1-3"
      class="g-text g-aiAbs g-aiPointText"
      style="top:79.5703%;margin-top:-9.1px;right:87.5632%;width:88px;"
    >
      <p class="g-pstyle3">active fires</p>
    </div>
  </div>
  <!-- Artboard: xl -->
  <div
    id="g-fire-xl"
    class="g-artboard"
    style="min-width: 1200px;aspect-ratio: 0.52060737527115;"
    data-aspect-ratio="0.521"
    data-min-width="1200"
  >
    <div
      id="g-fire-xl-img"
      class="g-fire-xl-img g-aiImg"
      alt=""
      style="background-image: url({assetsPath.replace(
        new RegExp('/([^/.]+)$'),
        '/$1/'
      ) || '/'}images/graphics/fire-xl.png);"
      loading="lazy"
    ></div>
    <div
      id="g-png-swir-xl"
      class="g-png-swir-xl g-aiImg"
      alt=""
      style="background-image: url({assetsPath.replace(
        new RegExp('/([^/.]+)$'),
        '/$1/'
      ) || '/'}images/graphics/swir-xl.png);"
      loading="lazy"
    ></div>
    <svg
      class="g-fire-xl-arrows-img g-svg-layer"
      style="position: absolute;width: 56.1667%;height: 21.5184%;top: 58.7549%;left: 21.4167%;"
      id="g-svg-arrows"
      xmlns="http://www.w3.org/2000/svg"
      baseProfile="tiny"
      version="1.2"
      viewBox="0 0 673.856 496"
    >
      <!-- Generator: Adobe Illustrator 29.7.1, SVG Export Plug-In . SVG Version: 2.1.1 Build 8)  -->
      <line
        x1="571"
        y1="1"
        x2="673.856"
        y2="1"
        fill="none"
        stroke="#fff"
        stroke-miterlimit="10"
        stroke-width="2"
      />
      <line
        y1="495"
        x2="102.856"
        y2="495"
        fill="none"
        stroke="#fff"
        stroke-miterlimit="10"
        stroke-width="2"
      />
      <style>
        #g-svg-arrows rect,
        #g-svg-arrows circle,
        #g-svg-arrows path,
        #g-svg-arrows line,
        #g-svg-arrows polyline,
        #g-svg-arrows polygon {
          vector-effect: non-scaling-stroke;
        }
      </style>
    </svg>

    <div
      id="g-ai2-1"
      class="g-text g-aiAbs g-aiPointText"
      style="top:58.7779%;margin-top:-12.8px;left:78.3792%;width:107px;"
    >
      <p class="g-pstyle0">active fire</p>
    </div>
    <div
      id="g-ai2-2"
      class="g-text g-aiAbs g-aiPointText"
      style="top:68.3657%;margin-top:-24.8px;left:48.8951%;margin-left:-106.5px;width:213px;"
    >
      <p class="g-pstyle1">Cottonwood Peak Fire</p>
      <p class="g-pstyle2">(Burn scar)</p>
    </div>
    <div
      id="g-ai2-3"
      class="g-text g-aiAbs g-aiPointText"
      style="top:80.2095%;margin-top:-12.8px;right:79.1707%;width:116px;"
    >
      <p class="g-pstyle3">active fires</p>
    </div>
  </div>
</div>

<!-- End ai2svelte - 2025-09-02 10:12 -->

<!-- Generated by ai2svelte v0.123.1 - 2025-09-02 10:12 -->
<!-- ai file: fire.ai -->
<style lang="scss">
  #g-fire-box {
    container-type: inline-size;
    container-name: g-fire-box;
  }
  #g-fire-box,
  #g-fire-box .g-artboard {
    margin: 0 auto;
  }
  #g-fire-box p {
    margin: 0;
  }
  #g-fire-box .g-aiAbs {
    position: absolute;
  }
  #g-fire-box .g-aiImg {
    position: absolute;
    top: 0;
    display: block;
    width: 100% !important;
    height: 100%;
    background-size: contain;
    background-repeat: no-repeat;
  }
  #g-fire-box .g-aiSymbol {
    position: absolute;
    box-sizing: border-box;
  }
  #g-fire-box .g-aiPointText p {
    white-space: nowrap;
  }
  @mixin animations($values...) {
    $animation: ();
    @each $value in $values {
      $animation: append($animation, $value, comma);
    }
    animation: $animation;
  }
  #g-fire-xs {
    position: relative;
    overflow: hidden;
  }
  @container g-fire-box (width >= 660px) {
    #g-fire-xs {
      display: none;
    }
  }
  #g-fire-xs p {
    font-family: var(--theme-font-family-sans-serif), Knowledge, sans-;
    font-weight: regular;
    line-height: 14px;
    height: auto;
    opacity: 1;
    letter-spacing: 0em;
    font-size: 12px;
    text-align: left;
    color: rgb(255, 255, 255);
    text-transform: none;
    padding-bottom: 0;
    padding-top: 0;
    mix-blend-mode: normal;
    font-style: normal;
    position: static;
  }
  #g-fire-xs .g-pstyle0 {
    font-weight: 700;
    height: 14px;
    text-align: center;
  }
  #g-fire-xs .g-pstyle1 {
    font-weight: 400;
    font-style: italic;
    height: 14px;
    text-align: center;
  }
  #g-fire-md {
    position: relative;
    overflow: hidden;
  }
  #g-fire-md {
    display: none;
  }
  @container g-fire-box (width >= 660px) and (width < 1200px) {
    #g-fire-md {
      display: block;
    }
  }
  #g-fire-md p {
    font-family: var(--theme-font-family-sans-serif), Knowledge, sans-;
    font-weight: regular;
    line-height: 17px;
    height: auto;
    opacity: 1;
    letter-spacing: 0em;
    font-size: 14px;
    text-align: left;
    color: rgb(255, 255, 255);
    text-transform: none;
    padding-bottom: 0;
    padding-top: 0;
    mix-blend-mode: normal;
    font-style: normal;
    position: static;
  }
  #g-fire-md .g-pstyle0 {
    font-weight: 700;
    height: 17px;
  }
  #g-fire-md .g-pstyle1 {
    font-weight: 700;
    height: 17px;
    text-align: center;
  }
  #g-fire-md .g-pstyle2 {
    font-weight: 400;
    font-style: italic;
    height: 17px;
    text-align: center;
  }
  #g-fire-md .g-pstyle3 {
    font-weight: 700;
    height: 17px;
    text-align: right;
  }
  #g-fire-xl {
    position: relative;
    overflow: hidden;
  }
  #g-fire-xl {
    display: none;
  }
  @container g-fire-box (width >= 1200px) {
    #g-fire-xl {
      display: block;
    }
  }
  #g-fire-xl p {
    font-family: var(--theme-font-family-sans-serif), Knowledge, sans-;
    font-weight: regular;
    line-height: 24px;
    height: auto;
    opacity: 1;
    letter-spacing: 0em;
    font-size: 20px;
    text-align: left;
    color: rgb(255, 255, 255);
    text-transform: none;
    padding-bottom: 0;
    padding-top: 0;
    mix-blend-mode: normal;
    font-style: normal;
    position: static;
  }
  #g-fire-xl .g-pstyle0 {
    font-weight: 700;
    height: 24px;
  }
  #g-fire-xl .g-pstyle1 {
    font-weight: 700;
    height: 24px;
    text-align: center;
  }
  #g-fire-xl .g-pstyle2 {
    font-weight: 400;
    font-style: italic;
    height: 24px;
    text-align: center;
  }
  #g-fire-xl .g-pstyle3 {
    font-weight: 700;
    height: 24px;
    text-align: right;
  }

  /* Custom CSS */
  @mixin shadow-mozzarella($clr) {
    text-shadow:
      0 0 10px #000000,
      0 0 10px #000000;
  }
  .g-text {
    @include shadow-mozzarella(#000000);
  }
</style>
