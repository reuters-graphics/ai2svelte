<script lang="ts">
  import Stock from "./ai2svelte/stock.svelte";
  import { onMount } from "svelte";
  import { Block } from "@reuters-graphics/graphics-components";
</script>

{#snippet rippleSnippet()}
  <!-- TradingView Widget BEGIN -->
  <div class="tradingview-widget-container">
    <div class="tradingview-widget-container__widget"></div>
    <div class="tradingview-widget-copyright">
      <a
        href="https://www.tradingview.com/symbols/KRAKEN-XRPUSD/?exchange=KRAKEN"
        rel="noopener nofollow"
        target="_blank"
        ><span class="blue-text">XRPUSD chart by TradingView</span></a
      >
    </div>
    <script
      type="text/javascript"
      src="https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js"
      async
    >
  {
  "symbol": "KRAKEN:XRPUSD",
  "chartOnly": false,
  "dateRange": "1D",
  "noTimeScale": false,
  "colorTheme": "dark",
  "isTransparent": false,
  "locale": "en",
  "width": 320,
  "autosize": false,
  "height": 200
}
    </script>
  </div>
  <!-- TradingView Widget END -->
{/snippet}

{#snippet bitcoinSnippet()}
  <!-- TradingView Widget BEGIN -->
  <div class="tradingview-widget-container">
    <div class="tradingview-widget-container__widget"></div>
    <div class="tradingview-widget-copyright">
      <a
        href="https://www.tradingview.com/symbols/BITSTAMP-BTCUSD/?exchange=BITSTAMP"
        rel="noopener nofollow"
        target="_blank"
        ><span class="blue-text">BTCUSD chart by TradingView</span></a
      >
    </div>
    <script
      type="text/javascript"
      src="https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js"
      async
    >
  {
  "symbol": "BITSTAMP:BTCUSD",
  "chartOnly": false,
  "dateRange": "1D",
  "noTimeScale": false,
  "colorTheme": "dark",
  "isTransparent": false,
  "locale": "en",
  "width": 320,
  "autosize": false,
  "height": 200
}
    </script>
  </div>
  <!-- TradingView Widget END -->
{/snippet}

{#snippet ethereumSnippet()}
  <!-- TradingView Widget BEGIN -->
  <div class="tradingview-widget-container">
    <div class="tradingview-widget-container__widget"></div>
    <div class="tradingview-widget-copyright">
      <a
        href="https://www.tradingview.com/symbols/BITSTAMP-ETHUSD/?exchange=BITSTAMP"
        rel="noopener nofollow"
        target="_blank"
        ><span class="blue-text">ETHUSD chart by TradingView</span></a
      >
    </div>
    <script
      type="text/javascript"
      src="https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js"
      async
    >
  {
  "symbol": "BITSTAMP:ETHUSD",
  "chartOnly": false,
  "dateRange": "1D",
  "noTimeScale": false,
  "colorTheme": "dark",
  "isTransparent": false,
  "locale": "en",
  "width": 320,
  "autosize": false,
  "height": 200
}
    </script>
  </div>
  <!-- TradingView Widget END -->
{/snippet}

<Block width="normal">
  <Stock
    assetsPath="/docs/"
    ripple={rippleSnippet}
    bitcoin={bitcoinSnippet}
    ethereum={ethereumSnippet}
  />
</Block>

<style lang="scss">
  :global {
    .g-artboard {
      overflow: unset !important;
    }

    .g-ripple,
    .g-bitcoin,
    .g-ethereum {
      .g-aiSnippet {
        z-index: 4;
        position: relative;
        .tradingview-widget-container {
          opacity: 0;
          z-index: 5;
          pointer-events: none;
          position: relative;
          transform: translate(0px, 20px);
          transition: 0.4s ease-in-out;
        }
      }

      .g-aiSnippet:hover {
        .tradingview-widget-container {
          opacity: 1;
        }
      }
    }
  }
</style>
