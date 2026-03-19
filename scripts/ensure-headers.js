import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module Workaround für __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Projekt-Root (angenommen scripts/ liegt im Root)
const projectRoot = path.resolve(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });

  return arrayOfFiles;
}

console.log(`Scanne ${srcDir}...`);

const files = getAllFiles(srcDir).filter(f => f.endsWith('.ts'));

let changedCount = 0;

files.forEach(filePath => {
  // Relativer Pfad für den Header (z.B. src/core/Scene.ts)
  const relativePath = path.relative(projectRoot, filePath);
  // Windows Backslashes zu Forward Slashes konvertieren
  const normalizedPath = relativePath.split(path.sep).join('/');
  
  const header = `/// ${normalizedPath}`;
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  let newContent = "";
  let needsUpdate = false;

  // Prüfen, ob die erste Zeile schon ein Pfad-Kommentar ist (beginnt mit /// src/)
  if (lines[0].startsWith('/// src/')) {
    if (lines[0] !== header) {
      // Header ist da, aber falsch -> Korrigieren
      lines[0] = header;
      newContent = lines.join('\n');
      needsUpdate = true;
    }
  } else {
    // Kein Header vorhanden -> Hinzufügen
    newContent = header + '\n' + content;
    needsUpdate = true;
  }

  if (needsUpdate) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`Updated: ${normalizedPath}`);
    changedCount++;
  }
});

console.log(`Fertig. ${changedCount} Dateien aktualisiert.`);
