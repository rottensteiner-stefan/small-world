import fs from 'fs';

let content = fs.readFileSync('src/tools/IXtractor.ts', 'utf8');

content = content.replace(/function setActiveTool\(tool: string\) \{/g, 'function setActiveTool(tool: string): void {');
content = content.replace(/function applyZoom\(([^)]*)\) \{/g, 'function applyZoom($1): void {');
content = content.replace(/function loadFile\(file: File\) \{/g, 'function loadFile(file: File): void {');
content = content.replace(/reader\.onload = \(e\) => \{/g, 'reader.onload = (e): void => {');
content = content.replace(/img\.onload = \(\) => \{/g, 'img.onload = (): void => {');
content = content.replace(/function updateSelectionBox\(\) \{/g, 'function updateSelectionBox(): void {');
content = content.replace(/function clearSelection\(\) \{/g, 'function clearSelection(): void {');
content = content.replace(/function captureCrop\(\) \{/g, 'function captureCrop(): void {');
content = content.replace(/function updatePropertiesBox\(\) \{/g, 'function updatePropertiesBox(): void {');
content = content.replace(/function startInteraction\(e: MouseEvent\) \{/g, 'function startInteraction(e: MouseEvent): void {');
content = content.replace(/function updateInteraction\(e: MouseEvent\) \{/g, 'function updateInteraction(e: MouseEvent): void {');
content = content.replace(/function endInteraction\(\) \{/g, 'function endInteraction(): void {');
content = content.replace(/function generateOutput\(\) \{/g, 'function generateOutput(): void {');
content = content.replace(/function downloadAsset\(\) \{/g, 'function downloadAsset(): void {');

fs.writeFileSync('src/tools/IXtractor.ts', content, 'utf8');

let pContent = fs.readFileSync('src/tools/Pixler.ts', 'utf8');

pContent = pContent.replace(/export class Pixler (\{[^]*?\})/, (match) => match); // just to match

pContent = pContent.replace(/get width\(\) \{/g, 'public get width(): number {');
pContent = pContent.replace(/set width\(val: number\) \{/g, 'public set width(val: number) {');
pContent = pContent.replace(/get height\(\) \{/g, 'public get height(): number {');
pContent = pContent.replace(/set height\(val: number\) \{/g, 'public set height(val: number) {');
pContent = pContent.replace(/get gridX\(\) \{/g, 'public get gridX(): number {');
pContent = pContent.replace(/set gridX\(val: number\) \{/g, 'public set gridX(val: number) {');
pContent = pContent.replace(/get gridY\(\) \{/g, 'public get gridY(): number {');
pContent = pContent.replace(/set gridY\(val: number\) \{/g, 'public set gridY(val: number) {');

pContent = pContent.replace(/function hexToRgb\(hex: string\) \{/g, 'function hexToRgb(hex: string): {r: number, g: number, b: number} | null {');
pContent = pContent.replace(/function saveColor\(\) \{/g, 'function saveColor(): void {');
pContent = pContent.replace(/function populateColorSelect\(\) \{/g, 'function populateColorSelect(): void {');
pContent = pContent.replace(/function clearCanvas\(\) \{/g, 'function clearCanvas(): void {');
pContent = pContent.replace(/function getSelectedColor\(\) \{/g, 'function getSelectedColor(): string {');
pContent = pContent.replace(/function fillBucket\(startX: number, startY: number\) \{/g, 'function fillBucket(startX: number, startY: number): void {');
pContent = pContent.replace(/function renderCanvas\(\) \{/g, 'function renderCanvas(): void {');
pContent = pContent.replace(/function generateExportString\(\) \{/g, 'function generateExportString(): void {');

fs.writeFileSync('src/tools/Pixler.ts', pContent, 'utf8');

