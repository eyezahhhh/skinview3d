import { ModelType } from "skinview-utils";
import { BoxGeometry, BufferAttribute, DoubleSide, FrontSide, Group, Matrix4, Mesh, MeshStandardMaterial, Object3D, Texture, Vector2, Vector3 } from "three";

function setUVs(box: BoxGeometry, u: number, v: number, width: number, height: number, depth: number, textureWidth: number, textureHeight: number): void {
	const toFaceVertices = (x1: number, y1: number, x2: number, y2: number) => [
		new Vector2(x1 / textureWidth, 1.0 - y2 / textureHeight),
		new Vector2(x2 / textureWidth, 1.0 - y2 / textureHeight),
		new Vector2(x2 / textureWidth, 1.0 - y1 / textureHeight),
		new Vector2(x1 / textureWidth, 1.0 - y1 / textureHeight)
	];

	const top = toFaceVertices(u + depth, v, u + width + depth, v + depth);
	const bottom = toFaceVertices(u + width + depth, v, u + width * 2 + depth, v + depth);
	const left = toFaceVertices(u, v + depth, u + depth, v + depth + height);
	const front = toFaceVertices(u + depth, v + depth, u + width + depth, v + depth + height);
	const right = toFaceVertices(u + width + depth, v + depth, u + width + depth * 2, v + height + depth);
	const back = toFaceVertices(u + width + depth * 2, v + depth, u + width * 2 + depth * 2, v + height + depth);

	const uvAttr = box.attributes.uv as BufferAttribute;
	uvAttr.copyVector2sArray([
		right[3], right[2], right[0], right[1],
		left[3], left[2], left[0], left[1],
		top[3], top[2], top[0], top[1],
		bottom[0], bottom[1], bottom[3], bottom[2],
		front[3], front[2], front[0], front[1],
		back[3], back[2], back[0], back[1]
	]);
	uvAttr.needsUpdate = true;
}

function setSkinUVs(box: BoxGeometry, u: number, v: number, width: number, height: number, depth: number): void {
	setUVs(box, u, v, width, height, depth, 64, 64);
}

function setCapeUVs(box: BoxGeometry, u: number, v: number, width: number, height: number, depth: number): void {
	setUVs(box, u, v, width, height, depth, 64, 32);
}

function rotateArray<T>(arr: T[], shift: number) {
	let original: T[] = [...arr];

	for (let i = 0; i < arr.length; ++i) {
		arr[i] = original[(i + shift) % arr.length];
	}

	return arr;
}

function setJsonUVs(box: BoxGeometry, faceUVs: any) {
	//console.log("FaceUVs: ", faceUVs);

	const toFaceVertices = (face: {uv: number[], rotation: number | undefined}) => {
		let result = [
			new Vector2(face.uv[0] / 16, 1.0 - face.uv[3] / 16),
			new Vector2(face.uv[2] / 16, 1.0 - face.uv[3] / 16),
			new Vector2(face.uv[2] / 16, 1.0 - face.uv[1] / 16),
			new Vector2(face.uv[0] / 16, 1.0 - face.uv[1] / 16)
		]

		if (face.rotation == undefined) face.rotation = 0;

		result = rotateArray(result, Math.floor(face.rotation / 90));
		
		return result;
	};

	let nth = toFaceVertices(faceUVs.north);
	let est = toFaceVertices(faceUVs.east);
	let sth = toFaceVertices(faceUVs.south);
	let wst = toFaceVertices(faceUVs.west);
	let up = toFaceVertices(faceUVs.up);
	let down = toFaceVertices(faceUVs.down);

	const uvAttr = box.attributes.uv as BufferAttribute;
	uvAttr.copyVector2sArray([
		est[3], est[2], est[0], est[1],
		wst[3], wst[2], wst[0], wst[1],
		up[3], up[2], up[0], up[1],
		down[3], down[2], down[0], down[1],
		sth[3], sth[2], sth[0], sth[1],
		nth[3], nth[2], nth[0], nth[1]
	]);
	uvAttr.needsUpdate = true;
}

/**
 * Notice that innerLayer and outerLayer may NOT be the direct children of the Group.
 */
export class BodyPart extends Group {
	constructor(
		readonly innerLayer: Object3D,
		readonly outerLayer: Object3D
	) {
		super();
		innerLayer.name = "inner";
		outerLayer.name = "outer";
	}
}

