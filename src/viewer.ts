import { inferModelType, isTextureSource, loadCapeToCanvas, loadCustomModelToCanvas, loadEarsToCanvas, loadEarsToCanvasFromSkin, loadImage, loadSkinToCanvas, ModelType, RemoteImage, TextureSource } from "skinview-utils";
import { Color, ColorRepresentation, PointLight, EquirectangularReflectionMapping, Group, NearestFilter, PerspectiveCamera, Scene, Texture, Vector2, WebGLRenderer, AmbientLight, Mapping } from "three";
import { RootAnimation } from "./animation.js";
import { BackEquipment, PlayerObject, JsonModelObject } from "./model.js";

export interface LoadOptions {
	/**
	 * Whether to make the object visible after the texture is loaded. Default is true.
	 */
	makeVisible?: boolean;
}

export interface SkinLoadOptions extends LoadOptions {
	/**
	 * The model type of skin. Default is "auto-detect".
	 */
	model?: ModelType | "auto-detect";

	/**
	 * true: Loads the ears drawn on the skin texture, and show it.
	 * "load-only": Loads the ears drawn on the skin texture, but do not make it visible.
	 * false: Do not load ears from the skin texture.
	 * Default is false.
	 */
	ears?: boolean | "load-only";
}

export interface CapeLoadOptions extends LoadOptions {
	/**
	 * The equipment (cape or elytra) to show, defaults to "cape".
	 * If makeVisible is set to false, this option will have no effect.
	 */
	backEquipment?: BackEquipment;
}

export interface CustomModelOptions extends LoadOptions {
	
}

export interface EarsLoadOptions extends LoadOptions {
	/**
	 * "standalone": The texture is a 14x7 image that only contains the ears;
	 * "skin": The texture is a skin that contains ears, and we only show its ear part.
	 * Default is "standalone".
	 */
	textureType?: "standalone" | "skin";
}

export interface SkinViewerOptions {
	width?: number;
	height?: number;
	skin?: RemoteImage | TextureSource;
	model?: ModelType | "auto-detect";
	cape?: RemoteImage | TextureSource;
	hatTexture?: RemoteImage | TextureSource;
	hatModel?: any;
	hat1Texture?: RemoteImage | TextureSource;
	hat1Model?: any;
	hat2Texture?: RemoteImage | TextureSource;
	hat2Model?: any;
	hat3Texture?: RemoteImage | TextureSource;
	hat3Model?: any;
	hat4Texture?: RemoteImage | TextureSource;
	hat4Model?: any;
	hat5Texture?: RemoteImage | TextureSource;
	hat5Model?: any;
	hat6Texture?: RemoteImage | TextureSource;
	hat6Model?: any;
	hat7Texture?: RemoteImage | TextureSource;
	hat7Model?: any;
	hat8Texture?: RemoteImage | TextureSource;
	hat8Model?: any;
	hat9Texture?: RemoteImage | TextureSource;
	hat9Model?: any;
	shoulderBuddyTexture?: RemoteImage | TextureSource;
	shoulderBuddyModel?: any;
	shoulderBuddy1Texture?: RemoteImage | TextureSource;
	shoulderBuddy1Model?: any;
	shoulderBuddy2Texture?: RemoteImage | TextureSource;
	shoulderBuddy2Model?: any;
	shoulderBuddy3Texture?: RemoteImage | TextureSource;
	shoulderBuddy3Model?: any;
	shoulderBuddy4Texture?: RemoteImage | TextureSource;
	shoulderBuddy4Model?: any;
	shoulderBuddy5Texture?: RemoteImage | TextureSource;
	shoulderBuddy5Model?: any;
	shoulderBuddy6Texture?: RemoteImage | TextureSource;
	shoulderBuddy6Model?: any;
	shoulderBuddy7Texture?: RemoteImage | TextureSource;
	shoulderBuddy7Model?: any;
	shoulderBuddy8Texture?: RemoteImage | TextureSource;
	shoulderBuddy8Model?: any;
	shoulderBuddy9Texture?: RemoteImage | TextureSource;
	shoulderBuddy9Model?: any;
	backEquipment?: BackEquipment | null;

