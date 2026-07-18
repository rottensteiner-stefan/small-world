import {
  SmallWorld,
  CustomShaderMaterial,
  ShadertoyImporter,
  GLSLSandboxImporter,
  ComputeToysImporter,
  ExternalShaderUniformBehavior,
  OrbitController,
  DirectionalLight,
  RendererType,
  CameraStrategyType,
  Color,
  Object3D,
  Plane,
} from "../../src/index.js";

// --- GLSL SHADERS (WebGL2) ---

const SHADERTOY_STAR_NEST = `
// Star Nest by Kali
#define iterations 17
#define formuparam 0.53
#define volsteps 20
#define stepsize 0.1
#define zoom   0.800
#define tile   0.850
#define speed  0.010 
#define brightness 0.0015
#define darkmatter 0.300
#define distfading 0.730
#define saturation 0.850

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
	vec2 uv=fragCoord.xy/iResolution.xy-.5;
	uv.y*=iResolution.y/iResolution.x;
	vec3 dir=vec3(uv*zoom,1.);
	float time=iTime*speed+.25;

	float a1=.5+iMouse.x/iResolution.x*2.;
	float a2=.8+iMouse.y/iResolution.y*2.;
	mat2 rot1=mat2(cos(a1),sin(a1),-sin(a1),cos(a1));
	mat2 rot2=mat2(cos(a2),sin(a2),-sin(a2),cos(a2));
	dir.xz*=rot1;
	dir.xy*=rot2;
	vec3 from=vec3(1.,.5,0.5);
	from+=vec3(time*2.,time,-2.);
	from.xz*=rot1;
	from.xy*=rot2;
	
	float s=0.1,fade=1.;
	vec3 v=vec3(0.);
	for (int r=0; r<volsteps; r++) {
		vec3 p=from+s*dir*.5;
		p = abs(vec3(tile)-mod(p,vec3(tile*2.)));
		float pa,a=pa=0.;
		for (int i=0; i<iterations; i++) { 
			p=abs(p)/dot(p,p)-formuparam;
			a+=abs(length(p)-pa);
			pa=length(p);
		}
		float dm=max(0.,darkmatter-a*a*.001);
		a*=a*a;
		if (r>6) fade*=1.-dm;
		v+=fade;
		v+=vec3(s,s*s,s*s*s*s)*a*brightness*fade;
		fade*=distfading;
		s+=stepsize;
	}
	v=mix(vec3(length(v)),v,saturation);
	fragColor = vec4(v*.01,1.);	
}
`;

const GLSLSANDBOX_PLASMA = `
#ifdef GL_ES
precision mediump float;
#endif

void main( void ) {
    vec2 p = ( gl_FragCoord.xy / resolution.xy ) * 2.0 - 1.0;
    p.x *= resolution.x / resolution.y;
    
    vec3 col = vec3(0.0);
    for(float i=1.0; i<4.0; i++) {
        vec2 newp = p;
        newp.x += 0.6 / i * cos(i * p.y + time + 0.3);
        newp.y += 0.6 / i * cos(i * p.x + time + 0.3);
        p = newp;
    }
    
    col = vec3(0.5 * sin(3.0 * p.x) + 0.5,
               0.5 * sin(3.0 * p.y) + 0.5,
               sin(p.x + p.y));
               
    gl_FragColor = vec4(col, 1.0);
}
`;

const SHADERTOY_FRACTAL = `
void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    vec2 uv0 = uv;
    vec3 finalColor = vec3(0.0);
    
    for (float i = 0.0; i < 4.0; i++) {
        uv = fract(uv * 1.5) - 0.5;
        float d = length(uv) * exp(-length(uv0));
        vec3 col = 0.5 + 0.5 * cos(iTime + uv0.xyx + vec3(0, 2, 4));
        d = sin(d * 8.0 + iTime) / 8.0;
        d = abs(d);
        d = pow(0.01 / d, 1.2);
        finalColor += col * d;
    }
    fragColor = vec4(finalColor, 1.0);
}
`;

// --- WGSL SHADERS (WebGPU) ---

