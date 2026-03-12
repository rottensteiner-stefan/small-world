class G {
  static imageCache = /* @__PURE__ */ new Map();
  static textCache = /* @__PURE__ */ new Map();
  static async fetchWithProgress(t, e) {
    const i = await fetch(t);
    if (!i.ok) throw new Error(`[AssetManager] HTTP Fehler: ${i.status} bei ${t}`);
    const s = i.headers.get("content-length"), r = s ? parseInt(s, 10) : 0;
    if (!e || !i.body)
      return i.blob();
    const o = i.body.getReader();
    let l = 0;
    const h = [];
    for (; ; ) {
      const { done: c, value: f } = await o.read();
      if (c) break;
      f && (l += f.length, h.push(f), e(l, r));
    }
    return new Blob(h);
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
    }).catch((o) => (console.error(o), new Promise((l, h) => {
      const c = new Image();
      c.crossOrigin = "anonymous", c.onload = () => l(c), c.onerror = () => h(`[AssetManager] Fallback fehlgeschlagen: ${t}`), c.src = t;
    })));
    return this.imageCache.set(s, r), r;
  }
  static async loadText(t, e) {
    if (this.textCache.has(t)) return this.textCache.get(t);
    const i = this.fetchWithProgress(t, e).then((s) => s.text());
    return this.textCache.set(t, i), i;
  }
}
class R {
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
    return new R(this.x, this.y, this.z);
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
class v {
  data = new Float32Array(16);
  constructor() {
    this.identity();
  }
  identity() {
    return this.data.fill(0), this.data[0] = 1, this.data[5] = 1, this.data[10] = 1, this.data[15] = 1, this;
  }
  compose(t, e, i) {
    const s = new v();
    v.translate(t, s);
    const r = new v();
    v.rotateX(e.x, r);
    const o = new v();
    v.rotateY(e.y, o);
    const l = new v();
    v.rotateZ(e.z, l);
    const h = new v();
    return h.data[0] = i.x, h.data[5] = i.y, h.data[10] = i.z, v.multiply(s, o, this), v.multiply(this, r, this), v.multiply(this, l, this), v.multiply(this, h, this), this;
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
    const s = t.data, r = e.data, o = i.data, l = s[0], h = s[1], c = s[2], f = s[3], a = s[4], u = s[5], g = s[6], x = s[7], p = s[8], d = s[9], y = s[10], _ = s[11], A = s[12], m = s[13], S = s[14], M = s[15], T = r[0], w = r[1], z = r[2], N = r[3], k = r[4], V = r[5], X = r[6], W = r[7], H = r[8], j = r[9], Y = r[10], q = r[11], $ = r[12], Z = r[13], J = r[14], Q = r[15];
    o[0] = l * T + a * w + p * z + A * N, o[1] = h * T + u * w + d * z + m * N, o[2] = c * T + g * w + y * z + S * N, o[3] = f * T + x * w + _ * z + M * N, o[4] = l * k + a * V + p * X + A * W, o[5] = h * k + u * V + d * X + m * W, o[6] = c * k + g * V + y * X + S * W, o[7] = f * k + x * V + _ * X + M * W, o[8] = l * H + a * j + p * Y + A * q, o[9] = h * H + u * j + d * Y + m * q, o[10] = c * H + g * j + y * Y + S * q, o[11] = f * H + x * j + _ * Y + M * q, o[12] = l * $ + a * Z + p * J + A * Q, o[13] = h * $ + u * Z + d * J + m * Q, o[14] = c * $ + g * Z + y * J + S * Q, o[15] = f * $ + x * Z + _ * J + M * Q;
  }
  static perspective(t, e, i, s, r) {
    const o = 1 / Math.tan(t / 2), l = r.data;
    l.fill(0), l[0] = o / e, l[5] = o, l[10] = s / (i - s), l[11] = -1, l[14] = i * s / (i - s);
  }
  static orthographic(t, e, i, s, r, o, l) {
    const h = l.data;
    h.fill(0), h[0] = 2 / (e - t), h[5] = 2 / (s - i), h[10] = 1 / (r - o), h[12] = -(e + t) / (e - t), h[13] = -(s + i) / (s - i), h[14] = r / (r - o), h[15] = 1;
  }
  static lookAt(t, e, i, s) {
    const r = s.data, o = t.clone().sub(e), l = o.length();
    l > 0 && o.scale(1 / l);
    const h = new R(
      i.y * o.z - i.z * o.y,
      i.z * o.x - i.x * o.z,
      i.x * o.y - i.y * o.x
    ), c = h.length();
    c > 0 && h.scale(1 / c);
    const f = new R(o.y * h.z - o.z * h.y, o.z * h.x - o.x * h.z, o.x * h.y - o.y * h.x);
    r[0] = h.x, r[4] = h.y, r[8] = h.z, r[12] = -h.dot(t), r[1] = f.x, r[5] = f.y, r[9] = f.z, r[13] = -f.dot(t), r[2] = o.x, r[6] = o.y, r[10] = o.z, r[14] = -o.dot(t), r[15] = 1;
  }
  transformVector(t) {
    const e = this.data, i = t.x, s = t.y, r = t.z;
    return t.x = e[0] * i + e[4] * s + e[8] * r + e[12], t.y = e[1] * i + e[5] * s + e[9] * r + e[13], t.z = e[2] * i + e[6] * s + e[10] * r + e[14], t;
  }
}
var U = /* @__PURE__ */ ((n) => (n.FIXED = "FixedCamera", n.STIFF = "StiffCamera", n.SMOOTH = "SmoothCamera", n.FPS = "FPSCamera", n))(U || {});
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
class Pt {
  constructor(t) {
    this.projection = t, this.setStrategy(U.SMOOTH);
  }
  position = new R(0, 10, 20);
  target = new R(0, 0, 0);
  up = new R(0, 1, 0);
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
    v.multiply(this.projection.getMatrix(), t, e);
  }
}
var C = /* @__PURE__ */ ((n) => (n.BEST = "BEST", n.WEB_GPU = "WEB_GPU", n.WEB_GL2 = "WEB_GL2", n.WEB_GL1 = "WEB_GL1", n.CANVAS = "CANVAS", n))(C || {});
const pt = "0.10.1", mt = C.BEST;
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
  position = new R(0, 0, 0);
  rotation = new R(0, 0, 0);
  scale = new R(1, 1, 1);
  localMatrix = new v();
  worldMatrix = new v();
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
    this.localMatrix.compose(this.position, this.rotation, this.scale), this.parent === null ? this.worldMatrix.data.set(this.localMatrix.data) : v.multiply(this.parent.worldMatrix, this.localMatrix, this.worldMatrix);
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
var E = /* @__PURE__ */ ((n) => (n.BASIC = "BasicMaterial", n.LAMBERT = "LabertMaterial", n.PHONG = "PhongMaterial", n.SKYBOX = "SkyboxMaterial", n.WIREFRAME = "WireframeMaterial", n))(E || {});
class L {
  constructor(t, e, i, s = 1) {
    this.r = t, this.g = e, this.b = i, this.a = s;
  }
  static get WHITE() {
    return new L(1, 1, 1);
  }
  static get BLACK() {
    return new L(0, 0, 0);
  }
  static get RED() {
    return new L(1, 0, 0);
  }
  static get GREEN() {
    return new L(0, 1, 0);
  }
  static get BLUE() {
    return new L(0, 0, 1);
  }
  static get ORANGE() {
    return new L(1, 0.5, 0);
  }
  static get DODGERBLUE() {
    return new L(0.12, 0.56, 1);
  }
  static get SKYBLUE() {
    return new L(0.53, 0.81, 0.92);
  }
  static get LIGHTSTEELBLUE() {
    return new L(0.69, 0.77, 0.87);
  }
  static get DARKSLATEGRAY() {
    return new L(0.18, 0.31, 0.31);
  }
  static get GRAY() {
    return new L(0.5, 0.5, 0.5);
  }
  static get YELLOW() {
    return new L(1, 1, 0);
  }
  toArray() {
    return [this.r, this.g, this.b, this.a];
  }
}
class F extends K {
  constructor(t, e, i = "Light") {
    super(i), this.color = t, this.intensity = e;
  }
}
var D = /* @__PURE__ */ ((n) => (n.AMBIENT = "AmbientLight", n.DIRECTIONAL = "DirectionalLight", n.POINT = "PointLight", n.SPOT = "SpotLight", n))(D || {});
class ot {
  clearColor = new L(0, 0, 0, 1);
  setClearColor(t) {
    this.clearColor = t;
  }
  // Diese Methode ist in ALLEN Renderern (sogar WebGPU) exakt gleich!
  extractLights(t) {
    let e = new L(0, 0, 0), i = new R(0, 1, 0), s = new L(0, 0, 0);
    const r = [], o = [], l = (h) => {
      if (h instanceof F)
        switch (h.type) {
          case D.AMBIENT:
            e = new L(
              h.color.r * h.intensity,
              h.color.g * h.intensity,
              h.color.b * h.intensity
            );
            break;
          case D.DIRECTIONAL:
            i = h.direction.clone().scale(-1).normalize(), s = new L(
              h.color.r * h.intensity,
              h.color.g * h.intensity,
              h.color.b * h.intensity
            );
            break;
          case D.POINT:
            r.length < 4 && r.push(h);
            break;
          case D.SPOT:
            o.length < 4 && o.push(h);
            break;
        }
      h.children && h.children.forEach(l);
    };
    for (const h of t.objects) l(h);
    return { aCol: e, dDir: i, dCol: s, pLights: r, sLights: o };
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
    this.defaultTexture = this.gl.createTexture(), this.gl.bindTexture(this.gl.TEXTURE_2D, this.defaultTexture), this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255])), this.defaultCubeTexture = this.gl.createTexture(), this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this.defaultCubeTexture);
    for (let t = 0; t < 6; t++)
      this.gl.texImage2D(this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + t, 0, this.gl.RGBA, 1, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, new Uint8Array([50, 50, 100, 255]));
  }
}
class xt extends at {
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
    ), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, t.magFilter === "nearest" ? this.gl.NEAREST : this.gl.LINEAR), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, t.minFilter === "nearest" ? this.gl.NEAREST : this.gl.LINEAR), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT), this.texCache.set(t, e)), e;
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
      this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR), this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR), this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE), this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE), this.texCubeCache.set(t, e);
    }
    return e;
  }
  render(t, e, i = new R()) {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT), this.gl.depthMask(!1), this.gl.useProgram(this.skyProg), this.skyLocs.vp && this.gl.uniformMatrix4fv(this.skyLocs.vp, !1, e);
    const s = (a) => {
      if (!(!a.isVisible || !a.material)) {
        if (a.geometry && a.material.type === E.SKYBOX) {
          const u = a.material;
          let g = this.cache.get(a.geometry);
          g || (g = new tt(this.gl, a.geometry), this.cache.set(a.geometry, g)), g.bind(this.skyLocs.pos), this.skyLocs.model && this.gl.uniformMatrix4fv(this.skyLocs.model, !1, a.worldMatrix.data), this.gl.activeTexture(this.gl.TEXTURE0), this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, u.cubeMap ? this.getWebGLCubeTexture(u.cubeMap) : this.defaultCubeTexture), this.skyLocs.skybox && this.gl.uniform1i(this.skyLocs.skybox, 0), this.gl.drawElements(this.gl.TRIANGLES, g.count, this.gl.UNSIGNED_SHORT, 0);
        }
        if (a.children) for (const u of a.children) s(u);
      }
    };
    for (const a of t.objects) s(a);
    this.gl.depthMask(!0), this.gl.useProgram(this.prog), this.locs.vp && this.gl.uniformMatrix4fv(this.locs.vp, !1, e), this.locs.viewPos && this.gl.uniform3f(this.locs.viewPos, i.x, i.y, i.z);
    const { aCol: r, dDir: o, dCol: l, pLights: h, sLights: c } = this.extractLights(t);
    this.locs.ambient && this.gl.uniform3f(this.locs.ambient, r.r, r.g, r.b), this.locs.dirDir && this.gl.uniform3f(this.locs.dirDir, o.x, o.y, o.z), this.locs.dirColor && this.gl.uniform3f(this.locs.dirColor, l.r, l.g, l.b), this.locs.numPL && this.gl.uniform1i(this.locs.numPL, h.length);
    for (let a = 0; a < h.length; a++)
      this.pointLightLocs[a].pos && this.gl.uniform3f(this.pointLightLocs[a].pos, h[a].worldMatrix.data[12], h[a].worldMatrix.data[13], h[a].worldMatrix.data[14]), this.pointLightLocs[a].col && this.gl.uniform3f(this.pointLightLocs[a].col, h[a].color.r * h[a].intensity, h[a].color.g * h[a].intensity, h[a].color.b * h[a].intensity);
    this.locs.numSL && this.gl.uniform1i(this.locs.numSL, c.length);
    for (let a = 0; a < c.length; a++) {
      this.spotLightLocs[a].pos && this.gl.uniform3f(this.spotLightLocs[a].pos, c[a].worldMatrix.data[12], c[a].worldMatrix.data[13], c[a].worldMatrix.data[14]);
      const u = c[a].direction.clone().normalize();
      this.spotLightLocs[a].dir && this.gl.uniform3f(this.spotLightLocs[a].dir, u.x, u.y, u.z), this.spotLightLocs[a].col && this.gl.uniform3f(this.spotLightLocs[a].col, c[a].color.r * c[a].intensity, c[a].color.g * c[a].intensity, c[a].color.b * c[a].intensity), this.spotLightLocs[a].params && this.gl.uniform4f(this.spotLightLocs[a].params, Math.cos(c[a].angle), Math.cos(c[a].angle * (1 - c[a].penumbra)), c[a].distance, c[a].decay);
    }
    const f = (a) => {
      if (!a.isVisible || !a.geometry || !a.material || a.material.type === E.SKYBOX) {
        if (a.children) for (const m of a.children) f(m);
        return;
      }
      const u = a.material;
      let g = this.cache.get(a.geometry);
      g || (g = new tt(this.gl, a.geometry), this.cache.set(a.geometry, g)), g.bind(this.locs.pos, this.locs.norm, this.locs.uv), this.locs.model && this.gl.uniformMatrix4fv(this.locs.model, !1, a.worldMatrix.data), this.locs.color && this.gl.uniform4fv(this.locs.color, u.color.toArray());
      let x = -1, p = [0, 0, 0, 0], d = this.defaultTexture, y = [0, 0], _ = [1, 1];
      if (u.type === E.LAMBERT)
        x = 0;
      else if (u.type === E.PHONG) {
        const m = u;
        x = m.shininess || 32, p = m.specularColor ? m.specularColor.toArray() : [0, 0, 0, 0], m.diffuseMap && (d = this.getWebGLTexture(m.diffuseMap), y = [m.diffuseMap.offset.x, m.diffuseMap.offset.y], _ = [m.diffuseMap.repeat.x, m.diffuseMap.repeat.y]);
      }
      this.gl.activeTexture(this.gl.TEXTURE0), this.gl.bindTexture(this.gl.TEXTURE_2D, d), this.locs.diffuseMap && this.gl.uniform1i(this.locs.diffuseMap, 0), this.locs.texOffset && this.gl.uniform2fv(this.locs.texOffset, y), this.locs.texRepeat && this.gl.uniform2fv(this.locs.texRepeat, _), this.locs.shininess && this.gl.uniform1f(this.locs.shininess, x), this.locs.specColor && this.gl.uniform4fv(this.locs.specColor, p);
      const A = u.type === E.WIREFRAME ? this.gl.LINES : this.gl.TRIANGLES;
      if (this.gl.drawElements(A, g.count, this.gl.UNSIGNED_SHORT, 0), a.children) for (const m of a.children) f(m);
    };
    for (const a of t.objects) f(a);
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
    out vec4 c;
    void main() {
      vec4 texColor = texture(u_diffuseMap, v_uv);
      if (u_shininess < -0.5) { c = u_color * texColor; return; }
      vec3 N = normalize(v_normal); vec3 V = normalize(u_viewPos - v_worldPos);
      vec3 finalLight = u_ambientColor; vec3 specular = vec3(0.0);
      vec3 L_dir = normalize(u_dirLightDir); float diff_dir = max(dot(N, L_dir), 0.0);
      finalLight += diff_dir * u_dirLightColor;
      if (u_shininess > 0.0 && diff_dir > 0.0) specular += pow(max(dot(V, reflect(-L_dir, N)), 0.0), u_shininess) * u_dirLightColor;
      for(int i = 0; i < 4; i++) {
        if (i >= u_numPointLights) break;
        vec3 lightVec = u_pointLightPos[i] - v_worldPos; float dist = length(lightVec); vec3 L_pt = lightVec / dist;
        float attenuation = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist); float diff_pt = max(dot(N, L_pt), 0.0);
        finalLight += diff_pt * u_pointLightColor[i] * attenuation;
        if (u_shininess > 0.0 && diff_pt > 0.0) specular += pow(max(dot(V, reflect(-L_pt, N)), 0.0), u_shininess) * u_pointLightColor[i] * attenuation;
      }
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
      c = vec4((finalLight * u_color.rgb * texColor.rgb) + (specular * u_specColor.rgb), u_color.a * texColor.a);
    }`, s = `#version 300 es
    in vec3 a_position; uniform mat4 u_vp; uniform mat4 u_model;
    out vec3 v_uvw;
    void main() {
        v_uvw = a_position; 
        gl_Position = u_vp * u_model * vec4(a_position, 1.0);
    }`, r = `#version 300 es
    precision highp float;
    in vec3 v_uvw; uniform samplerCube u_skybox;
    out vec4 c;
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
    ), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, t.magFilter === "nearest" ? this.gl.NEAREST : this.gl.LINEAR), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, t.minFilter === "nearest" ? this.gl.NEAREST : this.gl.LINEAR), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT), this.texCache.set(t, e)), e;
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
      this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR), this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR), this.texCubeCache.set(t, e);
    }
    return e;
  }
  render(t, e, i = new R()) {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT), this.gl.depthMask(!1), this.gl.useProgram(this.skyProg), this.skyLocs.vp && this.gl.uniformMatrix4fv(this.skyLocs.vp, !1, e);
    const s = (a) => {
      if (!(!a.isVisible || !a.material)) {
        if (a.geometry && a.material.type === E.SKYBOX) {
          const u = a.material;
          let g = this.cache.get(a.geometry);
          g || (g = new tt(this.gl, a.geometry), this.cache.set(a.geometry, g)), g.bind(this.skyLocs.pos), this.skyLocs.model && this.gl.uniformMatrix4fv(this.skyLocs.model, !1, a.worldMatrix.data), this.gl.activeTexture(this.gl.TEXTURE0), this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, u.cubeMap ? this.getWebGLCubeTexture(u.cubeMap) : this.defaultCubeTexture), this.skyLocs.skybox && this.gl.uniform1i(this.skyLocs.skybox, 0), this.gl.drawElements(this.gl.TRIANGLES, g.count, this.gl.UNSIGNED_SHORT, 0);
        }
        if (a.children) for (const u of a.children) s(u);
      }
    };
    for (const a of t.objects) s(a);
    this.gl.depthMask(!0), this.gl.useProgram(this.prog), this.locs.vp && this.gl.uniformMatrix4fv(this.locs.vp, !1, e), this.locs.viewPos && this.gl.uniform3f(this.locs.viewPos, i.x, i.y, i.z);
    const { aCol: r, dDir: o, dCol: l, pLights: h, sLights: c } = this.extractLights(t);
    this.locs.ambient && this.gl.uniform3f(this.locs.ambient, r.r, r.g, r.b), this.locs.dirDir && this.gl.uniform3f(this.locs.dirDir, o.x, o.y, o.z), this.locs.dirColor && this.gl.uniform3f(this.locs.dirColor, l.r, l.g, l.b), this.locs.numPL && this.gl.uniform1i(this.locs.numPL, h.length);
    for (let a = 0; a < h.length; a++)
      this.pointLightLocs[a].pos && this.gl.uniform3f(this.pointLightLocs[a].pos, h[a].worldMatrix.data[12], h[a].worldMatrix.data[13], h[a].worldMatrix.data[14]), this.pointLightLocs[a].col && this.gl.uniform3f(this.pointLightLocs[a].col, h[a].color.r * h[a].intensity, h[a].color.g * h[a].intensity, h[a].color.b * h[a].intensity);
    this.locs.numSL && this.gl.uniform1i(this.locs.numSL, c.length);
    for (let a = 0; a < c.length; a++) {
      this.spotLightLocs[a].pos && this.gl.uniform3f(this.spotLightLocs[a].pos, c[a].worldMatrix.data[12], c[a].worldMatrix.data[13], c[a].worldMatrix.data[14]);
      const u = c[a].direction.clone().normalize();
      this.spotLightLocs[a].dir && this.gl.uniform3f(this.spotLightLocs[a].dir, u.x, u.y, u.z), this.spotLightLocs[a].col && this.gl.uniform3f(this.spotLightLocs[a].col, c[a].color.r * c[a].intensity, c[a].color.g * c[a].intensity, c[a].color.b * c[a].intensity), this.spotLightLocs[a].params && this.gl.uniform4f(this.spotLightLocs[a].params, Math.cos(c[a].angle), Math.cos(c[a].angle * (1 - c[a].penumbra)), c[a].distance, c[a].decay);
    }
    const f = (a) => {
      if (!a.isVisible || !a.geometry || !a.material || a.material.type === E.SKYBOX) {
        if (a.children) for (const m of a.children) f(m);
        return;
      }
      const u = a.material;
      let g = this.cache.get(a.geometry);
      g || (g = new tt(this.gl, a.geometry), this.cache.set(a.geometry, g)), g.bind(this.locs.pos, this.locs.norm, this.locs.uv), this.locs.model && this.gl.uniformMatrix4fv(this.locs.model, !1, a.worldMatrix.data), this.locs.color && this.gl.uniform4fv(this.locs.color, u.color.toArray());
      let x = -1, p = [0, 0, 0, 0], d = this.defaultTexture, y = [0, 0], _ = [1, 1];
      if (u.type === E.LAMBERT)
        x = 0;
      else if (u.type === E.PHONG) {
        const m = u;
        x = m.shininess || 32, p = m.specularColor ? m.specularColor.toArray() : [0, 0, 0, 0], m.diffuseMap && (d = this.getWebGLTexture(m.diffuseMap), y = [m.diffuseMap.offset.x, m.diffuseMap.offset.y], _ = [m.diffuseMap.repeat.x, m.diffuseMap.repeat.y]);
      }
      this.gl.activeTexture(this.gl.TEXTURE0), this.gl.bindTexture(this.gl.TEXTURE_2D, d), this.locs.diffuseMap && this.gl.uniform1i(this.locs.diffuseMap, 0), this.locs.texOffset && this.gl.uniform2fv(this.locs.texOffset, y), this.locs.texRepeat && this.gl.uniform2fv(this.locs.texRepeat, _), this.locs.shininess && this.gl.uniform1f(this.locs.shininess, x), this.locs.specColor && this.gl.uniform4fv(this.locs.specColor, p);
      const A = u.type === E.WIREFRAME ? this.gl.LINES : this.gl.TRIANGLES;
      if (this.gl.drawElements(A, g.count, this.gl.UNSIGNED_SHORT, 0), a.children) for (const m of a.children) f(m);
    };
    for (const a of t.objects) f(a);
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
          struct U { vp: mat4x4f, model: mat4x4f, color: vec4f, specCol: vec4f, amb: vec4f, dCol: vec4f, dDir: vec4f, cam: vec4f, tOff: vec2f, tRep: vec2f, shininess: f32, numPL: f32, numSL: f32 }
          @group(0) @binding(0) var<uniform> u: U;
          struct PL { pos: vec4f, col: vec4f }
          @group(0) @binding(1) var<storage> pLights: array<PL>;
          struct SL { pos: vec4f, dir: vec4f, col: vec4f, params: vec4f }
          @group(0) @binding(2) var<storage> sLights: array<SL>;
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
            let L_dir = normalize(u.dDir.xyz); let diff_dir = max(dot(N, L_dir), 0.0); fL += diff_dir * u.dCol.xyz;
            if (u.shininess > 0.0 && diff_dir > 0.0) { spec += pow(max(dot(V, reflect(-L_dir, N)), 0.0), u.shininess) * u.dCol.xyz; }
            for(var j=0u; j<u32(u.numPL); j++) {
              let lVec = pLights[j].pos.xyz - i.wp; let d = length(lVec); let L = lVec/d;
              let atten = 1.0 / (1.0 + 0.1*d + 0.01*d*d); let diff = max(dot(N, L), 0.0); fL += diff * pLights[j].col.xyz * atten;
              if (u.shininess > 0.0 && diff > 0.0) { spec += pow(max(dot(V, reflect(-L, N)), 0.0), u.shininess) * pLights[j].col.xyz * atten; }
            }
            for(var j=0u; j<u32(u.numSL); j++) {
              let lVec = sLights[j].pos.xyz - i.wp; let d = length(lVec); let L = lVec/d; let S = normalize(sLights[j].dir.xyz); let theta = dot(-L, S);
              if(theta > sLights[j].params.x) {
                let sEff = smoothstep(sLights[j].params.x, sLights[j].params.y, theta);
                let atten = 1.0 / (1.0 + 0.1*d + 0.01*d*d); let diff = max(dot(N, L), 0.0); fL += diff * sLights[j].col.xyz * atten * sEff;
                if (u.shininess > 0.0 && diff > 0.0) { spec += pow(max(dot(V, reflect(-L, N)), 0.0), u.shininess) * sLights[j].col.xyz * atten * sEff; }
              }
            }
            return vec4f((fL * u.color.rgb * texCol.rgb) + (spec * u.specCol.rgb), u.color.a * texCol.a);
          }
        `
    }), i = this.device.createShaderModule({
      code: `
          struct U { vp: mat4x4f, model: mat4x4f, color: vec4f, specCol: vec4f, amb: vec4f, dCol: vec4f, dDir: vec4f, cam: vec4f, tOff: vec2f, tRep: vec2f, shininess: f32, numPL: f32, numSL: f32 }
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
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } }
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
    const l = this.device.createTexture({
      size: [1, 1],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    });
    this.device.queue.writeTexture({ texture: l }, new Uint8Array([255, 255, 255, 255]), { bytesPerRow: 4 }, [1, 1]), this.defaultTexBindGroup = this.device.createBindGroup({
      layout: this.texBGL,
      entries: [
        { binding: 0, resource: l.createView() },
        { binding: 1, resource: this.sampler }
      ]
    });
    const h = this.device.createTexture({
      size: [1, 1, 6],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    });
    for (let c = 0; c < 6; c++)
      this.device.queue.writeTexture({ texture: h, origin: [0, 0, c] }, new Uint8Array([50, 50, 100, 255]), { bytesPerRow: 4 }, [1, 1]);
    this.defaultCubeTexBindGroup = this.device.createBindGroup({
      layout: this.skyTexBGL,
      entries: [
        { binding: 0, resource: h.createView({ dimension: "cube" }) },
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
  // WICHTIG: public setClearColor() wurde gelöscht, da es nun über die abstrakte Klasse läuft!
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
        const o = this.device.createBuffer({
          size: s.byteLength + 3 & -4,
          usage: r,
          mappedAtCreation: !0
        });
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
      const i = this.device.createBuffer({ size: 1024, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }), s = this.device.createBuffer({ size: 512, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST }), r = this.device.createBuffer({ size: 1024, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST }), o = this.device.createBindGroup({
        layout: this.objBGL,
        entries: [
          { binding: 0, resource: { buffer: i } },
          { binding: 1, resource: { buffer: s } },
          { binding: 2, resource: { buffer: r } }
        ]
      });
      e = { ub: i, plb: s, slb: r, bg: o }, this.objCache.set(t, e);
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
  render(t, e, i = new R()) {
    if (!this.device) return;
    const s = this.device.createCommandEncoder(), r = s.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          // WICHTIG: Wir nutzen die geerbte clearColor Instanz. WebGPU akzeptiert dieses Object direkt duck-typed!
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
    }), { aCol: o, dDir: l, dCol: h, pLights: c, sLights: f } = this.extractLights(t), a = new Float32Array(160);
    a.set(e, 0), a.set([o.r, o.g, o.b, 1], 40), a.set([h.r, h.g, h.b, 1], 44), a.set([l.x, l.y, l.z, 0], 48), a.set([i.x, i.y, i.z, 0], 52), a[61] = c.length, a[62] = f.length;
    const u = new Float32Array(32);
    for (let p = 0; p < c.length; p++) {
      const d = c[p];
      u.set([d.worldMatrix.data[12], d.worldMatrix.data[13], d.worldMatrix.data[14], 0], p * 8), u.set([d.color.r * d.intensity, d.color.g * d.intensity, d.color.b * d.intensity, 0], p * 8 + 4);
    }
    const g = new Float32Array(64);
    for (let p = 0; p < f.length; p++) {
      const d = f[p], y = p * 16;
      g.set([d.worldMatrix.data[12], d.worldMatrix.data[13], d.worldMatrix.data[14], 0], y);
      const _ = d.direction.clone().normalize();
      g.set([_.x, _.y, _.z, 0], y + 4), g.set([d.color.r * d.intensity, d.color.g * d.intensity, d.color.b * d.intensity, 0], y + 8), g.set([Math.cos(d.angle), Math.cos(d.angle * (1 - d.penumbra)), d.distance, d.decay], y + 12);
    }
    const x = (p) => {
      if (!p.isVisible || !p.geometry || !p.material) return;
      const d = p.material;
      let y = this.defaultTexBindGroup, _ = -1, A = [0, 0, 0, 0], m = [0, 0], S = [1, 1];
      if (d.type === E.SKYBOX) {
        r.setPipeline(this.pipelineSkybox);
        const w = d;
        y = w.cubeMap ? this.getGPUCubeTextureBindGroup(w.cubeMap) : this.defaultCubeTexBindGroup;
      } else if (r.setPipeline(d.type === E.WIREFRAME ? this.pipelineLines : this.pipelineTriangles), d.type === E.LAMBERT)
        _ = 0;
      else if (d.type === E.PHONG) {
        const w = d;
        _ = w.shininess || 32, A = w.specularColor ? w.specularColor.toArray() : [0, 0, 0, 0], w.diffuseMap && (y = this.getGPUTextureBindGroup(w.diffuseMap), m = [w.diffuseMap.offset.x, w.diffuseMap.offset.y], S = [w.diffuseMap.repeat.x, w.diffuseMap.repeat.y]);
      }
      a.set(p.worldMatrix.data, 16), a.set(d.color.toArray(), 32), a.set(A, 36), a.set(m, 56), a.set(S, 58), a[60] = _;
      const M = this.getObjCache(p);
      this.device.queue.writeBuffer(M.ub, 0, a), this.device.queue.writeBuffer(M.plb, 0, u), this.device.queue.writeBuffer(M.slb, 0, g);
      const T = this.getGeoCache(p.geometry);
      if (r.setBindGroup(0, M.bg), r.setBindGroup(1, y), r.setVertexBuffer(0, T.vb), r.setVertexBuffer(1, T.nb ? T.nb : T.vb), r.setVertexBuffer(2, T.uvb ? T.uvb : T.vb), T.ib && T.format ? (r.setIndexBuffer(T.ib, T.format), r.drawIndexed(T.indexCount)) : r.draw(T.vertexCount), p.children) for (const w of p.children) x(w);
    };
    for (const p of t.objects || []) x(p);
    r.end(), this.device.queue.submit([s.finish()]);
  }
}
class Lt {
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
        s = new xt();
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
    if (!e) return new L(1, 1, 1, 1);
    e.fillStyle = t, e.fillRect(0, 0, 1, 1);
    const [i, s, r, o] = e.getImageData(0, 0, 1, 1).data;
    return new L(i / 255, s / 255, r / 255, o / 255);
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
      this.activeRenderer = await Lt.create(this.config.rendererType, i), this.config.skyColor ? this.activeRenderer.setClearColor(st.fromCSS(this.config.skyColor)) : this.activeRenderer.setClearColor(st.fromCSS("#111111"));
    } catch (e) {
      throw console.error("[SmallWorld] Initialisierung fehlgeschlagen:", e), e;
    }
  }
}
class B {
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
      const e = this.indices[t] * 3, i = this.indices[t + 1] * 3, s = this.indices[t + 2] * 3, r = this.vertices[e], o = this.vertices[e + 1], l = this.vertices[e + 2], h = this.vertices[i], c = this.vertices[i + 1], f = this.vertices[i + 2], a = this.vertices[s], u = this.vertices[s + 1], g = this.vertices[s + 2], x = h - r, p = c - o, d = f - l, y = a - r, _ = u - o, A = g - l, m = p * A - d * _, S = d * y - x * A, M = x * _ - p * y;
      this.normals[e] += m, this.normals[e + 1] += S, this.normals[e + 2] += M, this.normals[i] += m, this.normals[i + 1] += S, this.normals[i + 2] += M, this.normals[s] += m, this.normals[s + 1] += S, this.normals[s + 2] += M;
    }
    for (let t = 0; t < this.normals.length; t += 3) {
      const e = this.normals[t], i = this.normals[t + 1], s = this.normals[t + 2], r = Math.sqrt(e * e + i * i + s * s);
      r > 0 && (this.normals[t] /= r, this.normals[t + 1] /= r, this.normals[t + 2] /= r);
    }
  }
  applyMatrix4(t) {
    const e = new R();
    for (let i = 0; i < this.vertices.length; i += 3)
      e.x = this.vertices[i], e.y = this.vertices[i + 1], e.z = this.vertices[i + 2], t.transformVector(e), this.vertices[i] = e.x, this.vertices[i + 1] = e.y, this.vertices[i + 2] = e.z;
    return this.computeNormals(), this;
  }
  scale(t) {
    const e = new v();
    return v.scale(t, e), this.applyMatrix4(e);
  }
  rotateX(t) {
    const e = new v();
    return v.rotateX(t, e), this.applyMatrix4(e);
  }
  rotateY(t) {
    const e = new v();
    return v.rotateY(t, e), this.applyMatrix4(e);
  }
  rotateZ(t) {
    const e = new v();
    return v.rotateZ(t, e), this.applyMatrix4(e);
  }
}
class yt extends B {
  constructor(t, e, i, s) {
    super(), this.vertices = new Float32Array(t), this.uvs = new Float32Array(e), this.normals = new Float32Array(i), this.indices = new Uint16Array(s), this.normals.length === 0 && this.computeNormals();
  }
  generateGeometryData() {
  }
}
class _t {
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
class I extends _t {
  basePath = "";
  setBasePath(t) {
    return this.basePath = t, this;
  }
}
var b = /* @__PURE__ */ ((n) => (n.LOADER_END = "LoaderEnd", n.LOADER_ERROR = "LoaderError", n.LOADER_PROGRESS = "LoaderProgress", n.LOADER_START = "LoaderStart", n))(b || {});
class O {
  uuid = crypto.randomUUID();
  color = L.WHITE;
}
class nt extends O {
  type = E.PHONG;
  specularColor = L.WHITE;
  shininess = 32;
  diffuseMap = null;
}
class Et extends I {
  async load(t) {
    const e = this.basePath + t;
    this.dispatchEvent(b.LOADER_START, { url: e });
    try {
      const i = await G.loadText(e, (r, o) => {
        this.dispatchEvent(b.LOADER_PROGRESS, { url: e, loaded: r, total: o });
      }), s = this.parse(i);
      return this.dispatchEvent(b.LOADER_END, { url: e, data: s }), s;
    } catch (i) {
      throw this.dispatchEvent(b.LOADER_ERROR, { url: e, error: i }), i;
    }
  }
  parse(t) {
    const e = /* @__PURE__ */ new Map();
    let i = null;
    const s = t.split(`
`);
    for (let r of s) {
      if (r = r.trim(), r.length === 0 || r.startsWith("#")) continue;
      const o = r.split(/\s+/), l = o[0];
      l === "newmtl" ? (i = new nt(), e.set(o[1], i)) : l === "Kd" && i ? i.color = new L(
        parseFloat(o[1]),
        parseFloat(o[2]),
        parseFloat(o[3])
      ) : l === "Ks" && i ? i.specularColor = new L(
        parseFloat(o[1]),
        parseFloat(o[2]),
        parseFloat(o[3])
      ) : l === "Ns" && i && (i.shininess = parseFloat(o[1]));
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
class Gt extends I {
  async load(t) {
    const e = this.basePath + t;
    this.dispatchEvent(b.LOADER_START, { url: e });
    try {
      const i = await G.loadText(e, (o, l) => {
        this.dispatchEvent(b.LOADER_PROGRESS, { url: e, loaded: o, total: l });
      }), s = e.substring(0, e.lastIndexOf("/") + 1), r = await this.parse(i, s);
      return this.dispatchEvent(b.LOADER_END, { url: e, data: r }), r;
    } catch (i) {
      throw this.dispatchEvent(b.LOADER_ERROR, { url: e, error: i }), i;
    }
  }
  async parse(t, e) {
    const i = [], s = [], r = [];
    let o = /* @__PURE__ */ new Map();
    const l = /* @__PURE__ */ new Map();
    let h = new rt("default");
    l.set("default", h);
    const c = t.split(`
`);
    for (let a of c) {
      if (a = a.trim(), a.length === 0 || a.startsWith("#")) continue;
      const u = a.split(/\s+/), g = u[0];
      if (g === "mtllib")
        o = await new Et().load(e + u[1]);
      else if (g === "usemtl") {
        const x = u[1];
        l.has(x) || l.set(x, new rt(x)), h = l.get(x);
      } else if (g === "v")
        i.push(parseFloat(u[1]), parseFloat(u[2]), parseFloat(u[3]));
      else if (g === "vt")
        s.push(parseFloat(u[1]), parseFloat(u[2]));
      else if (g === "vn")
        r.push(parseFloat(u[1]), parseFloat(u[2]), parseFloat(u[3]));
      else if (g === "f") {
        const x = u.slice(1);
        for (let p = 1; p < x.length - 1; p++) {
          const d = this.parseFaceVertex(
            x[0],
            i,
            s,
            r,
            h
          ), y = this.parseFaceVertex(
            x[p],
            i,
            s,
            r,
            h
          ), _ = this.parseFaceVertex(
            x[p + 1],
            i,
            s,
            r,
            h
          );
          h.outIndices.push(d, y, _);
        }
      }
    }
    const f = new K("ModelRoot");
    return l.forEach((a, u) => {
      if (a.outIndices.length === 0) return;
      const g = new K(u);
      g.geometry = new yt(
        a.outVertices,
        a.outUVs,
        a.outNormals,
        a.outIndices
      ).getGeometryData(), g.material = o.get(u) || new nt(), f.add(g);
    }), f;
  }
  parseFaceVertex(t, e, i, s, r) {
    if (r.vertexCache.has(t)) return r.vertexCache.get(t);
    const o = t.split("/"), l = (parseInt(o[0]) - 1) * 3;
    if (r.outVertices.push(e[l], e[l + 1], e[l + 2]), o.length > 1 && o[1] !== "") {
      const c = (parseInt(o[1]) - 1) * 2;
      r.outUVs.push(i[c], i[c + 1]);
    } else
      r.outUVs.push(0, 0);
    if (o.length > 2) {
      const c = (parseInt(o[2]) - 1) * 3;
      r.outNormals.push(s[c], s[c + 1], s[c + 2]);
    }
    const h = r.indexCounter++;
    return r.vertexCache.set(t, h), h;
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
      this.images = await Promise.all(t.map((e) => G.loadImage(e))), this.isLoaded = !0;
    } catch (e) {
      console.error("Fehler beim Laden der CubeTexture", e);
    }
  }
}
class Ft extends I {
  async load(t) {
    const e = this.basePath + t;
    this.dispatchEvent("loadStart", { url: e });
    try {
      const i = await G.loadImage(
        e,
        (f, a) => this.dispatchEvent(b.LOADER_PROGRESS, { url: e, loaded: f, total: a }),
        !1
      ), s = i.width / 4, r = document.createElement("canvas");
      r.width = s, r.height = s;
      const o = r.getContext("2d", { willReadFrequently: !0 }), l = [
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
      ], h = [];
      for (const f of l) {
        o.clearRect(0, 0, s, s), o.drawImage(
          i,
          // Type-Cast für TypeScript
          f.col * s,
          f.row * s,
          s,
          s,
          0,
          0,
          s,
          s
        );
        const a = await createImageBitmap(r);
        h.push(a);
      }
      const c = new ht();
      return c.images = h, c.isLoaded = !0, this.dispatchEvent(b.LOADER_END, { url: e, data: c }), c;
    } catch (i) {
      throw this.dispatchEvent(b.LOADER_ERROR, { url: e, error: i }), i;
    }
  }
}
class bt extends B {
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
class wt extends O {
  type = E.SKYBOX;
  cubeMap = null;
}
class It extends K {
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
class Ot {
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
      this.image = await G.loadImage(t), this.isLoaded = !0;
    } catch (e) {
      console.error(`Fehler beim Laden der Textur: ${t}`, e);
    }
  }
}
var Tt = /* @__PURE__ */ ((n) => (n.UP = "ArrowUp", n.DOWN = "ArrowDown", n.LEFT = "ArrowLeft", n.RIGHT = "ArrowRight", n.SPACE = "Space", n.ENTER = "Enter", n.ESCAPE = "Escape", n.TAB = "Tab", n.BACKSPACE = "Backspace", n.SHIFT_L = "ShiftLeft", n.SHIFT_R = "ShiftRight", n.CTRL_L = "ControlLeft", n.CTRL_R = "ControlRight", n.ALT_L = "AltLeft", n.ALT_R = "AltRight", n.D0 = "Digit0", n.D1 = "Digit1", n.D2 = "Digit2", n.D3 = "Digit3", n.D4 = "Digit4", n.D5 = "Digit5", n.D6 = "Digit6", n.D7 = "Digit7", n.D8 = "Digit8", n.D9 = "Digit9", n.A = "KeyA", n.B = "KeyB", n.C = "KeyC", n.D = "KeyD", n.E = "KeyE", n.F = "KeyF", n.G = "KeyG", n.H = "KeyH", n.I = "KeyI", n.J = "KeyJ", n.K = "KeyK", n.L = "KeyL", n.M = "KeyM", n.N = "KeyN", n.O = "KeyO", n.P = "KeyP", n.Q = "KeyQ", n.R = "KeyR", n.S = "KeyS", n.T = "KeyT", n.U = "KeyU", n.V = "KeyV", n.W = "KeyW", n.X = "KeyX", n.Y = "KeyY", n.Z = "KeyZ", n))(Tt || {}), Rt = /* @__PURE__ */ ((n) => (n.LINEAR = "linear", n.NEAREST = "nearest", n))(Rt || {}), At = /* @__PURE__ */ ((n) => (n.REPEAT = "repeat", n.CLAMP_TO_EDGE = "clamp-to-edge", n.MIRRORED_REPEAT = "mirror-repeat", n))(At || {});
class lt {
  matrix = new v();
}
class zt extends lt {
  constructor(t, e, i, s, r, o) {
    super(), this.l = t, this.r = e, this.b = i, this.t = s, this.n = r, this.f = o, this.update();
  }
  update() {
    v.orthographic(this.l, this.r, this.b, this.t, this.n, this.f, this.matrix);
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
    v.perspective(this.fov, this.aspect, this.near, this.far, this.matrix);
  }
  getMatrix() {
    return this.matrix;
  }
}
class kt extends B {
  constructor(t = 1, e = 2, i = 16) {
    super(), this.radius = t, this.height = e, this.segments = i, this.generateGeometryData();
  }
  generateGeometryData() {
    const t = [], e = [], i = [], s = this.height / 2;
    for (let o = 0; o <= 1; o++) {
      const l = o === 0 ? -s : s, h = o === 0 ? 0 : 1;
      for (let c = 0; c <= this.segments; c++) {
        const f = c / this.segments, a = f * Math.PI * 2;
        t.push(this.radius * Math.sin(a), l, this.radius * Math.cos(a)), e.push(f, h);
      }
    }
    for (let o = 0; o < this.segments; o++) {
      const l = o, h = l + this.segments + 1;
      i.push(l, h, l + 1), i.push(h, h + 1, l + 1);
    }
    let r = t.length / 3;
    t.push(0, s, 0), e.push(0.5, 0.5);
    for (let o = 0; o <= this.segments; o++) {
      const l = o / this.segments * Math.PI * 2;
      t.push(this.radius * Math.sin(l), s, this.radius * Math.cos(l)), e.push(0.5 + Math.sin(l) * 0.5, 0.5 + Math.cos(l) * 0.5);
    }
    for (let o = 0; o < this.segments; o++) i.push(r, r + o + 1, r + o + 2);
    r = t.length / 3, t.push(0, -s, 0), e.push(0.5, 0.5);
    for (let o = 0; o <= this.segments; o++) {
      const l = o / this.segments * Math.PI * 2;
      t.push(this.radius * Math.sin(l), -s, this.radius * Math.cos(l)), e.push(0.5 + Math.sin(l) * 0.5, 0.5 - Math.cos(l) * 0.5);
    }
    for (let o = 0; o < this.segments; o++) i.push(r, r + o + 2, r + o + 1);
    this.vertices = new Float32Array(t), this.uvs = new Float32Array(e), this.indices = new Uint16Array(i), this.computeNormals();
  }
}
class Vt extends B {
  constructor(t = 20, e = 20) {
    super(), this.size = t, this.divisions = e, this.generateGeometryData();
  }
  generateGeometryData() {
    const t = [], e = [], i = [], s = this.size / this.divisions, r = this.size / 2;
    let o = 0;
    for (let l = 0; l <= this.divisions; l++) {
      const h = l * s - r, c = l / this.divisions;
      t.push(h, 0, -r, h, 0, r), e.push(c, 0, c, 1), i.push(o, o + 1), o += 2, t.push(-r, 0, h, r, 0, h), e.push(0, c, 1, c), i.push(o, o + 1), o += 2;
    }
    this.vertices = new Float32Array(t), this.uvs = new Float32Array(e), this.indices = new Uint16Array(i);
  }
}
class Xt extends B {
  constructor(t = 1, e = 1, i = 1, s = 1) {
    super(), this.width = t, this.depth = e, this.widthSegments = i, this.depthSegments = s, this.generateGeometryData();
  }
  generateGeometryData() {
    const t = [], e = [], i = [], s = this.width / 2, r = this.depth / 2;
    for (let o = 0; o <= this.depthSegments; o++) {
      const l = o / this.depthSegments;
      for (let h = 0; h <= this.widthSegments; h++) {
        const c = h / this.widthSegments;
        t.push(c * this.width - s, 0, l * this.depth - r), e.push(c, 1 - l);
      }
    }
    for (let o = 0; o < this.depthSegments; o++)
      for (let l = 0; l < this.widthSegments; l++) {
        const h = l + (this.widthSegments + 1) * o, c = l + (this.widthSegments + 1) * (o + 1), f = l + 1 + (this.widthSegments + 1) * (o + 1), a = l + 1 + (this.widthSegments + 1) * o;
        i.push(h, c, a), i.push(c, f, a);
      }
    this.vertices = new Float32Array(t), this.uvs = new Float32Array(e), this.indices = new Uint16Array(i), this.computeNormals();
  }
}
class Wt extends B {
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
class Ht extends B {
  constructor(t = 1, e = 16, i = 12) {
    super(), this.radius = t, this.widthSegments = e, this.heightSegments = i, this.generateGeometryData();
  }
  generateGeometryData() {
    const t = [], e = [], i = [], s = [];
    for (let r = 0; r <= this.heightSegments; r++) {
      const o = r / this.heightSegments, l = o * Math.PI;
      for (let h = 0; h <= this.widthSegments; h++) {
        const c = h / this.widthSegments, f = c * Math.PI * 2, a = -(this.radius * Math.sin(l) * Math.cos(f)), u = this.radius * Math.cos(l), g = this.radius * Math.sin(l) * Math.sin(f);
        t.push(a, u, g), e.push(a / this.radius, u / this.radius, g / this.radius), i.push(c, 1 - o);
      }
    }
    for (let r = 0; r < this.heightSegments; r++)
      for (let o = 0; o < this.widthSegments; o++) {
        const l = r * (this.widthSegments + 1) + o, h = l + this.widthSegments + 1;
        s.push(l, h, l + 1), s.push(h, h + 1, l + 1);
      }
    this.vertices = new Float32Array(t), this.normals = new Float32Array(e), this.uvs = new Float32Array(i), this.indices = new Uint16Array(s);
  }
}
class jt extends B {
  constructor(t = 1, e = 0.4, i = 16, s = 32) {
    super(), this.radius = t, this.tube = e, this.radialSegments = i, this.tubularSegments = s, this.generateGeometryData();
  }
  generateGeometryData() {
    const t = [], e = [], i = [];
    for (let s = 0; s <= this.radialSegments; s++) {
      const r = s / this.radialSegments, o = r * Math.PI * 2, l = Math.cos(o), h = Math.sin(o);
      for (let c = 0; c <= this.tubularSegments; c++) {
        const f = c / this.tubularSegments, a = f * Math.PI * 2, u = Math.cos(a), g = Math.sin(a);
        t.push(
          (this.radius + this.tube * l) * u,
          this.tube * h,
          (this.radius + this.tube * l) * g
        ), e.push(f, r);
      }
    }
    for (let s = 1; s <= this.radialSegments; s++)
      for (let r = 1; r <= this.tubularSegments; r++) {
        const o = (this.tubularSegments + 1) * s + r - 1, l = (this.tubularSegments + 1) * (s - 1) + r - 1, h = (this.tubularSegments + 1) * (s - 1) + r, c = (this.tubularSegments + 1) * s + r;
        i.push(o, l, c), i.push(l, h, c);
      }
    this.vertices = new Float32Array(t), this.uvs = new Float32Array(e), this.indices = new Uint16Array(i), this.computeNormals();
  }
}
class Yt extends B {
  constructor(t = 1, e = 32) {
    super(), this.radius = t, this.segments = e, this.generateGeometryData();
  }
  generateGeometryData() {
    const t = [], e = [], i = [];
    for (let s = 0; s < this.segments; s++) {
      const r = s / this.segments * Math.PI * 2, o = Math.cos(r), l = Math.sin(r);
      t.push(o * this.radius, 0, l * this.radius), e.push(0.5 + o * 0.5, 0.5 + l * 0.5), i.push(s, (s + 1) % this.segments);
    }
    this.vertices = new Float32Array(t), this.uvs = new Float32Array(e), this.indices = new Uint16Array(i);
  }
}
class qt extends B {
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
class $t extends B {
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
class Zt extends O {
  type = E.BASIC;
}
class Jt extends O {
  type = E.LAMBERT;
}
class Qt extends O {
  type = E.WIREFRAME;
}
class Kt extends F {
  type = D.AMBIENT;
  constructor(t = new L(1, 1, 1), e = 0.2) {
    super(t, e, "AmbientLight");
  }
}
class te extends F {
  type = D.DIRECTIONAL;
  intensity = 1;
  direction = new R(0, -1, 0).normalize();
  constructor(t = L.WHITE, e = 1) {
    super(t, e, "DirectionalLight");
  }
}
class ee extends F {
  constructor(t = L.WHITE, e = 1, i = 50, s = 2) {
    super(t, e, "PointLight"), this.distance = i, this.decay = s;
  }
  type = D.POINT;
}
class ie extends F {
  constructor(t = L.WHITE, e = 1, i = 50, s = Math.PI / 6, r = 0.5, o = 2) {
    super(t, e, "SpotLight"), this.distance = i, this.angle = s, this.penumbra = r, this.decay = o;
  }
  type = D.SPOT;
  direction = new R(0, -1, 0).normalize();
}
var P = /* @__PURE__ */ ((n) => (n[n.SPHERE = 0] = "SPHERE", n[n.BOX = 1] = "BOX", n))(P || {});
class se {
  constructor(t, e) {
    this.min = t, this.max = e;
    const i = e.clone().sub(t);
    this.broadRadius = i.length() / 2;
  }
  type = P.BOX;
  broadRadius;
  get center() {
    return this.min.clone().add(this.max).scale(0.5);
  }
  getBroadRadius() {
    return this.broadRadius;
  }
}
class re {
  constructor(t, e) {
    this.center = t, this.radius = e;
  }
  type = P.SPHERE;
  getBroadRadius() {
    return this.radius;
  }
}
class oe {
  static test(t, e) {
    const i = t.center.distanceToSq(e.center), s = t.getBroadRadius() + e.getBroadRadius();
    return i > s * s ? !1 : t.type === P.SPHERE && e.type === P.SPHERE ? this.sphereSphere(t, e) : t.type === P.BOX && e.type === P.BOX ? this.boxBox(t, e) : t.type === P.SPHERE && e.type === P.BOX ? this.sphereBox(t, e) : t.type === P.BOX && e.type === P.SPHERE ? this.sphereBox(e, t) : !1;
  }
  static sphereSphere(t, e) {
    const i = t.center.distanceToSq(e.center), s = (t.radius + e.radius) * (t.radius + e.radius);
    return i <= s;
  }
  static boxBox(t, e) {
    return t.min.x <= e.max.x && t.max.x >= e.min.x && t.min.y <= e.max.y && t.max.y >= e.min.y && t.min.z <= e.max.z && t.max.z >= e.min.z;
  }
  static sphereBox(t, e) {
    return new R(
      Math.max(e.min.x, Math.min(t.center.x, e.max.x)),
      Math.max(e.min.y, Math.min(t.center.y, e.max.y)),
      Math.max(e.min.z, Math.min(t.center.z, e.max.z))
    ).distanceToSq(t.center) <= t.radius * t.radius;
  }
}
class Mt {
  planes = new Float32Array(24);
  setFromMatrix(t) {
    const e = t.data, i = this.planes;
    i[0] = e[3] - e[0], i[1] = e[7] - e[4], i[2] = e[11] - e[8], i[3] = e[15] - e[12], i[4] = e[3] + e[0], i[5] = e[7] + e[4], i[6] = e[11] + e[8], i[7] = e[15] + e[12], i[8] = e[3] + e[1], i[9] = e[7] + e[5], i[10] = e[11] + e[9], i[11] = e[15] + e[13], i[12] = e[3] - e[1], i[13] = e[7] - e[5], i[14] = e[11] - e[9], i[15] = e[15] - e[13], i[16] = e[3] - e[2], i[17] = e[7] - e[6], i[18] = e[11] - e[10], i[19] = e[15] - e[14], i[20] = e[3] + e[2], i[21] = e[7] + e[6], i[22] = e[11] + e[10], i[23] = e[15] + e[14];
    for (let s = 0; s < 6; s++) {
      const r = s * 4, o = Math.sqrt(i[r] * i[r] + i[r + 1] * i[r + 1] + i[r + 2] * i[r + 2]);
      if (o > 0) {
        const l = 1 / o;
        i[r] *= l, i[r + 1] *= l, i[r + 2] *= l, i[r + 3] *= l;
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
class ae {
  static frustum = new Mt();
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
class ne extends I {
  async load(t) {
    const e = this.basePath + t;
    this.dispatchEvent(b.LOADER_START, { url: e });
    try {
      const i = await G.loadImage(e, (s, r) => {
        this.dispatchEvent(b.LOADER_PROGRESS, { url: e, loaded: s, total: r });
      });
      return this.dispatchEvent(b.LOADER_END, { url: e, data: i }), i;
    } catch (i) {
      throw this.dispatchEvent(b.LOADER_ERROR, { url: e, error: i }), i;
    }
  }
}
class St extends I {
  async load(t) {
    const e = this.basePath + t;
    this.dispatchEvent(b.LOADER_START, { url: e });
    try {
      const i = await G.loadText(e, (s, r) => {
        this.dispatchEvent(b.LOADER_PROGRESS, { url: e, loaded: s, total: r });
      });
      return this.dispatchEvent(b.LOADER_END, { url: e, data: i }), i;
    } catch (i) {
      throw this.dispatchEvent(b.LOADER_ERROR, { url: e, error: i }), i;
    }
  }
}
class he extends St {
  // Aktuell macht der ShaderLoader genau dasselbe wie der TextLoader.
  // Er ist aber ein eigener Typ, falls wir später WebGPU-Shader-Code
  // direkt hier validieren oder parsen möchten!
}
export {
  F as AbstractLight,
  O as AbstractMaterial,
  Kt as AmbientLight,
  G as AssetManager,
  Zt as BasicMaterial,
  se as BoundingBox,
  re as BoundingSphere,
  Pt as Camera,
  U as CameraStrategyType,
  Yt as Circle,
  oe as Collision,
  L as Color,
  st as ColorUtils,
  bt as Cube,
  ht as CubeTexture,
  kt as Cylinder,
  mt as DEFAULT_RENDERER,
  te as DirectionalLight,
  pt as ENGINE_VERSION,
  _t as EventDispatcher,
  b as EventType,
  ae as FrustumCuller,
  Vt as Grid,
  Ct as HUD,
  ne as ImageLoader,
  Ut as Input,
  Tt as Keys,
  Jt as LambertMaterial,
  D as LightType,
  $t as Line,
  I as Loader,
  v as Matrix4,
  yt as ModelGeometry,
  Gt as ObjLoader,
  K as Object3D,
  zt as OrthographicProjection,
  Nt as PerspectiveProjection,
  nt as PhongMaterial,
  Xt as Plane,
  ee as PointLight,
  Wt as Pyramid,
  C as RendererType,
  Bt as Scene,
  he as ShaderLoader,
  It as Skybox,
  Ft as SkyboxLoader,
  wt as SkyboxMaterial,
  Dt as SmallWorld,
  Ht as Sphere,
  ie as SpotLight,
  St as TextLoader,
  Ot as Texture,
  Rt as TextureFilter,
  At as TextureWrap,
  jt as Torus,
  qt as Triangle,
  et as Vector2D,
  R as Vector3D,
  Qt as WireframeMaterial
};