	shoulderBuddyList?: any;
	hatList?: any;

	/**
	 * If you want to show the ears drawn on the current skin, set this to "current-skin".
	 * To show ears that come from a separate texture, you have to specify 'textureType' ("standalone" or "skin") and 'source'.
	 * "standalone" means the provided texture is a 14x7 image that only contains the ears.
	 * "skin" means the provided texture is a skin that contains ears, and we only show its ear part.
	 */
	ears?: "current-skin" | {
		textureType: "standalone" | "skin",
		source: RemoteImage | TextureSource
	}

	/**
	 * Whether the canvas contains an alpha buffer. Default is true.
	 * This option can be turned off if you use an opaque background.
	 */
	alpha?: boolean;

	/**
	 * Render target.
	 * A new canvas is created if this parameter is unspecified.
	 */
	canvas?: HTMLCanvasElement;

	/**
	 * Whether to preserve the buffers until manually cleared or overwritten. Default is false.
	 */
	preserveDrawingBuffer?: boolean;

	/**
	 * The initial value of `SkinViewer.renderPaused`. Default is false.
	 * If this option is true, rendering and animation loops will not start.
	 */
	renderPaused?: boolean;

	/**
	 * The background of the scene. Default is transparent.
	 */
	background?: ColorRepresentation | Texture;

	/**
	 * The panorama background to use. This option overrides 'background' option.
	 */
	panorama?: RemoteImage | TextureSource;

	/**
	 * Camera vertical field of view, in degrees. Default is 50.
	 * The distance between the object and the camera is automatically computed.
	 */
	fov?: number;

	/**
	 * Zoom ratio of the player. Default is 0.9.
	 * This value affects the distance between the object and the camera.
	 * When set to 1.0, the top edge of the player's head coincides with the edge of the view.
	 */
	zoom?: number;
}

export class SkinViewer {
	readonly canvas: HTMLCanvasElement;
	readonly scene: Scene;
	readonly camera: PerspectiveCamera;
	readonly renderer: WebGLRenderer;
	playerObject: PlayerObject;
	readonly playerWrapper: Group;
	readonly animations: RootAnimation = new RootAnimation();
	readonly globalLight: AmbientLight = new AmbientLight(0xffffff, 0.4);
	readonly cameraLight: PointLight = new PointLight(0xffffff, 0.6);

	readonly skinCanvas: HTMLCanvasElement;
	readonly capeCanvas: HTMLCanvasElement;
	hatCanvas: HTMLCanvasElement;
	shoulderBuddyCanvas: HTMLCanvasElement;
	hatCanvases: any;
	shoulderBuddyCanvases: any;
	readonly earsCanvas: HTMLCanvasElement;
	private readonly skinTexture: Texture;
	private readonly capeTexture: Texture;
	private readonly hatTexture: Texture;
	private readonly shoulderBuddyTexture: Texture;
	private readonly earsTexture: Texture;

	private hatModel: any;
	private shoulderBuddyModel: any;
	private hatList: any;
	private shoulderBuddyList: any;

	private backgroundTexture: Texture | null = null;

	private _disposed: boolean = false;
	private _renderPaused: boolean = false;
	private _zoom: number;

	private animationID: number | null;
	private onContextLost: (event: Event) => void;
	private onContextRestored: () => void;