export class SkinObject extends Group {

	// body parts
	head: BodyPart;
	readonly body: BodyPart;
	readonly rightArm: BodyPart;
	readonly leftArm: BodyPart;
	readonly rightLeg: BodyPart;
	readonly leftLeg: BodyPart;

	private modelListeners: Array<() => void> = []; // called when model(slim property) is changed
	private slim = false;

	constructor(texture: Texture) {
		super();

		const layer1Material = new MeshStandardMaterial({
			map: texture,
			side: FrontSide
		});
		const layer2Material = new MeshStandardMaterial({
			map: texture,
			side: DoubleSide,
			transparent: true,
			alphaTest: 1e-5
		});

		const layer1MaterialBiased = layer1Material.clone();
		layer1MaterialBiased.polygonOffset = true;
		layer1MaterialBiased.polygonOffsetFactor = 1.0;
		layer1MaterialBiased.polygonOffsetUnits = 1.0;

		const layer2MaterialBiased = layer2Material.clone();
		layer2MaterialBiased.polygonOffset = true;
		layer2MaterialBiased.polygonOffsetFactor = 1.0;
		layer2MaterialBiased.polygonOffsetUnits = 1.0;

		// Head
		const headBox = new BoxGeometry(8, 8, 8);
		setSkinUVs(headBox, 0, 0, 8, 8, 8);
		const headMesh = new Mesh(headBox, layer1Material);

		const head2Box = new BoxGeometry(9, 9, 9);
		setSkinUVs(head2Box, 32, 0, 8, 8, 8);
		const head2Mesh = new Mesh(head2Box, layer2Material);

		this.head = new BodyPart(headMesh, head2Mesh);
		this.head.name = "head";
		this.head.add(headMesh, head2Mesh);
		headMesh.position.y = 4;
		head2Mesh.position.y = 4;
		this.add(this.head);

		// Body
		const bodyBox = new BoxGeometry(8, 12, 4);
		setSkinUVs(bodyBox, 16, 16, 8, 12, 4);
		const bodyMesh = new Mesh(bodyBox, layer1Material);

		const body2Box = new BoxGeometry(8.5, 12.5, 4.5);
		setSkinUVs(body2Box, 16, 32, 8, 12, 4);
		const body2Mesh = new Mesh(body2Box, layer2Material);

		this.body = new BodyPart(bodyMesh, body2Mesh);
		this.body.name = "body";
		this.body.add(bodyMesh, body2Mesh);
		this.body.position.y = -6;
		this.add(this.body);

		// Right Arm
		const rightArmBox = new BoxGeometry();
		const rightArmMesh = new Mesh(rightArmBox, layer1MaterialBiased);
		this.modelListeners.push(() => {
			rightArmMesh.scale.x = this.slim ? 3 : 4;
			rightArmMesh.scale.y = 12;
			rightArmMesh.scale.z = 4;
			setSkinUVs(rightArmBox, 40, 16, this.slim ? 3 : 4, 12, 4);
		});

		const rightArm2Box = new BoxGeometry();
		const rightArm2Mesh = new Mesh(rightArm2Box, layer2MaterialBiased);
		this.modelListeners.push(() => {
			rightArm2Mesh.scale.x = this.slim ? 3.5 : 4.5;
			rightArm2Mesh.scale.y = 12.5;
			rightArm2Mesh.scale.z = 4.5;
			setSkinUVs(rightArm2Box, 40, 32, this.slim ? 3 : 4, 12, 4);
		});

		const rightArmPivot = new Group();
		rightArmPivot.add(rightArmMesh, rightArm2Mesh);
		this.modelListeners.push(() => {
			rightArmPivot.position.x = this.slim ? -.5 : -1;
		});
		rightArmPivot.position.y = -4;

		this.rightArm = new BodyPart(rightArmMesh, rightArm2Mesh);
		this.rightArm.name = "rightArm";
		this.rightArm.add(rightArmPivot);
		this.rightArm.position.x = -5;
		this.rightArm.position.y = -2;
		this.add(this.rightArm);

		// Left Arm
		const leftArmBox = new BoxGeometry();
		const leftArmMesh = new Mesh(leftArmBox, layer1MaterialBiased);
		this.modelListeners.push(() => {
			leftArmMesh.scale.x = this.slim ? 3 : 4;
			leftArmMesh.scale.y = 12;
			leftArmMesh.scale.z = 4;
			setSkinUVs(leftArmBox, 32, 48, this.slim ? 3 : 4, 12, 4);
		});

		const leftArm2Box = new BoxGeometry();
		const leftArm2Mesh = new Mesh(leftArm2Box, layer2MaterialBiased);
		this.modelListeners.push(() => {
			leftArm2Mesh.scale.x = this.slim ? 3.5 : 4.5;
			leftArm2Mesh.scale.y = 12.5;
			leftArm2Mesh.scale.z = 4.5;
			setSkinUVs(leftArm2Box, 48, 48, this.slim ? 3 : 4, 12, 4);
		});

		const leftArmPivot = new Group();
		leftArmPivot.add(leftArmMesh, leftArm2Mesh);
		this.modelListeners.push(() => {
			leftArmPivot.position.x = this.slim ? 0.5 : 1;
		});
		leftArmPivot.position.y = -4;

		this.leftArm = new BodyPart(leftArmMesh, leftArm2Mesh);
		this.leftArm.name = "leftArm";
		this.leftArm.add(leftArmPivot);
		this.leftArm.position.x = 5;
		this.leftArm.position.y = -2;
		this.add(this.leftArm);

		// Right Leg
		const rightLegBox = new BoxGeometry(4, 12, 4);
		setSkinUVs(rightLegBox, 0, 16, 4, 12, 4);
		const rightLegMesh = new Mesh(rightLegBox, layer1MaterialBiased);

		const rightLeg2Box = new BoxGeometry(4.5, 12.5, 4.5);
		setSkinUVs(rightLeg2Box, 0, 32, 4, 12, 4);
		const rightLeg2Mesh = new Mesh(rightLeg2Box, layer2MaterialBiased);

		const rightLegPivot = new Group();
		rightLegPivot.add(rightLegMesh, rightLeg2Mesh);
		rightLegPivot.position.y = -6;

		this.rightLeg = new BodyPart(rightLegMesh, rightLeg2Mesh);
		this.rightLeg.name = "rightLeg";
		this.rightLeg.add(rightLegPivot);
		this.rightLeg.position.x = -1.9;
		this.rightLeg.position.y = -12;
		this.rightLeg.position.z = -.1;
		this.add(this.rightLeg);

		// Left Leg
		const leftLegBox = new BoxGeometry(4, 12, 4);
		setSkinUVs(leftLegBox, 16, 48, 4, 12, 4);
		const leftLegMesh = new Mesh(leftLegBox, layer1MaterialBiased);

		const leftLeg2Box = new BoxGeometry(4.5, 12.5, 4.5);
		setSkinUVs(leftLeg2Box, 0, 48, 4, 12, 4);
		const leftLeg2Mesh = new Mesh(leftLeg2Box, layer2MaterialBiased);

		const leftLegPivot = new Group();
		leftLegPivot.add(leftLegMesh, leftLeg2Mesh);
		leftLegPivot.position.y = -6;

		this.leftLeg = new BodyPart(leftLegMesh, leftLeg2Mesh);
		this.leftLeg.name = "leftLeg";
		this.leftLeg.add(leftLegPivot);
		this.leftLeg.position.x = 1.9;
		this.leftLeg.position.y = -12;
		this.leftLeg.position.z = -.1;
		this.add(this.leftLeg);

		this.modelType = "default";
	}