const COMPUTETOYS_SYNTHWAVE = `
@compute @workgroup_size(16, 16)
fn main_image(@builtin(global_invocation_id) id: vec3<u32>) {
    var uv = (vec2f(f32(id.x), f32(id.y)) * 2.0 - custom.resolution) / custom.resolution.y;
    
    var col = vec3f(0.0);
    
    // Ground plane
    if (uv.y < -0.1) {
        // Perspective projection
        let z = 1.0 / abs(uv.y + 0.1);
        let x = uv.x * z;
        
        // Moving grid
        let gridX = fract(x * 5.0);
        let gridZ = fract(z * 5.0 - custom.time * 2.0);
        
        let lineX = smoothstep(0.9, 1.0, gridX) + smoothstep(0.1, 0.0, gridX);
        let lineZ = smoothstep(0.9, 1.0, gridZ) + smoothstep(0.1, 0.0, gridZ);
        
        let grid = max(lineX, lineZ);
        
        // Distance fade
        let fade = exp(-z * 0.2);
        
        col = vec3f(1.0, 0.0, 1.0) * grid * fade; // Neon pink grid
    } else {
        // Sky / Sun
        let sunDist = length(uv - vec2f(0.0, 0.3));
        if (sunDist < 0.4) {
            // Sun stripes
            let stripe = fract(uv.y * 20.0 - custom.time);
            if (stripe > 0.3 || uv.y > 0.3) {
                // Gradient sun
                col = mix(vec3f(1.0, 0.0, 0.5), vec3f(1.0, 0.8, 0.0), (uv.y + 0.1) / 0.4);
            }
        } else {
            // Sky glow
            let glow = 0.1 / (sunDist + 0.1);
            col = vec3f(0.2, 0.0, 0.4) * glow;
        }
    }
    
    textureStore(screen, id.xy, vec4f(col, 1.0));
}
`;

const COMPUTETOYS_KISHIMISU = `
fn palette(t: f32) -> vec3f {
    let a = vec3f(0.5, 0.5, 0.5);
    let b = vec3f(0.5, 0.5, 0.5);
    let c = vec3f(1.0, 1.0, 1.0);
    let d = vec3f(0.263, 0.416, 0.557);
    return a + b * cos(6.28318 * (c * t + d));
}

@compute @workgroup_size(16, 16)
fn main_image(@builtin(global_invocation_id) id: vec3<u32>) {
    var uv = (vec2f(f32(id.x), f32(id.y)) * 2.0 - custom.resolution) / custom.resolution.y;
    let uv0 = uv;
    var finalColor = vec3f(0.0);
    
    for(var i: f32 = 0.0; i < 4.0; i += 1.0) {
        uv = fract(uv * 1.5) - 0.5;
        var d = length(uv) * exp(-length(uv0));
        let col = palette(length(uv0) + i * 0.4 + custom.time * 0.4);
        
        d = sin(d * 8.0 + custom.time) / 8.0;
        d = abs(d);
        d = pow(0.01 / d, 1.2);
        
        finalColor += col * d;
    }
    
    textureStore(screen, id.xy, vec4f(finalColor, 1.0));
}
`;

const COMPUTETOYS_RAYMARCH = `
fn rot(a: f32) -> mat2x2f {
    let s = sin(a);
    let c = cos(a);
    return mat2x2f(c, -s, s, c);
}

fn map(p: vec3f, time: f32) -> f32 {
    var q = p;
    
    // Rotating the world
    let r1 = rot(time * 0.5);
    q = vec3f(r1[0][0]*q.x + r1[1][0]*q.z, q.y, r1[0][1]*q.x + r1[1][1]*q.z);
    
    let r2 = rot(time * 0.3);
    q = vec3f(q.x, r2[0][0]*q.y + r2[1][0]*q.z, r2[0][1]*q.y + r2[1][1]*q.z);
    
    // Box SDF
    let b = vec3f(0.6, 0.6, 0.6);
    let d = abs(q) - b;
    let box = length(max(d, vec3f(0.0))) + min(max(d.x, max(d.y, d.z)), 0.0) - 0.1;
    
    // Sphere SDF
    let sphere = length(p) - 0.8;
    
    // Morph between box and sphere
    let morph = sin(time) * 0.5 + 0.5;
    return mix(box, sphere, morph);
}

fn getNormal(p: vec3f, time: f32) -> vec3f {
    let e = vec2f(0.001, 0.0);
    let d = map(p, time);
    let n = d - vec3f(
        map(p - e.xyy, time),
        map(p - e.yxy, time),
        map(p - e.yyx, time)
    );
    return normalize(n);
}

@compute @workgroup_size(16, 16)
fn main_image(@builtin(global_invocation_id) id: vec3<u32>) {
    var uv = (vec2f(f32(id.x), f32(id.y)) * 2.0 - custom.resolution) / custom.resolution.y;
    
    var ro = vec3f(0.0, 0.0, -3.0);
    var rd = normalize(vec3f(uv, 1.0));
    
    var t = 0.0;
    var d = 0.0;
    
    // Raymarching
    for(var i = 0u; i < 80u; i++) {
        let p = ro + rd * t;
        d = map(p, custom.time);
        if(d < 0.001 || t > 10.0) { break; }
        t += d;
    }
    
    var col = vec3f(0.05, 0.05, 0.1); // Dark background
    
    if(d < 0.001) {
        let p = ro + rd * t;
        let n = getNormal(p, custom.time);
        let light = normalize(vec3f(1.0, 1.0, -1.0));
        let diff = max(dot(n, light), 0.1);
        col = vec3f(0.2, 0.5, 0.8) * diff; // Blueish object
        
        // Specular
        let refl = reflect(-light, n);
        let spec = pow(max(dot(refl, -rd), 0.0), 32.0);
        col += vec3f(1.0) * spec;
    }
    
    // Add some fog
    col = mix(col, vec3f(0.05, 0.05, 0.1), 1.0 - exp(-0.1 * t));
    
    textureStore(screen, id.xy, vec4f(col, 1.0));
}
`;