	constructor(options: SkinViewerOptions = {}) {
		this.canvas = options.canvas === undefined ? document.createElement("canvas") : options.canvas;

		// texture
		this.skinCanvas = document.createElement("canvas");
		this.skinTexture = new Texture(this.skinCanvas);
		this.skinTexture.magFilter = NearestFilter;
		this.skinTexture.minFilter = NearestFilter;

		this.capeCanvas = document.createElement("canvas");
		this.capeTexture = new Texture(this.capeCanvas);
		this.capeTexture.magFilter = NearestFilter;
		this.capeTexture.minFilter = NearestFilter;

		this.hatCanvas = document.createElement("canvas");
		this.hatTexture = new Texture(this.hatCanvas);
		this.hatTexture.magFilter = NearestFilter;
		this.hatTexture.minFilter = NearestFilter;

		this.hatModel = options.hatModel;


		this.shoulderBuddyCanvas = document.createElement("canvas");
		this.shoulderBuddyTexture = new Texture(this.shoulderBuddyCanvas);
		this.shoulderBuddyTexture.magFilter = NearestFilter;
		this.shoulderBuddyTexture.minFilter = NearestFilter;

		this.shoulderBuddyModel = options.shoulderBuddyModel;

		this.hatCanvases = [null, null, null, null, null, null, null, null, null];
		this.shoulderBuddyCanvases = [null, null, null, null, null, null, null, null, null];

		if (options.hat1Model) this.hatCanvases[0] = {model: options.hat1Model, image: options.hat1Texture};
		if (options.hat2Model) this.hatCanvases[1] = {model: options.hat2Model, image: options.hat2Texture};
		if (options.hat3Model) this.hatCanvases[2] = {model: options.hat3Model, image: options.hat3Texture};
		if (options.hat4Model) this.hatCanvases[3] = {model: options.hat4Model, image: options.hat4Texture};
		if (options.hat5Model) this.hatCanvases[4] = {model: options.hat5Model, image: options.hat5Texture};
		if (options.hat6Model) this.hatCanvases[5] = {model: options.hat6Model, image: options.hat6Texture};
		if (options.hat7Model) this.hatCanvases[6] = {model: options.hat7Model, image: options.hat7Texture};
		if (options.hat8Model) this.hatCanvases[7] = {model: options.hat8Model, image: options.hat8Texture};
		if (options.hat9Model) this.hatCanvases[8] = {model: options.hat9Model, image: options.hat9Texture};

		if (options.shoulderBuddy1Model) this.shoulderBuddyCanvases[0] = {model: options.shoulderBuddy1Model, image: options.shoulderBuddy1Texture};
		if (options.shoulderBuddy2Model) this.shoulderBuddyCanvases[1] = {model: options.shoulderBuddy2Model, image: options.shoulderBuddy2Texture};
		if (options.shoulderBuddy3Model) this.shoulderBuddyCanvases[2] = {model: options.shoulderBuddy3Model, image: options.shoulderBuddy3Texture};
		if (options.shoulderBuddy4Model) this.shoulderBuddyCanvases[3] = {model: options.shoulderBuddy4Model, image: options.shoulderBuddy4Texture};
		if (options.shoulderBuddy5Model) this.shoulderBuddyCanvases[4] = {model: options.shoulderBuddy5Model, image: options.shoulderBuddy5Texture};
		if (options.shoulderBuddy6Model) this.shoulderBuddyCanvases[5] = {model: options.shoulderBuddy6Model, image: options.shoulderBuddy6Texture};
		if (options.shoulderBuddy7Model) this.shoulderBuddyCanvases[6] = {model: options.shoulderBuddy7Model, image: options.shoulderBuddy7Texture};
		if (options.shoulderBuddy8Model) this.shoulderBuddyCanvases[7] = {model: options.shoulderBuddy8Model, image: options.shoulderBuddy8Texture};
		if (options.shoulderBuddy9Model) this.shoulderBuddyCanvases[8] = {model: options.shoulderBuddy9Model, image: options.shoulderBuddy9Texture};

		/*if (options.hatList != undefined) {
			for (var i = 0; i < options.hatList.length; i++) {
				var canvas = document.createElement("canvas");
				var texture = new Texture(canvas);
				texture.magFilter = NearestFilter;
				texture.minFilter = NearestFilter;
				this.hatCanvases[i] = {
					canvas: canvas,
					texture: texture,
					json: options.hatList[i].json,
					image: options.hatList[i].image
				};
			}
		}
		console.log("canvas list:", this.hatCanvases, JSON.stringify(this.hatCanvases));

		if (options.shoulderBuddyList) {
			for (var i = 0; i < this.shoulderBuddyList.length; i++) {
				var canvas = document.createElement("canvas");
				var texture = new Texture(canvas);
				texture.magFilter = NearestFilter;
				texture.minFilter = NearestFilter;
				this.shoulderBuddyCanvases[i] = {
					canvas: canvas,
					texture: texture,
					json: this.shoulderBuddyList[i].json,
					image: options.shoulderBuddyList[i].image
				};
			}
		}*/

		this.earsCanvas = document.createElement("canvas");
		this.earsTexture = new Texture(this.earsCanvas);
		this.earsTexture.magFilter = NearestFilter;
		this.earsTexture.minFilter = NearestFilter;

		this.scene = new Scene();

		this.camera = new PerspectiveCamera();
		this.camera.add(this.cameraLight);
		this.scene.add(this.camera);
		this.scene.add(this.globalLight);

		this.renderer = new WebGLRenderer({
			canvas: this.canvas,
			alpha: options.alpha !== false, // default: true
			preserveDrawingBuffer: options.preserveDrawingBuffer === true // default: false

		});
		this.renderer.setPixelRatio(window.devicePixelRatio);

		this.playerObject = new PlayerObject(this.skinTexture, this.capeTexture, this.hatTexture, this.hatModel, this.shoulderBuddyTexture, this.shoulderBuddyModel, this.earsTexture, this.hatCanvases, this.shoulderBuddyCanvases);
		this.playerObject.name = "player";
		this.playerObject.skin.visible = false;
		this.playerObject.cape.visible = false;
		this.playerObject.hat.visible = false;
		this.playerObject.shoulderBuddy.visible = false;
		this.playerWrapper = new Group();
		this.playerWrapper.add(this.playerObject);
		this.scene.add(this.playerWrapper);

		if (options.skin !== undefined) {
			this.loadSkin(options.skin, {
				model: options.model,
				ears: options.ears === "current-skin"
			});
		}
		if (options.cape !== undefined) {
			if (options.backEquipment) {
				this.loadCape(options.cape, {backEquipment: options.backEquipment});
			} else {
				this.loadCape(options.cape);
			}
		}
		if (options.hatTexture !== undefined && options.hatTexture != null) {
			this.loadHat(options.hatTexture, options.hatModel);
		}
		if (options.shoulderBuddyTexture !== undefined) {
			this.loadShoulderBuddy(options.shoulderBuddyTexture, options.shoulderBuddyModel);
		}

		function handleCustomCanvas(canvas: any, src: any, model: any) {
			var image = new Image();
			image.src = src;
			image.onload = function() {
				loadCustomModelToCanvas(canvas, image);
				model.visible = true;
			}
		}

		/*for (var i = 0; i < this.hatCanvases.length; i++) {
			console.log("image:" + options.hatList[i].image);
			handleCustomCanvas(this.hatCanvases[i].canvas, options.hatList[i].image, this.playerObject.hats[i]);
		}*/

		if (options.ears !== undefined && options.ears !== "current-skin") {
			this.loadEars(options.ears.source, {
				textureType: options.ears.textureType
			});
		}
		if (options.width !== undefined) {
			this.width = options.width;
		}
		if (options.height !== undefined) {
			this.height = options.height;
		}
		if (options.background !== undefined) {
			this.background = options.background;
		}
		if (options.panorama !== undefined) {
			this.loadPanorama(options.panorama);
		}
		this.camera.position.z = 1;
		this._zoom = options.zoom === undefined ? 0.9 : options.zoom;
		this.fov = options.fov === undefined ? 50 : options.fov;

		if (options.renderPaused === true) {
			this._renderPaused = true;
			this.animationID = null;
		} else {
			this.animationID = window.requestAnimationFrame(() => this.draw());
		}

		this.onContextLost = (event: Event) => {
			event.preventDefault();
			if (this.animationID !== null) {
				window.cancelAnimationFrame(this.animationID);
				this.animationID = null;
			}
		};

		this.onContextRestored = () => {
			if (!this._renderPaused && !this._disposed && this.animationID === null) {
				this.animationID = window.requestAnimationFrame(() => this.draw());
			}
		};

		this.canvas.addEventListener("webglcontextlost", this.onContextLost, false);
		this.canvas.addEventListener("webglcontextrestored", this.onContextRestored, false);
	}