	get modelType(): ModelType {
		return this.slim ? "slim" : "default";
	}

	set modelType(value: ModelType) {
		this.slim = value === "slim";
		this.modelListeners.forEach(listener => listener());
	}

	private getBodyParts(): Array<BodyPart> {
		return this.children.filter(it => it instanceof BodyPart) as Array<BodyPart>;
	}

	setInnerLayerVisible(value: boolean): void {
		this.getBodyParts().forEach(part => part.innerLayer.visible = value);
	}

	setOuterLayerVisible(value: boolean): void {
		this.getBodyParts().forEach(part => part.outerLayer.visible = value);
	}
}

export class CapeObject extends Group {

	readonly cape: Mesh;

	constructor(texture: Texture) {
		super();

		const capeMaterial = new MeshStandardMaterial({
			map: texture,
			side: DoubleSide,
			transparent: true,
			alphaTest: 1e-5
		});

		// +z (front) - inside of cape
		// -z (back) - outside of cape
		const capeBox = new BoxGeometry(10, 16, 1);
		setCapeUVs(capeBox, 0, 0, 10, 16, 1);
		this.cape = new Mesh(capeBox, capeMaterial);
		this.cape.position.y = -8;
		this.cape.position.z = .5;
		this.add(this.cape);
	}
}

