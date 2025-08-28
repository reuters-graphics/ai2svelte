<script>
	let { assetsPath = "/", onAiMounted = () => {} } = $props();
	import { onMount } from "svelte";
	onMount(() => {
		onAiMounted();
	});
</script>

<div id="g-bird-stats-box">
	<!-- Artboard: xs -->
	<div
		id="g-bird-stats-xs"
		class="g-artboard"
		style="display: none;aspect-ratio: 1.00609756097561;"
	>
		<div
			id="g-bird-stats-xs-img"
			class="g-aiImg"
			alt=""
			style="background-image: url({assetsPath.replace(
				new RegExp('/([^/.]+)$'),
				'/$1/',
			) || '/'}images/bird-stats-xs.jpg);"
		></div>
		<div
			id="g-ai0-1"
			class="g-text g-aiAbs g-aiPointText"
			style="top:17.8601%;margin-top:-16.6px;right:55.8434%;width:111px;"
		>
			<p class="g-pstyle0">Hawks,</p>
			<p class="g-pstyle0">eagles, vultures</p>
		</div>
		<div
			id="g-ai0-2"
			class="g-text g-aiAbs g-aiPointText"
			style="top:17.7329%;margin-top:-10.2px;right:35.6484%;width:53px;"
		>
			<p class="g-pstyle1">28%</p>
		</div>
		<div
			id="g-ai0-3"
			class="g-text g-aiAbs g-aiPointText"
			style="top:39.989%;margin-top:-10.2px;left:59.5031%;margin-left:-26px;width:52px;"
		>
			<p class="g-pstyle2">27%</p>
		</div>
		<div
			id="g-ai0-4"
			class="g-text g-aiAbs g-aiPointText"
			style="top:40.1162%;margin-top:-8.6px;right:55.7969%;width:104px;"
		>
			<p class="g-pstyle0">Perching birds</p>
		</div>
		<div
			id="g-ai0-5"
			class="g-text g-aiAbs g-aiPointText"
			style="top:58.2817%;margin-top:-10.2px;left:59.3516%;margin-left:-25.5px;width:51px;"
		>
			<p class="g-pstyle2">18%</p>
		</div>
		<div
			id="g-ai0-6"
			class="g-text g-aiAbs g-aiPointText"
			style="top:58.4089%;margin-top:-8.6px;right:55.7558%;width:87px;"
		>
			<p class="g-pstyle0">Shore birds</p>
		</div>
		<div
			id="g-ai0-7"
			class="g-text g-aiAbs g-aiPointText"
			style="top:74.8723%;margin-top:-16.6px;right:55.7591%;width:55px;"
		>
			<p class="g-pstyle0">Other</p>
			<p class="g-pstyle0">birds</p>
		</div>
		<div
			id="g-ai0-8"
			class="g-text g-aiAbs g-aiPointText"
			style="top:74.7451%;margin-top:-10.2px;left:59.6547%;margin-left:-26.5px;width:53px;"
		>
			<p class="g-pstyle2">22%</p>
		</div>
		<div
			id="g-ai0-9"
			class="g-text g-aiAbs g-aiPointText"
			style="top:86.3305%;margin-top:-10.2px;left:58.4425%;margin-left:-22.5px;width:45px;"
		>
			<p class="g-pstyle2">5%</p>
		</div>
		<div
			id="g-ai0-10"
			class="g-text g-aiAbs g-aiPointText"
			style="top:88.8967%;margin-top:-16.6px;right:55.9091%;width:89px;"
		>
			<p class="g-pstyle0">Mammals</p>
			<p class="g-pstyle0">and reptiles</p>
		</div>
	</div>

	<!-- Artboard: sm -->
	<div
		id="g-bird-stats-sm"
		class="g-artboard"
		style="display: none;aspect-ratio: 2.60204081632653;"
	>
		<div
			id="g-bird-stats-sm-img"
			class="g-aiImg"
			alt=""
			style="background-image: url({assetsPath.replace(
				new RegExp('/([^/.]+)$'),
				'/$1/',
			) || '/'}images/bird-stats-sm.jpg);"
		></div>
		<div
			id="g-ai1-1"
			class="g-text g-aiAbs g-aiPointText"
			style="top:32.2266%;margin-top:-10.2px;left:61.5412%;margin-left:-25.5px;width:51px;"
		>
			<p class="g-pstyle0">18%</p>
		</div>
		<div
			id="g-ai1-2"
			class="g-text g-aiAbs g-aiPointText"
			style="top:34.2674%;margin-top:-10.2px;right:79.1387%;width:53px;"
		>
			<p class="g-pstyle1">28%</p>
		</div>
		<div
			id="g-ai1-3"
			class="g-text g-aiAbs g-aiPointText"
			style="top:34.2674%;margin-top:-10.2px;left:88.7431%;width:45px;"
		>
			<p class="g-pstyle2">5%</p>
		</div>
		<div
			id="g-ai1-4"
			class="g-text g-aiAbs g-aiPointText"
			style="top:34.7776%;margin-top:-10.2px;left:79.2048%;margin-left:-26.5px;width:53px;"
		>
			<p class="g-pstyle0">22%</p>
		</div>
		<div
			id="g-ai1-5"
			class="g-text g-aiAbs g-aiPointText"
			style="top:35.2878%;margin-top:-10.2px;left:41.7214%;margin-left:-26px;width:52px;"
		>
			<p class="g-pstyle0">27%</p>
		</div>
		<div
			id="g-ai1-6"
			class="g-text g-aiAbs"
			style="top:54.0816%;left:18.1056%;margin-left:-6.7647%;width:13.5294%;"
		>
			<p class="g-pstyle3">Hawks, eagles,</p>
			<p class="g-pstyle3">vultures</p>
		</div>
		<div
			id="g-ai1-7"
			class="g-text g-aiAbs g-aiPointText"
			style="top:63.0516%;margin-top:-16.6px;left:41.9778%;margin-left:-36.5px;width:73px;"
		>
			<p class="g-pstyle4">Perching</p>
			<p class="g-pstyle4">birds</p>
		</div>
		<div
			id="g-ai1-8"
			class="g-text g-aiAbs g-aiPointText"
			style="top:63.0516%;margin-top:-16.6px;left:61.6653%;margin-left:-27.5px;width:55px;"
		>
			<p class="g-pstyle4">Shore</p>
			<p class="g-pstyle4">birds</p>
		</div>
		<div
			id="g-ai1-9"
			class="g-text g-aiAbs g-aiPointText"
			style="top:63.0516%;margin-top:-16.6px;left:79.398%;margin-left:-27.5px;width:55px;"
		>
			<p class="g-pstyle4">Other</p>
			<p class="g-pstyle4">birds</p>
		</div>
		<div
			id="g-ai1-10"
			class="g-text g-aiAbs g-aiPointText"
			style="top:67.1332%;margin-top:-24.6px;left:92.3093%;margin-left:-41px;width:82px;"
		>
			<p class="g-pstyle4">Mammals</p>
			<p class="g-pstyle4">and</p>
			<p class="g-pstyle4">reptiles</p>
		</div>
	</div>

	<!-- Artboard: md -->
	<div
		id="g-bird-stats-md"
		class="g-artboard"
		style="display: none;aspect-ratio: 4.23076923076923;"
	>
		<div
			id="g-bird-stats-md-img"
			class="g-aiImg"
			alt=""
			style="background-image: url({assetsPath.replace(
				new RegExp('/([^/.]+)$'),
				'/$1/',
			) || '/'}images/bird-stats-md.jpg);"
		></div>
		<div
			id="g-ai2-1"
			class="g-text g-aiAbs g-aiPointText"
			style="top:32.1565%;margin-top:-10.2px;right:79.1977%;width:53px;"
		>
			<p class="g-pstyle0">28%</p>
		</div>
		<div
			id="g-ai2-2"
			class="g-text g-aiAbs g-aiPointText"
			style="top:32.1565%;margin-top:-10.2px;left:41.8842%;margin-left:-26px;width:52px;"
		>
			<p class="g-pstyle1">27%</p>
		</div>
		<div
			id="g-ai2-3"
			class="g-text g-aiAbs g-aiPointText"
			style="top:32.1565%;margin-top:-10.2px;left:61.3104%;margin-left:-25.5px;width:51px;"
		>
			<p class="g-pstyle1">18%</p>
		</div>
		<div
			id="g-ai2-4"
			class="g-text g-aiAbs g-aiPointText"
			style="top:32.1565%;margin-top:-10.2px;left:78.6355%;margin-left:-26.5px;width:53px;"
		>
			<p class="g-pstyle1">22%</p>
		</div>
		<div
			id="g-ai2-5"
			class="g-text g-aiAbs g-aiPointText"
			style="top:32.1565%;margin-top:-10.2px;left:88.5766%;width:45px;"
		>
			<p class="g-pstyle2">5%</p>
		</div>
		<div
			id="g-ai2-6"
			class="g-text g-aiAbs g-aiPointText"
			style="top:69.0154%;margin-top:-19.7px;left:18.9959%;margin-left:-59px;width:118px;"
		>
			<p class="g-pstyle3">Hawks, eagles,</p>
			<p class="g-pstyle3">vultures</p>
		</div>
		<div
			id="g-ai2-7"
			class="g-text g-aiAbs g-aiPointText"
			style="top:69.0154%;margin-top:-19.7px;left:41.9144%;margin-left:-40px;width:80px;"
		>
			<p class="g-pstyle3">Perching</p>
			<p class="g-pstyle3">birds</p>
		</div>
		<div
			id="g-ai2-8"
			class="g-text g-aiAbs g-aiPointText"
			style="top:69.0154%;margin-top:-19.7px;left:61.2722%;margin-left:-30px;width:60px;"
		>
			<p class="g-pstyle3">Shore</p>
			<p class="g-pstyle3">birds</p>
		</div>
		<div
			id="g-ai2-9"
			class="g-text g-aiAbs g-aiPointText"
			style="top:69.0154%;margin-top:-19.7px;left:78.6566%;margin-left:-30px;width:60px;"
		>
			<p class="g-pstyle3">Other</p>
			<p class="g-pstyle3">birds</p>
		</div>
		<div
			id="g-ai2-10"
			class="g-text g-aiAbs g-aiPointText"
			style="top:69.0154%;margin-top:-19.7px;left:90.7493%;margin-left:-49.5px;width:99px;"
		>
			<p class="g-pstyle3">Mammals</p>
			<p class="g-pstyle3">and reptiles</p>
		</div>
	</div>