	loadSkin(empty: null): void;
	loadSkin<S extends TextureSource | RemoteImage>(
		source: S,
		options?: SkinLoadOptions
	): S extends TextureSource ? void : Promise<void>;

	loadSkin(
		source: TextureSource | RemoteImage | null,
		options: SkinLoadOptions = {}
	): void | Promise<void> {
		if (source === null) {
			this.resetSkin();

		} else if (isTextureSource(source)) {
			loadSkinToCanvas(this.skinCanvas, source);
			this.skinTexture.needsUpdate = true;

			if (options.model === undefined || options.model === "auto-detect") {
				this.playerObject.skin.modelType = inferModelType(this.skinCanvas);
			} else {
				this.playerObject.skin.modelType = options.model;
			}

			if (options.makeVisible !== false) {
				this.playerObject.skin.visible = true;
			}

			if (options.ears === true || options.ears == "load-only") {
				loadEarsToCanvasFromSkin(this.earsCanvas, source);
				this.earsTexture.needsUpdate = true;
				if (options.ears === true) {
					this.playerObject.ears.visible = true;
				}
			}

		} else {
			return loadImage(source).then(image => this.loadSkin(image, options));
		}
	}

	resetSkin(): void {
		this.playerObject.skin.visible = false;
	}

	loadCape(empty: null): void;
	loadCape<S extends TextureSource | RemoteImage>(
		source: S,
		options?: CapeLoadOptions
	): S extends TextureSource ? void : Promise<void>;

