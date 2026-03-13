class z {
  static imageCache = /* @__PURE__ */ new Map();
  static textCache = /* @__PURE__ */ new Map();
  static async fetchWithProgress(t, e) {
    const i = await fetch(t);
    if (!i.ok) throw new Error(`[AssetManager] HTTP Fehler: ${i.status} bei ${t}`);
    const s = i.headers.get("content-length"), r = s ? parseInt(s, 10) : 0;
    if (!e || !i.body)
      return i.blob();
    const o = i.body.getReader();
    let h = 0;
    const c = [];
    for (; ; ) {
      const { done: l, value: p } = await o.read();
      if (l) break;
      p && (h += p.length, c.push(p), e(h, r));
    }
    return new Blob(c);
  }
  static async loadImage(t, e, i = !0) {
    const s = `${t}_${i}`;
    if (this.imageCache.has(s)) return this.imageCache.get(s);
    const r = this.fetchWithProgress(t, e).then(async (o) => {
      if (i)
        return createImageBitmap(o, {
          colorSpaceConversion: "none",
          imageOrientation: "flipY"
        });
      try {
        return await createImageBitmap(o, {
          colorSpaceConversion: "none",
          imageOrientation: "from-image"
        });
      } catch {
        return await createImageBitmap(o, {
          colorSpaceConversion: "none",
          imageOrientation: "none"
        });
      }
    }).catch((o) => (console.error(o), new Promise((h, c) => {
      const l = new Image();
      l.crossOrigin = "anonymous", l.onload = () => h(l), l.onerror = () => c(`[AssetManager] Fallback fehlgeschlagen: ${t}`), l.src = t;
    })));
    return this.imageCache.set(s, r), r;
  }
  static async loadText(t, e) {
    if (this.textCache.has(t)) return this.textCache.get(t);
    const i = this.fetchWithProgress(t, e).then((s) => s.text());
    return this.textCache.set(t, i), i;
  }
}
class P {
  constructor(t = 0, e = 0, i = 0) {
    this.x = t, this.y = e, this.z = i;
  }
  set(t, e, i) {
    return this.x = t, this.y = e, this.z = i, this;
  }
  add(t) {
    return this.x += t.x, this.y += t.y, this.z += t.z, this;
  }
  sub(t) {
    return this.x -= t.x, this.y -= t.y, this.z -= t.z, this;
  }
  scale(t) {
    return this.x *= t, this.y *= t, this.z *= t, this;
  }
  dot(t) {
    return this.x * t.x + this.y * t.y + this.z * t.z;
  }
  lengthSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }
  length() {
    return Math.sqrt(this.lengthSq());
  }
  distanceToSq(t) {
    const e = this.x - t.x, i = this.y - t.y, s = this.z - t.z;
    return e * e + i * i + s * s;
  }
  distanceTo(t) {
    return Math.sqrt(this.distanceToSq(t));
  }
  copyFrom(t) {
    return this.x = t.x, this.y = t.y, this.z = t.z, this;
  }
  clone() {
    return new P(this.x, this.y, this.z);
  }
  /**
   * Normalisiert den Vektor auf eine Länge von 1 (Einheitsvektor).
   * @returns this (für Method Chaining)
   */
  normalize() {
    const t = this.length();
    if (t > 1e-6) {
      const e = 1 / t;
      this.x *= e, this.y *= e, this.z *= e;
    } else
      this.x = 0, this.y = 0, this.z = 0;
    return this;
  }
}
class x {
  data = new Float32Array(16);
  constructor() {
    this.identity();
  }
  identity() {
    return this.data.fill(0), this.data[0] = 1, this.data[5] = 1, this.data[10] = 1, this.data[15] = 1, this;
  }
  compose(t, e, i) {
    const s = new x();
    x.translate(t, s);
    const r = new x();
    x.rotateX(e.x, r);
    const o = new x();
    x.rotateY(e.y, o);
    const h = new x();
    x.rotateZ(e.z, h);
    const c = new x();
    return c.data[0] = i.x, c.data[5] = i.y, c.data[10] = i.z, x.multiply(s, o, this), x.multiply(this, r, this), x.multiply(this, h, this), x.multiply(this, c, this), this;
  }
  static translate(t, e) {
    e.identity(), e.data[12] = t.x, e.data[13] = t.y, e.data[14] = t.z;
  }
  static scale(t, e) {
    e.identity(), e.data[0] = t, e.data[5] = t, e.data[10] = t;
  }
  static rotateX(t, e) {
    const i = Math.sin(t), s = Math.cos(t);
    e.identity(), e.data[5] = s, e.data[6] = i, e.data[9] = -i, e.data[10] = s;
  }
  static rotateY(t, e) {
    const i = Math.sin(t), s = Math.cos(t);
    e.identity(), e.data[0] = s, e.data[2] = -i, e.data[8] = i, e.data[10] = s;
  }
  static rotateZ(t, e) {
    const i = Math.sin(t), s = Math.cos(t);
    e.identity(), e.data[0] = s, e.data[1] = i, e.data[4] = -i, e.data[5] = s;
  }
  static multiply(t, e, i) {
    const s = t.data, r = e.data, o = i.data, h = s[0], c = s[1], l = s[2], p = s[3], u = s[4], n = s[5], g = s[6], f = s[7], y = s[8], R = s[9], m = s[10], d = s[11], v = s[12], L = s[13], E = s[14], S = s[15], F = r[0], G = r[1], A = r[2], T = r[3], k = r[4], V = r[5], X = r[6], W = r[7], j = r[8], H = r[9], Y = r[10], q = r[11], $ = r[12], Z = r[13], J = r[14], Q = r[15];
    o[0] = h * F + u * G + y * A + v * T, o[1] = c * F + n * G + R * A + L * T, o[2] = l * F + g * G + m * A + E * T, o[3] = p * F + f * G + d * A + S * T, o[4] = h * k + u * V + y * X + v * W, o[5] = c * k + n * V + R * X + L * W, o[6] = l * k + g * V + m * X + E * W, o[7] = p * k + f * V + d * X + S * W, o[8] = h * j + u * H + y * Y + v * q, o[9] = c * j + n * H + R * Y + L * q, o[10] = l * j + g * H + m * Y + E * q, o[11] = p * j + f * H + d * Y + S * q, o[12] = h * $ + u * Z + y * J + v * Q, o[13] = c * $ + n * Z + R * J + L * Q, o[14] = l * $ + g * Z + m * J + E * Q, o[15] = p * $ + f * Z + d * J + S * Q;
  }
  static perspective(t, e, i, s, r) {
    const o = 1 / Math.tan(t / 2), h = r.data;
    h.fill(0), h[0] = o / e, h[5] = o, h[10] = s / (i - s), h[11] = -1, h[14] = i * s / (i - s);
  }
  static orthographic(t, e, i, s, r, o, h) {
    const c = h.data;
    c.fill(0), c[0] = 2 / (e - t), c[5] = 2 / (s - i), c[10] = 1 / (r - o), c[12] = -(e + t) / (e - t), c[13] = -(s + i) / (s - i), c[14] = r / (r - o), c[15] = 1;
  }
  static lookAt(t, e, i, s) {
    const r = s.data, o = t.clone().sub(e), h = o.length();
    h > 0 && o.scale(1 / h);
    const c = new P(
      i.y * o.z - i.z * o.y,
      i.z * o.x - i.x * o.z,
      i.x * o.y - i.y * o.x
    ), l = c.length();
    l > 0 && c.scale(1 / l);
    const p = new P(o.y * c.z - o.z * c.y, o.z * c.x - o.x * c.z, o.x * c.y - o.y * c.x);
    r[0] = c.x, r[4] = c.y, r[8] = c.z, r[12] = -c.dot(t), r[1] = p.x, r[5] = p.y, r[9] = p.z, r[13] = -p.dot(t), r[2] = o.x, r[6] = o.y, r[10] = o.z, r[14] = -o.dot(t), r[15] = 1;
  }
  transformVector(t) {
    const e = this.data, i = t.x, s = t.y, r = t.z;
    return t.x = e[0] * i + e[4] * s + e[8] * r + e[12], t.y = e[1] * i + e[5] * s + e[9] * r + e[13], t.z = e[2] * i + e[6] * s + e[10] * r + e[14], t;
  }
}
var U = /* @__PURE__ */ ((a) => (a.FIXED = "FixedCamera", a.STIFF = "StiffCamera", a.SMOOTH = "SmoothCamera", a.FPS = "FPSCamera", a))(U || {});
class ct {
  type = U.FPS;
  heightOffset = 0.5;
  update(t, e, i, s) {
    if (i !== 0 || s !== 0) {
      t.theta -= i * 5e-3, t.phi += s * 5e-3;
      const r = Math.PI / 2 - 0.01;
      t.phi > r && (t.phi = r), t.phi < -r && (t.phi = -r);
    }
    t.position.x = e.x, t.position.y = e.y + this.heightOffset, t.position.z = e.z, t.target.x = t.position.x - Math.sin(t.theta) * Math.cos(t.phi), t.target.y = t.position.y - Math.sin(t.phi), t.target.z = t.position.z - Math.cos(t.theta) * Math.cos(t.phi);
  }
}
class ut {
  type = U.SMOOTH;
  radius = 20;
  lerpFactor = 0.1;
  update(t, e, i, s) {
    if (i !== 0 || s !== 0) {
      t.theta -= i * 5e-3, t.phi += s * 5e-3;
      const r = Math.PI / 2 - 0.01;
      t.phi > r && (t.phi = r), t.phi < -r && (t.phi = -r);
    }
    t.target.x += (e.x - t.target.x) * this.lerpFactor, t.target.y += (e.y - t.target.y) * this.lerpFactor, t.target.z += (e.z - t.target.z) * this.lerpFactor, t.position.x = t.target.x + this.radius * Math.sin(t.theta) * Math.cos(t.phi), t.position.y = t.target.y + this.radius * Math.sin(t.phi), t.position.z = t.target.z + this.radius * Math.cos(t.theta) * Math.cos(t.phi);
  }
}
class gt {
  type = U.STIFF;
  radius = 20;
  update(t, e, i, s) {
    if (i !== 0 || s !== 0) {
      t.theta -= i * 5e-3, t.phi += s * 5e-3;
      const r = Math.PI / 2 - 0.01;
      t.phi > r && (t.phi = r), t.phi < -r && (t.phi = -r);
    }
    t.target.copyFrom(e), t.position.x = t.target.x + this.radius * Math.sin(t.theta) * Math.cos(t.phi), t.position.y = t.target.y + this.radius * Math.sin(t.phi), t.position.z = t.target.z + this.radius * Math.cos(t.theta) * Math.cos(t.phi);
  }
}
class dt {
  type = U.FIXED;
  update(t, e, i, s) {
    t.target.copyFrom(e);
  }
}
class ft {
  // Wir cachen die Instanzen, damit wir nicht bei jedem Wechsel ein neues 'new' Keyword bemühen müssen.
  static strategies = /* @__PURE__ */ new Map([
    [U.FPS, new ct()],
    [U.SMOOTH, new ut()],
    [U.STIFF, new gt()],
    [U.FIXED, new dt()]
  ]);
  static get(t) {
    return this.strategies.get(t) || this.strategies.get(U.SMOOTH);
  }
}
class Mt {
  constructor(t) {
    this.projection = t, this.setStrategy(U.SMOOTH);
  }
  position = new P(0, 10, 20);
  target = new P(0, 0, 0);
  up = new P(0, 1, 0);
  // Geteilte Winkel für alle Strategien, damit der Blickwinkel erhalten bleibt
  theta = 0;
  phi = 0.6;
  strategy;
  setStrategy(t) {
    this.strategy = ft.get(t);
  }
  get activeStrategyType() {
    return this.strategy.type;
  }
  update(t, e, i) {
    this.strategy.update(this, t, e, i);
  }
  getViewProjection(t, e) {
    x.multiply(this.projection.getMatrix(), t, e);
  }
}
var C = /* @__PURE__ */ ((a) => (a.BEST = "BEST", a.WEB_GPU = "WEB_GPU", a.WEB_GL2 = "WEB_GL2", a.WEB_GL1 = "WEB_GL1", a.CANVAS = "CANVAS", a))(C || {});
const pt = "0.10.2", mt = C.BEST;
class Ct {
  constructor(t) {
    this.enabled = t;
  }
  root = null;
  // Hier speichern wir die Referenzen zu den HTML-Elementen für schnellen Zugriff
  elements = /* @__PURE__ */ new Map();
  async init() {
    if (this.enabled)
      try {
        let e = await (await fetch("./resources/templates/hud.html")).text();
        e = e.replace(/{sm-engine-version}/g, `v${pt}`);
        const i = document.createElement("div");
        i.innerHTML = e, document.body.appendChild(i), this.root = document.getElementById("sw-hud-root"), document.querySelectorAll("[data-hud]").forEach((r) => {
          const o = r.getAttribute("data-hud");
          o && this.elements.set(o, r);
        });
      } catch (t) {
        console.error("[HUD] Failed to load template:", t);
      }
  }
  setVisible(t) {
    this.root && (this.root.style.display = t ? "block" : "none");
  }
  /**
   * Nimmt ein Key-Value Objekt entgegen und aktualisiert nur die gemappten Elemente.
   * Beispiel: hud.update({ "hud.fps": 120, "hud.cam.type": "SMOOTH" });
   */
  update(t) {
    if (!(!this.enabled || !this.root || this.root.style.display === "none"))
      for (const e in t) {
        const i = this.elements.get(e);
        i && (i.textContent = t[e].toString());
      }
  }
}
class Ut {
  static keys = /* @__PURE__ */ new Map();
  static mouse = { x: 0, y: 0, dx: 0, dy: 0, right: !1 };
  static isPointerLocked = !1;
  static debug = !1;
  static init() {
    window.addEventListener("keydown", (t) => this.keys.set(t.code, !0)), window.addEventListener("keyup", (t) => this.keys.set(t.code, !1)), window.addEventListener("mousedown", (t) => {
      t.button === 2 && (this.mouse.right = !0);
    }), window.addEventListener("mouseup", (t) => {
      t.button === 2 && (this.mouse.right = !1);
    }), window.addEventListener("mousemove", (t) => {
      this.mouse.dx += t.movementX, this.mouse.dy += t.movementY;
    }), window.addEventListener("contextmenu", (t) => t.preventDefault()), document.addEventListener("pointerlockchange", () => {
      this.isPointerLocked = document.pointerLockElement !== null;
    });
  }
  static requestPointerLock(t) {
    try {
      t.requestPointerLock();
    } catch (e) {
      console.warn("[Input] Konnte PointerLock nicht aktivieren:", e);
    }
  }
  static isPressed(t) {
    return this.keys.get(t) === !0;
  }
  static getAxis(t, e) {
    let i = 0;
    return this.isPressed(t) && (i -= 1), this.isPressed(e) && (i += 1), i;
  }
}
class K {
  uuid = crypto.randomUUID();
  name = "";
  geometry = null;
  material = null;
  // <--- NEU
  bounds = null;
  position = new P(0, 0, 0);
  rotation = new P(0, 0, 0);
  scale = new P(1, 1, 1);
  localMatrix = new x();
  worldMatrix = new x();
  parent = null;
  children = [];
  isVisible = !0;
  frustumCulled = !0;
  constructor(t = "") {
    this.name = t;
  }
  add(t) {
    t.parent && t.parent.remove(t), t.parent = this, this.children.push(t);
  }
  remove(t) {
    const e = this.children.indexOf(t);
    e !== -1 && (t.parent = null, this.children.splice(e, 1));
  }
  updateMatrixWorld(t = !1) {
    this.localMatrix.compose(this.position, this.rotation, this.scale), this.parent === null ? this.worldMatrix.data.set(this.localMatrix.data) : x.multiply(this.parent.worldMatrix, this.localMatrix, this.worldMatrix);
    for (const e of this.children)
      e.updateMatrixWorld(t);
  }
}
class Bt {
  objects = [];
  add(t) {
    this.objects.push(t);
  }
  remove(t) {
    const e = this.objects.indexOf(t);
    e !== -1 && this.objects.splice(e, 1);
  }
  update() {
    for (const t of this.objects)
      t.updateMatrixWorld && t.updateMatrixWorld(!0);
  }
}
class tt {
  constructor(t, e) {
    this.gl = t, this.vbo = t.createBuffer(), t.bindBuffer(t.ARRAY_BUFFER, this.vbo), t.bufferData(t.ARRAY_BUFFER, e.vertices, t.STATIC_DRAW), e.normals && e.normals.length > 0 && (this.nbo = t.createBuffer(), t.bindBuffer(t.ARRAY_BUFFER, this.nbo), t.bufferData(t.ARRAY_BUFFER, e.normals, t.STATIC_DRAW)), e.uvs && e.uvs.length > 0 && (this.tbo = t.createBuffer(), t.bindBuffer(t.ARRAY_BUFFER, this.tbo), t.bufferData(t.ARRAY_BUFFER, e.uvs, t.STATIC_DRAW)), this.ebo = t.createBuffer(), t.bindBuffer(t.ELEMENT_ARRAY_BUFFER, this.ebo), t.bufferData(t.ELEMENT_ARRAY_BUFFER, e.indices, t.STATIC_DRAW), this.count = e.indices.length;
  }
  vbo;
  ebo;
  nbo = null;
  tbo = null;
  // <--- NEU: UV Buffer
  count;
  bind(t, e = -1, i = -1) {
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbo), this.gl.vertexAttribPointer(t, 3, this.gl.FLOAT, !1, 0, 0), this.gl.enableVertexAttribArray(t), e >= 0 && this.nbo && (this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.nbo), this.gl.vertexAttribPointer(e, 3, this.gl.FLOAT, !1, 0, 0), this.gl.enableVertexAttribArray(e)), i >= 0 && this.tbo && (this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.tbo), this.gl.vertexAttribPointer(i, 2, this.gl.FLOAT, !1, 0, 0), this.gl.enableVertexAttribArray(i)), this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.ebo);
  }
}
var b = /* @__PURE__ */ ((a) => (a.BASIC = "BasicMaterial", a.LAMBERT = "LabertMaterial", a.PHONG = "PhongMaterial", a.SKYBOX = "SkyboxMaterial", a.WIREFRAME = "WireframeMaterial", a))(b || {});
class _ {
  constructor(t, e, i, s = 1) {
    this.r = t, this.g = e, this.b = i, this.a = s;
  }
  static get WHITE() {
    return new _(1, 1, 1);
  }
  static get BLACK() {
    return new _(0, 0, 0);
  }
  static get RED() {
    return new _(1, 0, 0);
  }
  static get GREEN() {
    return new _(0, 1, 0);
  }
  static get BLUE() {
    return new _(0, 0, 1);
  }
  static get ORANGE() {
    return new _(1, 0.5, 0);
  }
  static get DODGERBLUE() {
    return new _(0.12, 0.56, 1);
  }
  static get SKYBLUE() {
    return new _(0.53, 0.81, 0.92);
  }
  static get LIGHTSTEELBLUE() {
    return new _(0.69, 0.77, 0.87);
  }
  static get DARKSLATEGRAY() {
    return new _(0.18, 0.31, 0.31);
  }
  static get GRAY() {
    return new _(0.5, 0.5, 0.5);
  }
  static get YELLOW() {
    return new _(1, 1, 0);
  }
  toArray() {
    return [this.r, this.g, this.b, this.a];
  }
}
class I extends K {
  constructor(t, e, i = "Light") {
    super(i), this.color = t, this.intensity = e;
  }
}
var B = /* @__PURE__ */ ((a) => (a.AMBIENT = "AmbientLight", a.AREA = "AreaLight", a.DIRECTIONAL = "DirectionalLight", a.POINT = "PointLight", a.SPOT = "SpotLight", a))(B || {});
class ot {
  clearColor = new _(0, 0, 0, 1);
  setClearColor(t) {
    this.clearColor = t;
  }
  // Diese Methode ist in ALLEN Renderern (sogar WebGPU) exakt gleich!
  extractLights(t) {
    let e = new _(0, 0, 0), i = new P(0, 1, 0), s = new _(0, 0, 0);
    const r = [], o = [], h = [], c = (l) => {
      if (l instanceof I)
        switch (l.type) {
          case B.AMBIENT:
            e = new _(l.color.r * l.intensity, l.color.g * l.intensity, l.color.b * l.intensity);
            break;
          case B.DIRECTIONAL:
            i = l.direction.clone().scale(-1).normalize(), s = new _(l.color.r * l.intensity, l.color.g * l.intensity, l.color.b * l.intensity);
            break;
          case B.POINT:
            r.length < 4 && r.push(l);
            break;
          case B.SPOT:
            o.length < 4 && o.push(l);
            break;
          case B.AREA:
            h.length < 4 && h.push(l);
            break;
        }
      l.children && l.children.forEach(c);
    };
    for (const l of t.objects) c(l);
    return { aCol: e, dDir: i, dCol: s, pLights: r, sLights: o, aLights: h };
  }
}
class at extends ot {
  // WebGL2 context erbt von WebGL1 context
  gl;
  defaultTexture;
  defaultCubeTexture;
  setSize(t, e) {
    const i = devicePixelRatio;
    this.gl.canvas.width = t * i, this.gl.canvas.height = e * i, this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
  }
  setClearColor(t) {
    super.setClearColor(t), this.gl.clearColor(t.r, t.g, t.b, t.a);
  }
  // Kompiliert und verlinkt einen Shader
  createShaderProgram(t, e) {
    const i = this.gl.createShader(this.gl.VERTEX_SHADER);
    this.gl.shaderSource(i, t), this.gl.compileShader(i), this.gl.getShaderParameter(i, this.gl.COMPILE_STATUS) || console.error("[WebGL] Vertex Shader Fehler:", this.gl.getShaderInfoLog(i));
    const s = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    this.gl.shaderSource(s, e), this.gl.compileShader(s), this.gl.getShaderParameter(s, this.gl.COMPILE_STATUS) || console.error("[WebGL] Fragment Shader Fehler:", this.gl.getShaderInfoLog(s));
    const r = this.gl.createProgram();
    return this.gl.attachShader(r, i), this.gl.attachShader(r, s), this.gl.linkProgram(r), this.gl.deleteShader(i), this.gl.deleteShader(s), r;
  }
  // Baut die weißen/blauen Fallback-Texturen
  initDefaultTextures() {
    this.defaultTexture = this.gl.createTexture(), this.gl.bindTexture(this.gl.TEXTURE_2D, this.defaultTexture), this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      1,
      1,
      0,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255, 255])
    ), this.defaultCubeTexture = this.gl.createTexture(), this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this.defaultCubeTexture);
    for (let t = 0; t < 6; t++)
      this.gl.texImage2D(
        this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + t,
        0,
        this.gl.RGBA,
        1,
        1,
        0,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        new Uint8Array([50, 50, 100, 255])
      );
  }
}
class Lt extends at {
  type = C.WEB_GL1;
  prog;
  locs;
  skyProg;
  skyLocs;
  cache = /* @__PURE__ */ new Map();
  texCache = /* @__PURE__ */ new Map();
  texCubeCache = /* @__PURE__ */ new Map();
  pointLightLocs = [];
  spotLightLocs = [];
  async initialize(t) {
    this.gl = t.getContext("webgl", { antialias: !0 }) || t.getContext("experimental-webgl"), this.initDefaultTextures();
    const e = "attribute vec3 a_position; attribute vec3 a_normal; attribute vec2 a_uv; uniform mat4 u_vp; uniform mat4 u_model; uniform vec2 u_texOffset; uniform vec2 u_texRepeat; varying vec3 v_worldPos; varying vec3 v_normal; varying vec2 v_uv; mat3 extractMat3(mat4 m) { return mat3(m[0].xyz, m[1].xyz, m[2].xyz); } void main() { vec4 wp = u_model * vec4(a_position, 1.0); v_worldPos = wp.xyz; v_normal = extractMat3(u_model) * a_normal; v_uv = (a_uv * u_texRepeat) + u_texOffset; gl_Position = u_vp * wp; }", i = "precision highp float; varying vec3 v_worldPos; varying vec3 v_normal; varying vec2 v_uv; uniform vec4 u_color; uniform vec4 u_specColor; uniform float u_shininess; uniform vec3 u_viewPos; uniform vec3 u_ambientColor; uniform vec3 u_dirLightColor; uniform vec3 u_dirLightDir; uniform sampler2D u_diffuseMap; uniform int u_numPointLights; uniform vec3 u_pointLightPos[4]; uniform vec3 u_pointLightColor[4]; uniform int u_numSpotLights; uniform vec3 u_spotLightPos[4]; uniform vec3 u_spotLightDir[4]; uniform vec3 u_spotLightColor[4]; uniform vec4 u_spotLightParams[4]; void main() { vec4 texColor = texture2D(u_diffuseMap, v_uv); if (u_shininess < -0.5) { gl_FragColor = u_color * texColor; return; } vec3 N = normalize(v_normal); vec3 V = normalize(u_viewPos - v_worldPos); vec3 finalLight = u_ambientColor; vec3 specular = vec3(0.0); vec3 L_dir = normalize(u_dirLightDir); float diff_dir = max(dot(N, L_dir), 0.0); finalLight += diff_dir * u_dirLightColor; if (u_shininess > 0.0 && diff_dir > 0.0) specular += pow(max(dot(V, reflect(-L_dir, N)), 0.0), u_shininess) * u_dirLightColor; for(int i = 0; i < 4; i++) { if (i >= u_numPointLights) break; vec3 lightVec = u_pointLightPos[i] - v_worldPos; float dist = length(lightVec); vec3 L_pt = lightVec / dist; float attenuation = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist); float diff_pt = max(dot(N, L_pt), 0.0); finalLight += diff_pt * u_pointLightColor[i] * attenuation; if (u_shininess > 0.0 && diff_pt > 0.0) specular += pow(max(dot(V, reflect(-L_pt, N)), 0.0), u_shininess) * u_pointLightColor[i] * attenuation; } for(int i = 0; i < 4; i++) { if (i >= u_numSpotLights) break; vec3 lightVec = u_spotLightPos[i] - v_worldPos; float dist = length(lightVec); vec3 L_sp = lightVec / dist; vec3 S_dir = normalize(u_spotLightDir[i]); float theta = dot(-L_sp, S_dir); if(theta > u_spotLightParams[i].x) { float spotEffect = smoothstep(u_spotLightParams[i].x, u_spotLightParams[i].y, theta); float attenuation = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist); float diff_sp = max(dot(N, L_sp), 0.0); finalLight += diff_sp * u_spotLightColor[i] * attenuation * spotEffect; if (u_shininess > 0.0 && diff_sp > 0.0) specular += pow(max(dot(V, reflect(-L_sp, N)), 0.0), u_shininess) * u_spotLightColor[i] * attenuation * spotEffect; } } gl_FragColor = vec4((finalLight * u_color.rgb * texColor.rgb) + (specular * u_specColor.rgb), u_color.a * texColor.a); }", s = "attribute vec3 a_position; uniform mat4 u_vp; uniform mat4 u_model; varying vec3 v_uvw; void main() { v_uvw = a_position; gl_Position = u_vp * u_model * vec4(a_position, 1.0); }", r = "precision highp float; varying vec3 v_uvw; uniform samplerCube u_skybox; void main() { gl_FragColor = textureCube(u_skybox, v_uvw); }";
    this.prog = this.createShaderProgram(e, i), this.skyProg = this.createShaderProgram(s, r), this.locs = {
      pos: this.gl.getAttribLocation(this.prog, "a_position"),
      norm: this.gl.getAttribLocation(this.prog, "a_normal"),
      uv: this.gl.getAttribLocation(this.prog, "a_uv"),
      vp: this.gl.getUniformLocation(this.prog, "u_vp"),
      model: this.gl.getUniformLocation(this.prog, "u_model"),
      color: this.gl.getUniformLocation(this.prog, "u_color"),
      specColor: this.gl.getUniformLocation(this.prog, "u_specColor"),
      ambient: this.gl.getUniformLocation(this.prog, "u_ambientColor"),
      dirColor: this.gl.getUniformLocation(this.prog, "u_dirLightColor"),
      dirDir: this.gl.getUniformLocation(this.prog, "u_dirLightDir"),
      shininess: this.gl.getUniformLocation(this.prog, "u_shininess"),
      viewPos: this.gl.getUniformLocation(this.prog, "u_viewPos"),
      numPL: this.gl.getUniformLocation(this.prog, "u_numPointLights"),
      numSL: this.gl.getUniformLocation(this.prog, "u_numSpotLights"),
      diffuseMap: this.gl.getUniformLocation(this.prog, "u_diffuseMap"),
      texOffset: this.gl.getUniformLocation(this.prog, "u_texOffset"),
      texRepeat: this.gl.getUniformLocation(this.prog, "u_texRepeat")
    }, this.skyLocs = {
      pos: this.gl.getAttribLocation(this.skyProg, "a_position"),
      vp: this.gl.getUniformLocation(this.skyProg, "u_vp"),
      model: this.gl.getUniformLocation(this.skyProg, "u_model"),
      skybox: this.gl.getUniformLocation(this.skyProg, "u_skybox")
    };
    for (let o = 0; o < 4; o++)
      this.pointLightLocs.push({
        pos: this.gl.getUniformLocation(this.prog, `u_pointLightPos[${o}]`),
        col: this.gl.getUniformLocation(this.prog, `u_pointLightColor[${o}]`)
      }), this.spotLightLocs.push({
        pos: this.gl.getUniformLocation(this.prog, `u_spotLightPos[${o}]`),
        dir: this.gl.getUniformLocation(this.prog, `u_spotLightDir[${o}]`),
        col: this.gl.getUniformLocation(this.prog, `u_spotLightColor[${o}]`),
        params: this.gl.getUniformLocation(this.prog, `u_spotLightParams[${o}]`)
      });
    this.gl.enable(this.gl.DEPTH_TEST);
  }
  getWebGLTexture(t) {
    if (!t.isLoaded || !t.image) return this.defaultTexture;
    let e = this.texCache.get(t);
    return e || (e = this.gl.createTexture(), this.gl.bindTexture(this.gl.TEXTURE_2D, e), this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      t.image
    ), this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MAG_FILTER,
      t.magFilter === "nearest" ? this.gl.NEAREST : this.gl.LINEAR
    ), this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MIN_FILTER,
      t.minFilter === "nearest" ? this.gl.NEAREST : this.gl.LINEAR
    ), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT), this.texCache.set(t, e)), e;
  }
  getWebGLCubeTexture(t) {
    if (!t.isLoaded || t.images.length !== 6) return this.defaultCubeTexture;
    let e = this.texCubeCache.get(t);
    if (!e) {
      e = this.gl.createTexture(), this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, e);
      for (let i = 0; i < 6; i++)
        this.gl.texImage2D(
          this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + i,
          0,
          this.gl.RGBA,
          this.gl.RGBA,
          this.gl.UNSIGNED_BYTE,
          t.images[i]
        );
      this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR), this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR), this.gl.texParameteri(
        this.gl.TEXTURE_CUBE_MAP,
        this.gl.TEXTURE_WRAP_S,
        this.gl.CLAMP_TO_EDGE
      ), this.gl.texParameteri(
        this.gl.TEXTURE_CUBE_MAP,
        this.gl.TEXTURE_WRAP_T,
        this.gl.CLAMP_TO_EDGE
      ), this.texCubeCache.set(t, e);
    }
    return e;
  }
  render(t, e, i = new P()) {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT), this.gl.depthMask(!1), this.gl.useProgram(this.skyProg), this.skyLocs.vp && this.gl.uniformMatrix4fv(this.skyLocs.vp, !1, e);
    const s = (u) => {
      if (!(!u.isVisible || !u.material)) {
        if (u.geometry && u.material.type === b.SKYBOX) {
          const n = u.material;
          let g = this.cache.get(u.geometry);
          g || (g = new tt(this.gl, u.geometry), this.cache.set(u.geometry, g)), g.bind(this.skyLocs.pos), this.skyLocs.model && this.gl.uniformMatrix4fv(this.skyLocs.model, !1, u.worldMatrix.data), this.gl.activeTexture(this.gl.TEXTURE0), this.gl.bindTexture(
            this.gl.TEXTURE_CUBE_MAP,
            n.cubeMap ? this.getWebGLCubeTexture(n.cubeMap) : this.defaultCubeTexture
          ), this.skyLocs.skybox && this.gl.uniform1i(this.skyLocs.skybox, 0), this.gl.drawElements(this.gl.TRIANGLES, g.count, this.gl.UNSIGNED_SHORT, 0);
        }
        if (u.children) for (const n of u.children) s(n);
      }
    };
    for (const u of t.objects) s(u);
    this.gl.depthMask(!0), this.gl.useProgram(this.prog), this.locs.vp && this.gl.uniformMatrix4fv(this.locs.vp, !1, e), this.locs.viewPos && this.gl.uniform3f(this.locs.viewPos, i.x, i.y, i.z);
    const { aCol: r, dDir: o, dCol: h, pLights: c, sLights: l } = this.extractLights(t);
    this.locs.ambient && this.gl.uniform3f(this.locs.ambient, r.r, r.g, r.b), this.locs.dirDir && this.gl.uniform3f(this.locs.dirDir, o.x, o.y, o.z), this.locs.dirColor && this.gl.uniform3f(this.locs.dirColor, h.r, h.g, h.b), this.locs.numPL && this.gl.uniform1i(this.locs.numPL, c.length);
    for (let u = 0; u < c.length; u++)
      this.pointLightLocs[u].pos && this.gl.uniform3f(
        this.pointLightLocs[u].pos,
        c[u].worldMatrix.data[12],
        c[u].worldMatrix.data[13],
        c[u].worldMatrix.data[14]
      ), this.pointLightLocs[u].col && this.gl.uniform3f(
        this.pointLightLocs[u].col,
        c[u].color.r * c[u].intensity,
        c[u].color.g * c[u].intensity,
        c[u].color.b * c[u].intensity
      );
    this.locs.numSL && this.gl.uniform1i(this.locs.numSL, l.length);
    for (let u = 0; u < l.length; u++) {
      this.spotLightLocs[u].pos && this.gl.uniform3f(
        this.spotLightLocs[u].pos,
        l[u].worldMatrix.data[12],
        l[u].worldMatrix.data[13],
        l[u].worldMatrix.data[14]
      );
      const n = l[u].direction.clone().normalize();
      this.spotLightLocs[u].dir && this.gl.uniform3f(this.spotLightLocs[u].dir, n.x, n.y, n.z), this.spotLightLocs[u].col && this.gl.uniform3f(
        this.spotLightLocs[u].col,
        l[u].color.r * l[u].intensity,
        l[u].color.g * l[u].intensity,
        l[u].color.b * l[u].intensity
      ), this.spotLightLocs[u].params && this.gl.uniform4f(
        this.spotLightLocs[u].params,
        Math.cos(l[u].angle),
        Math.cos(l[u].angle * (1 - l[u].penumbra)),
        l[u].distance,
        l[u].decay
      );
    }
    const p = (u) => {
      if (!u.isVisible || !u.geometry || !u.material || u.material.type === b.SKYBOX) {
        if (u.children) for (const L of u.children) p(L);
        return;
      }
      const n = u.material;
      let g = this.cache.get(u.geometry);
      g || (g = new tt(this.gl, u.geometry), this.cache.set(u.geometry, g)), g.bind(this.locs.pos, this.locs.norm, this.locs.uv), this.locs.model && this.gl.uniformMatrix4fv(this.locs.model, !1, u.worldMatrix.data), this.locs.color && this.gl.uniform4fv(this.locs.color, n.color.toArray());
      let f = -1, y = [0, 0, 0, 0], R = this.defaultTexture, m = [0, 0], d = [1, 1];
      if (n.type === b.LAMBERT)
        f = 0;
      else if (n.type === b.PHONG) {
        const L = n;
        f = L.shininess || 32, y = L.specularColor ? L.specularColor.toArray() : [0, 0, 0, 0], L.diffuseMap && (R = this.getWebGLTexture(L.diffuseMap), m = [L.diffuseMap.offset.x, L.diffuseMap.offset.y], d = [L.diffuseMap.repeat.x, L.diffuseMap.repeat.y]);
      }
      this.gl.activeTexture(this.gl.TEXTURE0), this.gl.bindTexture(this.gl.TEXTURE_2D, R), this.locs.diffuseMap && this.gl.uniform1i(this.locs.diffuseMap, 0), this.locs.texOffset && this.gl.uniform2fv(this.locs.texOffset, m), this.locs.texRepeat && this.gl.uniform2fv(this.locs.texRepeat, d), this.locs.shininess && this.gl.uniform1f(this.locs.shininess, f), this.locs.specColor && this.gl.uniform4fv(this.locs.specColor, y);
      const v = n.type === b.WIREFRAME ? this.gl.LINES : this.gl.TRIANGLES;
      if (this.gl.drawElements(v, g.count, this.gl.UNSIGNED_SHORT, 0), u.children) for (const L of u.children) p(L);
    };
    for (const u of t.objects) p(u);
  }
}
class it extends at {
  type = C.WEB_GL2;
  prog;
  locs;
  skyProg;
  skyLocs;
  cache = /* @__PURE__ */ new Map();
  texCache = /* @__PURE__ */ new Map();
  texCubeCache = /* @__PURE__ */ new Map();
  pointLightLocs = [];
  spotLightLocs = [];
  // <-- NEU: Locations für bis zu 4 AreaLights
  areaLightLocs = [];
  async initialize(t) {
    this.gl = t.getContext("webgl2", { antialias: !0 }), this.initDefaultTextures();
    const e = `#version 300 es
    in vec3 a_position; in vec3 a_normal; in vec2 a_uv;
    uniform mat4 u_vp; uniform mat4 u_model; uniform vec2 u_texOffset; uniform vec2 u_texRepeat;
    out vec3 v_worldPos; out vec3 v_normal; out vec2 v_uv;
    void main() {
      vec4 wp = u_model * vec4(a_position, 1.0);
      v_worldPos = wp.xyz; v_normal = mat3(u_model) * a_normal; v_uv = (a_uv * u_texRepeat) + u_texOffset;
      gl_Position = u_vp * wp;
    }`, i = `#version 300 es
    precision highp float;
    in vec3 v_worldPos; in vec3 v_normal; in vec2 v_uv;
    uniform vec4 u_color; uniform vec4 u_specColor; uniform float u_shininess; uniform vec3 u_viewPos;
    uniform vec3 u_ambientColor; uniform vec3 u_dirLightColor; uniform vec3 u_dirLightDir;
    uniform sampler2D u_diffuseMap;
    
    uniform int u_numPointLights; uniform vec3 u_pointLightPos[4]; uniform vec3 u_pointLightColor[4];
    uniform int u_numSpotLights; uniform vec3 u_spotLightPos[4]; uniform vec3 u_spotLightDir[4]; uniform vec3 u_spotLightColor[4]; uniform vec4 u_spotLightParams[4];
    
    uniform int u_numAreaLights;
    uniform vec3 u_areaLightPos[4];
    uniform vec3 u_areaLightColor[4];
    uniform vec3 u_areaLightRight[4];
    uniform vec3 u_areaLightUp[4];
    uniform vec3 u_areaLightNormal[4];
    uniform vec2 u_areaLightSize[4];

    out vec4 c;

    void main() {
      vec4 texColor = texture(u_diffuseMap, v_uv);
      if (u_shininess < -0.5) { c = u_color * texColor; return; }
      
      vec3 N = normalize(v_normal); 
      vec3 V = normalize(u_viewPos - v_worldPos);
      vec3 finalLight = u_ambientColor; 
      vec3 specular = vec3(0.0);
      
      // Directional Light
      vec3 L_dir = normalize(u_dirLightDir); float diff_dir = max(dot(N, L_dir), 0.0);
      finalLight += diff_dir * u_dirLightColor;
      if (u_shininess > 0.0 && diff_dir > 0.0) specular += pow(max(dot(V, reflect(-L_dir, N)), 0.0), u_shininess) * u_dirLightColor;
      
      // Point Lights
      for(int i = 0; i < 4; i++) {
        if (i >= u_numPointLights) break;
        vec3 lightVec = u_pointLightPos[i] - v_worldPos; float dist = length(lightVec); vec3 L_pt = lightVec / dist;
        float attenuation = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist); float diff_pt = max(dot(N, L_pt), 0.0);
        finalLight += diff_pt * u_pointLightColor[i] * attenuation;
        if (u_shininess > 0.0 && diff_pt > 0.0) specular += pow(max(dot(V, reflect(-L_pt, N)), 0.0), u_shininess) * u_pointLightColor[i] * attenuation;
      }
      
      // Spot Lights
      for(int i = 0; i < 4; i++) {
        if (i >= u_numSpotLights) break;
        vec3 lightVec = u_spotLightPos[i] - v_worldPos; float dist = length(lightVec); vec3 L_sp = lightVec / dist;
        vec3 S_dir = normalize(u_spotLightDir[i]); float theta = dot(-L_sp, S_dir);
        if(theta > u_spotLightParams[i].x) {
            float spotEffect = smoothstep(u_spotLightParams[i].x, u_spotLightParams[i].y, theta);
            float attenuation = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist); float diff_sp = max(dot(N, L_sp), 0.0);
            finalLight += diff_sp * u_spotLightColor[i] * attenuation * spotEffect;
            if (u_shininess > 0.0 && diff_sp > 0.0) specular += pow(max(dot(V, reflect(-L_sp, N)), 0.0), u_shininess) * u_spotLightColor[i] * attenuation * spotEffect;
        }
      }

      // Area Lights (Representative Point)
      for(int i = 0; i < 4; i++) {
        if (i >= u_numAreaLights) break;
        
        vec3 L_center = u_areaLightPos[i];
        vec3 L_normal = normalize(u_areaLightNormal[i]);
        vec3 dirFromLight = v_worldPos - L_center;
        
        // Licht strahlt nur nach vorne ab!
        if(dot(dirFromLight, L_normal) < 0.0) continue; 
        
        vec3 L_right = normalize(u_areaLightRight[i]);
        vec3 L_up = normalize(u_areaLightUp[i]);
        vec2 size = u_areaLightSize[i];

        // Projektion auf die Leuchtfläche
        float projX = clamp(dot(dirFromLight, L_right), -size.x, size.x);
        float projY = clamp(dot(dirFromLight, L_up), -size.y, size.y);

        // Der nächstgelegene Punkt auf der Fläche wird zu unserem "PointLight"
        vec3 closestPoint = L_center + L_right * projX + L_up * projY;
        
        vec3 lightVec = closestPoint - v_worldPos; 
        float dist = length(lightVec); 
        vec3 L_al = lightVec / (dist + 0.0001); // div by zero verhindern

        float attenuation = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist); 
        float diff_al = max(dot(N, L_al), 0.0);
        
        finalLight += diff_al * u_areaLightColor[i] * attenuation;
        if (u_shininess > 0.0 && diff_al > 0.0) {
            specular += pow(max(dot(V, reflect(-L_al, N)), 0.0), u_shininess) * u_areaLightColor[i] * attenuation;
        }
      }

      c = vec4((finalLight * u_color.rgb * texColor.rgb) + (specular * u_specColor.rgb), u_color.a * texColor.a);
    }`, s = `#version 300 es
    in vec3 a_position; uniform mat4 u_vp; uniform mat4 u_model; out vec3 v_uvw;
    void main() { v_uvw = a_position; gl_Position = u_vp * u_model * vec4(a_position, 1.0); }`, r = `#version 300 es
    precision highp float; in vec3 v_uvw; uniform samplerCube u_skybox; out vec4 c;
    void main() { c = texture(u_skybox, v_uvw); }`;
    this.prog = this.createShaderProgram(e, i), this.skyProg = this.createShaderProgram(s, r), this.locs = {
      pos: this.gl.getAttribLocation(this.prog, "a_position"),
      norm: this.gl.getAttribLocation(this.prog, "a_normal"),
      uv: this.gl.getAttribLocation(this.prog, "a_uv"),
      vp: this.gl.getUniformLocation(this.prog, "u_vp"),
      model: this.gl.getUniformLocation(this.prog, "u_model"),
      color: this.gl.getUniformLocation(this.prog, "u_color"),
      specColor: this.gl.getUniformLocation(this.prog, "u_specColor"),
      ambient: this.gl.getUniformLocation(this.prog, "u_ambientColor"),
      dirColor: this.gl.getUniformLocation(this.prog, "u_dirLightColor"),
      dirDir: this.gl.getUniformLocation(this.prog, "u_dirLightDir"),
      shininess: this.gl.getUniformLocation(this.prog, "u_shininess"),
      viewPos: this.gl.getUniformLocation(this.prog, "u_viewPos"),
      numPL: this.gl.getUniformLocation(this.prog, "u_numPointLights"),
      numSL: this.gl.getUniformLocation(this.prog, "u_numSpotLights"),
      numAL: this.gl.getUniformLocation(this.prog, "u_numAreaLights"),
      // <-- NEU
      diffuseMap: this.gl.getUniformLocation(this.prog, "u_diffuseMap"),
      texOffset: this.gl.getUniformLocation(this.prog, "u_texOffset"),
      texRepeat: this.gl.getUniformLocation(this.prog, "u_texRepeat")
    }, this.skyLocs = {
      pos: this.gl.getAttribLocation(this.skyProg, "a_position"),
      vp: this.gl.getUniformLocation(this.skyProg, "u_vp"),
      model: this.gl.getUniformLocation(this.skyProg, "u_model"),
      skybox: this.gl.getUniformLocation(this.skyProg, "u_skybox")
    };
    for (let o = 0; o < 4; o++)
      this.pointLightLocs.push({
        pos: this.gl.getUniformLocation(this.prog, `u_pointLightPos[${o}]`),
        col: this.gl.getUniformLocation(this.prog, `u_pointLightColor[${o}]`)
      }), this.spotLightLocs.push({
        pos: this.gl.getUniformLocation(this.prog, `u_spotLightPos[${o}]`),
        dir: this.gl.getUniformLocation(this.prog, `u_spotLightDir[${o}]`),
        col: this.gl.getUniformLocation(this.prog, `u_spotLightColor[${o}]`),
        params: this.gl.getUniformLocation(this.prog, `u_spotLightParams[${o}]`)
      }), this.areaLightLocs.push({
        pos: this.gl.getUniformLocation(this.prog, `u_areaLightPos[${o}]`),
        col: this.gl.getUniformLocation(this.prog, `u_areaLightColor[${o}]`),
        right: this.gl.getUniformLocation(this.prog, `u_areaLightRight[${o}]`),
        up: this.gl.getUniformLocation(this.prog, `u_areaLightUp[${o}]`),
        normal: this.gl.getUniformLocation(this.prog, `u_areaLightNormal[${o}]`),
        size: this.gl.getUniformLocation(this.prog, `u_areaLightSize[${o}]`)
      });
    this.gl.enable(this.gl.DEPTH_TEST);
  }
  getWebGLTexture(t) {
    if (!t.isLoaded || !t.image) return this.defaultTexture;
    let e = this.texCache.get(t);
    return e || (e = this.gl.createTexture(), this.gl.bindTexture(this.gl.TEXTURE_2D, e), this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, t.image), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, t.magFilter === "nearest" ? this.gl.NEAREST : this.gl.LINEAR), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, t.minFilter === "nearest" ? this.gl.NEAREST : this.gl.LINEAR), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT), this.texCache.set(t, e)), e;
  }
  getWebGLCubeTexture(t) {
    if (!t.isLoaded || t.images.length !== 6) return this.defaultCubeTexture;
    let e = this.texCubeCache.get(t);
    if (!e) {
      e = this.gl.createTexture(), this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, e);
      for (let i = 0; i < 6; i++)
        this.gl.texImage2D(this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, t.images[i]);
      this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR), this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR), this.texCubeCache.set(t, e);
    }
    return e;
  }
  render(t, e, i = new P()) {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT), this.gl.depthMask(!1), this.gl.useProgram(this.skyProg), this.skyLocs.vp && this.gl.uniformMatrix4fv(this.skyLocs.vp, !1, e);
    const s = (n) => {
      if (!(!n.isVisible || !n.material)) {
        if (n.geometry && n.material.type === b.SKYBOX) {
          const g = n.material;
          let f = this.cache.get(n.geometry);
          f || (f = new tt(this.gl, n.geometry), this.cache.set(n.geometry, f)), f.bind(this.skyLocs.pos), this.skyLocs.model && this.gl.uniformMatrix4fv(this.skyLocs.model, !1, n.worldMatrix.data), this.gl.activeTexture(this.gl.TEXTURE0), this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, g.cubeMap ? this.getWebGLCubeTexture(g.cubeMap) : this.defaultCubeTexture), this.skyLocs.skybox && this.gl.uniform1i(this.skyLocs.skybox, 0), this.gl.drawElements(this.gl.TRIANGLES, f.count, this.gl.UNSIGNED_SHORT, 0);
        }
        if (n.children) for (const g of n.children) s(g);
      }
    };
    for (const n of t.objects) s(n);
    this.gl.depthMask(!0), this.gl.useProgram(this.prog), this.locs.vp && this.gl.uniformMatrix4fv(this.locs.vp, !1, e), this.locs.viewPos && this.gl.uniform3f(this.locs.viewPos, i.x, i.y, i.z);
    const { aCol: r, dDir: o, dCol: h, pLights: c, sLights: l, aLights: p } = this.extractLights(t);
    this.locs.ambient && this.gl.uniform3f(this.locs.ambient, r.r, r.g, r.b), this.locs.dirDir && this.gl.uniform3f(this.locs.dirDir, o.x, o.y, o.z), this.locs.dirColor && this.gl.uniform3f(this.locs.dirColor, h.r, h.g, h.b), this.locs.numPL && this.gl.uniform1i(this.locs.numPL, c.length);
    for (let n = 0; n < c.length; n++)
      this.pointLightLocs[n].pos && this.gl.uniform3f(this.pointLightLocs[n].pos, c[n].worldMatrix.data[12], c[n].worldMatrix.data[13], c[n].worldMatrix.data[14]), this.pointLightLocs[n].col && this.gl.uniform3f(this.pointLightLocs[n].col, c[n].color.r * c[n].intensity, c[n].color.g * c[n].intensity, c[n].color.b * c[n].intensity);
    this.locs.numSL && this.gl.uniform1i(this.locs.numSL, l.length);
    for (let n = 0; n < l.length; n++) {
      this.spotLightLocs[n].pos && this.gl.uniform3f(this.spotLightLocs[n].pos, l[n].worldMatrix.data[12], l[n].worldMatrix.data[13], l[n].worldMatrix.data[14]);
      const g = l[n].direction.clone().normalize();
      this.spotLightLocs[n].dir && this.gl.uniform3f(this.spotLightLocs[n].dir, g.x, g.y, g.z), this.spotLightLocs[n].col && this.gl.uniform3f(this.spotLightLocs[n].col, l[n].color.r * l[n].intensity, l[n].color.g * l[n].intensity, l[n].color.b * l[n].intensity), this.spotLightLocs[n].params && this.gl.uniform4f(this.spotLightLocs[n].params, Math.cos(l[n].angle), Math.cos(l[n].angle * (1 - l[n].penumbra)), l[n].distance, l[n].decay);
    }
    this.locs.numAL && this.gl.uniform1i(this.locs.numAL, p.length);
    for (let n = 0; n < p.length; n++) {
      const g = p[n], f = g.worldMatrix.data;
      this.areaLightLocs[n].pos && this.gl.uniform3f(this.areaLightLocs[n].pos, f[12], f[13], f[14]), this.areaLightLocs[n].col && this.gl.uniform3f(this.areaLightLocs[n].col, g.color.r * g.intensity, g.color.g * g.intensity, g.color.b * g.intensity), this.areaLightLocs[n].right && this.gl.uniform3f(this.areaLightLocs[n].right, f[0], f[1], f[2]), this.areaLightLocs[n].up && this.gl.uniform3f(this.areaLightLocs[n].up, f[4], f[5], f[6]), this.areaLightLocs[n].normal && this.gl.uniform3f(this.areaLightLocs[n].normal, f[8], f[9], f[10]), this.areaLightLocs[n].size && this.gl.uniform2f(this.areaLightLocs[n].size, g.width / 2, g.height / 2);
    }
    const u = (n) => {
      if (!n.isVisible || !n.geometry || !n.material || n.material.type === b.SKYBOX) {
        if (n.children) for (const E of n.children) u(E);
        return;
      }
      const g = n.material;
      let f = this.cache.get(n.geometry);
      f || (f = new tt(this.gl, n.geometry), this.cache.set(n.geometry, f)), f.bind(this.locs.pos, this.locs.norm, this.locs.uv), this.locs.model && this.gl.uniformMatrix4fv(this.locs.model, !1, n.worldMatrix.data), this.locs.color && this.gl.uniform4fv(this.locs.color, g.color.toArray());
      let y = -1, R = [0, 0, 0, 0], m = this.defaultTexture, d = [0, 0], v = [1, 1];
      if (g.type === b.LAMBERT)
        y = 0;
      else if (g.type === b.PHONG) {
        const E = g;
        y = E.shininess || 32, R = E.specularColor ? E.specularColor.toArray() : [0, 0, 0, 0], E.diffuseMap && (m = this.getWebGLTexture(E.diffuseMap), d = [E.diffuseMap.offset.x, E.diffuseMap.offset.y], v = [E.diffuseMap.repeat.x, E.diffuseMap.repeat.y]);
      }
      this.gl.activeTexture(this.gl.TEXTURE0), this.gl.bindTexture(this.gl.TEXTURE_2D, m), this.locs.diffuseMap && this.gl.uniform1i(this.locs.diffuseMap, 0), this.locs.texOffset && this.gl.uniform2fv(this.locs.texOffset, d), this.locs.texRepeat && this.gl.uniform2fv(this.locs.texRepeat, v), this.locs.shininess && this.gl.uniform1f(this.locs.shininess, y), this.locs.specColor && this.gl.uniform4fv(this.locs.specColor, R);
      const L = g.type === b.WIREFRAME ? this.gl.LINES : this.gl.TRIANGLES;
      if (this.gl.drawElements(L, f.count, this.gl.UNSIGNED_SHORT, 0), n.children) for (const E of n.children) u(E);
    };
    for (const n of t.objects) u(n);
  }
}
class vt extends ot {
  type = C.WEB_GPU;
  adapter = null;
  device = null;
  context;
  format;
  pipelineTriangles;
  pipelineLines;
  pipelineSkybox;
  objBGL;
  texBGL;
  skyTexBGL;
  defaultTexBindGroup;
  defaultCubeTexBindGroup;
  sampler;
  geoCache = /* @__PURE__ */ new Map();
  // NEU: alb (Area Light Buffer) hinzugefügt
  objCache = /* @__PURE__ */ new Map();
  texCache = /* @__PURE__ */ new Map();
  texCubeCache = /* @__PURE__ */ new Map();
  samplerCache = /* @__PURE__ */ new Map();
  depthTexture;
  async initialize(t) {
    this.adapter = await navigator.gpu.requestAdapter(), this.device = await this.adapter.requestDevice(), this.context = t.getContext("webgpu"), this.format = navigator.gpu.getPreferredCanvasFormat(), this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: "premultiplied"
    }), this.sampler = this.device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
      addressModeU: "repeat",
      addressModeV: "repeat"
    });
    const e = this.device.createShaderModule({
      code: `
          // U-Struct um numAL erweitert
          struct U { vp: mat4x4f, model: mat4x4f, color: vec4f, specCol: vec4f, amb: vec4f, dCol: vec4f, dDir: vec4f, cam: vec4f, tOff: vec2f, tRep: vec2f, shininess: f32, numPL: f32, numSL: f32, numAL: f32 }
          @group(0) @binding(0) var<uniform> u: U;
          
          struct PL { pos: vec4f, col: vec4f }
          @group(0) @binding(1) var<storage> pLights: array<PL>;
          
          struct SL { pos: vec4f, dir: vec4f, col: vec4f, params: vec4f }
          @group(0) @binding(2) var<storage> sLights: array<SL>;
          
          // NEU: AL Struct und Binding für AreaLights
          struct AL { pos: vec4f, col: vec4f, right: vec4f, up: vec4f, normal: vec4f, size: vec4f }
          @group(0) @binding(3) var<storage> aLights: array<AL>;

          @group(1) @binding(0) var t: texture_2d<f32>;
          @group(1) @binding(1) var s: sampler;
          
          struct Out { @builtin(position) p: vec4f, @location(0) wp: vec3f, @location(1) n: vec3f, @location(2) uv: vec2f }
          
          @vertex fn vs(@location(0) p: vec3f, @location(1) n: vec3f, @location(2) uv: vec2f) -> Out {
            var o: Out; let worldP = u.model * vec4f(p, 1.0); o.p = u.vp * worldP; o.wp = worldP.xyz;
            o.n = (u.model * vec4f(n, 0.0)).xyz; o.uv = (uv * u.tRep) + u.tOff; return o;
          }
          
          @fragment fn fs(i: Out) -> @location(0) vec4f {
            let texCol = textureSample(t, s, i.uv);
            if (u.shininess < -0.5) { return u.color * texCol; }
            
            let N = normalize(i.n); let V = normalize(u.cam.xyz - i.wp); var fL = u.amb.xyz; var spec = vec3f(0.0);
            
            // Directional Light
            let L_dir = normalize(u.dDir.xyz); let diff_dir = max(dot(N, L_dir), 0.0); fL += diff_dir * u.dCol.xyz;
            if (u.shininess > 0.0 && diff_dir > 0.0) { spec += pow(max(dot(V, reflect(-L_dir, N)), 0.0), u.shininess) * u.dCol.xyz; }
            
            // Point Lights
            for(var j=0u; j<u32(u.numPL); j++) {
              let lVec = pLights[j].pos.xyz - i.wp; let d = length(lVec); let L = lVec/d;
              let atten = 1.0 / (1.0 + 0.1*d + 0.01*d*d); let diff = max(dot(N, L), 0.0); fL += diff * pLights[j].col.xyz * atten;
              if (u.shininess > 0.0 && diff > 0.0) { spec += pow(max(dot(V, reflect(-L, N)), 0.0), u.shininess) * pLights[j].col.xyz * atten; }
            }
            
            // Spot Lights
            for(var j=0u; j<u32(u.numSL); j++) {
              let lVec = sLights[j].pos.xyz - i.wp; let d = length(lVec); let L = lVec/d; let S = normalize(sLights[j].dir.xyz); let theta = dot(-L, S);
              if(theta > sLights[j].params.x) {
                let sEff = smoothstep(sLights[j].params.x, sLights[j].params.y, theta);
                let atten = 1.0 / (1.0 + 0.1*d + 0.01*d*d); let diff = max(dot(N, L), 0.0); fL += diff * sLights[j].col.xyz * atten * sEff;
                if (u.shininess > 0.0 && diff > 0.0) { spec += pow(max(dot(V, reflect(-L, N)), 0.0), u.shininess) * sLights[j].col.xyz * atten * sEff; }
              }
            }

            // NEU: Area Lights (Representative Point Approximation in WGSL)
            for(var j=0u; j<u32(u.numAL); j++) {
              let L_center = aLights[j].pos.xyz;
              let L_normal = normalize(aLights[j].normal.xyz);
              let dirFromLight = i.wp - L_center;
              
              if(dot(dirFromLight, L_normal) >= 0.0) {
                let L_right = normalize(aLights[j].right.xyz);
                let L_up = normalize(aLights[j].up.xyz);
                let size = aLights[j].size.xy;

                let projX = clamp(dot(dirFromLight, L_right), -size.x, size.x);
                let projY = clamp(dot(dirFromLight, L_up), -size.y, size.y);

                let closestPoint = L_center + L_right * projX + L_up * projY;
                let lightVec = closestPoint - i.wp; 
                let dist = length(lightVec); 
                let L_al = lightVec / (dist + 0.0001);

                let atten = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist); 
                let diff_al = max(dot(N, L_al), 0.0);
                
                fL += diff_al * aLights[j].col.xyz * atten;
                if (u.shininess > 0.0 && diff_al > 0.0) {
                    spec += pow(max(dot(V, reflect(-L_al, N)), 0.0), u.shininess) * aLights[j].col.xyz * atten;
                }
              }
            }

            return vec4f((fL * u.color.rgb * texCol.rgb) + (spec * u.specCol.rgb), u.color.a * texCol.a);
          }
        `
    }), i = this.device.createShaderModule({
      code: `
          struct U { vp: mat4x4f, model: mat4x4f, color: vec4f, specCol: vec4f, amb: vec4f, dCol: vec4f, dDir: vec4f, cam: vec4f, tOff: vec2f, tRep: vec2f, shininess: f32, numPL: f32, numSL: f32, numAL: f32 }
          @group(0) @binding(0) var<uniform> u: U;
          @group(1) @binding(0) var t: texture_cube<f32>; @group(1) @binding(1) var s: sampler;
          struct Out { @builtin(position) p: vec4f, @location(0) uvw: vec3f }
          @vertex fn vs(@location(0) p: vec3f) -> Out {
            var o: Out; o.uvw = p; o.p = u.vp * u.model * vec4f(p, 1.0); return o;
          }
          @fragment fn fs(i: Out) -> @location(0) vec4f { return textureSample(t, s, i.uvw); }
        `
    });
    this.objBGL = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
        { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } }
      ]
    }), this.texBGL = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } }
      ]
    }), this.skyTexBGL = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { viewDimension: "cube" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } }
      ]
    });
    const s = this.device.createPipelineLayout({ bindGroupLayouts: [this.objBGL, this.texBGL] }), r = this.device.createPipelineLayout({ bindGroupLayouts: [this.objBGL, this.skyTexBGL] }), o = {
      vertex: {
        module: e,
        buffers: [
          { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
          { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] },
          { arrayStride: 8, attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }] }
        ]
      },
      fragment: { module: e, targets: [{ format: this.format }] },
      primitive: { topology: "triangle-list", cullMode: "back" },
      depthStencil: { depthWriteEnabled: !0, depthCompare: "less", format: "depth24plus" },
      layout: s
    };
    this.pipelineTriangles = this.device.createRenderPipeline(o), o.primitive.topology = "line-list", this.pipelineLines = this.device.createRenderPipeline(o), this.pipelineSkybox = this.device.createRenderPipeline({
      vertex: { module: i, buffers: [o.vertex.buffers[0]] },
      fragment: { module: i, targets: [{ format: this.format }] },
      primitive: { topology: "triangle-list" },
      depthStencil: { depthWriteEnabled: !1, depthCompare: "less", format: "depth24plus" },
      layout: r
    });
    const h = this.device.createTexture({
      size: [1, 1],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    });
    this.device.queue.writeTexture({ texture: h }, new Uint8Array([255, 255, 255, 255]), { bytesPerRow: 4 }, [1, 1]), this.defaultTexBindGroup = this.device.createBindGroup({
      layout: this.texBGL,
      entries: [
        { binding: 0, resource: h.createView() },
        { binding: 1, resource: this.sampler }
      ]
    });
    const c = this.device.createTexture({
      size: [1, 1, 6],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    });
    for (let l = 0; l < 6; l++)
      this.device.queue.writeTexture({ texture: c, origin: [0, 0, l] }, new Uint8Array([50, 50, 100, 255]), { bytesPerRow: 4 }, [1, 1]);
    this.defaultCubeTexBindGroup = this.device.createBindGroup({
      layout: this.skyTexBGL,
      entries: [
        { binding: 0, resource: c.createView({ dimension: "cube" }) },
        { binding: 1, resource: this.sampler }
      ]
    }), this.setSize(t.clientWidth, t.clientHeight);
  }
  getSampler(t) {
    const e = `${t.addressModeU}_${t.addressModeV}_${t.magFilter}_${t.minFilter}`;
    if (!this.samplerCache.has(e)) {
      const i = this.device.createSampler({
        addressModeU: t.addressModeU,
        addressModeV: t.addressModeV,
        magFilter: t.magFilter,
        minFilter: t.minFilter,
        mipmapFilter: "linear"
      });
      this.samplerCache.set(e, i);
    }
    return this.samplerCache.get(e);
  }
  setSize(t, e) {
    if (!this.device) return;
    const i = devicePixelRatio;
    this.context.canvas.width = t * i, this.context.canvas.height = e * i, this.depthTexture = this.device.createTexture({
      size: [this.context.canvas.width, this.context.canvas.height],
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT
    });
  }
  getGeoCache(t) {
    let e = this.geoCache.get(t);
    if (!e) {
      const i = (s, r) => {
        const o = this.device.createBuffer({ size: s.byteLength + 3 & -4, usage: r, mappedAtCreation: !0 });
        return s instanceof Float32Array ? new Float32Array(o.getMappedRange()).set(s) : s instanceof Uint16Array ? new Uint16Array(o.getMappedRange()).set(s) : new Uint32Array(o.getMappedRange()).set(s), o.unmap(), o;
      };
      e = {
        vb: i(t.vertices, GPUBufferUsage.VERTEX),
        nb: t.normals ? i(t.normals, GPUBufferUsage.VERTEX) : null,
        uvb: t.uvs ? i(t.uvs, GPUBufferUsage.VERTEX) : null,
        ib: t.indices ? i(t.indices, GPUBufferUsage.INDEX) : null,
        indexCount: t.indices ? t.indices.length : 0,
        vertexCount: t.vertices.length / 3,
        format: t.indices ? t.indices instanceof Uint16Array ? "uint16" : "uint32" : null
      }, this.geoCache.set(t, e);
    }
    return e;
  }
  getObjCache(t) {
    let e = this.objCache.get(t);
    if (!e) {
      const i = this.device.createBuffer({ size: 1024, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }), s = this.device.createBuffer({ size: 512, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST }), r = this.device.createBuffer({ size: 1024, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST }), o = this.device.createBuffer({ size: 1024, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST }), h = this.device.createBindGroup({
        layout: this.objBGL,
        entries: [
          { binding: 0, resource: { buffer: i } },
          { binding: 1, resource: { buffer: s } },
          { binding: 2, resource: { buffer: r } },
          { binding: 3, resource: { buffer: o } }
          // <-- NEU
        ]
      });
      e = { ub: i, plb: s, slb: r, alb: o, bg: h }, this.objCache.set(t, e);
    }
    return e;
  }
  getGPUTextureBindGroup(t) {
    if (!t.isLoaded || !t.image) return this.defaultTexBindGroup;
    let e = this.texCache.get(t);
    if (!e) {
      const i = this.device.createTexture({
        size: [t.image.width, t.image.height],
        format: "rgba8unorm",
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
      });
      this.device.queue.copyExternalImageToTexture({ source: t.image }, { texture: i }, [t.image.width, t.image.height]);
      const s = this.getSampler(t);
      e = this.device.createBindGroup({
        layout: this.texBGL,
        entries: [
          { binding: 0, resource: i.createView() },
          { binding: 1, resource: s }
        ]
      }), this.texCache.set(t, e);
    }
    return e;
  }
  getGPUCubeTextureBindGroup(t) {
    if (!t.isLoaded || t.images.length !== 6) return this.defaultCubeTexBindGroup;
    let e = this.texCubeCache.get(t);
    if (!e) {
      const i = t.images[0], s = this.device.createTexture({
        size: [i.width, i.height, 6],
        format: "rgba8unorm",
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
      });
      for (let r = 0; r < 6; r++)
        this.device.queue.copyExternalImageToTexture({ source: t.images[r] }, { texture: s, origin: [0, 0, r] }, [i.width, i.height]);
      e = this.device.createBindGroup({
        layout: this.skyTexBGL,
        entries: [
          { binding: 0, resource: s.createView({ dimension: "cube" }) },
          { binding: 1, resource: this.sampler }
        ]
      }), this.texCubeCache.set(t, e);
    }
    return e;
  }
  render(t, e, i = new P()) {
    if (!this.device) return;
    const s = this.device.createCommandEncoder(), r = s.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: this.clearColor,
          loadOp: "clear",
          storeOp: "store"
        }
      ],
      depthStencilAttachment: {
        view: this.depthTexture.createView(),
        depthClearValue: 1,
        depthLoadOp: "clear",
        depthStoreOp: "store"
      }
    }), { aCol: o, dDir: h, dCol: c, pLights: l, sLights: p, aLights: u } = this.extractLights(t), n = new Float32Array(160);
    n.set(e, 0), n.set([o.r, o.g, o.b, 1], 40), n.set([c.r, c.g, c.b, 1], 44), n.set([h.x, h.y, h.z, 0], 48), n.set([i.x, i.y, i.z, 0], 52), n[61] = l.length, n[62] = p.length, n[63] = u.length;
    const g = new Float32Array(32);
    for (let m = 0; m < l.length; m++) {
      const d = l[m];
      g.set([d.worldMatrix.data[12], d.worldMatrix.data[13], d.worldMatrix.data[14], 0], m * 8), g.set([d.color.r * d.intensity, d.color.g * d.intensity, d.color.b * d.intensity, 0], m * 8 + 4);
    }
    const f = new Float32Array(64);
    for (let m = 0; m < p.length; m++) {
      const d = p[m], v = m * 16;
      f.set([d.worldMatrix.data[12], d.worldMatrix.data[13], d.worldMatrix.data[14], 0], v);
      const L = d.direction.clone().normalize();
      f.set([L.x, L.y, L.z, 0], v + 4), f.set([d.color.r * d.intensity, d.color.g * d.intensity, d.color.b * d.intensity, 0], v + 8), f.set([Math.cos(d.angle), Math.cos(d.angle * (1 - d.penumbra)), d.distance, d.decay], v + 12);
    }
    const y = new Float32Array(96);
    for (let m = 0; m < u.length; m++) {
      const d = u[m], v = d.worldMatrix.data, L = m * 24;
      y.set([v[12], v[13], v[14], 0], L), y.set([d.color.r * d.intensity, d.color.g * d.intensity, d.color.b * d.intensity, 0], L + 4), y.set([v[0], v[1], v[2], 0], L + 8), y.set([v[4], v[5], v[6], 0], L + 12), y.set([v[8], v[9], v[10], 0], L + 16), y.set([d.width / 2, d.height / 2, 0, 0], L + 20);
    }
    const R = (m) => {
      if (!m.isVisible || !m.geometry || !m.material) return;
      const d = m.material;
      let v = this.defaultTexBindGroup, L = -1, E = [0, 0, 0, 0], S = [0, 0], F = [1, 1];
      if (d.type === b.SKYBOX) {
        r.setPipeline(this.pipelineSkybox);
        const T = d;
        v = T.cubeMap ? this.getGPUCubeTextureBindGroup(T.cubeMap) : this.defaultCubeTexBindGroup;
      } else if (r.setPipeline(d.type === b.WIREFRAME ? this.pipelineLines : this.pipelineTriangles), d.type === b.LAMBERT)
        L = 0;
      else if (d.type === b.PHONG) {
        const T = d;
        L = T.shininess || 32, E = T.specularColor ? T.specularColor.toArray() : [0, 0, 0, 0], T.diffuseMap && (v = this.getGPUTextureBindGroup(T.diffuseMap), S = [T.diffuseMap.offset.x, T.diffuseMap.offset.y], F = [T.diffuseMap.repeat.x, T.diffuseMap.repeat.y]);
      }
      n.set(m.worldMatrix.data, 16), n.set(d.color.toArray(), 32), n.set(E, 36), n.set(S, 56), n.set(F, 58), n[60] = L;
      const G = this.getObjCache(m);
      this.device.queue.writeBuffer(G.ub, 0, n), this.device.queue.writeBuffer(G.plb, 0, g), this.device.queue.writeBuffer(G.slb, 0, f), this.device.queue.writeBuffer(G.alb, 0, y);
      const A = this.getGeoCache(m.geometry);
      if (r.setBindGroup(0, G.bg), r.setBindGroup(1, v), r.setVertexBuffer(0, A.vb), r.setVertexBuffer(1, A.nb ? A.nb : A.vb), r.setVertexBuffer(2, A.uvb ? A.uvb : A.vb), A.ib && A.format ? (r.setIndexBuffer(A.ib, A.format), r.drawIndexed(A.indexCount)) : r.draw(A.vertexCount), m.children) for (const T of m.children) R(T);
    };
    for (const m of t.objects || []) R(m);
    r.end(), this.device.queue.submit([s.finish()]);
  }
}
class xt {
  static async create(t, e) {
    let i = t;
    i === C.BEST && (i = navigator.gpu ? C.WEB_GPU : C.WEB_GL2);
    let s;
    switch (i) {
      case C.WEB_GPU:
        navigator.gpu ? s = new vt() : s = new it();
        break;
      case C.WEB_GL2:
        s = new it();
        break;
      case C.WEB_GL1:
        s = new Lt();
        break;
      default:
        s = new it();
        break;
    }
    return await s.initialize(e), s;
  }
}
class st {
  static _ctx = null;
  static getCtx() {
    if (!this._ctx) {
      const t = document.createElement("canvas");
      t.width = 1, t.height = 1, this._ctx = t.getContext("2d", { willReadFrequently: !0 });
    }
    return this._ctx;
  }
  static fromCSS(t) {
    const e = this.getCtx();
    if (!e) return new _(1, 1, 1, 1);
    e.fillStyle = t, e.fillRect(0, 0, 1, 1);
    const [i, s, r, o] = e.getImageData(0, 0, 1, 1).data;
    return new _(i / 255, s / 255, r / 255, o / 255);
  }
}
class Dt {
  config;
  activeRenderer;
  constructor() {
  }
  async init(t) {
    try {
      const e = await fetch(t);
      if (!e.ok)
        throw new Error(`Konfigurationsdatei nicht gefunden: ${t}`);
      this.config = await e.json(), this.config.rendererType || (this.config.rendererType = mt);
      const i = document.getElementById(this.config.canvasId);
      if (!i)
        throw new Error(`Canvas mit ID '${this.config.canvasId}' wurde nicht im DOM gefunden.`);
      this.activeRenderer = await xt.create(this.config.rendererType, i), this.config.skyColor ? this.activeRenderer.setClearColor(st.fromCSS(this.config.skyColor)) : this.activeRenderer.setClearColor(st.fromCSS("#111111"));
    } catch (e) {
      throw console.error("[SmallWorld] Initialisierung fehlgeschlagen:", e), e;
    }
  }
}
class D {
  vertices = new Float32Array();
  indices = new Uint16Array();
  normals = new Float32Array();
  uvs = new Float32Array();
  getGeometryData() {
    return this.normals.length === 0 && this.vertices.length > 0 && this.computeNormals(), this.uvs.length === 0 && this.vertices.length > 0 && (this.uvs = new Float32Array(this.vertices.length / 3 * 2)), {
      vertices: this.vertices,
      indices: this.indices,
      normals: this.normals,
      uvs: this.uvs
      // <--- NEU
    };
  }
  computeNormals() {
    if (this.normals = new Float32Array(this.vertices.length), this.indices.length % 3 !== 0) {
      for (let t = 0; t < this.normals.length; t += 3)
        this.normals[t] = 0, this.normals[t + 1] = 1, this.normals[t + 2] = 0;
      return;
    }
    for (let t = 0; t < this.indices.length; t += 3) {
      const e = this.indices[t] * 3, i = this.indices[t + 1] * 3, s = this.indices[t + 2] * 3, r = this.vertices[e], o = this.vertices[e + 1], h = this.vertices[e + 2], c = this.vertices[i], l = this.vertices[i + 1], p = this.vertices[i + 2], u = this.vertices[s], n = this.vertices[s + 1], g = this.vertices[s + 2], f = c - r, y = l - o, R = p - h, m = u - r, d = n - o, v = g - h, L = y * v - R * d, E = R * m - f * v, S = f * d - y * m;
      this.normals[e] += L, this.normals[e + 1] += E, this.normals[e + 2] += S, this.normals[i] += L, this.normals[i + 1] += E, this.normals[i + 2] += S, this.normals[s] += L, this.normals[s + 1] += E, this.normals[s + 2] += S;
    }
    for (let t = 0; t < this.normals.length; t += 3) {
      const e = this.normals[t], i = this.normals[t + 1], s = this.normals[t + 2], r = Math.sqrt(e * e + i * i + s * s);
      r > 0 && (this.normals[t] /= r, this.normals[t + 1] /= r, this.normals[t + 2] /= r);
    }
  }
  applyMatrix4(t) {
    const e = new P();
    for (let i = 0; i < this.vertices.length; i += 3)
      e.x = this.vertices[i], e.y = this.vertices[i + 1], e.z = this.vertices[i + 2], t.transformVector(e), this.vertices[i] = e.x, this.vertices[i + 1] = e.y, this.vertices[i + 2] = e.z;
    return this.computeNormals(), this;
  }
  scale(t) {
    const e = new x();
    return x.scale(t, e), this.applyMatrix4(e);
  }
  rotateX(t) {
    const e = new x();
    return x.rotateX(t, e), this.applyMatrix4(e);
  }
  rotateY(t) {
    const e = new x();
    return x.rotateY(t, e), this.applyMatrix4(e);
  }
  rotateZ(t) {
    const e = new x();
    return x.rotateZ(t, e), this.applyMatrix4(e);
  }
}
class _t extends D {
  constructor(t, e, i, s) {
    super(), this.vertices = new Float32Array(t), this.uvs = new Float32Array(e), this.normals = new Float32Array(i), this.indices = new Uint16Array(s), this.normals.length === 0 && this.computeNormals();
  }
  generateGeometryData() {
  }
}
class yt {
  _listeners = /* @__PURE__ */ new Map();
  // Wir erlauben 'string | EventType' für maximale Flexibilität und Typsicherheit
  addEventListener(t, e) {
    const i = t;
    this._listeners.has(i) || this._listeners.set(i, []), this._listeners.get(i).push(e);
  }
  removeEventListener(t, e) {
    const i = t, s = this._listeners.get(i);
    if (s) {
      const r = s.indexOf(e);
      r !== -1 && s.splice(r, 1);
    }
  }
  dispatchEvent(t, e = {}) {
    const i = t, s = this._listeners.get(i);
    if (s) {
      e.type = i;
      const r = s.slice(0);
      for (const o of r)
        o(e);
    }
  }
}
class O extends yt {
  basePath = "";
  setBasePath(t) {
    return this.basePath = t, this;
  }
}
var w = /* @__PURE__ */ ((a) => (a.LOADER_END = "LoaderEnd", a.LOADER_ERROR = "LoaderError", a.LOADER_PROGRESS = "LoaderProgress", a.LOADER_START = "LoaderStart", a))(w || {});
class N {
  uuid = crypto.randomUUID();
  color = _.WHITE;
}
class nt extends N {
  type = b.PHONG;
  specularColor = _.WHITE;
  shininess = 32;
  diffuseMap = null;
}
class Et extends O {
  async load(t) {
    const e = this.basePath + t;
    this.dispatchEvent(w.LOADER_START, { url: e });
    try {
      const i = await z.loadText(e, (r, o) => {
        this.dispatchEvent(w.LOADER_PROGRESS, { url: e, loaded: r, total: o });
      }), s = this.parse(i);
      return this.dispatchEvent(w.LOADER_END, { url: e, data: s }), s;
    } catch (i) {
      throw this.dispatchEvent(w.LOADER_ERROR, { url: e, error: i }), i;
    }
  }
  parse(t) {
    const e = /* @__PURE__ */ new Map();
    let i = null;
    const s = t.split(`
`);
    for (let r of s) {
      if (r = r.trim(), r.length === 0 || r.startsWith("#")) continue;
      const o = r.split(/\s+/), h = o[0];
      h === "newmtl" ? (i = new nt(), e.set(o[1], i)) : h === "Kd" && i ? i.color = new _(
        parseFloat(o[1]),
        parseFloat(o[2]),
        parseFloat(o[3])
      ) : h === "Ks" && i ? i.specularColor = new _(
        parseFloat(o[1]),
        parseFloat(o[2]),
        parseFloat(o[3])
      ) : h === "Ns" && i && (i.shininess = parseFloat(o[1]));
    }
    return e;
  }
}
class rt {
  constructor(t) {
    this.name = t;
  }
  outVertices = [];
  outUVs = [];
  outNormals = [];
  outIndices = [];
  vertexCache = /* @__PURE__ */ new Map();
  indexCounter = 0;
}
class Gt extends O {
  async load(t) {
    const e = this.basePath + t;
    this.dispatchEvent(w.LOADER_START, { url: e });
    try {
      const i = await z.loadText(e, (o, h) => {
        this.dispatchEvent(w.LOADER_PROGRESS, { url: e, loaded: o, total: h });
      }), s = e.substring(0, e.lastIndexOf("/") + 1), r = await this.parse(i, s);
      return this.dispatchEvent(w.LOADER_END, { url: e, data: r }), r;
    } catch (i) {
      throw this.dispatchEvent(w.LOADER_ERROR, { url: e, error: i }), i;
    }
  }
  async parse(t, e) {
    const i = [], s = [], r = [];
    let o = /* @__PURE__ */ new Map();
    const h = /* @__PURE__ */ new Map();
    let c = new rt("default");
    h.set("default", c);
    const l = t.split(`
`);
    for (let u of l) {
      if (u = u.trim(), u.length === 0 || u.startsWith("#")) continue;
      const n = u.split(/\s+/), g = n[0];
      if (g === "mtllib")
        o = await new Et().load(e + n[1]);
      else if (g === "usemtl") {
        const f = n[1];
        h.has(f) || h.set(f, new rt(f)), c = h.get(f);
      } else if (g === "v")
        i.push(parseFloat(n[1]), parseFloat(n[2]), parseFloat(n[3]));
      else if (g === "vt")
        s.push(parseFloat(n[1]), parseFloat(n[2]));
      else if (g === "vn")
        r.push(parseFloat(n[1]), parseFloat(n[2]), parseFloat(n[3]));
      else if (g === "f") {
        const f = n.slice(1);
        for (let y = 1; y < f.length - 1; y++) {
          const R = this.parseFaceVertex(
            f[0],
            i,
            s,
            r,
            c
          ), m = this.parseFaceVertex(
            f[y],
            i,
            s,
            r,
            c
          ), d = this.parseFaceVertex(
            f[y + 1],
            i,
            s,
            r,
            c
          );
          c.outIndices.push(R, m, d);
        }
      }
    }
    const p = new K("ModelRoot");
    return h.forEach((u, n) => {
      if (u.outIndices.length === 0) return;
      const g = new K(n);
      g.geometry = new _t(
        u.outVertices,
        u.outUVs,
        u.outNormals,
        u.outIndices
      ).getGeometryData(), g.material = o.get(n) || new nt(), p.add(g);
    }), p;
  }
  parseFaceVertex(t, e, i, s, r) {
    if (r.vertexCache.has(t)) return r.vertexCache.get(t);
    const o = t.split("/"), h = (parseInt(o[0]) - 1) * 3;
    if (r.outVertices.push(e[h], e[h + 1], e[h + 2]), o.length > 1 && o[1] !== "") {
      const l = (parseInt(o[1]) - 1) * 2;
      r.outUVs.push(i[l], i[l + 1]);
    } else
      r.outUVs.push(0, 0);
    if (o.length > 2) {
      const l = (parseInt(o[2]) - 1) * 3;
      r.outNormals.push(s[l], s[l + 1], s[l + 2]);
    }
    const c = r.indexCounter++;
    return r.vertexCache.set(t, c), c;
  }
}
class ht {
  uuid = crypto.randomUUID();
  images = [];
  isLoaded = !1;
  constructor(t) {
    t && t.length === 6 && this.load(t);
  }
  async load(t) {
    try {
      this.images = await Promise.all(t.map((e) => z.loadImage(e))), this.isLoaded = !0;
    } catch (e) {
      console.error("Fehler beim Laden der CubeTexture", e);
    }
  }
}
class Ft extends O {
  async load(t) {
    const e = this.basePath + t;
    this.dispatchEvent("loadStart", { url: e });
    try {
      const i = await z.loadImage(
        e,
        (p, u) => this.dispatchEvent(w.LOADER_PROGRESS, { url: e, loaded: p, total: u }),
        !1
      ), s = i.width / 4, r = document.createElement("canvas");
      r.width = s, r.height = s;
      const o = r.getContext("2d", { willReadFrequently: !0 }), h = [
        { col: 2, row: 1 },
        // 0: +x
        { col: 0, row: 1 },
        // 1: -x
        { col: 1, row: 0 },
        // 2: +y
        { col: 1, row: 2 },
        // 3: -y
        { col: 1, row: 1 },
        // 4: +z
        { col: 3, row: 1 }
        // 5: -z
      ], c = [];
      for (const p of h) {
        o.clearRect(0, 0, s, s), o.drawImage(
          i,
          // Type-Cast für TypeScript
          p.col * s,
          p.row * s,
          s,
          s,
          0,
          0,
          s,
          s
        );
        const u = await createImageBitmap(r);
        c.push(u);
      }
      const l = new ht();
      return l.images = c, l.isLoaded = !0, this.dispatchEvent(w.LOADER_END, { url: e, data: l }), l;
    } catch (i) {
      throw this.dispatchEvent(w.LOADER_ERROR, { url: e, error: i }), i;
    }
  }
}
class bt extends D {
  constructor(t = 1) {
    super(), this.size = t, this.generateGeometryData();
  }
  generateGeometryData() {
    const t = this.size / 2;
    this.vertices = new Float32Array([
      // Front
      -t,
      -t,
      t,
      t,
      -t,
      t,
      t,
      t,
      t,
      -t,
      t,
      t,
      // Back
      t,
      -t,
      -t,
      -t,
      -t,
      -t,
      -t,
      t,
      -t,
      t,
      t,
      -t,
      // Top
      -t,
      t,
      t,
      t,
      t,
      t,
      t,
      t,
      -t,
      -t,
      t,
      -t,
      // Bottom
      -t,
      -t,
      -t,
      t,
      -t,
      -t,
      t,
      -t,
      t,
      -t,
      -t,
      t,
      // Right
      t,
      -t,
      t,
      t,
      -t,
      -t,
      t,
      t,
      -t,
      t,
      t,
      t,
      // Left
      -t,
      -t,
      -t,
      -t,
      -t,
      t,
      -t,
      t,
      t,
      -t,
      t,
      -t
    ]), this.uvs = new Float32Array([
      // Front
      0,
      0,
      1,
      0,
      1,
      1,
      0,
      1,
      // Back
      0,
      0,
      1,
      0,
      1,
      1,
      0,
      1,
      // Top
      0,
      0,
      1,
      0,
      1,
      1,
      0,
      1,
      // Bottom
      0,
      0,
      1,
      0,
      1,
      1,
      0,
      1,
      // Right
      0,
      0,
      1,
      0,
      1,
      1,
      0,
      1,
      // Left
      0,
      0,
      1,
      0,
      1,
      1,
      0,
      1
    ]), this.indices = new Uint16Array([
      0,
      1,
      2,
      0,
      2,
      3,
      // Front
      4,
      5,
      6,
      4,
      6,
      7,
      // Back
      8,
      9,
      10,
      8,
      10,
      11,
      // Top
      12,
      13,
      14,
      12,
      14,
      15,
      // Bottom
      16,
      17,
      18,
      16,
      18,
      19,
      // Right
      20,
      21,
      22,
      20,
      22,
      23
      // Left
    ]), this.computeNormals();
  }
}
class wt extends N {
  type = b.SKYBOX;
  cubeMap = null;
}
class zt extends K {
  constructor(t, e = 100) {
    super("Skybox"), this.geometry = new bt(e).getGeometryData();
    const i = new wt();
    Array.isArray(t) ? i.cubeMap = new ht(t) : i.cubeMap = t, this.material = i, this.frustumCulled = !1;
  }
}
class et {
  constructor(t = 0, e = 0) {
    this.x = t, this.y = e;
  }
  set(t, e) {
    return this.x = t, this.y = e, this;
  }
  add(t) {
    return this.x += t.x, this.y += t.y, this;
  }
  sub(t) {
    return this.x -= t.x, this.y -= t.y, this;
  }
  scale(t) {
    return this.x *= t, this.y *= t, this;
  }
  dot(t) {
    return this.x * t.x + this.y * t.y;
  }
  lengthSq() {
    return this.x * this.x + this.y * this.y;
  }
  length() {
    return Math.sqrt(this.lengthSq());
  }
  distanceToSq(t) {
    const e = this.x - t.x, i = this.y - t.y;
    return e * e + i * i;
  }
  distanceTo(t) {
    return Math.sqrt(this.distanceToSq(t));
  }
  clone() {
    return new et(this.x, this.y);
  }
  /**
   * Normalisiert den Vektor auf eine Länge von 1 (Einheitsvektor).
   * @returns this (für Method Chaining)
   */
  normalize() {
    const t = this.length();
    if (t > 1e-6) {
      const e = 1 / t;
      this.x *= e, this.y *= e;
    } else
      this.x = 0, this.y = 0;
    return this;
  }
}
class It {
  uuid = crypto.randomUUID();
  image = null;
  isLoaded = !1;
  // --- NEU: Sampler-Konfiguration ---
  // Wir nutzen Strings, die WebGPU direkt versteht ("repeat", "clamp-to-edge", "mirror-repeat")
  addressModeU = "repeat";
  addressModeV = "repeat";
  // Filter: "linear" (weich) oder "nearest" (pixelig/scharf)
  magFilter = "linear";
  minFilter = "linear";
  offset = new et(0, 0);
  repeat = new et(1, 1);
  constructor(t) {
    t && this.load(t);
  }
  /**
   * Hilfsmethode, um das Wrapping schnell umzustellen
   */
  setWrapMode(t) {
    this.addressModeU = t, this.addressModeV = t;
  }
  /**
   * Hilfsmethode für den Filter-Modus
   */
  setFilterMode(t) {
    this.magFilter = t, this.minFilter = t;
  }
  async load(t) {
    try {
      this.image = await z.loadImage(t), this.isLoaded = !0;
    } catch (e) {
      console.error(`Fehler beim Laden der Textur: ${t}`, e);
    }
  }
}
var Tt = /* @__PURE__ */ ((a) => (a.UP = "ArrowUp", a.DOWN = "ArrowDown", a.LEFT = "ArrowLeft", a.RIGHT = "ArrowRight", a.SPACE = "Space", a.ENTER = "Enter", a.ESCAPE = "Escape", a.TAB = "Tab", a.BACKSPACE = "Backspace", a.SHIFT_L = "ShiftLeft", a.SHIFT_R = "ShiftRight", a.CTRL_L = "ControlLeft", a.CTRL_R = "ControlRight", a.ALT_L = "AltLeft", a.ALT_R = "AltRight", a.D0 = "Digit0", a.D1 = "Digit1", a.D2 = "Digit2", a.D3 = "Digit3", a.D4 = "Digit4", a.D5 = "Digit5", a.D6 = "Digit6", a.D7 = "Digit7", a.D8 = "Digit8", a.D9 = "Digit9", a.A = "KeyA", a.B = "KeyB", a.C = "KeyC", a.D = "KeyD", a.E = "KeyE", a.F = "KeyF", a.G = "KeyG", a.H = "KeyH", a.I = "KeyI", a.J = "KeyJ", a.K = "KeyK", a.L = "KeyL", a.M = "KeyM", a.N = "KeyN", a.O = "KeyO", a.P = "KeyP", a.Q = "KeyQ", a.R = "KeyR", a.S = "KeyS", a.T = "KeyT", a.U = "KeyU", a.V = "KeyV", a.W = "KeyW", a.X = "KeyX", a.Y = "KeyY", a.Z = "KeyZ", a))(Tt || {}), Rt = /* @__PURE__ */ ((a) => (a.LINEAR = "linear", a.NEAREST = "nearest", a))(Rt || {}), At = /* @__PURE__ */ ((a) => (a.REPEAT = "repeat", a.CLAMP_TO_EDGE = "clamp-to-edge", a.MIRRORED_REPEAT = "mirror-repeat", a))(At || {});
class lt {
  matrix = new x();
}
class Ot extends lt {
  constructor(t, e, i, s, r, o) {
    super(), this.l = t, this.r = e, this.b = i, this.t = s, this.n = r, this.f = o, this.update();
  }
  update() {
    x.orthographic(this.l, this.r, this.b, this.t, this.n, this.f, this.matrix);
  }
  getMatrix() {
    return this.matrix;
  }
}
class Nt extends lt {
  constructor(t, e, i, s) {
    super(), this.fov = t, this.aspect = e, this.near = i, this.far = s, this.update();
  }
  update() {
    x.perspective(this.fov, this.aspect, this.near, this.far, this.matrix);
  }
  getMatrix() {
    return this.matrix;
  }
}
class kt extends D {
  constructor(t = 1, e = 2, i = 16) {
    super(), this.radius = t, this.height = e, this.segments = i, this.generateGeometryData();
  }
  generateGeometryData() {
    const t = [], e = [], i = [], s = this.height / 2;
    for (let o = 0; o <= 1; o++) {
      const h = o === 0 ? -s : s, c = o === 0 ? 0 : 1;
      for (let l = 0; l <= this.segments; l++) {
        const p = l / this.segments, u = p * Math.PI * 2;
        t.push(this.radius * Math.sin(u), h, this.radius * Math.cos(u)), e.push(p, c);
      }
    }
    for (let o = 0; o < this.segments; o++) {
      const h = o, c = h + this.segments + 1;
      i.push(h, c, h + 1), i.push(c, c + 1, h + 1);
    }
    let r = t.length / 3;
    t.push(0, s, 0), e.push(0.5, 0.5);
    for (let o = 0; o <= this.segments; o++) {
      const h = o / this.segments * Math.PI * 2;
      t.push(this.radius * Math.sin(h), s, this.radius * Math.cos(h)), e.push(0.5 + Math.sin(h) * 0.5, 0.5 + Math.cos(h) * 0.5);
    }
    for (let o = 0; o < this.segments; o++) i.push(r, r + o + 1, r + o + 2);
    r = t.length / 3, t.push(0, -s, 0), e.push(0.5, 0.5);
    for (let o = 0; o <= this.segments; o++) {
      const h = o / this.segments * Math.PI * 2;
      t.push(this.radius * Math.sin(h), -s, this.radius * Math.cos(h)), e.push(0.5 + Math.sin(h) * 0.5, 0.5 - Math.cos(h) * 0.5);
    }
    for (let o = 0; o < this.segments; o++) i.push(r, r + o + 2, r + o + 1);
    this.vertices = new Float32Array(t), this.uvs = new Float32Array(e), this.indices = new Uint16Array(i), this.computeNormals();
  }
}
class Vt extends D {
  constructor(t = 20, e = 20) {
    super(), this.size = t, this.divisions = e, this.generateGeometryData();
  }
  generateGeometryData() {
    const t = [], e = [], i = [], s = this.size / this.divisions, r = this.size / 2;
    let o = 0;
    for (let h = 0; h <= this.divisions; h++) {
      const c = h * s - r, l = h / this.divisions;
      t.push(c, 0, -r, c, 0, r), e.push(l, 0, l, 1), i.push(o, o + 1), o += 2, t.push(-r, 0, c, r, 0, c), e.push(0, l, 1, l), i.push(o, o + 1), o += 2;
    }
    this.vertices = new Float32Array(t), this.uvs = new Float32Array(e), this.indices = new Uint16Array(i);
  }
}
class Xt extends D {
  constructor(t = 1, e = 1, i = 1, s = 1) {
    super(), this.width = t, this.depth = e, this.widthSegments = i, this.depthSegments = s, this.generateGeometryData();
  }
  generateGeometryData() {
    const t = [], e = [], i = [], s = this.width / 2, r = this.depth / 2;
    for (let o = 0; o <= this.depthSegments; o++) {
      const h = o / this.depthSegments;
      for (let c = 0; c <= this.widthSegments; c++) {
        const l = c / this.widthSegments;
        t.push(l * this.width - s, 0, h * this.depth - r), e.push(l, 1 - h);
      }
    }
    for (let o = 0; o < this.depthSegments; o++)
      for (let h = 0; h < this.widthSegments; h++) {
        const c = h + (this.widthSegments + 1) * o, l = h + (this.widthSegments + 1) * (o + 1), p = h + 1 + (this.widthSegments + 1) * (o + 1), u = h + 1 + (this.widthSegments + 1) * o;
        i.push(c, l, u), i.push(l, p, u);
      }
    this.vertices = new Float32Array(t), this.uvs = new Float32Array(e), this.indices = new Uint16Array(i), this.computeNormals();
  }
}
class Wt extends D {
  constructor(t = 1, e = 1) {
    super(), this.base = t, this.height = e, this.generateGeometryData();
  }
  generateGeometryData() {
    const t = this.base / 2, e = this.height / 2;
    this.vertices = new Float32Array([
      // Vorne
      0,
      e,
      0,
      -t,
      -e,
      t,
      t,
      -e,
      t,
      // Rechts
      0,
      e,
      0,
      t,
      -e,
      t,
      t,
      -e,
      -t,
      // Hinten
      0,
      e,
      0,
      t,
      -e,
      -t,
      -t,
      -e,
      -t,
      // Links
      0,
      e,
      0,
      -t,
      -e,
      -t,
      -t,
      -e,
      t,
      // Boden (2 Dreiecke)
      -t,
      -e,
      t,
      t,
      -e,
      -t,
      t,
      -e,
      t,
      -t,
      -e,
      t,
      -t,
      -e,
      -t,
      t,
      -e,
      -t
    ]), this.uvs = new Float32Array([
      // Vorne
      0.5,
      1,
      0,
      0,
      1,
      0,
      // Rechts
      0.5,
      1,
      0,
      0,
      1,
      0,
      // Hinten
      0.5,
      1,
      0,
      0,
      1,
      0,
      // Links
      0.5,
      1,
      0,
      0,
      1,
      0,
      // Boden
      0,
      1,
      1,
      0,
      1,
      1,
      0,
      1,
      0,
      0,
      1,
      0
    ]), this.indices = new Uint16Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]), this.computeNormals();
  }
}
class jt extends D {
  constructor(t = 1, e = 16, i = 12) {
    super(), this.radius = t, this.widthSegments = e, this.heightSegments = i, this.generateGeometryData();
  }
  generateGeometryData() {
    const t = [], e = [], i = [], s = [];
    for (let r = 0; r <= this.heightSegments; r++) {
      const o = r / this.heightSegments, h = o * Math.PI;
      for (let c = 0; c <= this.widthSegments; c++) {
        const l = c / this.widthSegments, p = l * Math.PI * 2, u = -(this.radius * Math.sin(h) * Math.cos(p)), n = this.radius * Math.cos(h), g = this.radius * Math.sin(h) * Math.sin(p);
        t.push(u, n, g), e.push(u / this.radius, n / this.radius, g / this.radius), i.push(l, 1 - o);
      }
    }
    for (let r = 0; r < this.heightSegments; r++)
      for (let o = 0; o < this.widthSegments; o++) {
        const h = r * (this.widthSegments + 1) + o, c = h + this.widthSegments + 1;
        s.push(h, c, h + 1), s.push(c, c + 1, h + 1);
      }
    this.vertices = new Float32Array(t), this.normals = new Float32Array(e), this.uvs = new Float32Array(i), this.indices = new Uint16Array(s);
  }
}
class Ht extends D {
  constructor(t = 1, e = 0.4, i = 16, s = 32) {
    super(), this.radius = t, this.tube = e, this.radialSegments = i, this.tubularSegments = s, this.generateGeometryData();
  }
  generateGeometryData() {
    const t = [], e = [], i = [];
    for (let s = 0; s <= this.radialSegments; s++) {
      const r = s / this.radialSegments, o = r * Math.PI * 2, h = Math.cos(o), c = Math.sin(o);
      for (let l = 0; l <= this.tubularSegments; l++) {
        const p = l / this.tubularSegments, u = p * Math.PI * 2, n = Math.cos(u), g = Math.sin(u);
        t.push(
          (this.radius + this.tube * h) * n,
          this.tube * c,
          (this.radius + this.tube * h) * g
        ), e.push(p, r);
      }
    }
    for (let s = 1; s <= this.radialSegments; s++)
      for (let r = 1; r <= this.tubularSegments; r++) {
        const o = (this.tubularSegments + 1) * s + r - 1, h = (this.tubularSegments + 1) * (s - 1) + r - 1, c = (this.tubularSegments + 1) * (s - 1) + r, l = (this.tubularSegments + 1) * s + r;
        i.push(o, h, l), i.push(h, c, l);
      }
    this.vertices = new Float32Array(t), this.uvs = new Float32Array(e), this.indices = new Uint16Array(i), this.computeNormals();
  }
}
class Yt extends D {
  constructor(t = 1, e = 32) {
    super(), this.radius = t, this.segments = e, this.generateGeometryData();
  }
  generateGeometryData() {
    const t = [], e = [], i = [];
    for (let s = 0; s < this.segments; s++) {
      const r = s / this.segments * Math.PI * 2, o = Math.cos(r), h = Math.sin(r);
      t.push(o * this.radius, 0, h * this.radius), e.push(0.5 + o * 0.5, 0.5 + h * 0.5), i.push(s, (s + 1) % this.segments);
    }
    this.vertices = new Float32Array(t), this.uvs = new Float32Array(e), this.indices = new Uint16Array(i);
  }
}
class qt extends D {
  constructor(t, e, i) {
    super(), this.pointA = t, this.pointB = e, this.pointC = i, this.generateGeometryData();
  }
  generateGeometryData() {
    this.vertices = new Float32Array([
      this.pointA.x,
      this.pointA.y,
      this.pointA.z,
      this.pointB.x,
      this.pointB.y,
      this.pointB.z,
      this.pointC.x,
      this.pointC.y,
      this.pointC.z
    ]), this.uvs = new Float32Array([0, 0, 1, 0, 0.5, 1]), this.indices = new Uint16Array([0, 1, 1, 2, 2, 0]);
  }
}
class $t extends D {
  constructor(t, e) {
    super(), this.start = t, this.end = e, this.generateGeometryData();
  }
  generateGeometryData() {
    this.vertices = new Float32Array([
      this.start.x,
      this.start.y,
      this.start.z,
      this.end.x,
      this.end.y,
      this.end.z
    ]), this.uvs = new Float32Array([0, 0, 1, 1]), this.indices = new Uint16Array([0, 1]);
  }
}
class Zt extends N {
  type = b.BASIC;
}
class Jt extends N {
  type = b.LAMBERT;
}
class Qt extends N {
  type = b.WIREFRAME;
}
class Kt extends I {
  type = B.AMBIENT;
  constructor(t = new _(1, 1, 1), e = 0.2) {
    super(t, e, "AmbientLight");
  }
}
class te extends I {
  type = B.DIRECTIONAL;
  intensity = 1;
  direction = new P(0, -1, 0).normalize();
  constructor(t = _.WHITE, e = 1) {
    super(t, e, "DirectionalLight");
  }
}
class ee extends I {
  constructor(t = _.WHITE, e = 1, i = 50, s = 2) {
    super(t, e, "PointLight"), this.distance = i, this.decay = s;
  }
  type = B.POINT;
}
class ie extends I {
  constructor(t = _.WHITE, e = 1, i = 50, s = Math.PI / 6, r = 0.5, o = 2) {
    super(t, e, "SpotLight"), this.distance = i, this.angle = s, this.penumbra = r, this.decay = o;
  }
  type = B.SPOT;
  direction = new P(0, -1, 0).normalize();
}
class se extends I {
  constructor(t = _.WHITE, e = 1, i = 5, s = 5) {
    super(t, e, "AreaLight"), this.width = i, this.height = s;
  }
  type = B.AREA;
}
var M = /* @__PURE__ */ ((a) => (a[a.SPHERE = 0] = "SPHERE", a[a.BOX = 1] = "BOX", a))(M || {});
class re {
  constructor(t, e) {
    this.min = t, this.max = e;
    const i = e.clone().sub(t);
    this.broadRadius = i.length() / 2;
  }
  type = M.BOX;
  broadRadius;
  get center() {
    return this.min.clone().add(this.max).scale(0.5);
  }
  getBroadRadius() {
    return this.broadRadius;
  }
}
class oe {
  constructor(t, e) {
    this.center = t, this.radius = e;
  }
  type = M.SPHERE;
  getBroadRadius() {
    return this.radius;
  }
}
class ae {
  static test(t, e) {
    const i = t.center.distanceToSq(e.center), s = t.getBroadRadius() + e.getBroadRadius();
    return i > s * s ? !1 : t.type === M.SPHERE && e.type === M.SPHERE ? this.sphereSphere(t, e) : t.type === M.BOX && e.type === M.BOX ? this.boxBox(t, e) : t.type === M.SPHERE && e.type === M.BOX ? this.sphereBox(t, e) : t.type === M.BOX && e.type === M.SPHERE ? this.sphereBox(e, t) : !1;
  }
  static sphereSphere(t, e) {
    const i = t.center.distanceToSq(e.center), s = (t.radius + e.radius) * (t.radius + e.radius);
    return i <= s;
  }
  static boxBox(t, e) {
    return t.min.x <= e.max.x && t.max.x >= e.min.x && t.min.y <= e.max.y && t.max.y >= e.min.y && t.min.z <= e.max.z && t.max.z >= e.min.z;
  }
  static sphereBox(t, e) {
    return new P(
      Math.max(e.min.x, Math.min(t.center.x, e.max.x)),
      Math.max(e.min.y, Math.min(t.center.y, e.max.y)),
      Math.max(e.min.z, Math.min(t.center.z, e.max.z))
    ).distanceToSq(t.center) <= t.radius * t.radius;
  }
}
class Pt {
  planes = new Float32Array(24);
  setFromMatrix(t) {
    const e = t.data, i = this.planes;
    i[0] = e[3] - e[0], i[1] = e[7] - e[4], i[2] = e[11] - e[8], i[3] = e[15] - e[12], i[4] = e[3] + e[0], i[5] = e[7] + e[4], i[6] = e[11] + e[8], i[7] = e[15] + e[12], i[8] = e[3] + e[1], i[9] = e[7] + e[5], i[10] = e[11] + e[9], i[11] = e[15] + e[13], i[12] = e[3] - e[1], i[13] = e[7] - e[5], i[14] = e[11] - e[9], i[15] = e[15] - e[13], i[16] = e[3] - e[2], i[17] = e[7] - e[6], i[18] = e[11] - e[10], i[19] = e[15] - e[14], i[20] = e[3] + e[2], i[21] = e[7] + e[6], i[22] = e[11] + e[10], i[23] = e[15] + e[14];
    for (let s = 0; s < 6; s++) {
      const r = s * 4, o = Math.sqrt(i[r] * i[r] + i[r + 1] * i[r + 1] + i[r + 2] * i[r + 2]);
      if (o > 0) {
        const h = 1 / o;
        i[r] *= h, i[r + 1] *= h, i[r + 2] *= h, i[r + 3] *= h;
      }
    }
  }
  intersectsVolume(t) {
    const e = t.center, i = t.getBroadRadius(), s = this.planes;
    for (let r = 0; r < 6; r++) {
      const o = r * 4;
      if (s[o] * e.x + s[o + 1] * e.y + s[o + 2] * e.z + s[o + 3] < -i) return !1;
    }
    return !0;
  }
}
class ne {
  static frustum = new Pt();
  static cull(t, e) {
    this.frustum.setFromMatrix(e);
    let i = 0;
    const s = (r) => {
      r.frustumCulled && r.bounds ? r.isVisible = this.frustum.intersectsVolume(r.bounds) : r.isVisible = !0, r.isVisible && i++;
      for (const o of r.children)
        s(o);
    };
    for (const r of t.objects)
      s(r);
    return i;
  }
}
class he extends O {
  async load(t) {
    const e = this.basePath + t;
    this.dispatchEvent(w.LOADER_START, { url: e });
    try {
      const i = await z.loadImage(e, (s, r) => {
        this.dispatchEvent(w.LOADER_PROGRESS, { url: e, loaded: s, total: r });
      });
      return this.dispatchEvent(w.LOADER_END, { url: e, data: i }), i;
    } catch (i) {
      throw this.dispatchEvent(w.LOADER_ERROR, { url: e, error: i }), i;
    }
  }
}
class St extends O {
  async load(t) {
    const e = this.basePath + t;
    this.dispatchEvent(w.LOADER_START, { url: e });
    try {
      const i = await z.loadText(e, (s, r) => {
        this.dispatchEvent(w.LOADER_PROGRESS, { url: e, loaded: s, total: r });
      });
      return this.dispatchEvent(w.LOADER_END, { url: e, data: i }), i;
    } catch (i) {
      throw this.dispatchEvent(w.LOADER_ERROR, { url: e, error: i }), i;
    }
  }
}
class le extends St {
  // Aktuell macht der ShaderLoader genau dasselbe wie der TextLoader.
  // Er ist aber ein eigener Typ, falls wir später WebGPU-Shader-Code
  // direkt hier validieren oder parsen möchten!
}
export {
  I as AbstractLight,
  N as AbstractMaterial,
  Kt as AmbientLight,
  se as AreaLight,
  z as AssetManager,
  Zt as BasicMaterial,
  re as BoundingBox,
  oe as BoundingSphere,
  Mt as Camera,
  U as CameraStrategyType,
  Yt as Circle,
  ae as Collision,
  _ as Color,
  st as ColorUtils,
  bt as Cube,
  ht as CubeTexture,
  kt as Cylinder,
  mt as DEFAULT_RENDERER,
  te as DirectionalLight,
  pt as ENGINE_VERSION,
  yt as EventDispatcher,
  w as EventType,
  ne as FrustumCuller,
  Vt as Grid,
  Ct as HUD,
  he as ImageLoader,
  Ut as Input,
  Tt as Keys,
  Jt as LambertMaterial,
  B as LightType,
  $t as Line,
  O as Loader,
  x as Matrix4,
  _t as ModelGeometry,
  Gt as ObjLoader,
  K as Object3D,
  Ot as OrthographicProjection,
  Nt as PerspectiveProjection,
  nt as PhongMaterial,
  Xt as Plane,
  ee as PointLight,
  Wt as Pyramid,
  C as RendererType,
  Bt as Scene,
  le as ShaderLoader,
  zt as Skybox,
  Ft as SkyboxLoader,
  wt as SkyboxMaterial,
  Dt as SmallWorld,
  jt as Sphere,
  ie as SpotLight,
  St as TextLoader,
  It as Texture,
  Rt as TextureFilter,
  At as TextureWrap,
  Ht as Torus,
  qt as Triangle,
  et as Vector2D,
  P as Vector3D,
  Qt as WireframeMaterial
};
