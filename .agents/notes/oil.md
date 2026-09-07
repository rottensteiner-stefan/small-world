# Pfützen-/Öl-Shader – Recherchenotizen

Zusammenfassung externer Recherche zu physikalisch plausiblen Pfützen-Shadern (Unreal Engine 5, Unity, Godot 4). Dient als Referenz für die Weiterentwicklung der Ölpfütze im "And Now?"-Diorama (unter dem Fass).

## 1. Kern-PBR-Werte für Wasser/Öl-Oberflächen

- **Base Color / Albedo:** fast schwarz oder sehr dunkles Braun/Grau. Reine Flüssigkeit hat keine Eigenfarbe, sie spiegelt nur die Umgebung oder lässt den Untergrund durchscheinen.
- **Metallic:** 0.0 (Dielektrikum).
- **Roughness:** 0.0–0.05 für eine perfekt glatte, spiegelnde Oberfläche. Das ist der wichtigste Einzelwert für den "nassen" Look.
- **Specular:** ~0.25, entspricht dem Brechungsindex von Wasser (IOR ≈ 1.333).

## 2. Die "Geheimzutaten" für den überzeugenden Look

- **Rand-Blending:** Pfütze darf nicht hart aufhören. Normal-Map des Untergrunds wird zum Rand hin per Lerp sanft auf eine flache Normale (0,0,1) geblendet.
- **Trübung/Dreckeffekt:** leichte Murkiness per Tiefenberechnung (Depth Fade / Pixel Depth Offset) – je tiefer die Pfütze, desto weniger sieht man den Boden darunter.
- **Wellen/Ripples:** zwei gegeneinander verschobene, feine Normal-Maps (Panner/Scrolling) für organische Bewegung; optional Flipbook oder Sinus-Wellen für Regenringe.
- **Nass-Zone um die Pfütze:** Roughness des umgebenden Bodens absenken + Albedo abdunkeln kurz bevor die eigentliche Wasserfläche beginnt – simuliert den feuchten Rand.

## 3. Engine-spezifische Umsetzung (Referenz, nicht direkt auf Small World anwendbar)

| Engine | Platzierung | Kernfeature |
|---|---|---|
| Unreal Engine 5 | Deferred Decal (Translucent) oder Single Layer Water | SSR/Wasserbrechung, Opacity stanzt die Pfützenform aus |
| Unity (URP/HDRP) | Decal Shader Graph | Screen Space Reflection im HDRP für Echtzeitspiegelung |
| Godot 4 | Spatial-Material (Vertex-Painting) oder Decal-Node | GDShader mit `render_mode blend_mix`, projiziert direkt auf beliebigen Untergrund |

### Godot Decal-Shader – Kernlogik (zur Inspiration)

```glsl
shader_type decal;
render_mode blend_mix;

uniform sampler2D puddle_shape : hint_default_white;
uniform float wet_edge_width : hint_range(0.0, 0.5) = 0.15;
uniform vec4 puddle_color : source_color = vec4(0.02, 0.02, 0.02, 1.0);
uniform sampler2D wave_noise : hint_normal, filter_linear_mipmap;
uniform vec2 wave_speed_1 = vec2(0.03, 0.02);
uniform vec2 wave_speed_2 = vec2(-0.02, 0.04);
uniform float wave_strength : hint_range(0.0, 0.3) = 0.04;

void fragment() {
    float mask = texture(puddle_shape, UV).r;
    float water_zone = smoothstep(0.5, 0.55, mask);
    float wet_zone = smoothstep(0.5 - wet_edge_width, 0.5, mask);

    vec3 wave1 = texture(wave_noise, UV + TIME * wave_speed_1).rgb * 2.0 - 1.0;
    vec3 wave2 = texture(wave_noise, UV + TIME * wave_speed_2).rgb * 2.0 - 1.0;
    vec3 combined_waves = normalize(wave1 + wave2) * wave_strength;

    ALBEDO = puddle_color.rgb;
    ALPHA = mix(wet_zone * 0.4, puddle_color.a, water_zone);
    ROUGHNESS = mix(0.15, 0.01, water_zone);

    vec3 water_normal = normalize(vec3(0.0, 0.0, 1.0) + combined_waves);
    NORMAL_MAP = water_normal * 0.5 + 0.5;
    NORMAL_MAP_ALPHA = water_zone;
    SPECULAR = 0.25;
}
```

## 4. Dynamisches Wachsen der Pfütze (Regen-Kopplung)

Prinzip: Der `smoothstep`-Grenzwert der Maske wird über einen globalen Parameter verschoben.

- Wert 1.0 (trocken) → Maske komplett weggeschnitten, keine Pfütze.
- Wert 0.6 (leichter Regen) → nur tiefste Maskenstellen werden zu Wasser.
- Wert 0.1 (Starkregen) → fast die gesamte Maske geflutet.

**Godot:** `RenderingServer.global_shader_parameter_set("global_rain_intensity", value)` steuert alle Decals im Level gleichzeitig; Interpolation via `move_toward` für organisches Auffüllen.

**Unreal:** Material Parameter Collection (MPC) mit Scalar Parameter `RainIntensity`, gesetzt über `Set Scalar Parameter Value` + `FInterp To` für sanften Übergang.

## 5. Relevanz für Small World / OilSlickMaterial

Diese Recherche ist eine externe Inspirationsquelle, kein 1:1-Implementierungsplan. Für die eigentliche Umsetzung in Small World gilt weiterhin [[project_oil_slick_material]] (PhongMaterial-Komposition, 3-Renderer-Support, LIGHT_CALC/WGSL_LIGHTING-Fallstricke) sowie [[project_showcase12_oil_puddle]] (bestehendes, bereits implementiertes Feature). Übertragbare Ideen für eine mögliche Weiterentwicklung:

- Roughness/Specular-Werte als Ausgangspunkt für Feintuning der bestehenden Öl-Materialeigenschaften.
- Rand-Blending-Ansatz (Normal-Map sanft auf flach blenden) als Lösung für harte Pfützenkanten.
- Zwei gegenläufige, scrollende Normal-Maps als einfache Wellen-Alternative zu bestehenden Ansätzen.
- Dynamisches Wachsen über einen globalen Parameter ist für die aktuelle statische Ölpfütze vermutlich Overkill, aber als Konzept notiert falls später eine Wetter-/Zustandssteuerung gewünscht wird.