export class JsonModelObject extends Group {
	//readonly hat: Mesh;

	constructor(texture: any, json: any) {
		super();

		//const elements = json.elements;
		//if (!elements.length) throw new Error("invalid json model");

		console.log(texture, json);

		/*const hatBox = new BoxGeometry(10, 10, 10);
		setUVs(hatBox, 0, 0, 5, 5, 5, 32, 32);
		this.hat = new Mesh(hatBox, hatMaterial);
		this.hat.position.y = -8;
		this.hat.position.z = 0.5;
		this.add(this.hat);*/
		

		this.updateModel(json, texture);
	}

	updateModel(json: any, texture: any): void {
		if (!json || !json.elements) return;

		const hatMaterial = new MeshStandardMaterial({
			map: texture,
			side: DoubleSide,
			transparent: true,
			alphaTest: 1e-5
		});

		for (var i = 0; i < json.elements.length; i++) {
			var element = json.elements[i];
			console.log(element);
			//console.log("found element:", element);
			var xDif = element.to[0] - element.from[0];
			var yDif = element.to[1] - element.from[1];
			var zDif = element.to[2] - element.from[2];
			var xPos = element.from[0];
			var yPos = element.from[1];
			var zPos = element.from[2];
			//if (xDif < 0) xPos += xDif;
			//if (yDif < 0) yPos += yDif;
			//if (zDif < 0) zPos += zDif;
			//console.log(xPos, yPos, zPos);
			//console.log("Size: ", xDif, yDif, zDif, " At: ", xPos, yPos, zPos);
			
			var box = new BoxGeometry(Math.abs(xDif), Math.abs(yDif), Math.abs(zDif));
			let hXdif = 0.5*xDif;
			let hYdif = 0.5*yDif;
			let hZdif = 0.5*zDif;
			box.translate(hXdif, hYdif, hZdif); // the box's origin is at the corner.
			box.translate(xPos, yPos, zPos); // you know what I'm just gonna make the geometry centred at the origin in the bb model
			setJsonUVs(box, element.faces);

			var mesh = new Mesh(box, hatMaterial);

			if (element.rotation != undefined) {
				console.log(element.name, " At Rotation ", element.rotation);
				let angle: number = element.rotation.angle * Math.PI / 180.0;
				let axisStr : string = element.rotation.axis;
				let axis : Vector3;
				let pivotAny = element.rotation.origin;
				let pivot : Vector3 = new Vector3(pivotAny[0], pivotAny[1], pivotAny[2]);

				switch (axisStr) {
				case "x":
					axis = new Vector3(1, 0, 0);
					break;
				case "y":
					axis = new Vector3(0, 1, 0);
					break;
				case "z":
					axis = new Vector3(0, 0, 1);
					break;
				default:
					axis = new Vector3(0, 0, 0);
					break;
				}

				mesh.position.sub(pivot);
				mesh.position.applyAxisAngle(axis, angle);
				mesh.position.add(pivot);
				
				mesh.rotateOnAxis(axis, angle);

				// if this is `angle` it's in the right place. if this is `-angle` it has the right rotation. total spain. therefore this monstrosity:
				// mesh.rotateOnAxis(axis, angle);
				// let cachedPos: Vector3 = new Vector3().copy(mesh.position);
				// mesh.rotateOnAxis(axis, -2 * angle);
				// mesh.position.copy(cachedPos);
				// console.log("CP ", cachedPos, "MP ", mesh.position);

				/*mesh.matrix.multiply(new Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z));
				mesh.matrix.multiply(new Matrix4().makeRotationAxis(axis, angle));
				mesh.matrix.multiply(new Matrix4().makeTranslation(pivot.x, pivot.y, pivot.z));*/
			}

			/*console.log(
				"Box Dimensions (WHD):", box.parameters.width, box.parameters.height, box.parameters.depth,
				"Mesh Scale: ", mesh.scale.x, mesh.scale.y, mesh.scale.z,
				" At: ", mesh.position.x, mesh.position.y, mesh.position.z);*/
			
			this.add(mesh);
		}
	}
}

