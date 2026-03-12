class F {
  static imageCache = /* @__PURE__ */ new Map();
  static textCache = /* @__PURE__ */ new Map();
  static async fetchWithProgress(t, e) {
    const i = await fetch(t);
    if (!i.ok) throw new Error(`[AssetManager] HTTP Fehler: ${i.status} bei ${t}`);
    const r = i.headers.get("content-length"), s = r ? parseInt(r, 10) : 0;
    if (!e || !i.body)
      return i.blob();
    const n = i.body.getReader();
    let h = 0;
    const l = [];
    for (; ; ) {
      const { done: c, value: d } = await n.read();
      if (c) break;
      d && (h += d.length, l.push(d), e(h, s));
    }
    return new Blob(l);
  }
  static async loadImage(t, e, i = !0) {
    const r = `${t}_${i}`;
    if (this.imageCache.has(r)) return this.imageCache.get(r);
    const s = this.fetchWithProgress(t, e).then(async (n) => {
      if (i)
        return createImageBitmap(n, {
          colorSpaceConversion: "none",
          imageOrientation: "flipY"
        });
      try {
        return await createImageBitmap(n, {
          colorSpaceConversion: "none",
          imageOrientation: "from-image"
        });
      } catch {
        return await createImageBitmap(n, {
          colorSpaceConversion: "none",
          imageOrientation: "none"
        });
      }
    }).catch((n) => (console.error(n), new Promise((h, l) => {
      const c = new Image();
      c.crossOrigin = "anonymous", c.onload = () => h(c), c.onerror = () => l(`[AssetManager] Fallback fehlgeschlagen: ${t}`), c.src = t;
    })));
    return this.imageCache.set(r, s), s;
  }
  static async loadText(t, e) {
    if (this.textCache.has(t)) return this.textCache.get(t);
    const i = this.fetchWithProgress(t, e).then((r) => r.text());
    return this.textCache.set(t, i), i;
  }
}
class w {
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
    const e = this.x - t.x, i = this.y - t.y, r = this.z - t.z;
    return e * e + i * i + r * r;
  }
  distanceTo(t) {
    return Math.sqrt(this.distanceToSq(t));
  }
  copyFrom(t) {
    return this.x = t.x, this.y = t.y, this.z = t.z, this;
  }
  clone() {
    return new w(this.x, this.y, this.z);
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
class y {
  data = new Float32Array(16);
  constructor() {
    this.identity();
  }
  identity() {
    return this.data.fill(0), this.data[0] = 1, this.data[5] = 1, this.data[10] = 1, this.data[15] = 1, this;
  }
  compose(t, e, i) {
    const r = new y();
    y.translate(t, r);
    const s = new y();
    y.rotateX(e.x, s);
    const n = new y();
    y.rotateY(e.y, n);
    const h = new y();
    y.rotateZ(e.z, h);
    const l = new y();
    return l.data[0] = i.x, l.data[5] = i.y, l.data[10] = i.z, y.multiply(r, n, this), y.multiply(this, s, this), y.multiply(this, h, this), y.multiply(this, l, this), this;
  }
  static translate(t, e) {
    e.identity(), e.data[12] = t.x, e.data[13] = t.y, e.data[14] = t.z;
  }
  static scale(t, e) {
    e.identity(), e.data[0] = t, e.data[5] = t, e.data[10] = t;
  }
  static rotateX(t, e) {
    const i = Math.sin(t), r = Math.cos(t);
    e.identity(), e.data[5] = r, e.data[6] = i, e.data[9] = -i, e.data[10] = r;
  }
  static rotateY(t, e) {
    const i = Math.sin(t), r = Math.cos(t);
    e.identity(), e.data[0] = r, e.data[2] = -i, e.data[8] = i, e.data[10] = r;
  }
  static rotateZ(t, e) {
    const i = Math.sin(t), r = Math.cos(t);
    e.identity(), e.data[0] = r, e.data[1] = i, e.data[4] = -i, e.data[5] = r;
  }
  static multiply(t, e, i) {
    const r = t.data, s = e.data, n = i.data, h = r[0], l = r[1], c = r[2], d = r[3], f = r[4], o = r[5], u = r[6], p = r[7], E = r[8], m = r[9], g = r[10], L = r[11], _ = r[12], S = r[13], x = r[14], P = r[15], G = s[0], A = s[1], R = s[2], z = s[3], k = s[4], V = s[5], X = s[6], W = s[7], j = s[8], H = s[9], Y = s[10], q = s[11], $ = s[12], Z = s[13], J = s[14], Q = s[15];
    n[0] = h * G + f * A + E * R + _ * z, n[1] = l * G + o * A + m * R + S * z, n[2] = c * G + u * A + g * R + x * z, n[3] = d * G + p * A + L * R + P * z, n[4] = h * k + f * V + E * X + _ * W, n[5] = l * k + o * V + m * X + S * W, n[6] = c * k + u * V + g * X + x * W, n[7] = d * k + p * V + L * X + P * W, n[8] = h * j + f * H + E * Y + _ * q, n[9] = l * j + o * H + m * Y + S * q, n[10] = c * j + u * H + g * Y + x * q, n[11] = d * j + p * H + L * Y + P * q, n[12] = h * $ + f * Z + E * J + _ * Q, n[13] = l * $ + o * Z + m * J + S * Q, n[14] = c * $ + u * Z + g * J + x * Q, n[15] = d * $ + p * Z + L * J + P * Q;
  }
  static perspective(t, e, i, r, s) {
    const n = 1 / Math.tan(t / 2), h = s.data;
    h.fill(0), h[0] = n / e, h[5] = n, h[10] = r / (i - r), h[11] = -1, h[14] = i * r / (i - r);
  }
  static orthographic(t, e, i, r, s, n, h) {
    const l = h.data;
    l.fill(0), l[0] = 2 / (e - t), l[5] = 2 / (r - i), l[10] = 1 / (s - n), l[12] = -(e + t) / (e - t), l[13] = -(r + i) / (r - i), l[14] = s / (s - n), l[15] = 1;
  }
  static lookAt(t, e, i, r) {
    const s = r.data, n = t.clone().sub(e), h = n.length();
    h > 0 && n.scale(1 / h);
    const l = new w(
      i.y * n.z - i.z * n.y,
      i.z * n.x - i.x * n.z,
      i.x * n.y - i.y * n.x
    ), c = l.length();
    c > 0 && l.scale(1 / c);
    const d = new w(n.y * l.z - n.z * l.y, n.z * l.x - n.x * l.z, n.x * l.y - n.y * l.x);
    s[0] = l.x, s[4] = l.y, s[8] = l.z, s[12] = -l.dot(t), s[1] = d.x, s[5] = d.y, s[9] = d.z, s[13] = -d.dot(t), s[2] = n.x, s[6] = n.y, s[10] = n.z, s[14] = -n.dot(t), s[15] = 1;
  }
  transformVector(t) {
    const e = this.data, i = t.x, r = t.y, s = t.z;
    return t.x = e[0] * i + e[4] * r + e[8] * s + e[12], t.y = e[1] * i + e[5] * r + e[9] * s + e[13], t.z = e[2] * i + e[6] * r + e[10] * s + e[14], t;
  }
}
var B = /* @__PURE__ */ ((a) => (a.FIXED = "FixedCamera", a.STIFF = "StiffCamera", a.SMOOTH = "SmoothCamera", a.FPS = "FPSCamera", a))(B || {});
class ht {
  type = B.FPS;
  heightOffset = 0.5;
  update(t, e, i, r) {
    if (i !== 0 || r !== 0) {
      t.theta -= i * 5e-3, t.phi += r * 5e-3;
      const s = Math.PI / 2 - 0.01;
      t.phi > s && (t.phi = s), t.phi < -s && (t.phi = -s);
    }
    t.position.x = e.x, t.position.y = e.y + this.heightOffset, t.position.z = e.z, t.target.x = t.position.x - Math.sin(t.theta) * Math.cos(t.phi), t.target.y = t.position.y - Math.sin(t.phi), t.target.z = t.position.z - Math.cos(t.theta) * Math.cos(t.phi);
  }
}
class lt {
  type = B.SMOOTH;
  radius = 20;
  lerpFactor = 0.1;
  update(t, e, i, r) {
    if (i !== 0 || r !== 0) {
      t.theta -= i * 5e-3, t.phi += r * 5e-3;
      const s = Math.PI / 2 - 0.01;
      t.phi > s && (t.phi = s), t.phi < -s && (t.phi = -s);
    }
    t.target.x += (e.x - t.target.x) * this.lerpFactor, t.target.y += (e.y - t.target.y) * this.lerpFactor, t.target.z += (e.z - t.target.z) * this.lerpFactor, t.position.x = t.target.x + this.radius * Math.sin(t.theta) * Math.cos(t.phi), t.position.y = t.target.y + this.radius * Math.sin(t.phi), t.position.z = t.target.z + this.radius * Math.cos(t.theta) * Math.cos(t.phi);
  }
}
class ct {
  type = B.STIFF;
  radius = 20;
  update(t, e, i, r) {
    if (i !== 0 || r !== 0) {
      t.theta -= i * 5e-3, t.phi += r * 5e-3;
      const s = Math.PI / 2 - 0.01;
      t.phi > s && (t.phi = s), t.phi < -s && (t.phi = -s);
    }
    t.target.copyFrom(e), t.position.x = t.target.x + this.radius * Math.sin(t.theta) * Math.cos(t.phi), t.position.y = t.target.y + this.radius * Math.sin(t.phi), t.position.z = t.target.z + this.radius * Math.cos(t.theta) * Math.cos(t.phi);
  }
}
class ut {
  type = B.FIXED;
  update(t, e, i, r) {
    t.target.copyFrom(e);
  }
}
class gt {
  // Wir cachen die Instanzen, damit wir nicht bei jedem Wechsel ein neues 'new' Keyword bemühen müssen.
  static strategies = /* @__PURE__ */ new Map([
    [B.FPS, new ht()],
    [B.SMOOTH, new lt()],
    [B.STIFF, new ct()],
    [B.FIXED, new ut()]
  ]);
  static get(t) {
    return this.strategies.get(t) || this.strategies.get(B.SMOOTH);
  }
}
class Mt {
  constructor(t) {
    this.projection = t, this.setStrategy(B.SMOOTH);
  }
  position = new w(0, 10, 20);
  target = new w(0, 0, 0);
  up = new w(0, 1, 0);
  // Geteilte Winkel für alle Strategien, damit der Blickwinkel erhalten bleibt
  theta = 0;
  phi = 0.6;
  strategy;
  setStrategy(t) {
    this.strategy = gt.get(t);
  }
  get activeStrategyType() {
    return this.strategy.type;
  }
  update(t, e, i) {
    this.strategy.update(this, t, e, i);
  }
  getViewProjection(t, e) {
    y.multiply(this.projection.getMatrix(), t, e);
  }
}
var U = /* @__PURE__ */ ((a) => (a.BEST = "BEST", a.WEB_GPU = "WEB_GPU", a.WEB_GL2 = "WEB_GL2", a.WEB_GL1 = "WEB_GL1", a.CANVAS = "CANVAS", a))(U || {});
const dt = "0.10.1", ft = U.BEST;
class St {
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
        e = e.replace(/{sm-engine-version}/g, `v${dt}`);
        const i = document.createElement("div");
        i.innerHTML = e, document.body.appendChild(i), this.root = document.getElementById("sw-hud-root"), document.querySelectorAll("[data-hud]").forEach((s) => {
          const n = s.getAttribute("data-hud");
          n && this.elements.set(n, s);
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
class Pt {
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
  position = new w(0, 0, 0);
  rotation = new w(0, 0, 0);
  scale = new w(1, 1, 1);
  localMatrix = new y();
  worldMatrix = new y();
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
    this.localMatrix.compose(this.position, this.rotation, this.scale), this.parent === null ? this.worldMatrix.data.set(this.localMatrix.data) : y.multiply(this.parent.worldMatrix, this.localMatrix, this.worldMatrix);
    for (const e of this.children)
      e.updateMatrixWorld(t);
  }
}
class Ct {
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
class v {
  constructor(t, e, i, r = 1) {
    this.r = t, this.g = e, this.b = i, this.a = r;
  }
  static get WHITE() {
    return new v(1, 1, 1);
  }
  static get BLACK() {
    return new v(0, 0, 0);
  }
  static get RED() {
    return new v(1, 0, 0);
  }
  static get GREEN() {
    return new v(0, 1, 0);
  }
  static get BLUE() {
    return new v(0, 0, 1);
  }
  static get ORANGE() {
    return new v(1, 0.5, 0);
  }
  static get DODGERBLUE() {
    return new v(0.12, 0.56, 1);
  }
  static get SKYBLUE() {
    return new v(0.53, 0.81, 0.92);
  }
  static get LIGHTSTEELBLUE() {
    return new v(0.69, 0.77, 0.87);
  }
  static get DARKSLATEGRAY() {
    return new v(0.18, 0.31, 0.31);
  }
  static get GRAY() {
    return new v(0.5, 0.5, 0.5);
  }
  static get YELLOW() {
    return new v(1, 1, 0);
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
var M = /* @__PURE__ */ ((a) => (a.AMBIENT = "AmbientLight", a.DIRECTIONAL = "DirectionalLight", a.POINT = "PointLight", a.SPOT = "SpotLight", a))(M || {});
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
class pt {
  type = U.WEB_GL1;
  gl;
  prog;
  locs;
  skyProg;
  skyLocs;
  cache = /* @__PURE__ */ new Map();
  texCache = /* @__PURE__ */ new Map();
  texCubeCache = /* @__PURE__ */ new Map();
  defaultTexture;
  defaultCubeTexture;
  pointLightLocs = [];
  spotLightLocs = [];
  async initialize(t) {
    this.gl = t.getContext("webgl", { antialias: !0 }) || t.getContext("experimental-webgl"), this.defaultTexture = this.gl.createTexture(), this.gl.bindTexture(this.gl.TEXTURE_2D, this.defaultTexture), this.gl.texImage2D(
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
    for (let s = 0; s < 6; s++)
      this.gl.texImage2D(
        this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + s,
        0,
        this.gl.RGBA,
        1,
        1,
        0,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        new Uint8Array([50, 50, 100, 255])
      );
    const e = "attribute vec3 a_position; attribute vec3 a_normal; attribute vec2 a_uv; uniform mat4 u_vp; uniform mat4 u_model; uniform vec2 u_texOffset; uniform vec2 u_texRepeat; varying vec3 v_worldPos; varying vec3 v_normal; varying vec2 v_uv; mat3 extractMat3(mat4 m) { return mat3(m[0].xyz, m[1].xyz, m[2].xyz); } void main() { vec4 wp = u_model * vec4(a_position, 1.0); v_worldPos = wp.xyz; v_normal = extractMat3(u_model) * a_normal; v_uv = (a_uv * u_texRepeat) + u_texOffset; gl_Position = u_vp * wp; }", i = "precision highp float; varying vec3 v_worldPos; varying vec3 v_normal; varying vec2 v_uv; uniform vec4 u_color; uniform vec4 u_specColor; uniform float u_shininess; uniform vec3 u_viewPos; uniform vec3 u_ambientColor; uniform vec3 u_dirLightColor; uniform vec3 u_dirLightDir; uniform sampler2D u_diffuseMap; uniform int u_numPointLights; uniform vec3 u_pointLightPos[4]; uniform vec3 u_pointLightColor[4]; uniform int u_numSpotLights; uniform vec3 u_spotLightPos[4]; uniform vec3 u_spotLightDir[4]; uniform vec3 u_spotLightColor[4]; uniform vec4 u_spotLightParams[4]; void main() { vec4 texColor = texture2D(u_diffuseMap, v_uv); if (u_shininess < -0.5) { gl_FragColor = u_color * texColor; return; } vec3 N = normalize(v_normal); vec3 V = normalize(u_viewPos - v_worldPos); vec3 finalLight = u_ambientColor; vec3 specular = vec3(0.0); vec3 L_dir = normalize(u_dirLightDir); float diff_dir = max(dot(N, L_dir), 0.0); finalLight += diff_dir * u_dirLightColor; if (u_shininess > 0.0 && diff_dir > 0.0) specular += pow(max(dot(V, reflect(-L_dir, N)), 0.0), u_shininess) * u_dirLightColor; for(int i = 0; i < 4; i++) { if (i >= u_numPointLights) break; vec3 lightVec = u_pointLightPos[i] - v_worldPos; float dist = length(lightVec); vec3 L_pt = lightVec / dist; float attenuation = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist); float diff_pt = max(dot(N, L_pt), 0.0); finalLight += diff_pt * u_pointLightColor[i] * attenuation; if (u_shininess > 0.0 && diff_pt > 0.0) specular += pow(max(dot(V, reflect(-L_pt, N)), 0.0), u_shininess) * u_pointLightColor[i] * attenuation; } for(int i = 0; i < 4; i++) { if (i >= u_numSpotLights) break; vec3 lightVec = u_spotLightPos[i] - v_worldPos; float dist = length(lightVec); vec3 L_sp = lightVec / dist; vec3 S_dir = normalize(u_spotLightDir[i]); float theta = dot(-L_sp, S_dir); if(theta > u_spotLightParams[i].x) { float spotEffect = smoothstep(u_spotLightParams[i].x, u_spotLightParams[i].y, theta); float attenuation = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist); float diff_sp = max(dot(N, L_sp), 0.0); finalLight += diff_sp * u_spotLightColor[i] * attenuation * spotEffect; if (u_shininess > 0.0 && diff_sp > 0.0) specular += pow(max(dot(V, reflect(-L_sp, N)), 0.0), u_shininess) * u_spotLightColor[i] * attenuation * spotEffect; } } gl_FragColor = vec4((finalLight * u_color.rgb * texColor.rgb) + (specular * u_specColor.rgb), u_color.a * texColor.a); }", r = (s, n) => {
      const h = this.gl.createShader(this.gl.VERTEX_SHADER);
      this.gl.shaderSource(h, s), this.gl.compileShader(h);
      const l = this.gl.createShader(this.gl.FRAGMENT_SHADER);
      this.gl.shaderSource(l, n), this.gl.compileShader(l);
      const c = this.gl.createProgram();
      return this.gl.attachShader(c, h), this.gl.attachShader(c, l), this.gl.linkProgram(c), c;
    };
    this.prog = r(e, i), this.skyProg = r(
      "attribute vec3 a_position; uniform mat4 u_vp; uniform mat4 u_model; varying vec3 v_uvw; void main() { v_uvw = a_position; gl_Position = u_vp * u_model * vec4(a_position, 1.0); }",
      "precision highp float; varying vec3 v_uvw; uniform samplerCube u_skybox; void main() { gl_FragColor = textureCube(u_skybox, v_uvw); }"
    ), this.locs = {
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
    for (let s = 0; s < 4; s++)
      this.pointLightLocs.push({
        pos: this.gl.getUniformLocation(this.prog, `u_pointLightPos[${s}]`),
        col: this.gl.getUniformLocation(this.prog, `u_pointLightColor[${s}]`)
      }), this.spotLightLocs.push({
        pos: this.gl.getUniformLocation(this.prog, `u_spotLightPos[${s}]`),
        dir: this.gl.getUniformLocation(this.prog, `u_spotLightDir[${s}]`),
        col: this.gl.getUniformLocation(this.prog, `u_spotLightColor[${s}]`),
        params: this.gl.getUniformLocation(this.prog, `u_spotLightParams[${s}]`)
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
  setClearColor(t) {
    this.gl.clearColor(t.r, t.g, t.b, t.a);
  }
  render(t, e, i = new w()) {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT), this.gl.depthMask(!1), this.gl.useProgram(this.skyProg), this.skyLocs.vp && this.gl.uniformMatrix4fv(this.skyLocs.vp, !1, e);
    const r = (o) => {
      if (!(!o.isVisible || !o.material)) {
        if (o.geometry && o.material.type === b.SKYBOX) {
          const u = o.material;
          let p = this.cache.get(o.geometry);
          p || (p = new tt(this.gl, o.geometry), this.cache.set(o.geometry, p)), p.bind(this.skyLocs.pos), this.skyLocs.model && this.gl.uniformMatrix4fv(this.skyLocs.model, !1, o.worldMatrix.data), this.gl.activeTexture(this.gl.TEXTURE0), this.gl.bindTexture(
            this.gl.TEXTURE_CUBE_MAP,
            u.cubeMap ? this.getWebGLCubeTexture(u.cubeMap) : this.defaultCubeTexture
          ), this.skyLocs.skybox && this.gl.uniform1i(this.skyLocs.skybox, 0), this.gl.drawElements(this.gl.TRIANGLES, p.count, this.gl.UNSIGNED_SHORT, 0);
        }
        if (o.children) for (const u of o.children) r(u);
      }
    };
    for (const o of t.objects) r(o);
    this.gl.depthMask(!0), this.gl.useProgram(this.prog), this.locs.vp && this.gl.uniformMatrix4fv(this.locs.vp, !1, e), this.locs.viewPos && this.gl.uniform3f(this.locs.viewPos, i.x, i.y, i.z);
    let s = new v(0, 0, 0), n = new w(0, 1, 0), h = new v(0, 0, 0);
    const l = [], c = [], d = (o) => {
      if (o instanceof I) {
        const u = o;
        switch (u.type) {
          case M.AMBIENT:
            s = new v(
              u.color.r * u.intensity,
              u.color.g * u.intensity,
              u.color.b * u.intensity
            );
            break;
          case M.DIRECTIONAL:
            n = u.direction.clone().scale(-1).normalize(), h = new v(
              u.color.r * u.intensity,
              u.color.g * u.intensity,
              u.color.b * u.intensity
            );
            break;
          case M.POINT:
            l.length < 4 && l.push(u);
            break;
          case M.SPOT:
            c.length < 4 && c.push(u);
            break;
        }
      }
      o.children && o.children.forEach(d);
    };
    for (const o of t.objects) d(o);
    this.locs.ambient && this.gl.uniform3f(this.locs.ambient, s.r, s.g, s.b), this.locs.dirDir && this.gl.uniform3f(this.locs.dirDir, n.x, n.y, n.z), this.locs.dirColor && this.gl.uniform3f(this.locs.dirColor, h.r, h.g, h.b), this.locs.numPL && this.gl.uniform1i(this.locs.numPL, l.length);
    for (let o = 0; o < l.length; o++)
      this.pointLightLocs[o].pos && this.gl.uniform3f(
        this.pointLightLocs[o].pos,
        l[o].worldMatrix.data[12],
        l[o].worldMatrix.data[13],
        l[o].worldMatrix.data[14]
      ), this.pointLightLocs[o].col && this.gl.uniform3f(
        this.pointLightLocs[o].col,
        l[o].color.r * l[o].intensity,
        l[o].color.g * l[o].intensity,
        l[o].color.b * l[o].intensity
      );
    this.locs.numSL && this.gl.uniform1i(this.locs.numSL, c.length);
    for (let o = 0; o < c.length; o++) {
      this.spotLightLocs[o].pos && this.gl.uniform3f(
        this.spotLightLocs[o].pos,
        c[o].worldMatrix.data[12],
        c[o].worldMatrix.data[13],
        c[o].worldMatrix.data[14]
      );
      const u = c[o].direction.clone().normalize();
      this.spotLightLocs[o].dir && this.gl.uniform3f(this.spotLightLocs[o].dir, u.x, u.y, u.z), this.spotLightLocs[o].col && this.gl.uniform3f(
        this.spotLightLocs[o].col,
        c[o].color.r * c[o].intensity,
        c[o].color.g * c[o].intensity,
        c[o].color.b * c[o].intensity
      ), this.spotLightLocs[o].params && this.gl.uniform4f(
        this.spotLightLocs[o].params,
        Math.cos(c[o].angle),
        Math.cos(c[o].angle * (1 - c[o].penumbra)),
        c[o].distance,
        c[o].decay
      );
    }
    const f = (o) => {
      if (!o.isVisible || !o.geometry || !o.material || o.material.type === b.SKYBOX) {
        if (o.children) for (const x of o.children) f(x);
        return;
      }
      const u = o.material;
      let p = this.cache.get(o.geometry);
      p || (p = new tt(this.gl, o.geometry), this.cache.set(o.geometry, p)), p.bind(this.locs.pos, this.locs.norm, this.locs.uv), this.locs.model && this.gl.uniformMatrix4fv(this.locs.model, !1, o.worldMatrix.data), this.locs.color && this.gl.uniform4fv(this.locs.color, u.color.toArray());
      let E = -1, m = [0, 0, 0, 0], g = this.defaultTexture, L = [0, 0], _ = [1, 1];
      if (u.type === b.LAMBERT)
        E = 0;
      else if (u.type === b.PHONG) {
        const x = u;
        E = x.shininess || 32, m = x.specularColor ? x.specularColor.toArray() : [0, 0, 0, 0], x.diffuseMap && (g = this.getWebGLTexture(x.diffuseMap), L = [x.diffuseMap.offset.x, x.diffuseMap.offset.y], _ = [x.diffuseMap.repeat.x, x.diffuseMap.repeat.y]);
      }
      this.gl.activeTexture(this.gl.TEXTURE0), this.gl.bindTexture(this.gl.TEXTURE_2D, g), this.locs.diffuseMap && this.gl.uniform1i(this.locs.diffuseMap, 0), this.locs.texOffset && this.gl.uniform2fv(this.locs.texOffset, L), this.locs.texRepeat && this.gl.uniform2fv(this.locs.texRepeat, _), this.locs.shininess && this.gl.uniform1f(this.locs.shininess, E), this.locs.specColor && this.gl.uniform4fv(this.locs.specColor, m);
      const S = u.type === b.WIREFRAME ? this.gl.LINES : this.gl.TRIANGLES;
      if (this.gl.drawElements(S, p.count, this.gl.UNSIGNED_SHORT, 0), o.children) for (const x of o.children) f(x);
    };
    for (const o of t.objects) f(o);
  }
  setSize(t, e) {
    const i = devicePixelRatio;
    this.gl.canvas.width = t * i, this.gl.canvas.height = e * i, this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
  }
}
class it {
  type = U.WEB_GL2;
  gl;
  prog;
  locs;
  skyProg;
  skyLocs;
  cache = /* @__PURE__ */ new Map();
  texCache = /* @__PURE__ */ new Map();
  texCubeCache = /* @__PURE__ */ new Map();
  defaultTexture;
  defaultCubeTexture;
  pointLightLocs = [];
  spotLightLocs = [];
  async initialize(t) {
    this.gl = t.getContext("webgl2", { antialias: !0 }), this.defaultTexture = this.gl.createTexture(), this.gl.bindTexture(this.gl.TEXTURE_2D, this.defaultTexture), this.gl.texImage2D(
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
    for (let h = 0; h < 6; h++)
      this.gl.texImage2D(
        this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + h,
        0,
        this.gl.RGBA,
        1,
        1,
        0,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        new Uint8Array([50, 50, 100, 255])
      );
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
    }`, r = `#version 300 es
    in vec3 a_position; uniform mat4 u_vp; uniform mat4 u_model;
    out vec3 v_uvw;
    void main() {
        v_uvw = a_position; 
        gl_Position = u_vp * u_model * vec4(a_position, 1.0);
    }`, s = `#version 300 es
    precision highp float;
    in vec3 v_uvw; uniform samplerCube u_skybox;
    out vec4 c;
    void main() { c = texture(u_skybox, v_uvw); }`, n = (h, l) => {
      const c = this.gl.createShader(this.gl.VERTEX_SHADER);
      this.gl.shaderSource(c, h), this.gl.compileShader(c);
      const d = this.gl.createShader(this.gl.FRAGMENT_SHADER);
      this.gl.shaderSource(d, l), this.gl.compileShader(d);
      const f = this.gl.createProgram();
      return this.gl.attachShader(f, c), this.gl.attachShader(f, d), this.gl.linkProgram(f), f;
    };
    this.prog = n(e, i), this.skyProg = n(r, s), this.locs = {
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
    for (let h = 0; h < 4; h++)
      this.pointLightLocs.push({
        pos: this.gl.getUniformLocation(this.prog, `u_pointLightPos[${h}]`),
        col: this.gl.getUniformLocation(this.prog, `u_pointLightColor[${h}]`)
      }), this.spotLightLocs.push({
        pos: this.gl.getUniformLocation(this.prog, `u_spotLightPos[${h}]`),
        dir: this.gl.getUniformLocation(this.prog, `u_spotLightDir[${h}]`),
        col: this.gl.getUniformLocation(this.prog, `u_spotLightColor[${h}]`),
        params: this.gl.getUniformLocation(this.prog, `u_spotLightParams[${h}]`)
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
      this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR), this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR), this.texCubeCache.set(t, e);
    }
    return e;
  }
  setClearColor(t) {
    this.gl.clearColor(t.r, t.g, t.b, t.a);
  }
  render(t, e, i = new w()) {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT), this.gl.depthMask(!1), this.gl.useProgram(this.skyProg), this.skyLocs.vp && this.gl.uniformMatrix4fv(this.skyLocs.vp, !1, e);
    const r = (o) => {
      if (!(!o.isVisible || !o.material)) {
        if (o.geometry && o.material.type === b.SKYBOX) {
          const u = o.material;
          let p = this.cache.get(o.geometry);
          p || (p = new tt(this.gl, o.geometry), this.cache.set(o.geometry, p)), p.bind(this.skyLocs.pos), this.skyLocs.model && this.gl.uniformMatrix4fv(this.skyLocs.model, !1, o.worldMatrix.data), this.gl.activeTexture(this.gl.TEXTURE0), this.gl.bindTexture(
            this.gl.TEXTURE_CUBE_MAP,
            u.cubeMap ? this.getWebGLCubeTexture(u.cubeMap) : this.defaultCubeTexture
          ), this.skyLocs.skybox && this.gl.uniform1i(this.skyLocs.skybox, 0), this.gl.drawElements(this.gl.TRIANGLES, p.count, this.gl.UNSIGNED_SHORT, 0);
        }
        if (o.children) for (const u of o.children) r(u);
      }
    };
    for (const o of t.objects) r(o);
    this.gl.depthMask(!0), this.gl.useProgram(this.prog);
    let s = new v(0, 0, 0), n = new w(0, 1, 0), h = new v(0, 0, 0);
    const l = [], c = [], d = (o) => {
      if (o instanceof I)
        switch (o.type) {
          case M.AMBIENT:
            s = new v(
              o.color.r * o.intensity,
              o.color.g * o.intensity,
              o.color.b * o.intensity
            );
            break;
          case M.DIRECTIONAL:
            n = o.direction.clone().scale(-1).normalize(), h = new v(
              o.color.r * o.intensity,
              o.color.g * o.intensity,
              o.color.b * o.intensity
            );
            break;
          case M.POINT:
            l.length < 4 && l.push(o);
            break;
          case M.SPOT:
            c.length < 4 && c.push(o);
            break;
        }
      o.children && o.children.forEach(d);
    };
    for (const o of t.objects) d(o);
    this.locs.vp && this.gl.uniformMatrix4fv(this.locs.vp, !1, e), this.locs.viewPos && this.gl.uniform3f(this.locs.viewPos, i.x, i.y, i.z), this.locs.ambient && this.gl.uniform3f(this.locs.ambient, s.r, s.g, s.b), this.locs.dirDir && this.gl.uniform3f(this.locs.dirDir, n.x, n.y, n.z), this.locs.dirColor && this.gl.uniform3f(this.locs.dirColor, h.r, h.g, h.b), this.locs.numPL && this.gl.uniform1i(this.locs.numPL, l.length);
    for (let o = 0; o < l.length; o++)
      this.pointLightLocs[o].pos && this.gl.uniform3f(
        this.pointLightLocs[o].pos,
        l[o].worldMatrix.data[12],
        l[o].worldMatrix.data[13],
        l[o].worldMatrix.data[14]
      ), this.pointLightLocs[o].col && this.gl.uniform3f(
        this.pointLightLocs[o].col,
        l[o].color.r * l[o].intensity,
        l[o].color.g * l[o].intensity,
        l[o].color.b * l[o].intensity
      );
    this.locs.numSL && this.gl.uniform1i(this.locs.numSL, c.length);
    for (let o = 0; o < c.length; o++) {
      this.spotLightLocs[o].pos && this.gl.uniform3f(
        this.spotLightLocs[o].pos,
        c[o].worldMatrix.data[12],
        c[o].worldMatrix.data[13],
        c[o].worldMatrix.data[14]
      );
      const u = c[o].direction.clone().normalize();
      this.spotLightLocs[o].dir && this.gl.uniform3f(this.spotLightLocs[o].dir, u.x, u.y, u.z), this.spotLightLocs[o].col && this.gl.uniform3f(
        this.spotLightLocs[o].col,
        c[o].color.r * c[o].intensity,
        c[o].color.g * c[o].intensity,
        c[o].color.b * c[o].intensity
      ), this.spotLightLocs[o].params && this.gl.uniform4f(
        this.spotLightLocs[o].params,
        Math.cos(c[o].angle),
        Math.cos(c[o].angle * (1 - c[o].penumbra)),
        c[o].distance,
        c[o].decay
      );
    }
    const f = (o) => {
      if (!o.isVisible || !o.geometry || !o.material || o.material.type === b.SKYBOX) {
        if (o.children) for (const x of o.children) f(x);
        return;
      }
      const u = o.material;
      let p = this.cache.get(o.geometry);
      p || (p = new tt(this.gl, o.geometry), this.cache.set(o.geometry, p)), p.bind(this.locs.pos, this.locs.norm, this.locs.uv);
      let E = -1, m = [0, 0, 0, 0], g = this.defaultTexture, L = [0, 0], _ = [1, 1];
      if (u.type === b.LAMBERT)
        E = 0;
      else if (u.type === b.PHONG) {
        const x = u;
        E = x.shininess || 32, m = x.specularColor ? x.specularColor.toArray() : [0, 0, 0, 0], x.diffuseMap && (g = this.getWebGLTexture(x.diffuseMap), L = [x.diffuseMap.offset.x, x.diffuseMap.offset.y], _ = [x.diffuseMap.repeat.x, x.diffuseMap.repeat.y]);
      }
      this.locs.model && this.gl.uniformMatrix4fv(this.locs.model, !1, o.worldMatrix.data), this.locs.color && this.gl.uniform4fv(this.locs.color, u.color.toArray()), this.locs.shininess && this.gl.uniform1f(this.locs.shininess, E), this.locs.specColor && this.gl.uniform4fv(this.locs.specColor, m), this.gl.activeTexture(this.gl.TEXTURE0), this.gl.bindTexture(this.gl.TEXTURE_2D, g), this.locs.diffuseMap && this.gl.uniform1i(this.locs.diffuseMap, 0), this.locs.texOffset && this.gl.uniform2fv(this.locs.texOffset, L), this.locs.texRepeat && this.gl.uniform2fv(this.locs.texRepeat, _);
      const S = u.type === b.WIREFRAME ? this.gl.LINES : this.gl.TRIANGLES;
      if (this.gl.drawElements(S, p.count, this.gl.UNSIGNED_SHORT, 0), o.children) for (const x of o.children) f(x);
    };
    for (const o of t.objects) f(o);
  }
  setSize(t, e) {
    this.gl.canvas.width = t * devicePixelRatio, this.gl.canvas.height = e * devicePixelRatio, this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
  }
}
class mt {
  type = U.WEB_GPU;
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
  clearColor = { r: 0, g: 0, b: 0, a: 1 };
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
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" }
        },
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
    const r = this.device.createPipelineLayout({
      bindGroupLayouts: [this.objBGL, this.texBGL]
    }), s = this.device.createPipelineLayout({
      bindGroupLayouts: [this.objBGL, this.skyTexBGL]
    }), n = {
      vertex: {
        module: e,
        buffers: [
          {
            arrayStride: 12,
            attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }]
          },
          {
            arrayStride: 12,
            attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }]
          },
          { arrayStride: 8, attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }] }
        ]
      },
      fragment: { module: e, targets: [{ format: this.format }] },
      primitive: { topology: "triangle-list", cullMode: "back" },
      depthStencil: { depthWriteEnabled: !0, depthCompare: "less", format: "depth24plus" },
      layout: r
    };
    this.pipelineTriangles = this.device.createRenderPipeline(n), n.primitive.topology = "line-list", this.pipelineLines = this.device.createRenderPipeline(n), this.pipelineSkybox = this.device.createRenderPipeline({
      vertex: { module: i, buffers: [n.vertex.buffers[0]] },
      fragment: { module: i, targets: [{ format: this.format }] },
      primitive: { topology: "triangle-list" },
      depthStencil: { depthWriteEnabled: !1, depthCompare: "less", format: "depth24plus" },
      layout: s
    });
    const h = this.device.createTexture({
      size: [1, 1],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    });
    this.device.queue.writeTexture(
      { texture: h },
      new Uint8Array([255, 255, 255, 255]),
      { bytesPerRow: 4 },
      [1, 1]
    ), this.defaultTexBindGroup = this.device.createBindGroup({
      layout: this.texBGL,
      entries: [
        { binding: 0, resource: h.createView() },
        { binding: 1, resource: this.sampler }
      ]
    });
    const l = this.device.createTexture({
      size: [1, 1, 6],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    });
    for (let c = 0; c < 6; c++)
      this.device.queue.writeTexture(
        {
          texture: l,
          origin: [0, 0, c]
        },
        new Uint8Array([50, 50, 100, 255]),
        { bytesPerRow: 4 },
        [1, 1]
      );
    this.defaultCubeTexBindGroup = this.device.createBindGroup({
      layout: this.skyTexBGL,
      entries: [
        { binding: 0, resource: l.createView({ dimension: "cube" }) },
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
  setClearColor(t) {
    this.clearColor = { r: t.r, g: t.g, b: t.b, a: t.a };
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
      const i = (r, s) => {
        const n = this.device.createBuffer({
          size: r.byteLength + 3 & -4,
          usage: s,
          mappedAtCreation: !0
        });
        return r instanceof Float32Array ? new Float32Array(n.getMappedRange()).set(r) : r instanceof Uint16Array ? new Uint16Array(n.getMappedRange()).set(r) : new Uint32Array(n.getMappedRange()).set(r), n.unmap(), n;
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
      const i = this.device.createBuffer({
        size: 1024,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      }), r = this.device.createBuffer({
        size: 512,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      }), s = this.device.createBuffer({
        size: 1024,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      }), n = this.device.createBindGroup({
        layout: this.objBGL,
        entries: [
          { binding: 0, resource: { buffer: i } },
          { binding: 1, resource: { buffer: r } },
          {
            binding: 2,
            resource: { buffer: s }
          }
        ]
      });
      e = { ub: i, plb: r, slb: s, bg: n }, this.objCache.set(t, e);
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
      this.device.queue.copyExternalImageToTexture({ source: t.image }, { texture: i }, [
        t.image.width,
        t.image.height
      ]);
      const r = this.getSampler(t);
      e = this.device.createBindGroup({
        layout: this.texBGL,
        entries: [
          { binding: 0, resource: i.createView() },
          { binding: 1, resource: r }
        ]
      }), this.texCache.set(t, e);
    }
    return e;
  }
  getGPUCubeTextureBindGroup(t) {
    if (!t.isLoaded || t.images.length !== 6) return this.defaultCubeTexBindGroup;
    let e = this.texCubeCache.get(t);
    if (!e) {
      const i = t.images[0], r = this.device.createTexture({
        size: [i.width, i.height, 6],
        format: "rgba8unorm",
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
      });
      for (let s = 0; s < 6; s++)
        this.device.queue.copyExternalImageToTexture(
          { source: t.images[s] },
          {
            texture: r,
            origin: [0, 0, s]
          },
          [i.width, i.height]
        );
      e = this.device.createBindGroup({
        layout: this.skyTexBGL,
        entries: [
          { binding: 0, resource: r.createView({ dimension: "cube" }) },
          {
            binding: 1,
            resource: this.sampler
          }
        ]
      }), this.texCubeCache.set(t, e);
    }
    return e;
  }
  render(t, e, i = new w()) {
    if (!this.device) return;
    const r = this.device.createCommandEncoder(), s = r.beginRenderPass({
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
    });
    let n = new v(0, 0, 0), h = new w(0, 1, 0), l = new v(0, 0, 0);
    const c = [], d = [], f = (m) => {
      if (m instanceof I) {
        const g = m;
        switch (g.type) {
          case M.AMBIENT:
            n = new v(
              g.color.r * g.intensity,
              g.color.g * g.intensity,
              g.color.b * g.intensity
            );
            break;
          case M.DIRECTIONAL:
            h = g.direction.clone().scale(-1).normalize(), l = new v(
              g.color.r * g.intensity,
              g.color.g * g.intensity,
              g.color.b * g.intensity
            );
            break;
          case M.POINT:
            c.length < 4 && c.push(g);
            break;
          case M.SPOT:
            d.length < 4 && d.push(g);
            break;
        }
      }
      m.children && m.children.forEach(f);
    };
    for (const m of t.objects) f(m);
    const o = new Float32Array(160);
    o.set(e, 0), o.set([n.r, n.g, n.b, 1], 40), o.set([l.r, l.g, l.b, 1], 44), o.set([h.x, h.y, h.z, 0], 48), o.set([i.x, i.y, i.z, 0], 52), o[61] = c.length, o[62] = d.length;
    const u = new Float32Array(32);
    for (let m = 0; m < c.length; m++) {
      const g = c[m];
      u.set(
        [g.worldMatrix.data[12], g.worldMatrix.data[13], g.worldMatrix.data[14], 0],
        m * 8
      ), u.set(
        [g.color.r * g.intensity, g.color.g * g.intensity, g.color.b * g.intensity, 0],
        m * 8 + 4
      );
    }
    const p = new Float32Array(64);
    for (let m = 0; m < d.length; m++) {
      const g = d[m], L = m * 16;
      p.set(
        [g.worldMatrix.data[12], g.worldMatrix.data[13], g.worldMatrix.data[14], 0],
        L
      );
      const _ = g.direction.clone().normalize();
      p.set([_.x, _.y, _.z, 0], L + 4), p.set(
        [g.color.r * g.intensity, g.color.g * g.intensity, g.color.b * g.intensity, 0],
        L + 8
      ), p.set(
        [Math.cos(g.angle), Math.cos(g.angle * (1 - g.penumbra)), g.distance, g.decay],
        L + 12
      );
    }
    const E = (m) => {
      if (!m.isVisible || !m.geometry || !m.material) return;
      const g = m.material;
      let L = this.defaultTexBindGroup, _ = -1, S = [0, 0, 0, 0], x = [0, 0], P = [1, 1];
      if (g.type === b.SKYBOX) {
        s.setPipeline(this.pipelineSkybox);
        const R = g;
        L = R.cubeMap ? this.getGPUCubeTextureBindGroup(R.cubeMap) : this.defaultCubeTexBindGroup;
      } else if (s.setPipeline(
        g.type === b.WIREFRAME ? this.pipelineLines : this.pipelineTriangles
      ), g.type === b.LAMBERT)
        _ = 0;
      else if (g.type === b.PHONG) {
        const R = g;
        _ = R.shininess || 32, S = R.specularColor ? R.specularColor.toArray() : [0, 0, 0, 0], R.diffuseMap && (L = this.getGPUTextureBindGroup(R.diffuseMap), x = [R.diffuseMap.offset.x, R.diffuseMap.offset.y], P = [R.diffuseMap.repeat.x, R.diffuseMap.repeat.y]);
      }
      o.set(m.worldMatrix.data, 16), o.set(g.color.toArray(), 32), o.set(S, 36), o.set(x, 56), o.set(P, 58), o[60] = _;
      const G = this.getObjCache(m);
      this.device.queue.writeBuffer(G.ub, 0, o), this.device.queue.writeBuffer(G.plb, 0, u), this.device.queue.writeBuffer(G.slb, 0, p);
      const A = this.getGeoCache(m.geometry);
      if (s.setBindGroup(0, G.bg), s.setBindGroup(1, L), s.setVertexBuffer(0, A.vb), s.setVertexBuffer(1, A.nb ? A.nb : A.vb), s.setVertexBuffer(2, A.uvb ? A.uvb : A.vb), A.ib && A.format ? (s.setIndexBuffer(A.ib, A.format), s.drawIndexed(A.indexCount)) : s.draw(A.vertexCount), m.children) for (const R of m.children) E(R);
    };
    for (const m of t.objects || []) E(m);
    s.end(), this.device.queue.submit([r.finish()]);
  }
}
class xt {
  static async create(t, e) {
    let i = t;
    i === U.BEST && (i = navigator.gpu ? U.WEB_GPU : U.WEB_GL2);
    let r;
    switch (i) {
      case U.WEB_GPU:
        navigator.gpu ? r = new mt() : r = new it();
        break;
      case U.WEB_GL2:
        r = new it();
        break;
      case U.WEB_GL1:
        r = new pt();
        break;
      default:
        r = new it();
        break;
    }
    return await r.initialize(e), r;
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
    if (!e) return new v(1, 1, 1, 1);
    e.fillStyle = t, e.fillRect(0, 0, 1, 1);
    const [i, r, s, n] = e.getImageData(0, 0, 1, 1).data;
    return new v(i / 255, r / 255, s / 255, n / 255);
  }
}
class Ut {
  config;
  activeRenderer;
  constructor() {
  }
  async init(t) {
    try {
      const e = await fetch(t);
      if (!e.ok)
        throw new Error(`Konfigurationsdatei nicht gefunden: ${t}`);
      this.config = await e.json(), this.config.rendererType || (this.config.rendererType = ft);
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
      const e = this.indices[t] * 3, i = this.indices[t + 1] * 3, r = this.indices[t + 2] * 3, s = this.vertices[e], n = this.vertices[e + 1], h = this.vertices[e + 2], l = this.vertices[i], c = this.vertices[i + 1], d = this.vertices[i + 2], f = this.vertices[r], o = this.vertices[r + 1], u = this.vertices[r + 2], p = l - s, E = c - n, m = d - h, g = f - s, L = o - n, _ = u - h, S = E * _ - m * L, x = m * g - p * _, P = p * L - E * g;
      this.normals[e] += S, this.normals[e + 1] += x, this.normals[e + 2] += P, this.normals[i] += S, this.normals[i + 1] += x, this.normals[i + 2] += P, this.normals[r] += S, this.normals[r + 1] += x, this.normals[r + 2] += P;
    }
    for (let t = 0; t < this.normals.length; t += 3) {
      const e = this.normals[t], i = this.normals[t + 1], r = this.normals[t + 2], s = Math.sqrt(e * e + i * i + r * r);
      s > 0 && (this.normals[t] /= s, this.normals[t + 1] /= s, this.normals[t + 2] /= s);
    }
  }
  applyMatrix4(t) {
    const e = new w();
    for (let i = 0; i < this.vertices.length; i += 3)
      e.x = this.vertices[i], e.y = this.vertices[i + 1], e.z = this.vertices[i + 2], t.transformVector(e), this.vertices[i] = e.x, this.vertices[i + 1] = e.y, this.vertices[i + 2] = e.z;
    return this.computeNormals(), this;
  }
  scale(t) {
    const e = new y();
    return y.scale(t, e), this.applyMatrix4(e);
  }
  rotateX(t) {
    const e = new y();
    return y.rotateX(t, e), this.applyMatrix4(e);
  }
  rotateY(t) {
    const e = new y();
    return y.rotateY(t, e), this.applyMatrix4(e);
  }
  rotateZ(t) {
    const e = new y();
    return y.rotateZ(t, e), this.applyMatrix4(e);
  }
}
class vt extends D {
  constructor(t, e, i, r) {
    super(), this.vertices = new Float32Array(t), this.uvs = new Float32Array(e), this.normals = new Float32Array(i), this.indices = new Uint16Array(r), this.normals.length === 0 && this.computeNormals();
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
    const i = t, r = this._listeners.get(i);
    if (r) {
      const s = r.indexOf(e);
      s !== -1 && r.splice(s, 1);
    }
  }
  dispatchEvent(t, e = {}) {
    const i = t, r = this._listeners.get(i);
    if (r) {
      e.type = i;
      const s = r.slice(0);
      for (const n of s)
        n(e);
    }
  }
}
class O extends yt {
  basePath = "";
  setBasePath(t) {
    return this.basePath = t, this;
  }
}
var T = /* @__PURE__ */ ((a) => (a.LOADER_END = "LoaderEnd", a.LOADER_ERROR = "LoaderError", a.LOADER_PROGRESS = "LoaderProgress", a.LOADER_START = "LoaderStart", a))(T || {});
class N {
  uuid = crypto.randomUUID();
  color = v.WHITE;
}
class ot extends N {
  type = b.PHONG;
  specularColor = v.WHITE;
  shininess = 32;
  diffuseMap = null;
}
class Lt extends O {
  async load(t) {
    const e = this.basePath + t;
    this.dispatchEvent(T.LOADER_START, { url: e });
    try {
      const i = await F.loadText(e, (s, n) => {
        this.dispatchEvent(T.LOADER_PROGRESS, { url: e, loaded: s, total: n });
      }), r = this.parse(i);
      return this.dispatchEvent(T.LOADER_END, { url: e, data: r }), r;
    } catch (i) {
      throw this.dispatchEvent(T.LOADER_ERROR, { url: e, error: i }), i;
    }
  }
  parse(t) {
    const e = /* @__PURE__ */ new Map();
    let i = null;
    const r = t.split(`
`);
    for (let s of r) {
      if (s = s.trim(), s.length === 0 || s.startsWith("#")) continue;
      const n = s.split(/\s+/), h = n[0];
      h === "newmtl" ? (i = new ot(), e.set(n[1], i)) : h === "Kd" && i ? i.color = new v(
        parseFloat(n[1]),
        parseFloat(n[2]),
        parseFloat(n[3])
      ) : h === "Ks" && i ? i.specularColor = new v(
        parseFloat(n[1]),
        parseFloat(n[2]),
        parseFloat(n[3])
      ) : h === "Ns" && i && (i.shininess = parseFloat(n[1]));
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
class Bt extends O {
  async load(t) {
    const e = this.basePath + t;
    this.dispatchEvent(T.LOADER_START, { url: e });
    try {
      const i = await F.loadText(e, (n, h) => {
        this.dispatchEvent(T.LOADER_PROGRESS, { url: e, loaded: n, total: h });
      }), r = e.substring(0, e.lastIndexOf("/") + 1), s = await this.parse(i, r);
      return this.dispatchEvent(T.LOADER_END, { url: e, data: s }), s;
    } catch (i) {
      throw this.dispatchEvent(T.LOADER_ERROR, { url: e, error: i }), i;
    }
  }
  async parse(t, e) {
    const i = [], r = [], s = [];
    let n = /* @__PURE__ */ new Map();
    const h = /* @__PURE__ */ new Map();
    let l = new rt("default");
    h.set("default", l);
    const c = t.split(`
`);
    for (let f of c) {
      if (f = f.trim(), f.length === 0 || f.startsWith("#")) continue;
      const o = f.split(/\s+/), u = o[0];
      if (u === "mtllib")
        n = await new Lt().load(e + o[1]);
      else if (u === "usemtl") {
        const p = o[1];
        h.has(p) || h.set(p, new rt(p)), l = h.get(p);
      } else if (u === "v")
        i.push(parseFloat(o[1]), parseFloat(o[2]), parseFloat(o[3]));
      else if (u === "vt")
        r.push(parseFloat(o[1]), parseFloat(o[2]));
      else if (u === "vn")
        s.push(parseFloat(o[1]), parseFloat(o[2]), parseFloat(o[3]));
      else if (u === "f") {
        const p = o.slice(1);
        for (let E = 1; E < p.length - 1; E++) {
          const m = this.parseFaceVertex(
            p[0],
            i,
            r,
            s,
            l
          ), g = this.parseFaceVertex(
            p[E],
            i,
            r,
            s,
            l
          ), L = this.parseFaceVertex(
            p[E + 1],
            i,
            r,
            s,
            l
          );
          l.outIndices.push(m, g, L);
        }
      }
    }
    const d = new K("ModelRoot");
    return h.forEach((f, o) => {
      if (f.outIndices.length === 0) return;
      const u = new K(o);
      u.geometry = new vt(
        f.outVertices,
        f.outUVs,
        f.outNormals,
        f.outIndices
      ).getGeometryData(), u.material = n.get(o) || new ot(), d.add(u);
    }), d;
  }
  parseFaceVertex(t, e, i, r, s) {
    if (s.vertexCache.has(t)) return s.vertexCache.get(t);
    const n = t.split("/"), h = (parseInt(n[0]) - 1) * 3;
    if (s.outVertices.push(e[h], e[h + 1], e[h + 2]), n.length > 1 && n[1] !== "") {
      const c = (parseInt(n[1]) - 1) * 2;
      s.outUVs.push(i[c], i[c + 1]);
    } else
      s.outUVs.push(0, 0);
    if (n.length > 2) {
      const c = (parseInt(n[2]) - 1) * 3;
      s.outNormals.push(r[c], r[c + 1], r[c + 2]);
    }
    const l = s.indexCounter++;
    return s.vertexCache.set(t, l), l;
  }
}
class nt {
  uuid = crypto.randomUUID();
  images = [];
  isLoaded = !1;
  constructor(t) {
    t && t.length === 6 && this.load(t);
  }
  async load(t) {
    try {
      this.images = await Promise.all(t.map((e) => F.loadImage(e))), this.isLoaded = !0;
    } catch (e) {
      console.error("Fehler beim Laden der CubeTexture", e);
    }
  }
}
class Dt extends O {
  async load(t) {
    const e = this.basePath + t;
    this.dispatchEvent("loadStart", { url: e });
    try {
      const i = await F.loadImage(
        e,
        (d, f) => this.dispatchEvent(T.LOADER_PROGRESS, { url: e, loaded: d, total: f }),
        !1
      ), r = i.width / 4, s = document.createElement("canvas");
      s.width = r, s.height = r;
      const n = s.getContext("2d", { willReadFrequently: !0 }), h = [
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
      ], l = [];
      for (const d of h) {
        n.clearRect(0, 0, r, r), n.drawImage(
          i,
          // Type-Cast für TypeScript
          d.col * r,
          d.row * r,
          r,
          r,
          0,
          0,
          r,
          r
        );
        const f = await createImageBitmap(s);
        l.push(f);
      }
      const c = new nt();
      return c.images = l, c.isLoaded = !0, this.dispatchEvent(T.LOADER_END, { url: e, data: c }), c;
    } catch (i) {
      throw this.dispatchEvent(T.LOADER_ERROR, { url: e, error: i }), i;
    }
  }
}
class Et extends D {
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
class _t extends N {
  type = b.SKYBOX;
  cubeMap = null;
}
class Gt extends K {
  constructor(t, e = 100) {
    super("Skybox"), this.geometry = new Et(e).getGeometryData();
    const i = new _t();
    Array.isArray(t) ? i.cubeMap = new nt(t) : i.cubeMap = t, this.material = i, this.frustumCulled = !1;
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
class Ft {
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
      this.image = await F.loadImage(t), this.isLoaded = !0;
    } catch (e) {
      console.error(`Fehler beim Laden der Textur: ${t}`, e);
    }
  }
}
var bt = /* @__PURE__ */ ((a) => (a.UP = "ArrowUp", a.DOWN = "ArrowDown", a.LEFT = "ArrowLeft", a.RIGHT = "ArrowRight", a.SPACE = "Space", a.ENTER = "Enter", a.ESCAPE = "Escape", a.TAB = "Tab", a.BACKSPACE = "Backspace", a.SHIFT_L = "ShiftLeft", a.SHIFT_R = "ShiftRight", a.CTRL_L = "ControlLeft", a.CTRL_R = "ControlRight", a.ALT_L = "AltLeft", a.ALT_R = "AltRight", a.D0 = "Digit0", a.D1 = "Digit1", a.D2 = "Digit2", a.D3 = "Digit3", a.D4 = "Digit4", a.D5 = "Digit5", a.D6 = "Digit6", a.D7 = "Digit7", a.D8 = "Digit8", a.D9 = "Digit9", a.A = "KeyA", a.B = "KeyB", a.C = "KeyC", a.D = "KeyD", a.E = "KeyE", a.F = "KeyF", a.G = "KeyG", a.H = "KeyH", a.I = "KeyI", a.J = "KeyJ", a.K = "KeyK", a.L = "KeyL", a.M = "KeyM", a.N = "KeyN", a.O = "KeyO", a.P = "KeyP", a.Q = "KeyQ", a.R = "KeyR", a.S = "KeyS", a.T = "KeyT", a.U = "KeyU", a.V = "KeyV", a.W = "KeyW", a.X = "KeyX", a.Y = "KeyY", a.Z = "KeyZ", a))(bt || {}), Tt = /* @__PURE__ */ ((a) => (a.LINEAR = "linear", a.NEAREST = "nearest", a))(Tt || {}), wt = /* @__PURE__ */ ((a) => (a.REPEAT = "repeat", a.CLAMP_TO_EDGE = "clamp-to-edge", a.MIRRORED_REPEAT = "mirror-repeat", a))(wt || {});
class at {
  matrix = new y();
}
class It extends at {
  constructor(t, e, i, r, s, n) {
    super(), this.l = t, this.r = e, this.b = i, this.t = r, this.n = s, this.f = n, this.update();
  }
  update() {
    y.orthographic(this.l, this.r, this.b, this.t, this.n, this.f, this.matrix);
  }
  getMatrix() {
    return this.matrix;
  }
}
class Ot extends at {
  constructor(t, e, i, r) {
    super(), this.fov = t, this.aspect = e, this.near = i, this.far = r, this.update();
  }
  update() {
    y.perspective(this.fov, this.aspect, this.near, this.far, this.matrix);
  }
  getMatrix() {
    return this.matrix;
  }
}
class Nt extends D {
  constructor(t = 1, e = 2, i = 16) {
    super(), this.radius = t, this.height = e, this.segments = i, this.generateGeometryData();
  }
  generateGeometryData() {
    const t = [], e = [], i = [], r = this.height / 2;
    for (let n = 0; n <= 1; n++) {
      const h = n === 0 ? -r : r, l = n === 0 ? 0 : 1;
      for (let c = 0; c <= this.segments; c++) {
        const d = c / this.segments, f = d * Math.PI * 2;
        t.push(this.radius * Math.sin(f), h, this.radius * Math.cos(f)), e.push(d, l);
      }
    }
    for (let n = 0; n < this.segments; n++) {
      const h = n, l = h + this.segments + 1;
      i.push(h, l, h + 1), i.push(l, l + 1, h + 1);
    }
    let s = t.length / 3;
    t.push(0, r, 0), e.push(0.5, 0.5);
    for (let n = 0; n <= this.segments; n++) {
      const h = n / this.segments * Math.PI * 2;
      t.push(this.radius * Math.sin(h), r, this.radius * Math.cos(h)), e.push(0.5 + Math.sin(h) * 0.5, 0.5 + Math.cos(h) * 0.5);
    }
    for (let n = 0; n < this.segments; n++) i.push(s, s + n + 1, s + n + 2);
    s = t.length / 3, t.push(0, -r, 0), e.push(0.5, 0.5);
    for (let n = 0; n <= this.segments; n++) {
      const h = n / this.segments * Math.PI * 2;
      t.push(this.radius * Math.sin(h), -r, this.radius * Math.cos(h)), e.push(0.5 + Math.sin(h) * 0.5, 0.5 - Math.cos(h) * 0.5);
    }
    for (let n = 0; n < this.segments; n++) i.push(s, s + n + 2, s + n + 1);
    this.vertices = new Float32Array(t), this.uvs = new Float32Array(e), this.indices = new Uint16Array(i), this.computeNormals();
  }
}
class zt extends D {
  constructor(t = 20, e = 20) {
    super(), this.size = t, this.divisions = e, this.generateGeometryData();
  }
  generateGeometryData() {
    const t = [], e = [], i = [], r = this.size / this.divisions, s = this.size / 2;
    let n = 0;
    for (let h = 0; h <= this.divisions; h++) {
      const l = h * r - s, c = h / this.divisions;
      t.push(l, 0, -s, l, 0, s), e.push(c, 0, c, 1), i.push(n, n + 1), n += 2, t.push(-s, 0, l, s, 0, l), e.push(0, c, 1, c), i.push(n, n + 1), n += 2;
    }
    this.vertices = new Float32Array(t), this.uvs = new Float32Array(e), this.indices = new Uint16Array(i);
  }
}
class kt extends D {
  constructor(t = 1, e = 1, i = 1, r = 1) {
    super(), this.width = t, this.depth = e, this.widthSegments = i, this.depthSegments = r, this.generateGeometryData();
  }
  generateGeometryData() {
    const t = [], e = [], i = [], r = this.width / 2, s = this.depth / 2;
    for (let n = 0; n <= this.depthSegments; n++) {
      const h = n / this.depthSegments;
      for (let l = 0; l <= this.widthSegments; l++) {
        const c = l / this.widthSegments;
        t.push(c * this.width - r, 0, h * this.depth - s), e.push(c, 1 - h);
      }
    }
    for (let n = 0; n < this.depthSegments; n++)
      for (let h = 0; h < this.widthSegments; h++) {
        const l = h + (this.widthSegments + 1) * n, c = h + (this.widthSegments + 1) * (n + 1), d = h + 1 + (this.widthSegments + 1) * (n + 1), f = h + 1 + (this.widthSegments + 1) * n;
        i.push(l, c, f), i.push(c, d, f);
      }
    this.vertices = new Float32Array(t), this.uvs = new Float32Array(e), this.indices = new Uint16Array(i), this.computeNormals();
  }
}
class Vt extends D {
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
class Xt extends D {
  constructor(t = 1, e = 16, i = 12) {
    super(), this.radius = t, this.widthSegments = e, this.heightSegments = i, this.generateGeometryData();
  }
  generateGeometryData() {
    const t = [], e = [], i = [], r = [];
    for (let s = 0; s <= this.heightSegments; s++) {
      const n = s / this.heightSegments, h = n * Math.PI;
      for (let l = 0; l <= this.widthSegments; l++) {
        const c = l / this.widthSegments, d = c * Math.PI * 2, f = -(this.radius * Math.sin(h) * Math.cos(d)), o = this.radius * Math.cos(h), u = this.radius * Math.sin(h) * Math.sin(d);
        t.push(f, o, u), e.push(f / this.radius, o / this.radius, u / this.radius), i.push(c, 1 - n);
      }
    }
    for (let s = 0; s < this.heightSegments; s++)
      for (let n = 0; n < this.widthSegments; n++) {
        const h = s * (this.widthSegments + 1) + n, l = h + this.widthSegments + 1;
        r.push(h, l, h + 1), r.push(l, l + 1, h + 1);
      }
    this.vertices = new Float32Array(t), this.normals = new Float32Array(e), this.uvs = new Float32Array(i), this.indices = new Uint16Array(r);
  }
}
class Wt extends D {
  constructor(t = 1, e = 0.4, i = 16, r = 32) {
    super(), this.radius = t, this.tube = e, this.radialSegments = i, this.tubularSegments = r, this.generateGeometryData();
  }
  generateGeometryData() {
    const t = [], e = [], i = [];
    for (let r = 0; r <= this.radialSegments; r++) {
      const s = r / this.radialSegments, n = s * Math.PI * 2, h = Math.cos(n), l = Math.sin(n);
      for (let c = 0; c <= this.tubularSegments; c++) {
        const d = c / this.tubularSegments, f = d * Math.PI * 2, o = Math.cos(f), u = Math.sin(f);
        t.push(
          (this.radius + this.tube * h) * o,
          this.tube * l,
          (this.radius + this.tube * h) * u
        ), e.push(d, s);
      }
    }
    for (let r = 1; r <= this.radialSegments; r++)
      for (let s = 1; s <= this.tubularSegments; s++) {
        const n = (this.tubularSegments + 1) * r + s - 1, h = (this.tubularSegments + 1) * (r - 1) + s - 1, l = (this.tubularSegments + 1) * (r - 1) + s, c = (this.tubularSegments + 1) * r + s;
        i.push(n, h, c), i.push(h, l, c);
      }
    this.vertices = new Float32Array(t), this.uvs = new Float32Array(e), this.indices = new Uint16Array(i), this.computeNormals();
  }
}
class jt extends D {
  constructor(t = 1, e = 32) {
    super(), this.radius = t, this.segments = e, this.generateGeometryData();
  }
  generateGeometryData() {
    const t = [], e = [], i = [];
    for (let r = 0; r < this.segments; r++) {
      const s = r / this.segments * Math.PI * 2, n = Math.cos(s), h = Math.sin(s);
      t.push(n * this.radius, 0, h * this.radius), e.push(0.5 + n * 0.5, 0.5 + h * 0.5), i.push(r, (r + 1) % this.segments);
    }
    this.vertices = new Float32Array(t), this.uvs = new Float32Array(e), this.indices = new Uint16Array(i);
  }
}
class Ht extends D {
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
class Yt extends D {
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
class qt extends N {
  type = b.BASIC;
}
class $t extends N {
  type = b.LAMBERT;
}
class Zt extends N {
  type = b.WIREFRAME;
}
class Jt extends I {
  type = M.AMBIENT;
  constructor(t = new v(1, 1, 1), e = 0.2) {
    super(t, e, "AmbientLight");
  }
}
class Qt extends I {
  type = M.DIRECTIONAL;
  intensity = 1;
  direction = new w(0, -1, 0).normalize();
  constructor(t = v.WHITE, e = 1) {
    super(t, e, "DirectionalLight");
  }
}
class Kt extends I {
  constructor(t = v.WHITE, e = 1, i = 50, r = 2) {
    super(t, e, "PointLight"), this.distance = i, this.decay = r;
  }
  type = M.POINT;
}
class te extends I {
  constructor(t = v.WHITE, e = 1, i = 50, r = Math.PI / 6, s = 0.5, n = 2) {
    super(t, e, "SpotLight"), this.distance = i, this.angle = r, this.penumbra = s, this.decay = n;
  }
  type = M.SPOT;
  direction = new w(0, -1, 0).normalize();
}
var C = /* @__PURE__ */ ((a) => (a[a.SPHERE = 0] = "SPHERE", a[a.BOX = 1] = "BOX", a))(C || {});
class ee {
  constructor(t, e) {
    this.min = t, this.max = e;
    const i = e.clone().sub(t);
    this.broadRadius = i.length() / 2;
  }
  type = C.BOX;
  broadRadius;
  get center() {
    return this.min.clone().add(this.max).scale(0.5);
  }
  getBroadRadius() {
    return this.broadRadius;
  }
}
class ie {
  constructor(t, e) {
    this.center = t, this.radius = e;
  }
  type = C.SPHERE;
  getBroadRadius() {
    return this.radius;
  }
}
class se {
  static test(t, e) {
    const i = t.center.distanceToSq(e.center), r = t.getBroadRadius() + e.getBroadRadius();
    return i > r * r ? !1 : t.type === C.SPHERE && e.type === C.SPHERE ? this.sphereSphere(t, e) : t.type === C.BOX && e.type === C.BOX ? this.boxBox(t, e) : t.type === C.SPHERE && e.type === C.BOX ? this.sphereBox(t, e) : t.type === C.BOX && e.type === C.SPHERE ? this.sphereBox(e, t) : !1;
  }
  static sphereSphere(t, e) {
    const i = t.center.distanceToSq(e.center), r = (t.radius + e.radius) * (t.radius + e.radius);
    return i <= r;
  }
  static boxBox(t, e) {
    return t.min.x <= e.max.x && t.max.x >= e.min.x && t.min.y <= e.max.y && t.max.y >= e.min.y && t.min.z <= e.max.z && t.max.z >= e.min.z;
  }
  static sphereBox(t, e) {
    return new w(
      Math.max(e.min.x, Math.min(t.center.x, e.max.x)),
      Math.max(e.min.y, Math.min(t.center.y, e.max.y)),
      Math.max(e.min.z, Math.min(t.center.z, e.max.z))
    ).distanceToSq(t.center) <= t.radius * t.radius;
  }
}
class Rt {
  planes = new Float32Array(24);
  setFromMatrix(t) {
    const e = t.data, i = this.planes;
    i[0] = e[3] - e[0], i[1] = e[7] - e[4], i[2] = e[11] - e[8], i[3] = e[15] - e[12], i[4] = e[3] + e[0], i[5] = e[7] + e[4], i[6] = e[11] + e[8], i[7] = e[15] + e[12], i[8] = e[3] + e[1], i[9] = e[7] + e[5], i[10] = e[11] + e[9], i[11] = e[15] + e[13], i[12] = e[3] - e[1], i[13] = e[7] - e[5], i[14] = e[11] - e[9], i[15] = e[15] - e[13], i[16] = e[3] - e[2], i[17] = e[7] - e[6], i[18] = e[11] - e[10], i[19] = e[15] - e[14], i[20] = e[3] + e[2], i[21] = e[7] + e[6], i[22] = e[11] + e[10], i[23] = e[15] + e[14];
    for (let r = 0; r < 6; r++) {
      const s = r * 4, n = Math.sqrt(i[s] * i[s] + i[s + 1] * i[s + 1] + i[s + 2] * i[s + 2]);
      if (n > 0) {
        const h = 1 / n;
        i[s] *= h, i[s + 1] *= h, i[s + 2] *= h, i[s + 3] *= h;
      }
    }
  }
  intersectsVolume(t) {
    const e = t.center, i = t.getBroadRadius(), r = this.planes;
    for (let s = 0; s < 6; s++) {
      const n = s * 4;
      if (r[n] * e.x + r[n + 1] * e.y + r[n + 2] * e.z + r[n + 3] < -i) return !1;
    }
    return !0;
  }
}
class re {
  static frustum = new Rt();
  static cull(t, e) {
    this.frustum.setFromMatrix(e);
    let i = 0;
    const r = (s) => {
      s.frustumCulled && s.bounds ? s.isVisible = this.frustum.intersectsVolume(s.bounds) : s.isVisible = !0, s.isVisible && i++;
      for (const n of s.children)
        r(n);
    };
    for (const s of t.objects)
      r(s);
    return i;
  }
}
class oe extends O {
  async load(t) {
    const e = this.basePath + t;
    this.dispatchEvent(T.LOADER_START, { url: e });
    try {
      const i = await F.loadImage(e, (r, s) => {
        this.dispatchEvent(T.LOADER_PROGRESS, { url: e, loaded: r, total: s });
      });
      return this.dispatchEvent(T.LOADER_END, { url: e, data: i }), i;
    } catch (i) {
      throw this.dispatchEvent(T.LOADER_ERROR, { url: e, error: i }), i;
    }
  }
}
class At extends O {
  async load(t) {
    const e = this.basePath + t;
    this.dispatchEvent(T.LOADER_START, { url: e });
    try {
      const i = await F.loadText(e, (r, s) => {
        this.dispatchEvent(T.LOADER_PROGRESS, { url: e, loaded: r, total: s });
      });
      return this.dispatchEvent(T.LOADER_END, { url: e, data: i }), i;
    } catch (i) {
      throw this.dispatchEvent(T.LOADER_ERROR, { url: e, error: i }), i;
    }
  }
}
class ne extends At {
  // Aktuell macht der ShaderLoader genau dasselbe wie der TextLoader.
  // Er ist aber ein eigener Typ, falls wir später WebGPU-Shader-Code
  // direkt hier validieren oder parsen möchten!
}
export {
  I as AbstractLight,
  N as AbstractMaterial,
  Jt as AmbientLight,
  F as AssetManager,
  qt as BasicMaterial,
  ee as BoundingBox,
  ie as BoundingSphere,
  Mt as Camera,
  B as CameraStrategyType,
  jt as Circle,
  se as Collision,
  v as Color,
  st as ColorUtils,
  Et as Cube,
  nt as CubeTexture,
  Nt as Cylinder,
  ft as DEFAULT_RENDERER,
  Qt as DirectionalLight,
  dt as ENGINE_VERSION,
  yt as EventDispatcher,
  T as EventType,
  re as FrustumCuller,
  zt as Grid,
  St as HUD,
  oe as ImageLoader,
  Pt as Input,
  bt as Keys,
  $t as LambertMaterial,
  M as LightType,
  Yt as Line,
  O as Loader,
  y as Matrix4,
  vt as ModelGeometry,
  Bt as ObjLoader,
  K as Object3D,
  It as OrthographicProjection,
  Ot as PerspectiveProjection,
  ot as PhongMaterial,
  kt as Plane,
  Kt as PointLight,
  Vt as Pyramid,
  U as RendererType,
  Ct as Scene,
  ne as ShaderLoader,
  Gt as Skybox,
  Dt as SkyboxLoader,
  _t as SkyboxMaterial,
  Ut as SmallWorld,
  Xt as Sphere,
  te as SpotLight,
  At as TextLoader,
  Ft as Texture,
  Tt as TextureFilter,
  wt as TextureWrap,
  Wt as Torus,
  Ht as Triangle,
  et as Vector2D,
  w as Vector3D,
  Zt as WireframeMaterial
};