</div>

<!-- End ai2html - 2025-07-09 13:22 -->

<!-- Generated by ai2html v0.101.0 - 2025-07-09 13:22 -->
<!-- ai file: bird-stats.ai -->
<style lang="scss">
	#g-bird-stats-box,
	#g-bird-stats-box .g-artboard {
		margin: 0 auto;
	}
	#g-bird-stats-box p {
		margin: 0;
	}
	#g-bird-stats-box .g-aiAbs {
		position: absolute;
	}
	#g-bird-stats-box .g-aiImg {
		position: absolute;
		top: 0;
		display: block;
		width: 100% !important;
		height: 100%;
		background-size: contain;
		background-repeat: no-repeat;
	}
	#g-bird-stats-box .g-aiPointText p {
		white-space: nowrap;
	}
	#g-bird-stats-box {
		container-type: inline-size;
		@container (min-width:0px) and (max-width: 509px) {
			#g-bird-stats-xs {
				display: block !important;
			}
		}
		@container (min-width:510px) and (max-width: 659px) {
			#g-bird-stats-sm {
				display: block !important;
			}
		}
		@container (min-width:660px) {
			#g-bird-stats-md {
				display: block !important;
			}
		}
	}
	#g-bird-stats-xs {
		position: relative;
		overflow: hidden;
	}
	#g-bird-stats-xs p {
		font-family: "Knowledge", "Source Sans Pro", Arial, sans-serif;
		font-weight: 300;
		line-height: 16px;
		height: auto;
		opacity: 1;
		padding-bottom: 0;
		letter-spacing: 0em;
		font-size: 14px;
		text-align: left;
		color: rgb(64, 64, 64);
		text-transform: none;
		padding-top: 0;
		mix-blend-mode: normal;
		font-style: normal;
		position: static;
	}
	#g-bird-stats-xs .g-pstyle0 {
		height: 16px;
		padding-bottom: 9px;
		text-align: right;
	}
	#g-bird-stats-xs .g-pstyle1 {
		font-weight: 500;
		line-height: 19px;
		height: 19px;
		padding-bottom: 9px;
		font-size: 16px;
		text-align: right;
	}
	#g-bird-stats-xs .g-pstyle2 {
		font-weight: 500;
		line-height: 19px;
		height: 19px;
		padding-bottom: 9px;
		font-size: 16px;
		text-align: center;
	}
	#g-bird-stats-sm {
		position: relative;
		overflow: hidden;
	}
	#g-bird-stats-sm p {
		font-family: "Knowledge", "Source Sans Pro", Arial, sans-serif;
		font-weight: 300;
		line-height: 16px;
		height: auto;
		opacity: 1;
		padding-bottom: 0;
		letter-spacing: 0em;
		font-size: 14px;
		text-align: left;
		color: rgb(64, 64, 64);
		text-transform: none;
		padding-top: 0;
		mix-blend-mode: normal;
		font-style: normal;
		position: static;
	}
	#g-bird-stats-sm .g-pstyle0 {
		font-weight: 500;
		line-height: 19px;
		height: 19px;
		padding-bottom: 9px;
		font-size: 16px;
		text-align: center;
	}
	#g-bird-stats-sm .g-pstyle1 {
		font-weight: 500;
		line-height: 19px;
		height: 19px;
		padding-bottom: 9px;
		font-size: 16px;
		text-align: right;
	}
	#g-bird-stats-sm .g-pstyle2 {
		font-weight: 500;
		line-height: 19px;
		height: 19px;
		padding-bottom: 9px;
		font-size: 16px;
	}
	#g-bird-stats-sm .g-pstyle3 {
		padding-bottom: 9px;
		text-align: center;
	}
	#g-bird-stats-sm .g-pstyle4 {
		height: 16px;
		padding-bottom: 9px;
		text-align: center;
	}
	#g-bird-stats-md {
		position: relative;
		overflow: hidden;
	}
	#g-bird-stats-md p {
		font-family: "Knowledge", "Source Sans Pro", Arial, sans-serif;
		font-weight: 300;
		line-height: 19px;
		height: auto;
		opacity: 1;
		padding-bottom: 0;
		letter-spacing: 0em;
		font-size: 16px;
		text-align: left;
		color: rgb(64, 64, 64);
		text-transform: none;
		padding-top: 0;
		mix-blend-mode: normal;
		font-style: normal;
		position: static;
	}
	#g-bird-stats-md .g-pstyle0 {
		font-weight: 500;
		height: 19px;
		padding-bottom: 9px;
		text-align: right;
	}
	#g-bird-stats-md .g-pstyle1 {
		font-weight: 500;
		height: 19px;
		padding-bottom: 9px;
		text-align: center;
	}
	#g-bird-stats-md .g-pstyle2 {
		font-weight: 500;
		height: 19px;
		padding-bottom: 9px;
	}
	#g-bird-stats-md .g-pstyle3 {
		height: 19px;
		padding-bottom: 9px;
		text-align: center;
	}

	/* Custom CSS */
	.text {
	}
</style>
