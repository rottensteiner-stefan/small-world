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

// --- NEW WebGL2 SHADERS (added: comic/toon + 2 more, see docs/guides for context) ---

const SHADERTOY_TOON_CREATURE = `
// Comic-style raymarched creature: hard cel-shading bands, grazing-angle ink outline,
// halftone shadow dots and a thick panel border.
float sdSphere(vec3 p, float r) { return length(p) - r; }
float sdEllipsoid(vec3 p, vec3 r) {
    float k0 = length(p / r);
    float k1 = length(p / (r * r));
    return k0 * (k0 - 1.0) / k1;
}
float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

float map(vec3 p) {
    vec3 q = p;
    q.y -= sin(iTime * 2.0) * 0.15; // Idle bob
    float body = sdEllipsoid(q, vec3(0.9, 0.75, 1.0));
    float head = sdSphere(q - vec3(0.0, 1.0, 0.3), 0.55);
    vec3 eyeOffset = vec3(0.22, 1.1, 0.75);
    float eyeL = sdSphere(q - eyeOffset, 0.12);
    float eyeR = sdSphere(q - vec3(-eyeOffset.x, eyeOffset.y, eyeOffset.z), 0.12);
    float d = smin(body, head, 0.35);
    d = min(d, eyeL);
    d = min(d, eyeR);
    return d;
}

vec3 getNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        map(p + e.xyy) - map(p - e.xyy),
        map(p + e.yxy) - map(p - e.yxy),
        map(p + e.yyx) - map(p - e.yyx)
    ));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;

    float camAngle = iTime * 0.4;
    vec3 ro = vec3(sin(camAngle) * 4.0, 1.2, cos(camAngle) * 4.0);
    vec3 target = vec3(0.0, 0.6, 0.0);
    vec3 fwd = normalize(target - ro);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
    vec3 up = cross(fwd, right);
    vec3 rd = normalize(fwd + uv.x * right + uv.y * up);

    float t = 0.0;
    float d = 0.0;
    int hit = 0;
    for (int i = 0; i < 80; i++) {
        vec3 p = ro + rd * t;
        d = map(p);
        if (d < 0.001) { hit = 1; break; }
        t += d;
        if (t > 20.0) break;
    }

    vec3 skyTop = vec3(0.55, 0.82, 0.98);
    vec3 skyBottom = vec3(0.92, 0.96, 0.85);
    vec3 col = mix(skyBottom, skyTop, clamp(uv.y * 0.6 + 0.4, 0.0, 1.0));

    if (hit == 1) {
        vec3 p = ro + rd * t;
        vec3 n = getNormal(p);
        vec3 lightDir = normalize(vec3(0.6, 0.8, 0.4));
        float diff = max(dot(n, lightDir), 0.0);

        // Cel-shading: quantize the diffuse term into hard bands
        float bands = 4.0;
        float toon = floor(diff * bands) / bands;
        toon = toon * 0.85 + 0.15;

        vec3 base = mix(vec3(1.0, 0.75, 0.2), vec3(0.95, 0.35, 0.35), step(0.6, p.y));
        vec3 shaded = base * toon;

        // Ink outline via grazing-angle rim (classic cheap toon outline)
        float rim = 1.0 - max(dot(n, -rd), 0.0);
        float outline = smoothstep(0.55, 0.75, rim);
        shaded = mix(shaded, vec3(0.05, 0.05, 0.08), outline);

        // Comic halftone dots in the mid-tone shadow band
        vec2 dotUV = fragCoord * 0.35;
        float dotPattern = step(0.5, fract(dotUV.x)) * step(0.5, fract(dotUV.y));
        float shadowMask = smoothstep(0.35, 0.15, diff) * (1.0 - outline);
        shaded = mix(shaded, shaded * 0.75, dotPattern * shadowMask);

        col = shaded;
    }

    // Thick black panel border for that "comic panel" feel
    vec2 m = fragCoord / iResolution.xy;
    float border = 1.0 - smoothstep(0.0, 0.015, min(min(m.x, 1.0 - m.x), min(m.y, 1.0 - m.y)));
    col = mix(col, vec3(0.05), border);

    fragColor = vec4(col, 1.0);
}
`;