class Showcase23Engine extends SmallWorld {
  public api: string;

  constructor(container: HTMLElement, api: string) {
    console.log("[Showcase23] Engine Constructor. API:", api);
    super({
      canvasId: container.id,
      rendererType: api === "webgl2" ? RendererType.WEB_GL2 : RendererType.WEB_GPU,
    });
    this.api = api;
  }

  protected async setupScene(): Promise<void> {
    console.log("[Showcase23] setupScene starting...");
    // Setup Camera
    this.camera.position.set(0, 0, 5);
    this.camera.setStrategy(CameraStrategyType.HYBRID_SYNC);
    this.camera.addBehavior(new OrbitController());

    // Basic Light
    const dirLight = new DirectionalLight(new Color(1, 1, 1), 1.0);
    dirLight.direction.set(-1, -1, -1);
    this.scene.add(dirLight);

    // Build the Gallery Billboards based on API
    console.log("[Showcase23] Building gallery for API:", this.api);
    if (this.api === "webgl2") {
      this.buildWebGL2Gallery();
    } else {
      this.buildWebGPUGallery();
    }
  }

  private buildWebGL2Gallery() {
    const shadertoyMat1 = new CustomShaderMaterial(
      new ShadertoyImporter().parse(SHADERTOY_STAR_NEST),
    );
    const sandboxMat = new CustomShaderMaterial(
      new GLSLSandboxImporter().parse(GLSLSANDBOX_PLASMA),
    );
    const shadertoyMat2 = new CustomShaderMaterial(
      new ShadertoyImporter().parse(SHADERTOY_FRACTAL),
    );

    shadertoyMat1.backfaceCulling = false;
    sandboxMat.backfaceCulling = false;
    shadertoyMat2.backfaceCulling = false;

    this.createScreen(-4.5, Math.PI / 6, shadertoyMat1);
    this.createScreen(0, 0, sandboxMat);
    this.createScreen(4.5, -Math.PI / 6, shadertoyMat2);
  }

  private buildWebGPUGallery() {
    const wMat1 = new CustomShaderMaterial(new ComputeToysImporter().parse(COMPUTETOYS_SYNTHWAVE));
    const wMat2 = new CustomShaderMaterial(new ComputeToysImporter().parse(COMPUTETOYS_KISHIMISU));
    const wMat3 = new CustomShaderMaterial(new ComputeToysImporter().parse(COMPUTETOYS_RAYMARCH));

    wMat1.backfaceCulling = false;
    wMat2.backfaceCulling = false;
    wMat3.backfaceCulling = false;

    this.createScreen(-4.5, Math.PI / 6, wMat1);
    this.createScreen(0, 0, wMat2);
    this.createScreen(4.5, -Math.PI / 6, wMat3);
  }

  private createScreen(xOffset: number, yRotation: number, material: CustomShaderMaterial) {
    console.log(`[Showcase23] createScreen at x=${xOffset}, rot=${yRotation}`);
    const screen = new Object3D(`screen_${xOffset}`);
    screen.geometry = new Plane({
      width: 4,
      height: 3,
      widthSegments: 1,
      heightSegments: 1,
    }).getGeometryData();
    screen.material = material;
    screen.position.set(xOffset, 0, xOffset === 0 ? -1 : 0);
    screen.rotation.set(0, yRotation, 0); // Already upright
    screen.addBehavior(new ExternalShaderUniformBehavior(800, 600));
    this.scene.add(screen);
  }

  protected update(): void {
    // Engine base update takes care of scene and behaviors
  }
}

async function init() {
  console.log("[Showcase23] init called.");
  const container = document.getElementById("container") as HTMLElement;
  container.innerHTML = '<canvas id="canvas23"></canvas>';
  console.log("[Showcase23] canvas appended.");

  const params = new URLSearchParams(window.location.search);
  const api = params.get("api") || "off";
  console.log("[Showcase23] URL api parameter:", api);

  if (api === "off") {
    return; // Wait for UI toggle
  }

  try {
    console.log("[Showcase23] Instantiating Showcase23Engine...");
    const engine = new Showcase23Engine(document.getElementById("canvas23") as HTMLElement, api);
    console.log("[Showcase23] Starting engine...");
    await engine.start();
    console.log("[Showcase23] Engine started successfully.");
  } catch (err) {
    console.error("[Showcase23] Engine crashed:", err);
  }
}

init().catch(console.error);
