<script lang="ts">
	import { untrack } from "svelte";
	import type { Attachment } from "svelte/attachments";
	import {
		Mesh,
		Program,
		RenderTarget,
		Renderer,
		Triangle,
		Vec2,
		Vec3,
		Vec4,
	} from "ogl";
	import { type ColorRepresentation, toLinearRgb, toRgb } from "./color";
	import { updateFluidPointerState } from "./fluid-pointer";

	interface Props {
		/**
		 * Dissipation factor for the fluid.
		 * @default 0.95
		 */
		dissipation?: number;
		/**
		 * Radius of the pointer influence.
		 * @default 0.0025
		 */
		pointerSize?: number;
		/**
		 * Color of freshly injected (high-density) dye.
		 * @default "#dc3e00"
		 */
		startColor?: ColorRepresentation;
		/**
		 * Color dye fades toward as its density decays to zero.
		 * @default "#6f0000"
		 */
		endColor?: ColorRepresentation;
		/**
		 * First intermediate color the dye passes through as it decays from
		 * startColor toward endColor, giving the fade an iridescent sheen
		 * instead of a flat two-color blend.
		 * @default "#9c0c81"
		 */
		midColor1?: ColorRepresentation;
		/**
		 * Second intermediate color the dye passes through, closer to endColor.
		 * @default "#4e0bac"
		 */
		midColor2?: ColorRepresentation;
		/**
		 * Cubic bezier control points `[x1, y1, x2, y2]` (same shape as CSS
		 * `cubic-bezier()`) that pace the color stop lerp: x is normalized
		 * density (1 = fresh, 0 = about to disappear), y is how far along
		 * the start→mid1→mid2→end sequence the dye is. Linear `[0,0,1,1]`
		 * spends equal density on each stop; bowing the curve spends more
		 * density lingering on some stops and less on others.
		 * @default [0.03, 0.6, 0.48, 1]
		 */
		colorEase?: readonly [number, number, number, number];
		/**
		 * Fluid velocity dissipation.
		 * @default 0.98
		 */
		velocityDissipation?: number;
		/**
		 * Pressure iterations. More iterations = more accurate but slower.
		 * @default 24
		 */
		pressureIterations?: number;
		/**
		 * Output color levels per channel for the 8x8 Bayer ordered dither.
		 * Low values (e.g. 4) make the dither pattern clearly visible; high
		 * values (e.g. 32+) make it act as subtle anti-banding instead.
		 * @default 2
		 */
		ditherLevels?: number;
		/**
		 * Size in physical pixels of one dither matrix cell. Larger values
		 * produce chunkier, more visible dithering (like a lower-res retro
		 * dither); 1 is a fine, per-pixel pattern.
		 * @default 4
		 */
		ditherPixelSize?: number;
		/**
		 * Debug: keep the sim running its own idle wandering-pointer preview
		 * forever, ignoring real pointer/touch input. Useful for tuning
		 * config values against a repeatable motion instead of the mouse.
		 * @default false
		 */
		debugAutoPlay?: boolean;
		/**
		 * Enable the bloom post-process glow around bright dithered pixels.
		 * @default true
		 */
		bloomEnabled?: boolean;
		/**
		 * Brightness above which a pixel starts contributing to the bloom glow.
		 * @default 0.6
		 */
		bloomThreshold?: number;
		/**
		 * Strength of the bloom glow added on top of the base image.
		 * @default 1
		 */
		bloomIntensity?: number;
		/**
		 * Spread of the bloom glow, in blur-sample texel multiples.
		 * @default 0.2
		 */
		bloomRadius?: number;
		/**
		 * Multiplier on the simulation's internal resolution (independent of
		 * the canvas's rendered/CSS size). Lower this on constrained devices
		 * (e.g. mobile) to cut GPU/battery cost without shrinking the canvas
		 * itself.
		 * @default 1
		 */
		resolutionScale?: number;
	}

	type PointerState = {
		x: number;
		y: number;
		dx: number;
		dy: number;
		moved: boolean;
		initialized: boolean;
	};

	type PreviewState = {
		enabled: boolean;
		timeMs: number;
	};

	type CanvasMetrics = {
		width: number;
		height: number;
	};

	type DoubleFBO = {
		read: RenderTarget;
		write: RenderTarget;
		swap: () => void;
	};

	let {
		dissipation = 0.95,
		pointerSize = 0.0025,
		startColor = "#dc3e00",
		endColor = "#6f0000",
		midColor1 = "#9c0c81",
		midColor2 = "#4e0bac",
		colorEase = [0.03, 0.6, 0.48, 1],
		velocityDissipation = 0.98,
		pressureIterations = 24,
		ditherLevels = 2,
		ditherPixelSize = 4,
		debugAutoPlay = false,
		bloomEnabled = true,
		bloomThreshold = 0.6,
		bloomIntensity = 1,
		bloomRadius = 0.2,
		resolutionScale = 1,
	}: Props = $props();

	const pointerState = $state<PointerState>({
		x: 0,
		y: 0,
		dx: 0,
		dy: 0,
		moved: false,
		initialized: false,
	});
	const previewState = $state<PreviewState>({
		enabled: true,
		timeMs: 0,
	});
	const canvasMetrics = $state<CanvasMetrics>({
		width: 1,
		height: 1,
	});

	const pointerUv = new Vec2();
	const splatColor = new Vec3();
	const startDitherColor = new Vec3();
	const endDitherColor = new Vec3();
	const midDitherColor1 = new Vec3();
	const midDitherColor2 = new Vec3();
	const colorEaseValue = new Vec4();

	const pointerForceClamp = 450;
	const pointerForceInitialLerp = 0.2;
	const pointerForceLerp = 0.55;

	$effect(() => {
		const [r, g, b] = toLinearRgb(startColor, [1, 105 / 255, 0]);
		splatColor.set(r, g, b);
	});

	$effect(() => {
		const [r, g, b] = toRgb(startColor, [1, 105 / 255, 0]);
		startDitherColor.set(r, g, b);
	});

	$effect(() => {
		const [r, g, b] = toRgb(endColor, [0.18, 0.04, 0.36]);
		endDitherColor.set(r, g, b);
	});

	$effect(() => {
		const [r, g, b] = toRgb(midColor1, [1, 0.18, 0.61]);
		midDitherColor1.set(r, g, b);
	});

	$effect(() => {
		const [r, g, b] = toRgb(midColor2, [0.2, 0.84, 1]);
		midDitherColor2.set(r, g, b);
	});

	$effect(() => {
		colorEaseValue.set(...colorEase);
	});

	const updatePointerPosition = (
		px: number,
		py: number,
		width: number,
		height: number,
	) => {
		updateFluidPointerState({
			state: pointerState,
			uv: pointerUv,
			x: px,
			y: py,
			width,
			height,
			forceClamp: pointerForceClamp,
			initialLerp: pointerForceInitialLerp,
			lerp: pointerForceLerp,
		});
	};

	const vertexShader = `
		attribute vec2 uv;
		attribute vec2 position;
		varying vec2 vUv;
		varying vec2 vL;
		varying vec2 vR;
		varying vec2 vT;
		varying vec2 vB;
		uniform vec2 uTexel;

		void main () {
			vUv = uv;
			vL = vUv - vec2(uTexel.x, 0.);
			vR = vUv + vec2(uTexel.x, 0.);
			vT = vUv + vec2(0., uTexel.y);
			vB = vUv - vec2(0., uTexel.y);
			gl_Position = vec4(position, 0.0, 1.0);
		}
	`;

	const advectionShader = `
		precision highp float;
		varying vec2 vUv;
		uniform sampler2D uVelocity;
		uniform sampler2D uInput;
		uniform vec2 uTexel;
		uniform float uDt;
		uniform float uDissipation;

		vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
			vec2 st = uv / tsize - 0.5;
			vec2 iuv = floor(st);
			vec2 fuv = fract(st);
			vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
			vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
			vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
			vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
			return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
		}

		void main () {
			vec2 coord = vUv - uDt * bilerp(uVelocity, vUv, uTexel).xy * uTexel;
			gl_FragColor = uDissipation * bilerp(uInput, coord, uTexel);
			gl_FragColor.a = 1.;
		}
	`;

	const divergenceShader = `
		precision highp float;
		varying vec2 vL;
		varying vec2 vR;
		varying vec2 vT;
		varying vec2 vB;
		uniform sampler2D uVelocity;

		void main () {
			float L = texture2D(uVelocity, vL).x;
			float R = texture2D(uVelocity, vR).x;
			float T = texture2D(uVelocity, vT).y;
			float B = texture2D(uVelocity, vB).y;
			float div = .6 * (R - L + T - B);
			gl_FragColor = vec4(div, 0., 0., 1.);
		}
	`;

	const pressureShader = `
		precision highp float;
		varying vec2 vUv;
		varying vec2 vL;
		varying vec2 vR;
		varying vec2 vT;
		varying vec2 vB;
		uniform sampler2D uPressure;
		uniform sampler2D uDivergence;

		void main () {
			float L = texture2D(uPressure, vL).x;
			float R = texture2D(uPressure, vR).x;
			float T = texture2D(uPressure, vT).x;
			float B = texture2D(uPressure, vB).x;
			float divergence = texture2D(uDivergence, vUv).x;
			float pressure = (L + R + B + T - divergence) * 0.25;
			gl_FragColor = vec4(pressure, 0., 0., 1.);
		}
	`;

	const gradientSubtractShader = `
		precision highp float;
		varying vec2 vUv;
		varying vec2 vL;
		varying vec2 vR;
		varying vec2 vT;
		varying vec2 vB;
		uniform sampler2D uPressure;
		uniform sampler2D uVelocity;

		void main () {
			float L = texture2D(uPressure, vL).x;
			float R = texture2D(uPressure, vR).x;
			float T = texture2D(uPressure, vT).x;
			float B = texture2D(uPressure, vB).x;
			vec2 velocity = texture2D(uVelocity, vUv).xy;
			velocity.xy -= vec2(R - L, T - B);
			gl_FragColor = vec4(velocity, 0., 1.);
		}
	`;

	const splatShader = `
		precision highp float;
		varying vec2 vUv;
		uniform sampler2D uInput;
		uniform float uRatio;
		uniform vec3 uPointValue;
		uniform vec2 uPoint;
		uniform float uPointSize;

		void main () {
			vec2 p = vUv - uPoint.xy;
			p.x *= uRatio;
			vec3 splat = pow(2., -dot(p, p) / uPointSize) * uPointValue;
			vec3 base = texture2D(uInput, vUv).xyz;
			gl_FragColor = vec4(base + splat, 1.);
		}
	`;

	const outputVertexShader = `
		attribute vec2 uv;
		attribute vec2 position;
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = vec4(position, 0.0, 1.0);
		}
	`;

	const outputShader = `
		precision highp float;
		varying vec2 vUv;
		uniform sampler2D uTexture;
		uniform vec3 uStartColor;
		uniform vec3 uEndColor;
		uniform vec3 uMidColor1;
		uniform vec3 uMidColor2;
		uniform vec4 uColorEase;
		uniform float uDitherLevels;
		uniform float uDitherPixelSize;
		uniform vec2 uResolution;

		vec3 linearToSrgb(vec3 color) {
			vec3 safe = max(color, vec3(0.0));
			vec3 low = safe * 12.92;
			vec3 high = 1.055 * pow(safe, vec3(1.0 / 2.4)) - 0.055;
			vec3 cutoff = step(vec3(0.0031308), safe);
			return mix(low, high, cutoff);
		}

		// Same construction as WebKit's UnitBezier: a cubic bezier from (0,0)
		// through (b.x,b.y) and (b.z,b.w) to (1,1), solved for y at a given x
		// via Newton-Raphson (falling back to a bisection step whenever the
		// tangent goes flat) since GLSL has no analytic cubic-root builtin.
		float cubicBezierEase(float x, vec4 b) {
			float cx = 3.0 * b.x;
			float bx = 3.0 * (b.z - b.x) - cx;
			float ax = 1.0 - cx - bx;

			float cy = 3.0 * b.y;
			float by = 3.0 * (b.w - b.y) - cy;
			float ay = 1.0 - cy - by;

			float t = clamp(x, 0.0, 1.0);
			for (int i = 0; i < 8; i++) {
				float xEst = ((ax * t + bx) * t + cx) * t - x;
				if (abs(xEst) < 1e-5) break;
				float d = (3.0 * ax * t + 2.0 * bx) * t + cx;
				if (abs(d) < 1e-6) break;
				t = clamp(t - xEst / d, 0.0, 1.0);
			}
			return clamp(((ay * t + by) * t + cy) * t, 0.0, 1.0);
		}

		float bayerOffset(float bx, float by) {
			if (bx > 0.5 && by < 0.5) return 2.0;
			if (bx < 0.5 && by > 0.5) return 3.0;
			if (bx > 0.5 && by > 0.5) return 1.0;
			return 0.0;
		}

		float bayerDither8x8(vec2 fragCoord) {
			float x = mod(fragCoord.x, 8.0);
			float y = mod(fragCoord.y, 8.0);

			float x0 = mod(x, 2.0);
			float y0 = mod(y, 2.0);
			float x1 = mod(floor(x / 2.0), 2.0);
			float y1 = mod(floor(y / 2.0), 2.0);
			float x2 = floor(x / 4.0);
			float y2 = floor(y / 4.0);

			float value = 16.0 * bayerOffset(x0, y0) + 4.0 * bayerOffset(x1, y1) + bayerOffset(x2, y2);
			return value / 64.0;
		}

		void main() {
			// Sample once per dither cell (not per fragment) so the fluid's
			// silhouette itself is blocky at the dither resolution, instead
			// of a smooth shape with only a thin dithered band at its edge.
			vec2 cell = floor(gl_FragCoord.xy / uDitherPixelSize);
			vec2 cellCenterPx = (cell + 0.5) * uDitherPixelSize;
			vec2 cellUv = cellCenterPx / uResolution;

			vec3 C = texture2D(uTexture, cellUv).rgb;
			vec3 srgb = linearToSrgb(C);
			float lum = max(srgb.r, max(srgb.g, srgb.b));

			float threshold = bayerDither8x8(cell) - 0.5;
			// n levels means n possible outputs (0, 1/(n-1), ..., 1), so the
			// quantization step divides by (n-1), not n: dividing by n leaves
			// an extra fractional bucket (e.g. 0, 0.5, 1 at n=2) instead of
			// snapping straight to the two extremes.
			float steps = max(uDitherLevels - 1.0, 1.0);
			float ditheredLum = clamp(floor(lum * steps + threshold + 0.5) / steps, 0.0, 1.0);

			// Dither against a foreground color mixed from a fixed set of
			// stops instead of each pixel's own srgb hue: gamma encoding
			// doesn't preserve channel ratios across different intensities,
			// so the local sample's hue drifts with density (hot yellow core
			// vs cooler orange edges) if reconstructed directly. Using
			// density (lum) as a freshness proxy instead: dye near full
			// density just started (uStartColor), dye that's decayed toward
			// zero is about to disappear (uEndColor), passing through
			// uMidColor1/uMidColor2 in between for an iridescent sheen
			// instead of a flat two-color blend. uColorEase re-paces that
			// progression across density (e.g. lingering on the mid stops)
			// instead of spending equal density on each one.
			float t = cubicBezierEase(clamp(lum, 0.0, 1.0), uColorEase);
			vec3 foreground;
			if (t < 1.0 / 3.0) {
				foreground = mix(uEndColor, uMidColor2, t * 3.0);
			} else if (t < 2.0 / 3.0) {
				foreground = mix(uMidColor2, uMidColor1, (t - 1.0 / 3.0) * 3.0);
			} else {
				foreground = mix(uMidColor1, uStartColor, (t - 2.0 / 3.0) * 3.0);
			}
			gl_FragColor = vec4(foreground * ditheredLum, ditheredLum);
		}
	`;

	const bloomShader = `
		precision highp float;
		varying vec2 vUv;
		uniform sampler2D uTexture;
		uniform vec2 uTexel;
		uniform float uBloomThreshold;
		uniform float uBloomRadius;

		void main() {
			vec2 offset = uTexel * uBloomRadius;
			vec3 sum = vec3(0.0);
			float totalWeight = 0.0;
			for (int x = -1; x <= 1; x++) {
				for (int y = -1; y <= 1; y++) {
					vec2 o = vec2(float(x), float(y)) * offset;
					float weight = (x == 0 && y == 0) ? 4.0 : ((x == 0 || y == 0) ? 2.0 : 1.0);
					vec3 c = texture2D(uTexture, vUv + o).rgb;
					sum += max(c - uBloomThreshold, 0.0) * weight;
					totalWeight += weight;
				}
			}
			gl_FragColor = vec4(sum / totalWeight, 1.0);
		}
	`;

	const compositeShader = `
		precision highp float;
		varying vec2 vUv;
		uniform sampler2D uScene;
		uniform sampler2D uBloom;
		uniform float uBloomIntensity;

		void main() {
			vec4 scene = texture2D(uScene, vUv);
			vec3 bloom = texture2D(uBloom, vUv).rgb * uBloomIntensity;
			float bloomAlpha = max(max(bloom.r, bloom.g), bloom.b);
			gl_FragColor = vec4(scene.rgb + bloom, clamp(scene.a + bloomAlpha, 0.0, 1.0));
		}
	`;

	const setupScene = (targetCanvas: HTMLCanvasElement) => {
		const renderer = new Renderer({
			canvas: targetCanvas,
			alpha: true,
			dpr: typeof window !== "undefined" ? window.devicePixelRatio : 1,
		});
		const gl = renderer.gl;
		gl.clearColor(0, 0, 0, 0);

		targetCanvas.style.width = "100%";
		targetCanvas.style.height = "100%";

		const halfFloatExt = gl.renderer.extensions["OES_texture_half_float"] as
			| { HALF_FLOAT_OES: number }
			| undefined;
		const textureType = gl.renderer.isWebgl2
			? (gl as WebGL2RenderingContext).HALF_FLOAT
			: (halfFloatExt?.HALF_FLOAT_OES ?? gl.FLOAT);
		const internalFormat = gl.renderer.isWebgl2
			? textureType === gl.FLOAT
				? (gl as WebGL2RenderingContext).RGBA32F
				: (gl as WebGL2RenderingContext).RGBA16F
			: gl.RGBA;

		const createFBO = (w: number, h: number) =>
			new RenderTarget(gl, {
				width: w,
				height: h,
				type: textureType,
				format: gl.RGBA,
				internalFormat,
				minFilter: gl.NEAREST,
				magFilter: gl.NEAREST,
				depth: false,
				stencil: false,
			});

		const createDoubleFBO = (w: number, h: number): DoubleFBO => {
			const doubleFBO: DoubleFBO = {
				read: createFBO(w, h),
				write: createFBO(w, h),
				swap: () => {
					const temp = doubleFBO.read;
					doubleFBO.read = doubleFBO.write;
					doubleFBO.write = temp;
				},
			};
			return doubleFBO;
		};

		const density = createDoubleFBO(128, 128);
		const velocity = createDoubleFBO(128, 128);
		const pressure = createDoubleFBO(128, 128);
		const divergence = createFBO(128, 128);

		const texel = new Vec2(1 / 128, 1 / 128);
		const advectionUniforms = {
			uVelocity: { value: velocity.read.texture },
			uInput: { value: velocity.read.texture },
			uTexel: { value: texel },
			uDt: { value: 1 / 60 },
			uDissipation: { value: velocityDissipation },
		};
		const divergenceUniforms = {
			uVelocity: { value: velocity.read.texture },
			uTexel: { value: texel },
		};
		const pressureUniforms = {
			uPressure: { value: pressure.read.texture },
			uDivergence: { value: divergence.texture },
			uTexel: { value: texel },
		};
		const gradientSubtractUniforms = {
			uPressure: { value: pressure.read.texture },
			uVelocity: { value: velocity.read.texture },
			uTexel: { value: texel },
		};
		const splatUniforms = {
			uInput: { value: velocity.read.texture },
			uRatio: { value: 1 },
			uPointValue: { value: new Vec3() },
			uPoint: { value: pointerUv },
			uPointSize: { value: pointerSize },
			uTexel: { value: texel },
		};
		const outputUniforms = {
			uTexture: { value: density.read.texture },
			uStartColor: { value: startDitherColor },
			uEndColor: { value: endDitherColor },
			uMidColor1: { value: midDitherColor1 },
			uMidColor2: { value: midDitherColor2 },
			uColorEase: { value: colorEaseValue },
			uDitherLevels: { value: ditherLevels },
			uDitherPixelSize: { value: ditherPixelSize },
			uResolution: { value: new Vec2(1, 1) },
		};

		const createPostFBO = (w: number, h: number) =>
			new RenderTarget(gl, {
				width: w,
				height: h,
				depth: false,
				stencil: false,
				minFilter: gl.LINEAR,
				magFilter: gl.LINEAR,
			});

		const sceneTarget = createPostFBO(1, 1);
		const bloomTarget = createPostFBO(1, 1);

		const bloomUniforms = {
			uTexture: { value: sceneTarget.texture },
			uTexel: { value: new Vec2(1, 1) },
			uBloomThreshold: { value: bloomThreshold },
			uBloomRadius: { value: bloomRadius },
		};
		const compositeUniforms = {
			uScene: { value: sceneTarget.texture },
			uBloom: { value: bloomTarget.texture },
			uBloomIntensity: { value: bloomEnabled ? bloomIntensity : 0 },
		};

		const advectionProgram = new Program(gl, {
			vertex: vertexShader,
			fragment: advectionShader,
			uniforms: advectionUniforms,
			depthTest: false,
			depthWrite: false,
		});
		const divergenceProgram = new Program(gl, {
			vertex: vertexShader,
			fragment: divergenceShader,
			uniforms: divergenceUniforms,
			depthTest: false,
			depthWrite: false,
		});
		const pressureProgram = new Program(gl, {
			vertex: vertexShader,
			fragment: pressureShader,
			uniforms: pressureUniforms,
			depthTest: false,
			depthWrite: false,
		});
		const gradientSubtractProgram = new Program(gl, {
			vertex: vertexShader,
			fragment: gradientSubtractShader,
			uniforms: gradientSubtractUniforms,
			depthTest: false,
			depthWrite: false,
		});
		const splatProgram = new Program(gl, {
			vertex: vertexShader,
			fragment: splatShader,
			uniforms: splatUniforms,
			depthTest: false,
			depthWrite: false,
		});
		const outputProgram = new Program(gl, {
			vertex: outputVertexShader,
			fragment: outputShader,
			uniforms: outputUniforms,
			depthTest: false,
			depthWrite: false,
			transparent: true,
		});
		const bloomProgram = new Program(gl, {
			vertex: outputVertexShader,
			fragment: bloomShader,
			uniforms: bloomUniforms,
			depthTest: false,
			depthWrite: false,
		});
		const compositeProgram = new Program(gl, {
			vertex: outputVertexShader,
			fragment: compositeShader,
			uniforms: compositeUniforms,
			depthTest: false,
			depthWrite: false,
			transparent: true,
		});

		const triangle = new Triangle(gl);
		const simMesh = new Mesh(gl, {
			geometry: triangle,
			program: advectionProgram,
		});

		const renderPass = (program: Program, target?: RenderTarget) => {
			simMesh.program = program;
			renderer.render({ scene: simMesh, target, clear: true });
		};

		const handlePointerMove = (e: PointerEvent) => {
			if (debugAutoPlay) return;
			const rect = targetCanvas.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;

			const wasPreview = previewState.enabled;
			previewState.enabled = false;
			if (wasPreview) {
				pointerState.initialized = false;
				pointerState.dx = 0;
				pointerState.dy = 0;
			}
			updatePointerPosition(x, y, rect.width, rect.height);
		};

		const handleTouchMove = (e: TouchEvent) => {
			if (debugAutoPlay) return;
			e.preventDefault();
			const touch = e.touches[0];
			if (!touch) return;
			const rect = targetCanvas.getBoundingClientRect();
			const x = touch.clientX - rect.left;
			const y = touch.clientY - rect.top;

			const wasPreview = previewState.enabled;
			previewState.enabled = false;
			if (wasPreview) {
				pointerState.initialized = false;
				pointerState.dx = 0;
				pointerState.dy = 0;
			}
			updatePointerPosition(x, y, rect.width, rect.height);
		};

		targetCanvas.addEventListener("pointermove", handlePointerMove);
		targetCanvas.addEventListener("touchmove", handleTouchMove, {
			passive: false,
		});

		const resizeSimulation = (w: number, h: number) => {
			const simResX = Math.max(1, Math.floor(w * 0.5 * resolutionScale));
			const simResY = Math.max(1, Math.floor(h * 0.5 * resolutionScale));

			if (simResX > density.read.width || simResY > density.read.height) {
				density.read.setSize(simResX, simResY);
				density.write.setSize(simResX, simResY);
				velocity.read.setSize(simResX, simResY);
				velocity.write.setSize(simResX, simResY);
				pressure.read.setSize(simResX, simResY);
				pressure.write.setSize(simResX, simResY);
				divergence.setSize(simResX, simResY);
			}

			const fboW = density.read.width;
			const fboH = density.read.height;
			texel.set(1 / fboW, 1 / fboH);

			if (w > 0 && h > 0) {
				pointerUv.set(pointerState.x / w, 1 - pointerState.y / h);
			}
		};

		const disposeTarget = (target: RenderTarget) => {
			target.textures.forEach((texture) => {
				if (texture.texture) gl.deleteTexture(texture.texture);
			});
			if (target.depthTexture?.texture)
				gl.deleteTexture(target.depthTexture.texture);
			if (target.depthBuffer) gl.deleteRenderbuffer(target.depthBuffer);
			if (target.stencilBuffer) gl.deleteRenderbuffer(target.stencilBuffer);
			if (target.depthStencilBuffer)
				gl.deleteRenderbuffer(target.depthStencilBuffer);
			if (target.buffer) gl.deleteFramebuffer(target.buffer);
		};

		let raf = 0;
		let previous = 0;
		let pendingSimW = 0;
		let pendingSimH = 0;
		let resizeTimer = 0;
		const tick = (now: number) => {
			const w = Math.max(1, targetCanvas.clientWidth);
			const h = Math.max(1, targetCanvas.clientHeight);
			const bufW = Math.round(w * renderer.dpr);
			const bufH = Math.round(h * renderer.dpr);
			if (targetCanvas.width !== bufW || targetCanvas.height !== bufH) {
				targetCanvas.width = bufW;
				targetCanvas.height = bufH;
				renderer.width = w;
				renderer.height = h;
				renderer.state.viewport = { x: 0, y: 0, width: null, height: null };
				canvasMetrics.width = w;
				canvasMetrics.height = h;
				outputUniforms.uResolution.value.set(bufW, bufH);
				sceneTarget.setSize(bufW, bufH);
				bloomTarget.setSize(bufW, bufH);
				bloomUniforms.uTexel.value.set(1 / bufW, 1 / bufH);
				pendingSimW = w;
				pendingSimH = h;
				clearTimeout(resizeTimer);
				resizeTimer = window.setTimeout(
					() => resizeSimulation(pendingSimW, pendingSimH),
					150,
				);
			}
			const delta = previous ? (now - previous) / 1000 : 0;
			previous = now;
			const dt = 1 / 60;
			const width = canvasMetrics.width || targetCanvas.clientWidth || 1;
			const height = canvasMetrics.height || targetCanvas.clientHeight || 1;
			const aspect = height > 0 ? width / height : 1;

			if (previewState.enabled && width > 0 && height > 0) {
				previewState.timeMs += delta * 1000;
				const previewX =
					(0.5 - 0.45 * Math.sin(0.003 * previewState.timeMs - 2)) * width;
				const previewY =
					(0.5 +
						0.1 * Math.sin(0.0025 * previewState.timeMs) +
						0.1 * Math.cos(0.002 * previewState.timeMs)) *
					height;
				updatePointerPosition(previewX, previewY, width, height);
			}

			if (pointerState.moved) {
				splatUniforms.uInput.value = velocity.read.texture;
				splatUniforms.uRatio.value = aspect;
				splatUniforms.uPoint.value.set(pointerUv.x, pointerUv.y);
				splatUniforms.uPointValue.value.set(
					pointerState.dx,
					-pointerState.dy,
					1,
				);
				splatUniforms.uPointSize.value = pointerSize;
				renderPass(splatProgram, velocity.write);
				velocity.swap();

				splatUniforms.uInput.value = density.read.texture;
				splatUniforms.uPointValue.value.set(
					splatColor.x,
					splatColor.y,
					splatColor.z,
				);
				renderPass(splatProgram, density.write);
				density.swap();

				if (!previewState.enabled) {
					pointerState.moved = false;
				}
			}

			divergenceUniforms.uVelocity.value = velocity.read.texture;
			renderPass(divergenceProgram, divergence);

			pressureUniforms.uDivergence.value = divergence.texture;
			const iterations = Math.max(0, Math.floor(pressureIterations));
			for (let i = 0; i < iterations; i++) {
				pressureUniforms.uPressure.value = pressure.read.texture;
				renderPass(pressureProgram, pressure.write);
				pressure.swap();
			}

			gradientSubtractUniforms.uPressure.value = pressure.read.texture;
			gradientSubtractUniforms.uVelocity.value = velocity.read.texture;
			renderPass(gradientSubtractProgram, velocity.write);
			velocity.swap();

			advectionUniforms.uDt.value = dt;
			advectionUniforms.uVelocity.value = velocity.read.texture;
			advectionUniforms.uInput.value = velocity.read.texture;
			advectionUniforms.uDissipation.value = velocityDissipation;
			renderPass(advectionProgram, velocity.write);
			velocity.swap();

			advectionUniforms.uVelocity.value = velocity.read.texture;
			advectionUniforms.uInput.value = density.read.texture;
			advectionUniforms.uDissipation.value = dissipation;
			renderPass(advectionProgram, density.write);
			density.swap();

			outputUniforms.uTexture.value = density.read.texture;
			outputUniforms.uDitherLevels.value = ditherLevels;
			outputUniforms.uDitherPixelSize.value = ditherPixelSize;
			renderPass(outputProgram, sceneTarget);

			if (bloomEnabled) {
				bloomUniforms.uBloomThreshold.value = bloomThreshold;
				bloomUniforms.uBloomRadius.value = bloomRadius;
				renderPass(bloomProgram, bloomTarget);
			}
			compositeUniforms.uBloomIntensity.value = bloomEnabled
				? bloomIntensity
				: 0;
			renderPass(compositeProgram);

			raf = window.requestAnimationFrame(tick);
		};

		raf = window.requestAnimationFrame(tick);

		return () => {
			window.cancelAnimationFrame(raf);
			clearTimeout(resizeTimer);
			targetCanvas.removeEventListener("pointermove", handlePointerMove);
			targetCanvas.removeEventListener("touchmove", handleTouchMove);

			disposeTarget(density.read);
			disposeTarget(density.write);
			disposeTarget(velocity.read);
			disposeTarget(velocity.write);
			disposeTarget(pressure.read);
			disposeTarget(pressure.write);
			disposeTarget(divergence);
			disposeTarget(sceneTarget);
			disposeTarget(bloomTarget);

			advectionProgram.remove();
			divergenceProgram.remove();
			pressureProgram.remove();
			gradientSubtractProgram.remove();
			splatProgram.remove();
			outputProgram.remove();
			bloomProgram.remove();
			compositeProgram.remove();
			triangle.remove();
		};
	};

	const mountScene: Attachment<HTMLCanvasElement> = (targetCanvas) =>
		untrack(() => setupScene(targetCanvas));
</script>

<canvas {@attach mountScene} class="fluid-canvas" aria-hidden="true"></canvas>

<style>
	.fluid-canvas {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
		/* The backing buffer is rendered at devicePixelRatio, so the browser
		   downscales it to the CSS size for display. Without this, that
		   downscale blends across dither cell edges (soft "half pixel"
		   colors between black and the foreground) instead of keeping the
		   dither's hard-edged squares crisp. */
		image-rendering: pixelated;
	}
</style>