const SHADERTOY_VORONOI_STAINED_GLASS = `
// Stained-glass mosaic: F1/F2 voronoi with animated feature points, jewel-toned cells
// and black "lead" borders between panes.
vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453123);
}

vec3 voronoi(vec2 x) {
    vec2 n = floor(x);
    vec2 f = fract(x);

    float f1 = 8.0;
    float f2 = 8.0;
    float cellHash = 0.0;

    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 neighbor = vec2(float(i), float(j));
            vec2 point = hash2(n + neighbor);
            vec2 animated = 0.5 + 0.4 * sin(iTime * 0.35 + 6.2831 * point);
            vec2 diff = neighbor + animated - f;
            float d = length(diff);
            if (d < f1) {
                f2 = f1;
                f1 = d;
                cellHash = hash2(n + neighbor).x;
            } else if (d < f2) {
                f2 = d;
            }
        }
    }
    return vec3(f1, f2, cellHash);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    uv *= 4.0;

    vec3 v = voronoi(uv);
    float f1 = v.x;
    float f2 = v.y;
    float cellHash = v.z;

    vec3 gemColor = 0.5 + 0.5 * cos(6.2831 * cellHash + vec3(0.0, 0.6, 1.2) + 1.5);
    gemColor = mix(gemColor, vec3(1.0), 0.15);

    float glow = 1.0 - smoothstep(0.0, 0.9, f1);
    vec3 col = gemColor * (0.55 + 0.55 * glow);

    // Black lead lines at cell borders
    float edge = smoothstep(0.0, 0.06, f2 - f1);
    col = mix(vec3(0.03), col, edge);

    float vig = 1.0 - dot(uv * 0.12, uv * 0.12);
    col *= clamp(vig, 0.5, 1.0);

    fragColor = vec4(col, 1.0);
}
`;

