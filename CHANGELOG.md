# Changelog

## [0.8.45] - 2024-05-24

### Hinzugefügt (Added)
- Spotlight-Unterstützung zum `WebGPURenderer` hinzugefügt.
- WGSL-Shader um die Berechnungslogik für Spotlights erweitert.

### Geändert (Changed)
- Uniform-Buffer-Layout erweitert, um Spotlight-Daten aufzunehmen.
- Phong-Material-Eigenschaften (`shininess`, `specularColor`) werden nun im Shader korrekt berücksichtigt.
- Licht-Verarbeitung in der `render`-Methode zur Extraktion von bis zu 4 Spotlights aus der Szene angepasst.

### Build
- NPM-Abhängigkeiten auf die neuesten Versionen aktualisiert.