export class ElytraObject extends Group {

	readonly leftWing: Group;
	readonly rightWing: Group;

	constructor(texture: Texture) {
		super();

		const elytraMaterial = new MeshStandardMaterial({
			map: texture,
			side: DoubleSide,
			transparent: true,
			alphaTest: 1e-5
		});

		const leftWingBox = new BoxGeometry(12, 22, 4);
		setCapeUVs(leftWingBox, 22, 0, 10, 20, 2);
		const leftWingMesh = new Mesh(leftWingBox, elytraMaterial);
		leftWingMesh.position.x = -5;
		leftWingMesh.position.y = -10;
		leftWingMesh.position.z = -1;
		this.leftWing = new Group();
		this.leftWing.add(leftWingMesh);
		this.add(this.leftWing);

		const rightWingBox = new BoxGeometry(12, 22, 4);
		setCapeUVs(rightWingBox, 22, 0, 10, 20, 2);
		const rightWingMesh = new Mesh(rightWingBox, elytraMaterial);
		rightWingMesh.scale.x = -1;
		rightWingMesh.position.x = 5;
		rightWingMesh.position.y = -10;
		rightWingMesh.position.z = -1;
		this.rightWing = new Group();
		this.rightWing.add(rightWingMesh);
		this.add(this.rightWing);

		this.leftWing.position.x = 5;
		this.leftWing.rotation.x = .2617994;
		this.leftWing.rotation.y = .01; // to avoid z-fighting
		this.leftWing.rotation.z = .2617994;
		this.updateRightWing();
	}

	/**
	 * Mirrors the position & rotation of left wing,
	 * and apply them to the right wing.
	 */
	updateRightWing(): void {
		this.rightWing.position.x = -this.leftWing.position.x;
		this.rightWing.position.y = this.leftWing.position.y;
		this.rightWing.rotation.x = this.leftWing.rotation.x;
		this.rightWing.rotation.y = -this.leftWing.rotation.y;
		this.rightWing.rotation.z = -this.leftWing.rotation.z;
	}
}

export class EarsObject extends Group {

	readonly rightEar: Mesh;
	readonly leftEar: Mesh;

	constructor(texture: Texture) {
		super();

		const material = new MeshStandardMaterial({
			map: texture,
			side: FrontSide
		});
		const earBox = new BoxGeometry(8, 8, 4 / 3);
		setUVs(earBox, 0, 0, 6, 6, 1, 14, 7);

		this.rightEar = new Mesh(earBox, material);
		this.rightEar.name = "rightEar";
		this.rightEar.position.x = -6;
		this.add(this.rightEar);

		this.leftEar = new Mesh(earBox, material);
		this.leftEar.name = "leftEar";
		this.leftEar.position.x = 6;
		this.add(this.leftEar);
	}
}

export type BackEquipment = "cape" | "elytra";

export class PlayerObject extends Group {

	readonly skin: SkinObject;
	readonly cape: CapeObject;
	readonly elytra: ElytraObject;
	readonly ears: EarsObject;
	hat: JsonModelObject;
	hat1: JsonModelObject | null;
	hat2: JsonModelObject | null;
	hat3: JsonModelObject | null;
	hat4: JsonModelObject | null;
	hat5: JsonModelObject | null;
	hat6: JsonModelObject | null;
	hat7: JsonModelObject | null;
	hat8: JsonModelObject | null;
	hat9: JsonModelObject | null;

	
	shoulderBuddy1: JsonModelObject | null;
	shoulderBuddy2: JsonModelObject | null;
	shoulderBuddy3: JsonModelObject | null;
	shoulderBuddy4: JsonModelObject | null;
	shoulderBuddy5: JsonModelObject | null;
	shoulderBuddy6: JsonModelObject | null;
	shoulderBuddy7: JsonModelObject | null;
	shoulderBuddy8: JsonModelObject | null;
	shoulderBuddy9: JsonModelObject | null;