	loadCape(
		source: TextureSource | RemoteImage | null,
		options: CapeLoadOptions = {}
	): void | Promise<void> {
		if (source === null) {
			this.resetCape();

		} else if (isTextureSource(source)) {
			loadCapeToCanvas(this.capeCanvas, source);
			this.capeTexture.needsUpdate = true;

			if (options.makeVisible !== false) {
				this.playerObject.backEquipment = options.backEquipment === undefined ? "cape" : options.backEquipment;
			}

		} else {
			return loadImage(source).then(image => this.loadCape(image, options));
		}
	}

	resetCape(): void {
		this.playerObject.backEquipment = null;
	}

	loadHat(empty: null): void;
	loadHat<S extends TextureSource | RemoteImage>(
		source: S,
		options?: CustomModelOptions
	): S extends TextureSource ? void : Promise<void>;

	loadHat(
		source: TextureSource | RemoteImage | null,
		options: CustomModelOptions = {}
	): void | Promise<void> {
		
		if (source === null) {
			this.resetHat();

		} else if (isTextureSource(source)) {
			loadCustomModelToCanvas(this.hatCanvas, source);
			this.hatTexture.needsUpdate = true;
			this.playerObject.hat.visible = true;

		} else {
			return loadImage(source).then(image => this.loadHat(image, options));
		}
	}

	setNewHat(source: TextureSource | RemoteImage | null, json: any): void {
		if (source === null) {
			this.resetHat();
		} else if (isTextureSource(source)) {
			this.hatModel = json;
			loadCustomModelToCanvas(this.hatCanvas, source);
		} else {
			loadImage(source).then(image => this.setNewHat(image, json));
		}
	}

	resetHat(): void {
		this.playerObject.hat.visible = false;
	}

	loadSpecificHat(
		source: TextureSource | RemoteImage | null,
		i: any,
		options: CustomModelOptions = {}
	): void | Promise<void> {
		//this.resetAllHats();
		if (source === null) return;

		if (isTextureSource(source)) {
			//this.hatModel = json;
			loadCustomModelToCanvas(this.hatCanvases[i].canvas, source);
			this.hatTexture.needsUpdate = true;
			this.playerObject.hats[i].visible = true;

		} else {
			return loadImage(source).then(image => this.loadSpecificHat(image, i, options));
		}
	}

