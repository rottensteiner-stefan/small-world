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
    let n = 0;
    const h = [];
    for (; ; ) {
      const { done: l, value: g } = await o.read();
      if (l) break;
      g && (n += g.length, h.push(g), e(n, r));
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
    }).catch((o) => (console.error(o), new Promise((n, h) => {
      const l = new Image();
      l.crossOrigin = "anonymous", l.onload = () => n(l), l.onerror = () => h(`[AssetManager] Fallback fehlgeschlagen: ${t}`), l.src = t;
    })));
    return this.imageCache.set(s, r), r;
  }
  static async loadText(t, e) {
    if (this.textCache.has(t)) return this.textCache.get(t);
    const i = this.fetchWithProgress(t, e).then((s) => s.text());
    return this.textCache.set(t, i), i;
  }
}
const G = {
  FIXED: "FixedCamera",
  STIFF: "StiffCamera",
  SMOOTH: "SmoothCamera",
  FPS: "FPSCamera"
};
class ct {
  type = G.FIXED;
  update(t, e, i, s) {
    t.target.copyFrom(e);
  }
}
class ut {
  type = G.FPS;
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
class gt {
  type = G.SMOOTH;
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
class dt {
  type = G.STIFF;
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
class ft {
  // Wir cachen die Instanzen, damit wir nicht bei jedem Wechsel ein neues 'new' Keyword bemühen müssen.
  static strategies = /* @__PURE__ */ new Map([
    [G.FPS, new ut()],
    [G.SMOOTH, new gt()],
    [G.STIFF, new dt()],
    [G.FIXED, new ct()]
  ]);
  static get(t) {
    return this.strategies.get(t) || this.strategies.get(G.SMOOTH);
  }
}
class S {
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
    return new S(this.x, this.y, this.z);
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
class w {
  data = new Float32Array(16);
  constructor() {
    this.identity();
  }
  identity() {
    return this.data.fill(0), this.data[0] = 1, this.data[5] = 1, this.data[10] = 1, this.data[15] = 1, this;
  }
  compose(t, e, i) {
    const s = new w();
    w.translate(t, s);
    const r = new w();
    w.rotateX(e.x, r);
    const o = new w();
    w.rotateY(e.y, o);
    const n = new w();
    w.rotateZ(e.z, n);
    const h = new w();
    return h.data[0] = i.x, h.data[5] = i.y, h.data[10] = i.z, w.multiply(s, o, this), w.multiply(this, r, this), w.multiply(this, n, this), w.multiply(this, h, this), this;
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
    const s = t.data, r = e.data, o = i.data, n = s[0], h = s[1], l = s[2], g = s[3], L = s[4], a = s[5], u = s[6], c = s[7], p = s[8], y = s[9], f = s[10], m = s[11], x = s[12], _ = s[13], v = s[14], P = s[15], M = r[0], U = r[1], A = r[2], T = r[3], k = r[4], V = r[5], X = r[6], W = r[7], j = r[8], Y = r[9], H = r[10], K = r[11], $ = r[12], q = r[13], Z = r[14], J = r[15];
    o[0] = n * M + L * U + p * A + x * T, o[1] = h * M + a * U + y * A + _ * T, o[2] = l * M + u * U + f * A + v * T, o[3] = g * M + c * U + m * A + P * T, o[4] = n * k + L * V + p * X + x * W, o[5] = h * k + a * V + y * X + _ * W, o[6] = l * k + u * V + f * X + v * W, o[7] = g * k + c * V + m * X + P * W, o[8] = n * j + L * Y + p * H + x * K, o[9] = h * j + a * Y + y * H + _ * K, o[10] = l * j + u * Y + f * H + v * K, o[11] = g * j + c * Y + m * H + P * K, o[12] = n * $ + L * q + p * Z + x * J, o[13] = h * $ + a * q + y * Z + _ * J, o[14] = l * $ + u * q + f * Z + v * J, o[15] = g * $ + c * q + m * Z + P * J;
  }
  static perspective(t, e, i, s, r) {
    const o = 1 / Math.tan(t / 2), n = r.data;
    n.fill(0), n[0] = o / e, n[5] = o, n[10] = s / (i - s), n[11] = -1, n[14] = i * s / (i - s);
  }
  static orthographic(t, e, i, s, r, o, n) {
    const h = n.data;
    h.fill(0), h[0] = 2 / (e - t), h[5] = 2 / (s - i), h[10] = 1 / (r - o), h[12] = -(e + t) / (e - t), h[13] = -(s + i) / (s - i), h[14] = r / (r - o), h[15] = 1;
  }
  static lookAt(t, e, i, s) {
    const r = s.data, o = t.clone().sub(e), n = o.length();
    n > 0 && o.scale(1 / n);
    const h = new S(
      i.y * o.z - i.z * o.y,
      i.z * o.x - i.x * o.z,
      i.x * o.y - i.y * o.x
    ), l = h.length();
    l > 0 && h.scale(1 / l);
    const g = new S(o.y * h.z - o.z * h.y, o.z * h.x - o.x * h.z, o.x * h.y - o.y * h.x);
    r[0] = h.x, r[4] = h.y, r[8] = h.z, r[12] = -h.dot(t), r[1] = g.x, r[5] = g.y, r[9] = g.z, r[13] = -g.dot(t), r[2] = o.x, r[6] = o.y, r[10] = o.z, r[14] = -o.dot(t), r[15] = 1;
  }
  transformVector(t) {
    const e = this.data, i = t.x, s = t.y, r = t.z;
    return t.x = e[0] * i + e[4] * s + e[8] * r + e[12], t.y = e[1] * i + e[5] * s + e[9] * r + e[13], t.z = e[2] * i + e[6] * s + e[10] * r + e[14], t;
  }
}
class St {
  constructor(t) {
    this.projection = t, this.setStrategy(G.SMOOTH);
  }
  position = new S(0, 10, 20);
  target = new S(0, 0, 0);
  up = new S(0, 1, 0);
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
    w.multiply(this.projection.getMatrix(), t, e);
  }
}
const B = {
  BEST: "BEST",
  WEB_GPU: "WEB_GPU",
  WEB_GL2: "WEB_GL2",
  WEB_GL1: "WEB_GL1",
  CANVAS: "CANVAS"
}, pt = "0.10.4", mt = B.BEST;
class Pt {
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
class Mt {
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
class Q {
  uuid = crypto.randomUUID();
  name = "";
  geometry = null;
  material = null;
  // <--- NEU
  bounds = null;
  position = new S(0, 0, 0);
  rotation = new S(0, 0, 0);
  scale = new S(1, 1, 1);
  localMatrix = new w();
  worldMatrix = new w();
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
    this.localMatrix.compose(this.position, this.rotation, this.scale), this.parent === null ? this.worldMatrix.data.set(this.localMatrix.data) : w.multiply(this.parent.worldMatrix, this.localMatrix, this.worldMatrix);
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
class E {
  constructor(t, e, i, s = 1) {
    this.r = t, this.g = e, this.b = i, this.a = s;
  }
  static get WHITE() {
    return new E(1, 1, 1);
  }
  static get BLACK() {
    return new E(0, 0, 0);
  }
  static get RED() {
    return new E(1, 0, 0);
  }
  static get GREEN() {
    return new E(0, 1, 0);
  }
  static get BLUE() {
    return new E(0, 0, 1);
  }
  static get ORANGE() {
    return new E(1, 0.5, 0);
  }
  static get DODGERBLUE() {
    return new E(0.12, 0.56, 1);
  }
  static get SKYBLUE() {
    return new E(0.53, 0.81, 0.92);
  }
  static get LIGHTSTEELBLUE() {
    return new E(0.69, 0.77, 0.87);
  }
  static get DARKSLATEGRAY() {
    return new E(0.18, 0.31, 0.31);
  }
  static get GRAY() {
    return new E(0.5, 0.5, 0.5);
  }
  static get YELLOW() {
    return new E(1, 1, 0);
  }
  toArray() {
    return [this.r, this.g, this.b, this.a];
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
    if (!e) return new E(1, 1, 1, 1);
    e.fillStyle = t, e.fillRect(0, 0, 1, 1);
    const [i, s, r, o] = e.getImageData(0, 0, 1, 1).data;
    return new E(i / 255, s / 255, r / 255, o / 255);
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
const b = {
  BASIC: "BasicMaterial",
  LAMBERT: "LambertMaterial",
  PHONG: "PhongMaterial",
  SKYBOX: "SkyboxMaterial",
  WIREFRAME: "WireframeMaterial"
}, F = {
  AMBIENT: "AmbientLight",
  DIRECTIONAL: "DirectionalLight",
  POINT: "PointLight",
  SPOT: "SpotLight",
  AREA: "AreaLight"
};
class ot {
  clearColor = new E(0, 0, 0, 1);
  setClearColor(t) {
    this.clearColor = t;
  }
  // Diese Methode ist in ALLEN Renderern (sogar WebGPU) exakt gleich!
  extractLights(t) {
    let e = new E(0, 0, 0), i = new S(0, 1, 0), s = new E(0, 0, 0);
    const r = [], o = [], n = [], h = (l) => {
      if ("type" in l) {
        const g = l;
        switch (g.type) {
          case F.AMBIENT:
            e = new E(
              g.color.r * g.intensity,
              g.color.g * g.intensity,
              g.color.b * g.intensity
            );
            break;
          case F.DIRECTIONAL:
            i = g.direction.clone().scale(-1).normalize(), s = new E(
              g.color.r * g.intensity,
              g.color.g * g.intensity,
              g.color.b * g.intensity
            );
            break;
          case F.POINT:
            r.length < 4 && r.push(g);
            break;
          case F.SPOT:
            o.length < 4 && o.push(g);
            break;
          case F.AREA:
            n.length < 4 && n.push(g);
            break;
        }
      }
      l.children && l.children.forEach(h);
    };
    for (const l of t.objects) h(l);
    return { aCol: e, dDir: i, dCol: s, pLights: r, sLights: o, aLights: n };
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
  type = B.WEB_GL1;
  prog;
  locs;
  skyProg;
  skyLocs;
  cache = /* @__PURE__ */ new Map();
  texCache = /* @__PURE__ */ new Map();
  texCubeCache = /* @__PURE__ */ new Map();
  pointLightLocs = [];
  spotLightLocs = [];
  areaLightLocs = [];
  async initialize(t) {
    this.gl = t.getContext("webgl", { antialias: !0 }) || t.getContext("experimental-webgl"), this.initDefaultTextures();
    const e = "attribute vec3 a_position; attribute vec3 a_normal; attribute vec2 a_uv; uniform mat4 u_vp; uniform mat4 u_model; uniform vec2 u_texOffset; uniform vec2 u_texRepeat; varying vec3 v_worldPos; varying vec3 v_normal; varying vec2 v_uv; mat3 extractMat3(mat4 m) { return mat3(m[0].xyz, m[1].xyz, m[2].xyz); } void main() { vec4 wp = u_model * vec4(a_position, 1.0); v_worldPos = wp.xyz; v_normal = extractMat3(u_model) * a_normal; v_uv = (a_uv * u_texRepeat) + u_texOffset; gl_Position = u_vp * wp; }", i = "precision highp float; varying vec3 v_worldPos; varying vec3 v_normal; varying vec2 v_uv; uniform vec4 u_color; uniform vec4 u_specColor; uniform float u_shininess; uniform vec3 u_viewPos; uniform vec3 u_ambientColor; uniform vec3 u_dirLightColor; uniform vec3 u_dirLightDir; uniform sampler2D u_diffuseMap; uniform int u_numPointLights; uniform vec3 u_pointLightPos[4]; uniform vec3 u_pointLightColor[4]; uniform int u_numSpotLights; uniform vec3 u_spotLightPos[4]; uniform vec3 u_spotLightDir[4]; uniform vec3 u_spotLightColor[4]; uniform vec4 u_spotLightParams[4]; uniform int u_numAreaLights; uniform vec3 u_areaLightPos[4]; uniform vec3 u_areaLightColor[4]; uniform vec3 u_areaLightRight[4]; uniform vec3 u_areaLightUp[4]; uniform vec3 u_areaLightNormal[4]; uniform vec2 u_areaLightSize[4]; void main() { vec4 texColor = texture2D(u_diffuseMap, v_uv); if (u_shininess < -0.5) { gl_FragColor = u_color * texColor; return; } vec3 N = normalize(v_normal); vec3 V = normalize(u_viewPos - v_worldPos); vec3 finalLight = u_ambientColor; vec3 specular = vec3(0.0); vec3 L_dir = normalize(u_dirLightDir); float diff_dir = max(dot(N, L_dir), 0.0); finalLight += diff_dir * u_dirLightColor; if (u_shininess > 0.0 && diff_dir > 0.0) specular += pow(max(dot(V, reflect(-L_dir, N)), 0.0), u_shininess) * u_dirLightColor; for(int i = 0; i < 4; i++) { if (i >= u_numPointLights) break; vec3 lightVec = u_pointLightPos[i] - v_worldPos; float dist = length(lightVec); vec3 L_pt = lightVec / dist; float attenuation = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist); float diff_pt = max(dot(N, L_pt), 0.0); finalLight += diff_pt * u_pointLightColor[i] * attenuation; if (u_shininess > 0.0 && diff_pt > 0.0) specular += pow(max(dot(V, reflect(-L_pt, N)), 0.0), u_shininess) * u_pointLightColor[i] * attenuation; } for(int i = 0; i < 4; i++) { if (i >= u_numSpotLights) break; vec3 lightVec = u_spotLightPos[i] - v_worldPos; float dist = length(lightVec); vec3 L_sp = lightVec / dist; vec3 S_dir = normalize(u_spotLightDir[i]); float theta = dot(-L_sp, S_dir); if(theta > u_spotLightParams[i].x) { float spotEffect = smoothstep(u_spotLightParams[i].x, u_spotLightParams[i].y, theta); float attenuation = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist); float diff_sp = max(dot(N, L_sp), 0.0); finalLight += diff_sp * u_spotLightColor[i] * attenuation * spotEffect; if (u_shininess > 0.0 && diff_sp > 0.0) specular += pow(max(dot(V, reflect(-L_sp, N)), 0.0), u_shininess) * u_spotLightColor[i] * attenuation * spotEffect; } } for(int i = 0; i < 4; i++) { if (i >= u_numAreaLights) break; vec3 L_center = u_areaLightPos[i]; vec3 L_normal = normalize(u_areaLightNormal[i]); vec3 dirFromLight = v_worldPos - L_center; if(dot(dirFromLight, L_normal) >= 0.0) { vec3 L_right = normalize(u_areaLightRight[i]); vec3 L_up = normalize(u_areaLightUp[i]); vec2 size = u_areaLightSize[i]; float projX = clamp(dot(dirFromLight, L_right), -size.x, size.x); float projY = clamp(dot(dirFromLight, L_up), -size.y, size.y); vec3 closestPoint = L_center + L_right * projX + L_up * projY; vec3 lightVec = closestPoint - v_worldPos; float dist = length(lightVec); vec3 L_al = lightVec / (dist + 0.0001); float attenuation = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist); float diff_al = max(dot(N, L_al), 0.0); finalLight += diff_al * u_areaLightColor[i] * attenuation; if (u_shininess > 0.0 && diff_al > 0.0) specular += pow(max(dot(V, reflect(-L_al, N)), 0.0), u_shininess) * u_areaLightColor[i] * attenuation; } } gl_FragColor = vec4((finalLight * u_color.rgb * texColor.rgb) + (specular * u_specColor.rgb), u_color.a * texColor.a); }", s = "attribute vec3 a_position; uniform mat4 u_vp; uniform mat4 u_model; varying vec3 v_uvw; void main() { v_uvw = a_position; gl_Position = u_vp * u_model * vec4(a_position, 1.0); }", r = "precision highp float; varying vec3 v_uvw; uniform samplerCube u_skybox; void main() { gl_FragColor = textureCube(u_skybox, v_uvw); }";
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
        norm: this.gl.getUniformLocation(this.prog, `u_areaLightNormal[${o}]`),
        size: this.gl.getUniformLocation(this.prog, `u_areaLightSize[${o}]`)
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
  render(t, e, i = new S()) {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT), this.gl.depthMask(!1), this.gl.useProgram(this.skyProg), this.skyLocs.vp && this.gl.uniformMatrix4fv(this.skyLocs.vp, !1, e);
    const s = (a) => {
      if (!(!a.isVisible || !a.material)) {
        if (a.geometry && a.material.type === b.SKYBOX) {
          const u = a.material;
          let c = this.cache.get(a.geometry);
          c || (c = new tt(this.gl, a.geometry), this.cache.set(a.geometry, c)), c.bind(this.skyLocs.pos), this.skyLocs.model && this.gl.uniformMatrix4fv(this.skyLocs.model, !1, a.worldMatrix.data), this.gl.activeTexture(this.gl.TEXTURE0), this.gl.bindTexture(
            this.gl.TEXTURE_CUBE_MAP,
            u.cubeMap ? this.getWebGLCubeTexture(u.cubeMap) : this.defaultCubeTexture
          ), this.skyLocs.skybox && this.gl.uniform1i(this.skyLocs.skybox, 0), this.gl.drawElements(this.gl.TRIANGLES, c.count, this.gl.UNSIGNED_SHORT, 0);
        }
        if (a.children) for (const u of a.children) s(u);
      }
    };
    for (const a of t.objects) s(a);
    this.gl.depthMask(!0), this.gl.useProgram(this.prog), this.locs.vp && this.gl.uniformMatrix4fv(this.locs.vp, !1, e), this.locs.viewPos && this.gl.uniform3f(this.locs.viewPos, i.x, i.y, i.z);
    const { aCol: r, dDir: o, dCol: n, pLights: h, sLights: l, aLights: g } = this.extractLights(t);
    this.locs.ambient && this.gl.uniform3f(this.locs.ambient, r.r, r.g, r.b), this.locs.dirDir && this.gl.uniform3f(this.locs.dirDir, o.x, o.y, o.z), this.locs.dirColor && this.gl.uniform3f(this.locs.dirColor, n.r, n.g, n.b), this.locs.numPL && this.gl.uniform1i(this.locs.numPL, h.length);
    for (let a = 0; a < h.length; a++)
      this.pointLightLocs[a].pos && this.gl.uniform3f(
        this.pointLightLocs[a].pos,
        h[a].worldMatrix.data[12],
        h[a].worldMatrix.data[13],
        h[a].worldMatrix.data[14]
      ), this.pointLightLocs[a].col && this.gl.uniform3f(
        this.pointLightLocs[a].col,
        h[a].color.r * h[a].intensity,
        h[a].color.g * h[a].intensity,
        h[a].color.b * h[a].intensity
      );
    this.locs.numSL && this.gl.uniform1i(this.locs.numSL, l.length);
    for (let a = 0; a < l.length; a++) {
      this.spotLightLocs[a].pos && this.gl.uniform3f(
        this.spotLightLocs[a].pos,
        l[a].worldMatrix.data[12],
        l[a].worldMatrix.data[13],
        l[a].worldMatrix.data[14]
      );
      const u = l[a].direction.clone().normalize();
      this.spotLightLocs[a].dir && this.gl.uniform3f(this.spotLightLocs[a].dir, u.x, u.y, u.z), this.spotLightLocs[a].col && this.gl.uniform3f(
        this.spotLightLocs[a].col,
        l[a].color.r * l[a].intensity,
        l[a].color.g * l[a].intensity,
        l[a].color.b * l[a].intensity
      ), this.spotLightLocs[a].params && this.gl.uniform4f(
        this.spotLightLocs[a].params,
        Math.cos(l[a].angle),
        Math.cos(l[a].angle * (1 - l[a].penumbra)),
        l[a].distance,
        l[a].decay
      );
    }
    this.locs.numAL && this.gl.uniform1i(this.locs.numAL, g.length);
    for (let a = 0; a < g.length; a++) {
      const u = g[a], c = u.worldMatrix.data;
      this.areaLightLocs[a].pos && this.gl.uniform3f(this.areaLightLocs[a].pos, c[12], c[13], c[14]), this.areaLightLocs[a].col && this.gl.uniform3f(
        this.areaLightLocs[a].col,
        u.color.r * u.intensity,
        u.color.g * u.intensity,
        u.color.b * u.intensity
      ), this.areaLightLocs[a].right && this.gl.uniform3f(this.areaLightLocs[a].right, c[0], c[1], c[2]), this.areaLightLocs[a].up && this.gl.uniform3f(this.areaLightLocs[a].up, c[4], c[5], c[6]), this.areaLightLocs[a].norm && this.gl.uniform3f(this.areaLightLocs[a].norm, c[8], c[9], c[10]), this.areaLightLocs[a].size && this.gl.uniform2f(this.areaLightLocs[a].size, u.width / 2, u.height / 2);
    }
    const L = (a) => {
      if (!a.isVisible || !a.geometry || !a.material || a.material.type === b.SKYBOX) {
        if (a.children) for (const v of a.children) L(v);
        return;
      }
      const u = a.material;
      let c = this.cache.get(a.geometry);
      c || (c = new tt(this.gl, a.geometry), this.cache.set(a.geometry, c)), c.bind(this.locs.pos, this.locs.norm, this.locs.uv), this.locs.model && this.gl.uniformMatrix4fv(this.locs.model, !1, a.worldMatrix.data), this.locs.color && this.gl.uniform4fv(this.locs.color, u.color.toArray());
      let p = -1, y = [0, 0, 0, 0], f = this.defaultTexture, m = [0, 0], x = [1, 1];
      if (u.type === b.LAMBERT)
        p = 0;
      else if (u.type === b.PHONG) {
        const v = u;
        p = v.shininess || 32, y = v.specularColor ? v.specularColor.toArray() : [0, 0, 0, 0], v.diffuseMap && (f = this.getWebGLTexture(v.diffuseMap), m = [v.diffuseMap.offset.x, v.diffuseMap.offset.y], x = [v.diffuseMap.repeat.x, v.diffuseMap.repeat.y]);
      }
      this.gl.activeTexture(this.gl.TEXTURE0), this.gl.bindTexture(this.gl.TEXTURE_2D, f), this.locs.diffuseMap && this.gl.uniform1i(this.locs.diffuseMap, 0), this.locs.texOffset && this.gl.uniform2fv(this.locs.texOffset, m), this.locs.texRepeat && this.gl.uniform2fv(this.locs.texRepeat, x), this.locs.shininess && this.gl.uniform1f(this.locs.shininess, p), this.locs.specColor && this.gl.uniform4fv(this.locs.specColor, y);
      const _ = u.type === b.WIREFRAME ? this.gl.LINES : this.gl.TRIANGLES;
      if (this.gl.drawElements(_, c.count, this.gl.UNSIGNED_SHORT, 0), a.children) for (const v of a.children) L(v);
    };
    for (const a of t.objects) L(a);
  }
}
class it extends at {
  type = B.WEB_GL2;
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
  render(t, e, i = new S()) {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT), this.gl.depthMask(!1), this.gl.useProgram(this.skyProg), this.skyLocs.vp && this.gl.uniformMatrix4fv(this.skyLocs.vp, !1, e);
    const s = (a) => {
      if (!(!a.isVisible || !a.material)) {
        if (a.geometry && a.material.type === b.SKYBOX) {
          const u = a.material;
          let c = this.cache.get(a.geometry);
          c || (c = new tt(this.gl, a.geometry), this.cache.set(a.geometry, c)), c.bind(this.skyLocs.pos), this.skyLocs.model && this.gl.uniformMatrix4fv(this.skyLocs.model, !1, a.worldMatrix.data), this.gl.activeTexture(this.gl.TEXTURE0), this.gl.bindTexture(
            this.gl.TEXTURE_CUBE_MAP,
            u.cubeMap ? this.getWebGLCubeTexture(u.cubeMap) : this.defaultCubeTexture
          ), this.skyLocs.skybox && this.gl.uniform1i(this.skyLocs.skybox, 0), this.gl.drawElements(this.gl.TRIANGLES, c.count, this.gl.UNSIGNED_SHORT, 0);
        }
        if (a.children) for (const u of a.children) s(u);
      }
    };
    for (const a of t.objects) s(a);
    this.gl.depthMask(!0), this.gl.useProgram(this.prog), this.locs.vp && this.gl.uniformMatrix4fv(this.locs.vp, !1, e), this.locs.viewPos && this.gl.uniform3f(this.locs.viewPos, i.x, i.y, i.z);
    const { aCol: r, dDir: o, dCol: n, pLights: h, sLights: l, aLights: g } = this.extractLights(t);
    this.locs.ambient && this.gl.uniform3f(this.locs.ambient, r.r, r.g, r.b), this.locs.dirDir && this.gl.uniform3f(this.locs.dirDir, o.x, o.y, o.z), this.locs.dirColor && this.gl.uniform3f(this.locs.dirColor, n.r, n.g, n.b), this.locs.numPL && this.gl.uniform1i(this.locs.numPL, h.length);
    for (let a = 0; a < h.length; a++)
      this.pointLightLocs[a].pos && this.gl.uniform3f(
        this.pointLightLocs[a].pos,
        h[a].worldMatrix.data[12],
        h[a].worldMatrix.data[13],
        h[a].worldMatrix.data[14]
      ), this.pointLightLocs[a].col && this.gl.uniform3f(
        this.pointLightLocs[a].col,
        h[a].color.r * h[a].intensity,
        h[a].color.g * h[a].intensity,
        h[a].color.b * h[a].intensity
      );
    this.locs.numSL && this.gl.uniform1i(this.locs.numSL, l.length);
    for (let a = 0; a < l.length; a++) {
      this.spotLightLocs[a].pos && this.gl.uniform3f(
        this.spotLightLocs[a].pos,
        l[a].worldMatrix.data[12],
        l[a].worldMatrix.data[13],
        l[a].worldMatrix.data[14]
      );
      const u = l[a].direction.clone().normalize();
      this.spotLightLocs[a].dir && this.gl.uniform3f(this.spotLightLocs[a].dir, u.x, u.y, u.z), this.spotLightLocs[a].col && this.gl.uniform3f(
        this.spotLightLocs[a].col,
        l[a].color.r * l[a].intensity,
        l[a].color.g * l[a].intensity,
        l[a].color.b * l[a].intensity
      ), this.spotLightLocs[a].params && this.gl.uniform4f(
        this.spotLightLocs[a].params,
        Math.cos(l[a].angle),
        Math.cos(l[a].angle * (1 - l[a].penumbra)),
        l[a].distance,
        l[a].decay
      );
    }
    this.locs.numAL && this.gl.uniform1i(this.locs.numAL, g.length);
    for (let a = 0; a < g.length; a++) {
      const u = g[a], c = u.worldMatrix.data;
      this.areaLightLocs[a].pos && this.gl.uniform3f(this.areaLightLocs[a].pos, c[12], c[13], c[14]), this.areaLightLocs[a].col && this.gl.uniform3f(
        this.areaLightLocs[a].col,
        u.color.r * u.intensity,
        u.color.g * u.intensity,
        u.color.b * u.intensity
      ), this.areaLightLocs[a].right && this.gl.uniform3f(this.areaLightLocs[a].right, c[0], c[1], c[2]), this.areaLightLocs[a].up && this.gl.uniform3f(this.areaLightLocs[a].up, c[4], c[5], c[6]), this.areaLightLocs[a].normal && this.gl.uniform3f(this.areaLightLocs[a].normal, c[8], c[9], c[10]), this.areaLightLocs[a].size && this.gl.uniform2f(this.areaLightLocs[a].size, u.width / 2, u.height / 2);
    }
    const L = (a) => {
      if (!a.isVisible || !a.geometry || !a.material || a.material.type === b.SKYBOX) {
        if (a.children) for (const v of a.children) L(v);
        return;
      }
      const u = a.material;
      let c = this.cache.get(a.geometry);
      c || (c = new tt(this.gl, a.geometry), this.cache.set(a.geometry, c)), c.bind(this.locs.pos, this.locs.norm, this.locs.uv), this.locs.model && this.gl.uniformMatrix4fv(this.locs.model, !1, a.worldMatrix.data), this.locs.color && this.gl.uniform4fv(this.locs.color, u.color.toArray());
      let p = -1, y = [0, 0, 0, 0], f = this.defaultTexture, m = [0, 0], x = [1, 1];
      if (u.type === b.LAMBERT)
        p = 0;
      else if (u.type === b.PHONG) {
        const v = u;
        p = v.shininess || 32, y = v.specularColor ? v.specularColor.toArray() : [0, 0, 0, 0], v.diffuseMap && (f = this.getWebGLTexture(v.diffuseMap), m = [v.diffuseMap.offset.x, v.diffuseMap.offset.y], x = [v.diffuseMap.repeat.x, v.diffuseMap.repeat.y]);
      }
      this.gl.activeTexture(this.gl.TEXTURE0), this.gl.bindTexture(this.gl.TEXTURE_2D, f), this.locs.diffuseMap && this.gl.uniform1i(this.locs.diffuseMap, 0), this.locs.texOffset && this.gl.uniform2fv(this.locs.texOffset, m), this.locs.texRepeat && this.gl.uniform2fv(this.locs.texRepeat, x), this.locs.shininess && this.gl.uniform1f(this.locs.shininess, p), this.locs.specColor && this.gl.uniform4fv(this.locs.specColor, y);
      const _ = u.type === b.WIREFRAME ? this.gl.LINES : this.gl.TRIANGLES;
      if (this.gl.drawElements(_, c.count, this.gl.UNSIGNED_SHORT, 0), a.children) for (const v of a.children) L(v);
    };
    for (const a of t.objects) L(a);
  }
}
class yt extends ot {
  type = B.WEB_GPU;
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
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" }
        },
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
    const s = this.device.createPipelineLayout({
      bindGroupLayouts: [this.objBGL, this.texBGL]
    }), r = this.device.createPipelineLayout({
      bindGroupLayouts: [this.objBGL, this.skyTexBGL]
    }), o = {
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
    const n = this.device.createTexture({
      size: [1, 1],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    });
    this.device.queue.writeTexture(
      { texture: n },
      new Uint8Array([255, 255, 255, 255]),
      { bytesPerRow: 4 },
      [1, 1]
    ), this.defaultTexBindGroup = this.device.createBindGroup({
      layout: this.texBGL,
      entries: [
        { binding: 0, resource: n.createView() },
        { binding: 1, resource: this.sampler }
      ]
    });
    const h = this.device.createTexture({
      size: [1, 1, 6],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    });
    for (let l = 0; l < 6; l++)
      this.device.queue.writeTexture(
        { texture: h, origin: [0, 0, l] },
        new Uint8Array([50, 50, 100, 255]),
        { bytesPerRow: 4 },
        [1, 1]
      );
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
      const i = this.device.createBuffer({
        size: 1024,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      }), s = this.device.createBuffer({
        size: 512,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      }), r = this.device.createBuffer({
        size: 1024,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      }), o = this.device.createBuffer({
        size: 1024,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      }), n = this.device.createBindGroup({
        layout: this.objBGL,
        entries: [
          { binding: 0, resource: { buffer: i } },
          { binding: 1, resource: { buffer: s } },
          { binding: 2, resource: { buffer: r } },
          { binding: 3, resource: { buffer: o } }
          // <-- NEU
        ]
      });
      e = { ub: i, plb: s, slb: r, alb: o, bg: n }, this.objCache.set(t, e);
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
        this.device.queue.copyExternalImageToTexture(
          { source: t.images[r] },
          { texture: s, origin: [0, 0, r] },
          [i.width, i.height]
        );
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
  render(t, e, i = new S()) {
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
    }), { aCol: o, dDir: n, dCol: h, pLights: l, sLights: g, aLights: L } = this.extractLights(t), a = new Float32Array(160);
    a.set(e, 0), a.set([o.r, o.g, o.b, 1], 40), a.set([h.r, h.g, h.b, 1], 44), a.set([n.x, n.y, n.z, 0], 48), a.set([i.x, i.y, i.z, 0], 52), a[61] = l.length, a[62] = g.length, a[63] = L.length;
    const u = new Float32Array(32);
    for (let f = 0; f < l.length; f++) {
      const m = l[f];
      u.set(
        [m.worldMatrix.data[12], m.worldMatrix.data[13], m.worldMatrix.data[14], 0],
        f * 8
      ), u.set(
        [m.color.r * m.intensity, m.color.g * m.intensity, m.color.b * m.intensity, 0],
        f * 8 + 4
      );
    }
    const c = new Float32Array(64);
    for (let f = 0; f < g.length; f++) {
      const m = g[f], x = f * 16;
      c.set(
        [m.worldMatrix.data[12], m.worldMatrix.data[13], m.worldMatrix.data[14], 0],
        x
      );
      const _ = m.direction.clone().normalize();
      c.set([_.x, _.y, _.z, 0], x + 4), c.set(
        [m.color.r * m.intensity, m.color.g * m.intensity, m.color.b * m.intensity, 0],
        x + 8
      ), c.set(
        [Math.cos(m.angle), Math.cos(m.angle * (1 - m.penumbra)), m.distance, m.decay],
        x + 12
      );
    }
    const p = new Float32Array(96);
    for (let f = 0; f < L.length; f++) {
      const m = L[f], x = m.worldMatrix.data, _ = f * 24;
      p.set([x[12], x[13], x[14], 0], _), p.set(
        [m.color.r * m.intensity, m.color.g * m.intensity, m.color.b * m.intensity, 0],
        _ + 4
      ), p.set([x[0], x[1], x[2], 0], _ + 8), p.set([x[4], x[5], x[6], 0], _ + 12), p.set([x[8], x[9], x[10], 0], _ + 16), p.set([m.width / 2, m.height / 2, 0, 0], _ + 20);
    }
    const y = (f) => {
      if (!f.isVisible || !f.geometry || !f.material) return;
      const m = f.material;
      let x = this.defaultTexBindGroup, _ = -1, v = [0, 0, 0, 0], P = [0, 0], M = [1, 1];
      if (m.type === b.SKYBOX) {
        r.setPipeline(this.pipelineSkybox);
        const T = m;
        x = T.cubeMap ? this.getGPUCubeTextureBindGroup(T.cubeMap) : this.defaultCubeTexBindGroup;
      } else if (r.setPipeline(
        m.type === b.WIREFRAME ? this.pipelineLines : this.pipelineTriangles
      ), m.type === b.LAMBERT)
        _ = 0;
      else if (m.type === b.PHONG) {
        const T = m;
        _ = T.shininess || 32, v = T.specularColor ? T.specularColor.toArray() : [0, 0, 0, 0], T.diffuseMap && (x = this.getGPUTextureBindGroup(T.diffuseMap), P = [T.diffuseMap.offset.x, T.diffuseMap.offset.y], M = [T.diffuseMap.repeat.x, T.diffuseMap.repeat.y]);
      }
      a.set(f.worldMatrix.data, 16), a.set(m.color.toArray(), 32), a.set(v, 36), a.set(P, 56), a.set(M, 58), a[60] = _;
      const U = this.getObjCache(f);
      this.device.queue.writeBuffer(U.ub, 0, a), this.device.queue.writeBuffer(U.plb, 0, u), this.device.queue.writeBuffer(U.slb, 0, c), this.device.queue.writeBuffer(U.alb, 0, p);
      const A = this.getGeoCache(f.geometry);
      if (r.setBindGroup(0, U.bg), r.setBindGroup(1, x), r.setVertexBuffer(0, A.vb), r.setVertexBuffer(1, A.nb ? A.nb : A.vb), r.setVertexBuffer(2, A.uvb ? A.uvb : A.vb), A.ib && A.format ? (r.setIndexBuffer(A.ib, A.format), r.drawIndexed(A.indexCount)) : r.draw(A.vertexCount), f.children) for (const T of f.children) y(T);
    };
    for (const f of t.objects || []) y(f);
    r.end(), this.device.queue.submit([s.finish()]);
  }
}
class vt {
  static async create(t, e) {
    let i = t;
    i === B.BEST && (i = navigator.gpu ? B.WEB_GPU : B.WEB_GL2);
    let s;
    switch (i) {
      case B.WEB_GPU:
        navigator.gpu ? s = new yt() : s = new it();
        break;
      case B.WEB_GL2:
        s = new it();
        break;
      case B.WEB_GL1:
        s = new Lt();
        break;
      default:
        s = new it();
        break;
    }
    return await s.initialize(e), s;
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
      this.config = await e.json(), this.config.rendererType || (this.config.rendererType = mt);
      const i = document.getElementById(this.config.canvasId);
      if (!i)
        throw new Error(`Canvas mit ID '${this.config.canvasId}' wurde nicht im DOM gefunden.`);
      this.activeRenderer = await vt.create(this.config.rendererType, i), this.config.skyColor ? this.activeRenderer.setClearColor(st.fromCSS(this.config.skyColor)) : this.activeRenderer.setClearColor(st.fromCSS("#111111"));
    } catch (e) {
      throw console.error("[SmallWorld] Initialisierung fehlgeschlagen:", e), e;
    }
  }
}
const R = {
  LOADER_END: "LoaderEnd",
  LOADER_ERROR: "LoaderError",
  LOADER_PROGRESS: "LoaderProgress",
  LOADER_START: "LoaderStart"
};
class xt {
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
class I extends xt {
  basePath = "";
  setBasePath(t) {
    return this.basePath = t, this;
  }
}
class C {
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
      const e = this.indices[t] * 3, i = this.indices[t + 1] * 3, s = this.indices[t + 2] * 3, r = this.vertices[e], o = this.vertices[e + 1], n = this.vertices[e + 2], h = this.vertices[i], l = this.vertices[i + 1], g = this.vertices[i + 2], L = this.vertices[s], a = this.vertices[s + 1], u = this.vertices[s + 2], c = h - r, p = l - o, y = g - n, f = L - r, m = a - o, x = u - n, _ = p * x - y * m, v = y * f - c * x, P = c * m - p * f;
      this.normals[e] += _, this.normals[e + 1] += v, this.normals[e + 2] += P, this.normals[i] += _, this.normals[i + 1] += v, this.normals[i + 2] += P, this.normals[s] += _, this.normals[s + 1] += v, this.normals[s + 2] += P;
    }
    for (let t = 0; t < this.normals.length; t += 3) {
      const e = this.normals[t], i = this.normals[t + 1], s = this.normals[t + 2], r = Math.sqrt(e * e + i * i + s * s);
      r > 0 && (this.normals[t] /= r, this.normals[t + 1] /= r, this.normals[t + 2] /= r);
    }
  }
  applyMatrix4(t) {
    const e = new S();
    for (let i = 0; i < this.vertices.length; i += 3)
      e.x = this.vertices[i], e.y = this.vertices[i + 1], e.z = this.vertices[i + 2], t.transformVector(e), this.vertices[i] = e.x, this.vertices[i + 1] = e.y, this.vertices[i + 2] = e.z;
    return this.computeNormals(), this;
  }
  scale(t) {
    const e = new w();
    return w.scale(t, e), this.applyMatrix4(e);
  }
  rotateX(t) {
    const e = new w();
    return w.rotateX(t, e), this.applyMatrix4(e);
  }
  rotateY(t) {
    const e = new w();
    return w.rotateY(t, e), this.applyMatrix4(e);
  }
  rotateZ(t) {
    const e = new w();
    return w.rotateZ(t, e), this.applyMatrix4(e);
  }
}
class _t extends C {
  constructor(t, e, i, s) {
    super(), this.vertices = new Float32Array(t), this.uvs = new Float32Array(e), this.normals = new Float32Array(i), this.indices = new Uint16Array(s), this.normals.length === 0 && this.computeNormals();
  }
  generateGeometryData() {
  }
}
class N {
  uuid = crypto.randomUUID();
  color = E.WHITE;
}
class nt extends N {
  type = b.PHONG;
  specularColor = E.WHITE;
  shininess = 32;
  diffuseMap = null;
}
class Et extends I {
  async load(t) {
    const e = this.basePath + t;
    this.dispatchEvent(R.LOADER_START, { url: e });
    try {
      const i = await z.loadText(e, (r, o) => {
        this.dispatchEvent(R.LOADER_PROGRESS, { url: e, loaded: r, total: o });
      }), s = this.parse(i);
      return this.dispatchEvent(R.LOADER_END, { url: e, data: s }), s;
    } catch (i) {
      throw this.dispatchEvent(R.LOADER_ERROR, { url: e, error: i }), i;
    }
  }
  parse(t) {
    const e = /* @__PURE__ */ new Map();
    let i = null;
    const s = t.split(`
`);
    for (let r of s) {
      if (r = r.trim(), r.length === 0 || r.startsWith("#")) continue;
      const o = r.split(/\s+/), n = o[0];
      n === "newmtl" ? (i = new nt(), e.set(o[1], i)) : n === "Kd" && i ? i.color = new E(
        parseFloat(o[1]),
        parseFloat(o[2]),
        parseFloat(o[3])
      ) : n === "Ks" && i ? i.specularColor = new E(
        parseFloat(o[1]),
        parseFloat(o[2]),
        parseFloat(o[3])
      ) : n === "Ns" && i && (i.shininess = parseFloat(o[1]));
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
class Dt extends I {
  async load(t) {
    const e = this.basePath + t;
    this.dispatchEvent(R.LOADER_START, { url: e });
    try {
      const i = await z.loadText(e, (o, n) => {
        this.dispatchEvent(R.LOADER_PROGRESS, { url: e, loaded: o, total: n });
      }), s = e.substring(0, e.lastIndexOf("/") + 1), r = await this.parse(i, s);
      return this.dispatchEvent(R.LOADER_END, { url: e, data: r }), r;
    } catch (i) {
      throw this.dispatchEvent(R.LOADER_ERROR, { url: e, error: i }), i;
    }
  }
  async parse(t, e) {
    const i = [], s = [], r = [];
    let o = /* @__PURE__ */ new Map();
    const n = /* @__PURE__ */ new Map();
    let h = new rt("default");
    n.set("default", h);
    const l = t.split(`
`);
    for (let L of l) {
      if (L = L.trim(), L.length === 0 || L.startsWith("#")) continue;
      const a = L.split(/\s+/), u = a[0];
      if (u === "mtllib")
        o = await new Et().load(e + a[1]);
      else if (u === "usemtl") {
        const c = a[1];
        n.has(c) || n.set(c, new rt(c)), h = n.get(c);
      } else if (u === "v")
        i.push(parseFloat(a[1]), parseFloat(a[2]), parseFloat(a[3]));
      else if (u === "vt")
        s.push(parseFloat(a[1]), parseFloat(a[2]));
      else if (u === "vn")
        r.push(parseFloat(a[1]), parseFloat(a[2]), parseFloat(a[3]));
      else if (u === "f") {
        const c = a.slice(1);
        for (let p = 1; p < c.length - 1; p++) {
          const y = this.parseFaceVertex(
            c[0],
            i,
            s,
            r,
            h
          ), f = this.parseFaceVertex(
            c[p],
            i,
            s,
            r,
            h
          ), m = this.parseFaceVertex(
            c[p + 1],
            i,
            s,
            r,
            h
          );
          h.outIndices.push(y, f, m);
        }
      }
    }
    const g = new Q("ModelRoot");
    return n.forEach((L, a) => {
      if (L.outIndices.length === 0) return;
      const u = new Q(a);
      u.geometry = new _t(
        L.outVertices,
        L.outUVs,
        L.outNormals,
        L.outIndices
      ).getGeometryData(), u.material = o.get(a) || new nt(), g.add(u);
    }), g;
  }
  parseFaceVertex(t, e, i, s, r) {
    if (r.vertexCache.has(t)) return r.vertexCache.get(t);
    const o = t.split("/"), n = (parseInt(o[0]) - 1) * 3;
    if (r.outVertices.push(e[n], e[n + 1], e[n + 2]), o.length > 1 && o[1] !== "") {
      const l = (parseInt(o[1]) - 1) * 2;
      r.outUVs.push(i[l], i[l + 1]);
    } else
      r.outUVs.push(0, 0);
    if (o.length > 2) {
      const l = (parseInt(o[2]) - 1) * 3;
      r.outNormals.push(s[l], s[l + 1], s[l + 2]);
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
      this.images = await Promise.all(t.map((e) => z.loadImage(e))), this.isLoaded = !0;
    } catch (e) {
      console.error("Fehler beim Laden der CubeTexture", e);
    }
  }
}
class Bt extends I {
  async load(t) {
    const e = this.basePath + t;
    this.dispatchEvent("loadStart", { url: e });
    try {
      const i = await z.loadImage(
        e,
        (g, L) => this.dispatchEvent(R.LOADER_PROGRESS, { url: e, loaded: g, total: L }),
        !1
      ), s = i.width / 4, r = document.createElement("canvas");
      r.width = s, r.height = s;
      const o = r.getContext("2d", { willReadFrequently: !0 }), n = [
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
      for (const g of n) {
        o.clearRect(0, 0, s, s), o.drawImage(
          i,
          // Type-Cast für TypeScript
          g.col * s,
          g.row * s,
          s,
          s,
          0,
          0,
          s,
          s
        );
        const L = await createImageBitmap(r);
        h.push(L);
      }
      const l = new ht();
      return l.images = h, l.isLoaded = !0, this.dispatchEvent(R.LOADER_END, { url: e, data: l }), l;
    } catch (i) {
      throw this.dispatchEvent(R.LOADER_ERROR, { url: e, error: i }), i;
    }
  }
}
class wt extends C {
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
class Tt extends N {
  type = b.SKYBOX;
  cubeMap = null;
}
class Gt extends Q {
  constructor(t, e = 100) {
    super("Skybox"), this.geometry = new wt(e).getGeometryData();
    const i = new Tt();
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
      this.image = await z.loadImage(t), this.isLoaded = !0;
    } catch (e) {
      console.error(`Fehler beim Laden der Textur: ${t}`, e);
    }
  }
}
const zt = {
  UP: "ArrowUp",
  DOWN: "ArrowDown",
  LEFT: "ArrowLeft",
  RIGHT: "ArrowRight",
  SPACE: "Space",
  ENTER: "Enter",
  ESCAPE: "Escape",
  TAB: "Tab",
  BACKSPACE: "Backspace",
  SHIFT_L: "ShiftLeft",
  SHIFT_R: "ShiftRight",
  CTRL_L: "ControlLeft",
  CTRL_R: "ControlRight",
  ALT_L: "AltLeft",
  ALT_R: "AltRight",
  D0: "Digit0",
  D1: "Digit1",
  D2: "Digit2",
  D3: "Digit3",
  D4: "Digit4",
  D5: "Digit5",
  D6: "Digit6",
  D7: "Digit7",
  D8: "Digit8",
  D9: "Digit9",
  A: "KeyA",
  B: "KeyB",
  C: "KeyC",
  D: "KeyD",
  E: "KeyE",
  F: "KeyF",
  G: "KeyG",
  H: "KeyH",
  I: "KeyI",
  J: "KeyJ",
  K: "KeyK",
  L: "KeyL",
  M: "KeyM",
  N: "KeyN",
  O: "KeyO",
  P: "KeyP",
  Q: "KeyQ",
  R: "KeyR",
  S: "KeyS",
  T: "KeyT",
  U: "KeyU",
  V: "KeyV",
  W: "KeyW",
  X: "KeyX",
  Y: "KeyY",
  Z: "KeyZ"
}, It = {
  LINEAR: "linear",
  NEAREST: "nearest"
}, Nt = {
  REPEAT: "repeat",
  CLAMP_TO_EDGE: "clamp-to-edge",
  MIRRORED_REPEAT: "mirror-repeat"
};
class lt {
  matrix = new w();
}
class Ot extends lt {
  constructor(t, e, i, s, r, o) {
    super(), this.l = t, this.r = e, this.b = i, this.t = s, this.n = r, this.f = o, this.update();
  }
  update() {
    w.orthographic(this.l, this.r, this.b, this.t, this.n, this.f, this.matrix);
  }
  getMatrix() {
    return this.matrix;
  }
}
class kt extends lt {
  constructor(t, e, i, s) {
    super(), this.fov = t, this.aspect = e, this.near = i, this.far = s, this.update();
  }
  update() {
    w.perspective(this.fov, this.aspect, this.near, this.far, this.matrix);
  }
  getMatrix() {
    return this.matrix;
  }
}
class Vt extends C {
  constructor(t = 1, e = 2, i = 16) {
    super(), this.radius = t, this.height = e, this.segments = i, this.generateGeometryData();
  }
  generateGeometryData() {
    const t = [], e = [], i = [], s = this.height / 2;
    for (let o = 0; o <= 1; o++) {
      const n = o === 0 ? -s : s, h = o === 0 ? 0 : 1;
      for (let l = 0; l <= this.segments; l++) {
        const g = l / this.segments, L = g * Math.PI * 2;
        t.push(this.radius * Math.sin(L), n, this.radius * Math.cos(L)), e.push(g, h);
      }
    }
    for (let o = 0; o < this.segments; o++) {
      const n = o, h = n + this.segments + 1;
      i.push(n, h, n + 1), i.push(h, h + 1, n + 1);
    }
    let r = t.length / 3;
    t.push(0, s, 0), e.push(0.5, 0.5);
    for (let o = 0; o <= this.segments; o++) {
      const n = o / this.segments * Math.PI * 2;
      t.push(this.radius * Math.sin(n), s, this.radius * Math.cos(n)), e.push(0.5 + Math.sin(n) * 0.5, 0.5 + Math.cos(n) * 0.5);
    }
    for (let o = 0; o < this.segments; o++) i.push(r, r + o + 1, r + o + 2);
    r = t.length / 3, t.push(0, -s, 0), e.push(0.5, 0.5);
    for (let o = 0; o <= this.segments; o++) {
      const n = o / this.segments * Math.PI * 2;
      t.push(this.radius * Math.sin(n), -s, this.radius * Math.cos(n)), e.push(0.5 + Math.sin(n) * 0.5, 0.5 - Math.cos(n) * 0.5);
    }
    for (let o = 0; o < this.segments; o++) i.push(r, r + o + 2, r + o + 1);
    this.vertices = new Float32Array(t), this.uvs = new Float32Array(e), this.indices = new Uint16Array(i), this.computeNormals();
  }
}
class Xt extends C {
  constructor(t = 20, e = 20) {
    super(), this.size = t, this.divisions = e, this.generateGeometryData();
  }
  generateGeometryData() {
    const t = [], e = [], i = [], s = this.size / this.divisions, r = this.size / 2;
    let o = 0;
    for (let n = 0; n <= this.divisions; n++) {
      const h = n * s - r, l = n / this.divisions;
      t.push(h, 0, -r, h, 0, r), e.push(l, 0, l, 1), i.push(o, o + 1), o += 2, t.push(-r, 0, h, r, 0, h), e.push(0, l, 1, l), i.push(o, o + 1), o += 2;
    }
    this.vertices = new Float32Array(t), this.uvs = new Float32Array(e), this.indices = new Uint16Array(i);
  }
}
class Wt extends C {
  constructor(t = 1, e = 1, i = 1, s = 1) {
    super(), this.width = t, this.depth = e, this.widthSegments = i, this.depthSegments = s, this.generateGeometryData();
  }
  generateGeometryData() {
    const t = [], e = [], i = [], s = this.width / 2, r = this.depth / 2;
    for (let o = 0; o <= this.depthSegments; o++) {
      const n = o / this.depthSegments;
      for (let h = 0; h <= this.widthSegments; h++) {
        const l = h / this.widthSegments;
        t.push(l * this.width - s, 0, n * this.depth - r), e.push(l, 1 - n);
      }
    }
    for (let o = 0; o < this.depthSegments; o++)
      for (let n = 0; n < this.widthSegments; n++) {
        const h = n + (this.widthSegments + 1) * o, l = n + (this.widthSegments + 1) * (o + 1), g = n + 1 + (this.widthSegments + 1) * (o + 1), L = n + 1 + (this.widthSegments + 1) * o;
        i.push(h, l, L), i.push(l, g, L);
      }
    this.vertices = new Float32Array(t), this.uvs = new Float32Array(e), this.indices = new Uint16Array(i), this.computeNormals();
  }
}
class jt extends C {
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
class Yt extends C {
  constructor(t = 1, e = 16, i = 12) {
    super(), this.radius = t, this.widthSegments = e, this.heightSegments = i, this.generateGeometryData();
  }
  generateGeometryData() {
    const t = [], e = [], i = [], s = [];
    for (let r = 0; r <= this.heightSegments; r++) {
      const o = r / this.heightSegments, n = o * Math.PI;
      for (let h = 0; h <= this.widthSegments; h++) {
        const l = h / this.widthSegments, g = l * Math.PI * 2, L = -(this.radius * Math.sin(n) * Math.cos(g)), a = this.radius * Math.cos(n), u = this.radius * Math.sin(n) * Math.sin(g);
        t.push(L, a, u), e.push(L / this.radius, a / this.radius, u / this.radius), i.push(l, 1 - o);
      }
    }
    for (let r = 0; r < this.heightSegments; r++)
      for (let o = 0; o < this.widthSegments; o++) {
        const n = r * (this.widthSegments + 1) + o, h = n + this.widthSegments + 1;
        s.push(n, h, n + 1), s.push(h, h + 1, n + 1);
      }
    this.vertices = new Float32Array(t), this.normals = new Float32Array(e), this.uvs = new Float32Array(i), this.indices = new Uint16Array(s);
  }
}
class Ht extends C {
  constructor(t = 1, e = 0.4, i = 16, s = 32) {
    super(), this.radius = t, this.tube = e, this.radialSegments = i, this.tubularSegments = s, this.generateGeometryData();
  }
  generateGeometryData() {
    const t = [], e = [], i = [];
    for (let s = 0; s <= this.radialSegments; s++) {
      const r = s / this.radialSegments, o = r * Math.PI * 2, n = Math.cos(o), h = Math.sin(o);
      for (let l = 0; l <= this.tubularSegments; l++) {
        const g = l / this.tubularSegments, L = g * Math.PI * 2, a = Math.cos(L), u = Math.sin(L);
        t.push(
          (this.radius + this.tube * n) * a,
          this.tube * h,
          (this.radius + this.tube * n) * u
        ), e.push(g, r);
      }
    }
    for (let s = 1; s <= this.radialSegments; s++)
      for (let r = 1; r <= this.tubularSegments; r++) {
        const o = (this.tubularSegments + 1) * s + r - 1, n = (this.tubularSegments + 1) * (s - 1) + r - 1, h = (this.tubularSegments + 1) * (s - 1) + r, l = (this.tubularSegments + 1) * s + r;
        i.push(o, n, l), i.push(n, h, l);
      }
    this.vertices = new Float32Array(t), this.uvs = new Float32Array(e), this.indices = new Uint16Array(i), this.computeNormals();
  }
}
class Kt extends C {
  constructor(t = 1, e = 32) {
    super(), this.radius = t, this.segments = e, this.generateGeometryData();
  }
  generateGeometryData() {
    const t = [], e = [], i = [];
    for (let s = 0; s < this.segments; s++) {
      const r = s / this.segments * Math.PI * 2, o = Math.cos(r), n = Math.sin(r);
      t.push(o * this.radius, 0, n * this.radius), e.push(0.5 + o * 0.5, 0.5 + n * 0.5), i.push(s, (s + 1) % this.segments);
    }
    this.vertices = new Float32Array(t), this.uvs = new Float32Array(e), this.indices = new Uint16Array(i);
  }
}
class $t extends C {
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
class qt extends C {
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
const bt = {
  // Durchschnitt aus R, G und B, zentriert um den Nullpunkt (Y=0)
  CENTERED_AVERAGE: (d, t, e, i, s) => (d + t + e) / 3 / 255 * s - s / 2,
  // Liest nur den Rot-Kanal, Terrain startet flach bei Y=0 und geht nur nach oben
  BASE_RED: (d, t, e, i, s) => d / 255 * s,
  // Spielerei: Invertiertes Terrain (Schluchten statt Berge)
  INVERTED_AVERAGE: (d, t, e, i, s) => (1 - (d + t + e) / 3 / 255) * s - s / 2
};
class Zt extends C {
  /**
   * @param image Das geladene Bild (Heightmap)
   * @param width Breite des Terrains in Weltkoordinaten
   * @param depth Tiefe des Terrains in Weltkoordinaten
   * @param maxHeight Wie hoch ist der höchste Berg (weißester Pixel)?
   * @param widthSegments Anzahl der Unterteilungen auf der X-Achse (Auflösung)
   * @param depthSegments Anzahl der Unterteilungen auf der Z-Achse (Auflösung)
   * @param strategy Funktion zur Höhenberechnung (Standard: CENTERED_AVERAGE)
   */
  constructor(t, e = 100, i = 100, s = 20, r = 64, o = 64, n = bt.CENTERED_AVERAGE) {
    super(), this.image = t, this.width = e, this.depth = i, this.maxHeight = s, this.widthSegments = r, this.depthSegments = o, this.strategy = n, this.generateGeometryData();
  }
  generateGeometryData() {
    const t = document.createElement("canvas");
    t.width = this.image.width, t.height = this.image.height;
    const e = t.getContext("2d", { willReadFrequently: !0 });
    e.drawImage(this.image, 0, 0);
    const i = e.getImageData(0, 0, t.width, t.height).data, s = [], r = [], o = [], n = this.width / 2, h = this.depth / 2;
    for (let l = 0; l <= this.depthSegments; l++) {
      const g = l / this.depthSegments;
      for (let L = 0; L <= this.widthSegments; L++) {
        const a = L / this.widthSegments, u = Math.floor(a * (t.width - 1)), p = (Math.floor(g * (t.height - 1)) * t.width + u) * 4, y = i[p], f = i[p + 1], m = i[p + 2], x = i[p + 3], _ = a * this.width - n, v = g * this.depth - h, P = this.strategy(y, f, m, x, this.maxHeight);
        s.push(_, P, v), r.push(a, 1 - g);
      }
    }
    for (let l = 0; l < this.depthSegments; l++)
      for (let g = 0; g < this.widthSegments; g++) {
        const L = g + (this.widthSegments + 1) * l, a = g + (this.widthSegments + 1) * (l + 1), u = g + 1 + (this.widthSegments + 1) * (l + 1), c = g + 1 + (this.widthSegments + 1) * l;
        o.push(L, a, c), o.push(a, u, c);
      }
    this.vertices = new Float32Array(s), this.uvs = new Float32Array(r), this.indices = new Uint32Array(o), this.computeNormals();
  }
}
class Jt {
  /**
   * Generiert eine Heightmap mit dem Diamond-Square-Algorithmus.
   * @param detail Bestimmt die Größe (Größe = 2^detail + 1). z.B. detail 8 = 257x257 Pixel.
   * @param roughness Wie zerklüftet ist das Terrain? (0.0 = flach, 1.0 = extremes Chaos, ~0.6 ist gut für Hügel)
   * @returns Ein ImageBitmap, das direkt in die Terrain-Geometrie gepumpt werden kann.
   */
  static async generateDiamondSquare(t = 8, e = 0.6) {
    const i = Math.pow(2, t) + 1, s = i - 1, r = new Float32Array(i * i), o = (p, y, f) => {
      r[y * i + p] = f;
    }, n = (p, y) => p < 0 || p >= i || y < 0 || y >= i ? -1 : r[y * i + p];
    o(0, 0, 0.5), o(s, 0, 0.5), o(0, s, 0.5), o(s, s, 0.5);
    let h = s, l = 1;
    for (; h > 1; ) {
      const p = h / 2;
      for (let y = 0; y < s; y += h)
        for (let f = 0; f < s; f += h) {
          const m = n(f, y), x = n(f + h, y), _ = n(f, y + h), v = n(f + h, y + h), P = (m + x + _ + v) / 4, M = (Math.random() - 0.5) * l;
          o(f + p, y + p, P + M);
        }
      for (let y = 0; y <= s; y += p)
        for (let f = y % h === 0 ? p : 0; f <= s; f += h) {
          let m = 0, x = 0;
          const _ = [
            n(f, y - p),
            // Top
            n(f, y + p),
            // Bottom
            n(f - p, y),
            // Left
            n(f + p, y)
            // Right
          ];
          for (const M of _)
            M !== -1 && (m += M, x++);
          const v = m / x, P = (Math.random() - 0.5) * l;
          o(f, y, v + P);
        }
      l *= e, h = p;
    }
    let g = 1 / 0, L = -1 / 0;
    for (let p = 0; p < r.length; p++)
      r[p] < g && (g = r[p]), r[p] > L && (L = r[p]);
    for (let p = 0; p < r.length; p++)
      r[p] = (r[p] - g) / (L - g);
    const a = document.createElement("canvas");
    a.width = i, a.height = i;
    const u = a.getContext("2d"), c = u.createImageData(i, i);
    for (let p = 0; p < r.length; p++) {
      const y = Math.floor(r[p] * 255), f = p * 4;
      c.data[f] = y, c.data[f + 1] = y, c.data[f + 2] = y, c.data[f + 3] = 255;
    }
    return u.putImageData(c, 0, 0), await createImageBitmap(a);
  }
}
class Qt extends N {
  type = b.BASIC;
}
class te extends N {
  type = b.LAMBERT;
}
class ee extends N {
  type = b.WIREFRAME;
}
class O extends Q {
  constructor(t = E.WHITE, e, i = "Light") {
    super(i), this.color = t, this.intensity = e;
  }
}
class ie extends O {
  type = F.AMBIENT;
  constructor(t = E.WHITE, e = 0.2) {
    super(t, e, "AmbientLight");
  }
}
class se extends O {
  type = F.DIRECTIONAL;
  intensity = 1;
  direction = new S(0, -1, 0).normalize();
  constructor(t = E.WHITE, e = 1) {
    super(t, e, "DirectionalLight");
  }
}
class re extends O {
  constructor(t = E.WHITE, e = 1, i = 50, s = 2) {
    super(t, e, "PointLight"), this.distance = i, this.decay = s;
  }
  type = F.POINT;
}
class oe extends O {
  constructor(t = E.WHITE, e = 1, i = 50, s = Math.PI / 6, r = 0.5, o = 2) {
    super(t, e, "SpotLight"), this.distance = i, this.angle = s, this.penumbra = r, this.decay = o;
  }
  type = F.SPOT;
  direction = new S(0, -1, 0).normalize();
}
class ae extends O {
  constructor(t = E.WHITE, e = 1, i = 5, s = 5) {
    super(t, e, "AreaLight"), this.width = i, this.height = s;
  }
  type = F.AREA;
}
const D = {
  SPHERE: 0,
  BOX: 1
};
class ne {
  constructor(t, e) {
    this.min = t, this.max = e;
    const i = e.clone().sub(t);
    this.broadRadius = i.length() / 2;
  }
  type = D.BOX;
  broadRadius;
  get center() {
    return this.min.clone().add(this.max).scale(0.5);
  }
  getBroadRadius() {
    return this.broadRadius;
  }
}
class he {
  constructor(t, e) {
    this.center = t, this.radius = e;
  }
  type = D.SPHERE;
  getBroadRadius() {
    return this.radius;
  }
}
class le {
  static test(t, e) {
    const i = t.center.distanceToSq(e.center), s = t.getBroadRadius() + e.getBroadRadius();
    return i > s * s ? !1 : t.type === D.SPHERE && e.type === D.SPHERE ? this.sphereSphere(t, e) : t.type === D.BOX && e.type === D.BOX ? this.boxBox(t, e) : t.type === D.SPHERE && e.type === D.BOX ? this.sphereBox(t, e) : t.type === D.BOX && e.type === D.SPHERE ? this.sphereBox(e, t) : !1;
  }
  static sphereSphere(t, e) {
    const i = t.center.distanceToSq(e.center), s = (t.radius + e.radius) * (t.radius + e.radius);
    return i <= s;
  }
  static boxBox(t, e) {
    return t.min.x <= e.max.x && t.max.x >= e.min.x && t.min.y <= e.max.y && t.max.y >= e.min.y && t.min.z <= e.max.z && t.max.z >= e.min.z;
  }
  static sphereBox(t, e) {
    return new S(
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
    for (let s = 0; s < 6; s++) {
      const r = s * 4, o = Math.sqrt(i[r] * i[r] + i[r + 1] * i[r + 1] + i[r + 2] * i[r + 2]);
      if (o > 0) {
        const n = 1 / o;
        i[r] *= n, i[r + 1] *= n, i[r + 2] *= n, i[r + 3] *= n;
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
class ce {
  static frustum = new Rt();
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
class ue extends I {
  async load(t) {
    const e = this.basePath + t;
    this.dispatchEvent(R.LOADER_START, { url: e });
    try {
      const i = await z.loadImage(e, (s, r) => {
        this.dispatchEvent(R.LOADER_PROGRESS, { url: e, loaded: s, total: r });
      });
      return this.dispatchEvent(R.LOADER_END, { url: e, data: i }), i;
    } catch (i) {
      throw this.dispatchEvent(R.LOADER_ERROR, { url: e, error: i }), i;
    }
  }
}
class At extends I {
  async load(t) {
    const e = this.basePath + t;
    this.dispatchEvent(R.LOADER_START, { url: e });
    try {
      const i = await z.loadText(e, (s, r) => {
        this.dispatchEvent(R.LOADER_PROGRESS, { url: e, loaded: s, total: r });
      });
      return this.dispatchEvent(R.LOADER_END, { url: e, data: i }), i;
    } catch (i) {
      throw this.dispatchEvent(R.LOADER_ERROR, { url: e, error: i }), i;
    }
  }
}
class ge extends At {
  // Aktuell macht der ShaderLoader genau dasselbe wie der TextLoader.
  // Er ist aber ein eigener Typ, falls wir später WebGPU-Shader-Code
  // direkt hier validieren oder parsen möchten!
}
export {
  O as AbstractLight,
  N as AbstractMaterial,
  ie as AmbientLight,
  ae as AreaLight,
  z as AssetManager,
  Qt as BasicMaterial,
  ne as BoundingBox,
  he as BoundingSphere,
  St as Camera,
  G as CameraStrategyType,
  Kt as Circle,
  le as Collision,
  E as Color,
  st as ColorUtils,
  wt as Cube,
  ht as CubeTexture,
  Vt as Cylinder,
  mt as DEFAULT_RENDERER,
  se as DirectionalLight,
  pt as ENGINE_VERSION,
  xt as EventDispatcher,
  R as EventType,
  ce as FrustumCuller,
  Xt as Grid,
  Pt as HUD,
  Jt as HeightmapGenerator,
  ue as ImageLoader,
  Mt as Input,
  zt as Keys,
  te as LambertMaterial,
  F as LightType,
  qt as Line,
  I as Loader,
  w as Matrix4,
  _t as ModelGeometry,
  Dt as ObjLoader,
  Q as Object3D,
  Ot as OrthographicProjection,
  kt as PerspectiveProjection,
  nt as PhongMaterial,
  Wt as Plane,
  re as PointLight,
  jt as Pyramid,
  B as RendererType,
  Ct as Scene,
  ge as ShaderLoader,
  Gt as Skybox,
  Bt as SkyboxLoader,
  Tt as SkyboxMaterial,
  Ut as SmallWorld,
  Yt as Sphere,
  oe as SpotLight,
  Zt as Terrain,
  bt as TerrainStrategies,
  At as TextLoader,
  Ft as Texture,
  It as TextureFilter,
  Nt as TextureWrap,
  Ht as Torus,
  $t as Triangle,
  et as Vector2D,
  S as Vector3D,
  ee as WireframeMaterial
};