	shoulderBuddy: JsonModelObject;
	hats: any;
	shoulderBuddies: any;

	constructor(skinTexture: Texture, capeTexture: Texture, hatTexture: Texture, hatModel: any, shoulderBuddyTexture: Texture, shoulderBuddyModel: any, earsTexture: Texture, hatCanvases: any, shoulderBuddyCanvases: any) {
		super();

		this.skin = new SkinObject(skinTexture);
		this.skin.name = "skin";
		this.skin.position.y = 8;
		this.add(this.skin);

		this.cape = new CapeObject(capeTexture);
		this.cape.name = "cape";
		this.cape.position.y = 8;
		this.cape.position.z = -2;
		this.cape.rotation.x = 10.8 * Math.PI / 180;
		this.cape.rotation.y = Math.PI;
		this.add(this.cape);

		this.elytra = new ElytraObject(capeTexture);
		this.elytra.name = "elytra";
		this.elytra.position.y = 8;
		this.elytra.position.z = -2;
		this.elytra.visible = false;
		this.add(this.elytra);

		this.ears = new EarsObject(earsTexture);
		this.ears.name = "ears";
		this.ears.position.y = 10;
		this.ears.position.z = 2 / 3;
		this.ears.visible = false;
		this.skin.head.add(this.ears);

		this.hat = new JsonModelObject(hatTexture, hatModel);
		this.hat.name = "hat";
		this.hat.position.y = 8;
		this.hat.position.x = 8;
		this.hat.position.z = 8;
		this.hat.rotation.y = Math.PI;
		this.skin.head.add(this.hat);

		this.hat1 = null;
		this.hat2 = null;
		this.hat3 = null;
		this.hat4 = null;
		this.hat5 = null;
		this.hat6 = null;
		this.hat7 = null;
		this.hat8 = null;
		this.hat9 = null;

		if (hatCanvases[0] != null) {
			this.hat1 = new JsonModelObject(hatTexture, hatCanvases[0].model);
			this.hat1.name = "hat1";
			this.hat1.position.y = 8;
			this.hat1.position.x = 8;
			this.hat1.position.z = 8;
			this.hat1.rotation.y = Math.PI;
			this.skin.head.add(this.hat1);
		}

		if (hatCanvases[1] != null) {
			this.hat2 = new JsonModelObject(hatTexture, hatCanvases[1].model);
			this.hat2.name = "hat2";
			this.hat2.position.y = 8;
			this.hat2.position.x = 8;
			this.hat2.position.z = 8;
			this.hat2.rotation.y = Math.PI;
			this.skin.head.add(this.hat2);
		}

		if (hatCanvases[2] != null) {
			this.hat3 = new JsonModelObject(hatTexture, hatCanvases[2].model);
			this.hat3.name = "hat3";
			this.hat3.position.y = 8;
			this.hat3.position.x = 8;
			this.hat3.position.z = 8;
			this.hat3.rotation.y = Math.PI;
			this.skin.head.add(this.hat3);
		}

		if (hatCanvases[3] != null) {
			this.hat4 = new JsonModelObject(hatTexture, hatCanvases[3].model);
			this.hat4.name = "hat4";
			this.hat4.position.y = 8;
			this.hat4.position.x = 8;
			this.hat4.position.z = 8;
			this.hat4.rotation.y = Math.PI;
			this.skin.head.add(this.hat4);
		}

		if (hatCanvases[4] != null) {
			this.hat5 = new JsonModelObject(hatTexture, hatCanvases[4].model);
			this.hat5.name = "hat5";
			this.hat5.position.y = 8;
			this.hat5.position.x = 8;
			this.hat5.position.z = 8;
			this.hat5.rotation.y = Math.PI;
			this.skin.head.add(this.hat5);
		}

		if (hatCanvases[5] != null) {
			this.hat6 = new JsonModelObject(hatTexture, hatCanvases[5].model);
			this.hat6.name = "hat6";
			this.hat6.position.y = 8;
			this.hat6.position.x = 8;
			this.hat6.position.z = 8;
			this.hat6.rotation.y = Math.PI;
			this.skin.head.add(this.hat6);
		}

		if (hatCanvases[6] != null) {
			this.hat7 = new JsonModelObject(hatTexture, hatCanvases[6].model);
			this.hat7.name = "hat7";
			this.hat7.position.y = 8;
			this.hat7.position.x = 8;
			this.hat7.position.z = 8;
			this.hat7.rotation.y = Math.PI;
			this.skin.head.add(this.hat7);
		}

		if (hatCanvases[7] != null) {
			this.hat8 = new JsonModelObject(hatTexture, hatCanvases[7].model);
			this.hat8.name = "hat8";
			this.hat8.position.y = 8;
			this.hat8.position.x = 8;
			this.hat8.position.z = 8;
			this.hat8.rotation.y = Math.PI;
			this.skin.head.add(this.hat8);
		}

		if (hatCanvases[8] != null) {
			this.hat8 = new JsonModelObject(hatTexture, hatCanvases[8].model);
			this.hat8.name = "hat8";
			this.hat8.position.y = 8;
			this.hat8.position.x = 8;
			this.hat8.position.z = 8;
			this.hat8.rotation.y = Math.PI;
			this.skin.head.add(this.hat8);
		}





		this.shoulderBuddy1 = null;
		this.shoulderBuddy2 = null;
		this.shoulderBuddy3 = null;
		this.shoulderBuddy4 = null;
		this.shoulderBuddy5 = null;
		this.shoulderBuddy6 = null;
		this.shoulderBuddy7 = null;
		this.shoulderBuddy8 = null;
		this.shoulderBuddy9 = null;

		if (shoulderBuddyCanvases[0] != null) {
			this.shoulderBuddy1 = new JsonModelObject(shoulderBuddyTexture, shoulderBuddyCanvases[0].model);
			this.shoulderBuddy1.name = "shoulderBuddy1";
			this.shoulderBuddy1.position.y = 7.5;
			this.shoulderBuddy1.position.x = 13.8;
			this.shoulderBuddy1.position.z = 8;
			this.shoulderBuddy1.rotation.y = Math.PI;
			this.add(this.shoulderBuddy1);
		}

		if (shoulderBuddyCanvases[1] != null) {
			this.shoulderBuddy2 = new JsonModelObject(shoulderBuddyTexture, shoulderBuddyCanvases[1].model);
			this.shoulderBuddy2.name = "shoulderBuddy2";
			this.shoulderBuddy2.position.y = 7.5;
			this.shoulderBuddy2.position.x = 13.8;
			this.shoulderBuddy2.position.z = 8;
			this.shoulderBuddy2.rotation.y = Math.PI;
			this.add(this.shoulderBuddy2);
		}

		if (shoulderBuddyCanvases[2] != null) {
			this.shoulderBuddy3 = new JsonModelObject(shoulderBuddyTexture, shoulderBuddyCanvases[2].model);
			this.shoulderBuddy3.name = "shoulderBuddy3";
			this.shoulderBuddy3.position.y = 7.5;
			this.shoulderBuddy3.position.x = 13.8;
			this.shoulderBuddy3.position.z = 8;
			this.shoulderBuddy3.rotation.y = Math.PI;
			this.add(this.shoulderBuddy3);
		}

		if (shoulderBuddyCanvases[3] != null) {
			this.shoulderBuddy4 = new JsonModelObject(shoulderBuddyTexture, shoulderBuddyCanvases[3].model);
			this.shoulderBuddy4.name = "shoulderBuddy4";
			this.shoulderBuddy4.position.y = 7.5;
			this.shoulderBuddy4.position.x = 13.8;
			this.shoulderBuddy4.position.z = 8;
			this.shoulderBuddy4.rotation.y = Math.PI;
			this.add(this.shoulderBuddy4);
		}

		if (shoulderBuddyCanvases[4] != null) {
			this.shoulderBuddy5 = new JsonModelObject(shoulderBuddyTexture, shoulderBuddyCanvases[4].model);
			this.shoulderBuddy5.name = "shoulderBuddy5";
			this.shoulderBuddy5.position.y = 7.5;
			this.shoulderBuddy5.position.x = 13.8;
			this.shoulderBuddy5.position.z = 8;
			this.shoulderBuddy5.rotation.y = Math.PI;
			this.add(this.shoulderBuddy5);
		}

		if (shoulderBuddyCanvases[5] != null) {
			this.shoulderBuddy6 = new JsonModelObject(shoulderBuddyTexture, shoulderBuddyCanvases[5].model);
			this.shoulderBuddy6.name = "shoulderBuddy6";
			this.shoulderBuddy6.position.y = 7.5;
			this.shoulderBuddy6.position.x = 13.8;
			this.shoulderBuddy6.position.z = 8;
			this.shoulderBuddy6.rotation.y = Math.PI;
			this.add(this.shoulderBuddy6);
		}

		if (shoulderBuddyCanvases[6] != null) {
			this.shoulderBuddy7 = new JsonModelObject(shoulderBuddyTexture, shoulderBuddyCanvases[6].model);
			this.shoulderBuddy7.name = "shoulderBuddy7";
			this.shoulderBuddy7.position.y = 7.5;
			this.shoulderBuddy7.position.x = 13.8;
			this.shoulderBuddy7.position.z = 8;
			this.shoulderBuddy7.rotation.y = Math.PI;
			this.add(this.shoulderBuddy7);
		}

		if (shoulderBuddyCanvases[7] != null) {
			this.shoulderBuddy8 = new JsonModelObject(shoulderBuddyTexture, shoulderBuddyCanvases[7].model);
			this.shoulderBuddy8.name = "shoulderBuddy8";
			this.shoulderBuddy8.position.y = 7.5;
			this.shoulderBuddy8.position.x = 13.8;
			this.shoulderBuddy8.position.z = 8;
			this.shoulderBuddy8.rotation.y = Math.PI;
			this.add(this.shoulderBuddy8);
		}

		if (shoulderBuddyCanvases[8] != null) {
			this.shoulderBuddy8 = new JsonModelObject(shoulderBuddyTexture, shoulderBuddyCanvases[8].model);
			this.shoulderBuddy8.name = "shoulderBuddy8";
			this.shoulderBuddy8.position.y = 7.5;
			this.shoulderBuddy8.position.x = 13.8;
			this.shoulderBuddy8.position.z = 8;
			this.shoulderBuddy8.rotation.y = Math.PI;
			this.add(this.shoulderBuddy8);
		}






		this.shoulderBuddy = new JsonModelObject(shoulderBuddyTexture, shoulderBuddyModel);
		this.shoulderBuddy.name = "shoulderbuddy";
		this.shoulderBuddy.position.y = 7.5;
		this.shoulderBuddy.position.x = 13.8;
		this.shoulderBuddy.position.z = 8;
		//this.hat.rotation.x = 10.8 * Math.PI / 180;
		this.shoulderBuddy.rotation.y = Math.PI;
		this.add(this.shoulderBuddy);
		
		/*this.hats = [];
		for (var i = 0; i < hatCanvases.length; i++) {
			this.hats[i] = new JsonModelObject(hatCanvases[i].texture, hatCanvases[i].json);
			this.hats[i].name = "hat-" + i;
			this.hats[i].position.y = 7.5;
			this.hats[i].position.x = 13.8;
			this.hats[i].position.z = 8;
			this.hats[i].rotation.y = Math.PI;
			this.skin.head.add(this.hats[i]);
		}

		this.shoulderBuddies = [];
		for (var i = 0; i < shoulderBuddyCanvases.length; i++) {
			this.shoulderBuddies[0] = new JsonModelObject(shoulderBuddyCanvases[i].texture, shoulderBuddyCanvases[i].json);
			this.shoulderBuddies[0].name = "hat-" + i;
			this.shoulderBuddies[0].position.y = 7.5;
			this.shoulderBuddies[0].position.x = 13.8;
			this.shoulderBuddies[0].position.z = 8;
			this.shoulderBuddies[0].rotation.y = Math.PI;
			this.add(this.shoulderBuddies[0]);
		}*/
	}

	get backEquipment(): BackEquipment | null {
		if (this.cape.visible) {
			return "cape";
		} else if (this.elytra.visible) {
			return "elytra";
		} else {
			return null;
		}
	}

	set backEquipment(value: BackEquipment | null) {
		this.cape.visible = value === "cape";
		this.elytra.visible = value === "elytra";
	}

	set setHat(value: Texture | null) {
		this.hat.visible = true;
	}

	set setShoulderBuddy(value: Texture | null) {
		this.shoulderBuddy.visible = true;
	}
}