	resetAllHats(toShow: any): void {
		if (this.playerObject.hat1) this.playerObject.hat1.visible = toShow == 1;
		if (this.playerObject.hat2) this.playerObject.hat2.visible = toShow == 2;
		if (this.playerObject.hat3) this.playerObject.hat3.visible = toShow == 3;
		if (this.playerObject.hat4) this.playerObject.hat4.visible = toShow == 4;
		if (this.playerObject.hat5) this.playerObject.hat5.visible = toShow == 5;
		if (this.playerObject.hat6) this.playerObject.hat6.visible = toShow == 6;
		if (this.playerObject.hat7) this.playerObject.hat7.visible = toShow == 7;
		if (this.playerObject.hat8) this.playerObject.hat8.visible = toShow == 8;
		if (this.playerObject.hat9) this.playerObject.hat9.visible = toShow == 9;
	}

	loadShoulderBuddy(empty: null): void;
	loadShoulderBuddy<S extends TextureSource | RemoteImage>(
		source: S,
		options?: CustomModelOptions
	): S extends TextureSource ? void : Promise<void>;

	loadShoulderBuddy(
		source: TextureSource | RemoteImage | null,
		options: CustomModelOptions = {}
	): void | Promise<void> {
		if (source === null) {
			this.resetShoulderBuddy();

		} else if (isTextureSource(source)) {
			loadCustomModelToCanvas(this.shoulderBuddyCanvas, source);
			this.shoulderBuddyTexture.needsUpdate = true;
			this.playerObject.shoulderBuddy.visible = true;
		} else {
			return loadImage(source).then(image => this.loadShoulderBuddy(image, options));
		}
	}

	resetShoulderBuddy(): void {
		this.playerObject.shoulderBuddy.visible = false;
	}

	resetAllShoulderBuddies(toShow: any): void {
		if (this.playerObject.shoulderBuddy1) this.playerObject.shoulderBuddy1.visible = toShow == 1;
		if (this.playerObject.shoulderBuddy2) this.playerObject.shoulderBuddy2.visible = toShow == 2;
		if (this.playerObject.shoulderBuddy3) this.playerObject.shoulderBuddy3.visible = toShow == 3;
		if (this.playerObject.shoulderBuddy4) this.playerObject.shoulderBuddy4.visible = toShow == 4;
		if (this.playerObject.shoulderBuddy5) this.playerObject.shoulderBuddy5.visible = toShow == 5;
		if (this.playerObject.shoulderBuddy6) this.playerObject.shoulderBuddy6.visible = toShow == 6;
		if (this.playerObject.shoulderBuddy7) this.playerObject.shoulderBuddy7.visible = toShow == 7;
		if (this.playerObject.shoulderBuddy8) this.playerObject.shoulderBuddy8.visible = toShow == 8;
		if (this.playerObject.shoulderBuddy9) this.playerObject.shoulderBuddy9.visible = toShow == 9;
	}

	loadEars(empty: null): void;
	loadEars<S extends TextureSource | RemoteImage>(
		source: S,
		options?: EarsLoadOptions
	): S extends TextureSource ? void : Promise<void>;

	loadEars(
		source: TextureSource | RemoteImage | null,
		options: EarsLoadOptions = {}
	): void | Promise<void> {
		if (source === null) {
			this.resetEars();

		} else if (isTextureSource(source)) {
			if (options.textureType === "skin") {
				loadEarsToCanvasFromSkin(this.earsCanvas, source);
			} else {
				loadEarsToCanvas(this.earsCanvas, source);
			}
			this.earsTexture.needsUpdate = true;

			if (options.makeVisible !== false) {
				this.playerObject.ears.visible = true;
			}

		} else {
			return loadImage(source).then(image => this.loadEars(image, options));
		}
	}

	resetEars(): void {
		this.playerObject.ears.visible = false;
	}

	loadPanorama<S extends TextureSource | RemoteImage>(
		source: S
	): S extends TextureSource ? void : Promise<void> {
		return this.loadBackground(source, EquirectangularReflectionMapping);
	}