const GLSLSANDBOX_RETRO_ASCII = `
#ifdef GL_ES
precision mediump float;
#endif

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453123);
}

// A drifting plasma-ish brightness field that the ASCII renderer "prints".
float sourceBrightness(vec2 uv) {
    vec2 p = uv * 3.0;
    float v = 0.0;
    v += sin(p.x * 1.3 + time * 0.6);
    v += sin(p.y * 1.7 - time * 0.4);
    v += sin((p.x + p.y) * 0.8 + time * 0.9);
    v += sin(length(p - vec2(sin(time * 0.3), cos(time * 0.25)) * 2.0) * 2.0 - time);
    return v * 0.25 + 0.5;
}

// Procedural "character" density mask mimicking a . : + # ascii ramp (no font texture needed).
float charMask(vec2 cellUV, float brightness) {
    vec2 c = cellUV - 0.5;
    float d = length(c);

    if (brightness < 0.15) return 0.0;
    if (brightness < 0.35) return step(d, 0.08);
    if (brightness < 0.55) return step(d, 0.16);
    if (brightness < 0.7) {
        float plus = step(abs(c.x), 0.06) + step(abs(c.y), 0.06);
        return clamp(plus, 0.0, 1.0);
    }
    if (brightness < 0.85) {
        float hashLines = step(abs(c.x), 0.06) + step(abs(c.y), 0.06)
                         + step(abs(c.x - c.y), 0.06) + step(abs(c.x + c.y), 0.06);
        return clamp(hashLines, 0.0, 1.0);
    }
    return step(max(abs(c.x), abs(c.y)), 0.42);
}

void main(void) {
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    float cellSize = 10.0;
    vec2 cellCoord = gl_FragCoord.xy / cellSize;
    vec2 cellId = floor(cellCoord);
    vec2 cellUV = fract(cellCoord);

    vec2 sampleUV = (cellId * cellSize) / resolution.xy;
    float brightness = sourceBrightness(sampleUV);
    float mask = charMask(cellUV, brightness);

    // Phosphor green terminal palette
    vec3 phosphor = vec3(0.25, 1.0, 0.35);
    vec3 col = phosphor * mask * (0.7 + 0.3 * hash(cellId + floor(time * 6.0)));

    // Scanlines
    float scan = 0.85 + 0.15 * sin(gl_FragCoord.y * 3.14159);
    col *= scan;

    // Vignette for that CRT feel
    vec2 vc = uv * 2.0 - 1.0;
    float vig = 1.0 - dot(vc * 0.5, vc * 0.5);
    col *= clamp(vig, 0.3, 1.0);

    col += phosphor * 0.02;

    gl_FragColor = vec4(col, 1.0);
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

// --- NEW WebGPU SHADERS (added: comic/toon + 2 more) ---

const COMPUTETOYS_TOON_SHAPE = `
// Comic-style raymarched toy: a spinning rounded cube with a ring, cel-shaded with
// a grazing-angle ink outline and halftone shadow dots — same recipe as the WebGL2 twin.
fn sdRoundBox(p: vec3f, b: vec3f, r: f32) -> f32 {
    let q = abs(p) - b;
    return length(max(q, vec3f(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}

fn sdTorus(p: vec3f, t: vec2f) -> f32 {
    let q = vec2f(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
}

fn sminToon(a: f32, b: f32, k: f32) -> f32 {
    let h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

fn map(p: vec3f, time: f32) -> f32 {
    var q = p;
    let spin = time * 0.6;
    let c = cos(spin);
    let s = sin(spin);
    q = vec3f(c * q.x - s * q.z, q.y, s * q.x + c * q.z);

    let box = sdRoundBox(q, vec3f(0.5, 0.5, 0.5), 0.12);
    let torus = sdTorus(q, vec2f(0.85, 0.18));
    return sminToon(box, torus, 0.25);
}

fn getNormal(p: vec3f, time: f32) -> vec3f {
    let e = vec2f(0.001, 0.0);
    return normalize(vec3f(
        map(p + e.xyy, time) - map(p - e.xyy, time),
        map(p + e.yxy, time) - map(p - e.yxy, time),
        map(p + e.yyx, time) - map(p - e.yyx, time)
    ));
}

@compute @workgroup_size(16, 16)
fn main_image(@builtin(global_invocation_id) id: vec3<u32>) {
    var uv = (vec2f(f32(id.x), f32(id.y)) * 2.0 - custom.resolution) / custom.resolution.y;

    let ro = vec3f(0.0, 0.6, -3.6);
    let lookTarget = vec3f(0.0, 0.0, 0.0);
    let fwd = normalize(lookTarget - ro);
    let right = normalize(cross(vec3f(0.0, 1.0, 0.0), fwd));
    let up = cross(fwd, right);
    let rd = normalize(fwd + uv.x * right + uv.y * up);

    var t = 0.0;
    var d = 0.0;
    var hit = false;
    for (var i = 0u; i < 90u; i++) {
        let p = ro + rd * t;
        d = map(p, custom.time);
        if (d < 0.001) { hit = true; break; }
        t += d;
        if (t > 12.0) { break; }
    }

    var col = mix(vec3f(0.92, 0.95, 0.85), vec3f(0.55, 0.8, 0.98), clamp(uv.y * 0.5 + 0.5, 0.0, 1.0));

    if (hit) {
        let p = ro + rd * t;
        let n = getNormal(p, custom.time);
        let lightDir = normalize(vec3f(0.6, 0.8, 0.3));
        let diff = max(dot(n, lightDir), 0.0);

        let bands = 4.0;
        let toon = floor(diff * bands) / bands * 0.85 + 0.15;

        var base = vec3f(1.0, 0.55, 0.25);
        base = mix(base, vec3f(0.95, 0.35, 0.4), step(0.6, n.y));
        var shaded = base * toon;

        let rim = 1.0 - max(dot(n, -rd), 0.0);
        let outline = smoothstep(0.55, 0.75, rim);
        shaded = mix(shaded, vec3f(0.05, 0.05, 0.08), outline);

        let dotUV = vec2f(f32(id.x), f32(id.y)) * 0.35;
        let dotPattern = step(0.5, fract(dotUV.x)) * step(0.5, fract(dotUV.y));
        let shadowMask = smoothstep(0.35, 0.15, diff) * (1.0 - outline);
        shaded = mix(shaded, shaded * 0.75, dotPattern * shadowMask);

        col = shaded;
    }

    let m = vec2f(f32(id.x), f32(id.y)) / custom.resolution;
    let border = 1.0 - smoothstep(0.0, 0.015, min(min(m.x, 1.0 - m.x), min(m.y, 1.0 - m.y)));
    col = mix(col, vec3f(0.05, 0.05, 0.05), border);

    textureStore(screen, id.xy, vec4f(col, 1.0));
}
`;

const COMPUTETOYS_HEX_HOLOGRAM = `
// Sci-fi hologram: hex-tiled grid (BigWings-style F1/F2 hex coords), glowing cells that
// randomly flicker awake, plus a vertical hologram scan bar.
fn vmod2(x: vec2f, y: vec2f) -> vec2f {
    return x - y * floor(x / y);
}

fn hexDist(pIn: vec2f) -> f32 {
    let p = abs(pIn);
    let c = dot(p, normalize(vec2f(1.0, 1.7320508)));
    return max(c, p.x);
}

// Returns vec4(angle, distFromEdge, cellIdX, cellIdY)
fn hexCoords(uv: vec2f) -> vec4f {
    let r = vec2f(1.0, 1.7320508);
    let h = r * 0.5;

    let a = vmod2(uv, r) - h;
    let b = vmod2(uv - h, r) - h;

    var gv: vec2f;
    if (dot(a, a) < dot(b, b)) {
        gv = a;
    } else {
        gv = b;
    }

    let ang = atan2(gv.x, gv.y);
    let distFromEdge = 0.5 - hexDist(gv);
    let cellIdxy = uv - gv;
    return vec4f(ang, distFromEdge, cellIdxy.x, cellIdxy.y);
}

fn rand(p: vec2f) -> f32 {
    return fract(sin(dot(p, vec2f(41.3, 289.1))) * 43758.5453123);
}

@compute @workgroup_size(16, 16)
fn main_image(@builtin(global_invocation_id) id: vec3<u32>) {
    var uv = (vec2f(f32(id.x), f32(id.y)) * 2.0 - custom.resolution) / custom.resolution.y;
    uv *= 6.0;

    let hc = hexCoords(uv);
    let edgeDist = hc.y;
    let cellId = vec2f(hc.z, hc.w);

    let flicker = rand(cellId);
    let scanY = f32(id.y) / custom.resolution.y;
    let sweep = smoothstep(0.0, 0.15, 1.0 - abs(fract(scanY - custom.time * 0.25) - 0.5) * 2.0);
    let cellActive = step(0.35, flicker + sweep * 0.6);

    let fillMask = smoothstep(0.05, 0.25, edgeDist) * cellActive;
    let edgeGlow = 1.0 - smoothstep(0.0, 0.08, abs(edgeDist - 0.42));

    let cyan = vec3f(0.15, 0.85, 1.0);
    let magenta = vec3f(0.85, 0.2, 1.0);
    let cellColor = mix(cyan, magenta, flicker);

    var col = vec3f(0.02, 0.03, 0.06);
    col += cellColor * fillMask * 0.5;
    col += cellColor * edgeGlow * 0.8;

    // Bright traveling hologram scan bar (sharpened cosine peak)
    let bar = pow(0.5 + 0.5 * cos(6.2831 * (scanY - custom.time * 0.15)), 40.0);
    col += vec3f(0.6, 0.9, 1.0) * bar * 0.5;

    let lines = 0.9 + 0.1 * sin(f32(id.y) * 3.14159);
    col *= lines;

    textureStore(screen, id.xy, vec4f(col, 1.0));
}
`;

const COMPUTETOYS_MATRIX_RAIN = `
// Classic falling "digital rain": procedural columns of glyph-like blocks with a bright
// white head and a fading green tail, no font texture required.
fn rand(p: vec2f) -> f32 {
    return fract(sin(dot(p, vec2f(12.9898, 78.233))) * 43758.5453123);
}

fn rand1(p: f32) -> f32 {
    return fract(sin(p * 91.345) * 47453.5453123);
}

@compute @workgroup_size(16, 16)
fn main_image(@builtin(global_invocation_id) id: vec3<u32>) {
    let res = custom.resolution;
    let fragCoord = vec2f(f32(id.x), f32(id.y));

    let cellSize = 14.0;
    let colId = floor(fragCoord.x / cellSize);

    let speed = 2.0 + rand1(colId) * 4.0;
    let colOffset = rand1(colId + 91.7) * 40.0;

    let scrollY = (fragCoord.y / cellSize) + custom.time * speed + colOffset;
    let rowId = floor(scrollY);

    let trailLen = 8.0 + rand1(colId + 3.3) * 14.0;
    let headRow = floor(custom.time * speed + colOffset + res.y / cellSize);
    let distFromHead = headRow - rowId;

    var brightness = 0.0;
    if (distFromHead >= 0.0 && distFromHead < trailLen) {
        brightness = pow(1.0 - (distFromHead / trailLen), 1.5);
    }

    let glyphSeed = rand(vec2f(colId, rowId));
    let flicker = 0.6 + 0.4 * fract(glyphSeed * 13.0 + custom.time * 3.0);

    // Fake blocky "glyph" mask inside each cell — not a real font, just a density lattice
    let cellUV = fract(vec2f(fragCoord.x / cellSize, scrollY));
    let glyphMask = step(0.15, glyphSeed) * step(abs(cellUV.x - 0.5), 0.35) * step(abs(cellUV.y - 0.5), 0.4);

    let isHead = step(0.0, distFromHead) * step(distFromHead, 1.0);
    let green = vec3f(0.1, 1.0, 0.35);
    let white = vec3f(0.85, 1.0, 0.9);
    let glyphColor = mix(green, white, isHead);

    var col = vec3f(0.0, 0.05, 0.02);
    col += glyphColor * brightness * flicker * glyphMask;

    textureStore(screen, id.xy, vec4f(col, 1.0));
}
`;

class Showcase23Engine extends SmallWorld {
  public api: string;

  constructor(container: HTMLElement, api: string) {
    super({
      canvasId: container.id,
      rendererType: api === "webgl2" ? RendererType.WEB_GL2 : RendererType.WEB_GPU,
    });
    this.api = api;
  }

  protected async setupScene(): Promise<void> {
    // Setup Camera (pulled back further than before to frame two rows of screens)
    this.camera.position.set(0, 0, 8.5);
    this.camera.setStrategy(CameraStrategyType.HYBRID_SYNC);
    this.camera.addBehavior(new OrbitController());

    // Basic Light
    const dirLight = new DirectionalLight(new Color(1, 1, 1), 1.0);
    dirLight.direction.set(-1, -1, -1);
    this.scene.add(dirLight);

    // Build the Gallery Billboards based on API

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
    const toonMat = new CustomShaderMaterial(
      new ShadertoyImporter().parse(SHADERTOY_TOON_CREATURE),
    );
    const voronoiMat = new CustomShaderMaterial(
      new ShadertoyImporter().parse(SHADERTOY_VORONOI_STAINED_GLASS),
    );
    const asciiMat = new CustomShaderMaterial(
      new GLSLSandboxImporter().parse(GLSLSANDBOX_RETRO_ASCII),
    );

    for (const mat of [shadertoyMat1, sandboxMat, shadertoyMat2, toonMat, voronoiMat, asciiMat]) {
      mat.backfaceCulling = false;
    }

    // Top row: the original gallery
    this.createScreen(-4.5, 1.8, Math.PI / 6, shadertoyMat1);
    this.createScreen(0, 1.8, 0, sandboxMat);
    this.createScreen(4.5, 1.8, -Math.PI / 6, shadertoyMat2);

    // Bottom row: comic-style toon shading + 2 more
    this.createScreen(-4.5, -1.8, Math.PI / 6, toonMat);
    this.createScreen(0, -1.8, 0, voronoiMat);
    this.createScreen(4.5, -1.8, -Math.PI / 6, asciiMat);
  }

  private buildWebGPUGallery() {
    const wMat1 = new CustomShaderMaterial(new ComputeToysImporter().parse(COMPUTETOYS_SYNTHWAVE));
    const wMat2 = new CustomShaderMaterial(new ComputeToysImporter().parse(COMPUTETOYS_KISHIMISU));
    const wMat3 = new CustomShaderMaterial(new ComputeToysImporter().parse(COMPUTETOYS_RAYMARCH));
    const toonMat = new CustomShaderMaterial(
      new ComputeToysImporter().parse(COMPUTETOYS_TOON_SHAPE),
    );
    const hexMat = new CustomShaderMaterial(
      new ComputeToysImporter().parse(COMPUTETOYS_HEX_HOLOGRAM),
    );
    const matrixMat = new CustomShaderMaterial(
      new ComputeToysImporter().parse(COMPUTETOYS_MATRIX_RAIN),
    );

    for (const mat of [wMat1, wMat2, wMat3, toonMat, hexMat, matrixMat]) {
      mat.backfaceCulling = false;
    }

    // Top row: the original gallery
    this.createScreen(-4.5, 1.8, Math.PI / 6, wMat1);
    this.createScreen(0, 1.8, 0, wMat2);
    this.createScreen(4.5, 1.8, -Math.PI / 6, wMat3);

    // Bottom row: comic-style toon shading + 2 more
    this.createScreen(-4.5, -1.8, Math.PI / 6, toonMat);
    this.createScreen(0, -1.8, 0, hexMat);
    this.createScreen(4.5, -1.8, -Math.PI / 6, matrixMat);
  }

  private createScreen(
    xOffset: number,
    yOffset: number,
    yRotation: number,
    material: CustomShaderMaterial,
  ) {
    console.log(`[Showcase23] createScreen at x=${xOffset}, y=${yOffset}, rot=${yRotation}`);
    const screen = new Object3D(`screen_${xOffset}_${yOffset}`);
    screen.geometry = new Plane({
      width: 4,
      height: 3,
      widthSegments: 1,
      heightSegments: 1,
    }).getGeometryData();
    screen.material = material;
    screen.position.set(xOffset, yOffset, xOffset === 0 ? -1 : 0);
    screen.rotation.set(0, yRotation, 0); // Already upright
    screen.addBehavior(new ExternalShaderUniformBehavior(800, 600));
    this.scene.add(screen);
  }

  protected update(): void {
    // Engine base update takes care of scene and behaviors
  }
}

async function init() {
  const container = document.getElementById("container") as HTMLElement;
  container.innerHTML = '<canvas id="canvas23"></canvas>';

  const params = new URLSearchParams(window.location.search);
  const api = params.get("api") || "off";

  if (api === "off") {
    return; // Wait for UI toggle
  }

  const engine = new Showcase23Engine(document.getElementById("canvas23") as HTMLElement, api);
  await engine.start();
}

init().catch(console.error);
