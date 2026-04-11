let V = normalize(u.cam.xyz - i.wp); var fL = u.amb.xyz; var spec = vec3f(0.0);
let N = normalize(i.n); 
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