	loadBackground<S extends TextureSource | RemoteImage>(
		source: S,
		mapping?: Mapping
	): S extends TextureSource ? void : Promise<void>;

	loadBackground<S extends TextureSource | RemoteImage>(
		source: S,
		mapping?: Mapping
	): void | Promise<void> {
		if (isTextureSource(source)) {
			if (this.backgroundTexture !== null) {
				this.backgroundTexture.dispose();
			}
			this.backgroundTexture = new Texture();
			this.backgroundTexture.image = source;
			if (mapping !== undefined) {
				this.backgroundTexture.mapping = mapping;
			}
			this.backgroundTexture.needsUpdate = true;
			this.scene.background = this.backgroundTexture;
		} else {
			return loadImage(source).then(image => this.loadBackground(image, mapping));
		}
	}

	private draw(): void {
		this.animations.runAnimationLoop(this.playerObject);
		this.render();
		this.animationID = window.requestAnimationFrame(() => this.draw());
	}

	/**
	* Renders the scene to the canvas.
	* This method does not change the animation progress.
	*/
	render(): void {
		this.renderer.render(this.scene, this.camera);
	}

	setSize(width: number, height: number): void {
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(width, height);
	}

	dispose(): void {
		this._disposed = true;

		this.canvas.removeEventListener("webglcontextlost", this.onContextLost, false);
		this.canvas.removeEventListener("webglcontextrestored", this.onContextRestored, false);

		if (this.animationID !== null) {
			window.cancelAnimationFrame(this.animationID);
			this.animationID = null;
		}

		this.renderer.dispose();
		this.skinTexture.dispose();
		this.capeTexture.dispose();
		this.hatTexture.dispose();
		if (this.backgroundTexture !== null) {
			this.backgroundTexture.dispose();
			this.backgroundTexture = null;
		}
	}

	get disposed(): boolean {
		return this._disposed;
	}

	/**
	 * Whether rendering and animations are paused.
	 * Setting this property to true will stop both rendering and animation loops.
	 * Setting it back to false will resume them.
	 */
	get renderPaused(): boolean {
		return this._renderPaused;
	}

	set renderPaused(value: boolean) {
		this._renderPaused = value;

		if (this._renderPaused && this.animationID !== null) {
			window.cancelAnimationFrame(this.animationID);
			this.animationID = null;
		} else if (!this._renderPaused && !this._disposed && !this.renderer.getContext().isContextLost() && this.animationID == null) {
			this.animationID = window.requestAnimationFrame(() => this.draw());
		}
	}

	get width(): number {
		return this.renderer.getSize(new Vector2()).width;
	}

	set width(newWidth: number) {
		this.setSize(newWidth, this.height);
	}

	get height(): number {
		return this.renderer.getSize(new Vector2()).height;
	}

	set height(newHeight: number) {
		this.setSize(this.width, newHeight);
	}

	get background(): null | Color | Texture {
		return this.scene.background;
	}

	set background(value: null | ColorRepresentation | Texture) {
		if (value === null || value instanceof Color || value instanceof Texture) {
			this.scene.background = value;
		} else {
			this.scene.background = new Color(value);
		}
		if (this.backgroundTexture !== null && value !== this.backgroundTexture) {
			this.backgroundTexture.dispose();
			this.backgroundTexture = null;
		}
	}

	adjustCameraDistance(): void {
		let distance = 4.5 + 16.5 / Math.tan(this.fov / 180 * Math.PI / 2) / this.zoom;

		// limit distance between 10 ~ 256 (default min / max distance of OrbitControls)
		if (distance < 10) {
			distance = 10;
		} else if (distance > 256) {
			distance = 256;
		}

		this.camera.position.multiplyScalar(distance / this.camera.position.length());
		this.camera.updateProjectionMatrix();
	}

	get fov(): number {
		return this.camera.fov;
	}

	set fov(value: number) {
		this.camera.fov = value;
		this.adjustCameraDistance();
	}

	get zoom(): number {
		return this._zoom;
	}

	set zoom(value: number) {
		this._zoom = value;
		this.adjustCameraDistance();
	}
}
