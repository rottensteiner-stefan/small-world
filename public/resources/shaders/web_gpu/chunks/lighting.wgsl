// WGSL Lighting calculation (Logic only)

// IMPORTANT: Re-normalize interpolated normal in fragment shader!
let N = normalize(i.n);
let V = normalize(global.viewPos.xyz - i.wp); 
var fL = global.ambientColor.xyz; 
var spec = vec3f(0.0);

// Directional Light
let L_dir = normalize(global.dirLightDir.xyz); 
let diff_dir = max(dot(N, L_dir), 0.0); 
fL += diff_dir * global.dirLightColor.xyz;
if (obj.shininess > 0.0 && diff_dir > 0.0) { 
    spec += pow(max(dot(V, reflect(-L_dir, N)), 0.0), obj.shininess) * global.dirLightColor.xyz; 
}

// Point Lights
for(var j=0u; j<u32(global.numPointLights); j++) {
  let lVec = pLights[j].pos.xyz - i.wp; 
  let d = length(lVec); 
  
  let lDist = max(pLights[j].pos.w, 0.001);
  let decay = pLights[j].col.w;
  
  let distFalloff = 1.0 / max(d * d, 0.01);
  let distRatio = d / lDist;
  let distRatio4 = distRatio * distRatio * distRatio * distRatio;
  let window = clamp(1.0 - distRatio4, 0.0, 1.0);
  let cutoff = window * window;
  
  var atten = clamp(1.0 - d / lDist, 0.0, 1.0);
  if (decay > 0.0) {
      atten = distFalloff * cutoff;
  }
  
  if (atten > 0.0) {
      let L = lVec/max(d, 0.0001);
      let diff = max(dot(N, L), 0.0); 
      fL += diff * pLights[j].col.xyz * atten;
      if (obj.shininess > 0.0 && diff > 0.0) { 
        spec += pow(max(dot(V, reflect(-L, N)), 0.0), obj.shininess) * pLights[j].col.xyz * atten; 
      }
  }
}

// Spot Lights
for(var j=0u; j<u32(global.numSpotLights); j++) {
  let lVec = sLights[j].pos.xyz - i.wp; 
  let d = length(lVec); 
  let L = lVec/d; 
  let S = normalize(sLights[j].dir.xyz); 
  let theta = dot(-L, S);
  if(theta > sLights[j].params.x) {
    let sEff = smoothstep(sLights[j].params.x, sLights[j].params.y, theta);
    let atten = 1.0 / (1.0 + 0.1*d + 0.01*d*d); 
    let diff = max(dot(N, L), 0.0); 
    fL += diff * sLights[j].col.xyz * atten * sEff;
    if (obj.shininess > 0.0 && diff > 0.0) { 
        spec += pow(max(dot(V, reflect(-L, N)), 0.0), obj.shininess) * sLights[j].col.xyz * atten * sEff; 
    }
  }
}

// Area Lights
for(var j=0u; j<u32(global.numAreaLights); j++) {
    let L_center = aLights[j].pos.xyz;
    let L_normal = normalize(aLights[j].normal.xyz);
    let dirFromLight = i.wp - L_center;
    if(dot(dirFromLight, L_normal) < 0.0) { continue; }

    let L_right = normalize(aLights[j].right.xyz);
    let L_up = normalize(aLights[j].up.xyz);
    let size = aLights[j].size.xy;

    let projX = clamp(dot(dirFromLight, L_right), -size.x, size.x);
    let projY = clamp(dot(dirFromLight, L_up), -size.y, size.y);

    let closestPoint = L_center + L_right * projX + L_up * projY;
    let lightVec = closestPoint - i.wp;
    let dist = length(lightVec);
    let L = lightVec / (dist + 0.0001);

    let atten = 1.0 / (1.0 + 0.1*dist + 0.01*dist*dist);
    let diff = max(dot(N, L), 0.0);

    fL += diff * aLights[j].col.xyz * atten;
    if (obj.shininess > 0.0 && diff > 0.0) {
        spec += pow(max(dot(V, reflect(-L, N)), 0.0), obj.shininess) * aLights[j].col.xyz * atten;
    }
}
