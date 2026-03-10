import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// 1. Version aus package.json auslesen
const packageJsonPath = path.resolve(process.cwd(), "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const { version } = packageJson;

// 2. Datum des letzten Commits abrufen (Format: YYYY-MM-DD)
const date = execSync("git log -1 --format=%as").toString().trim();

// 3. Commits seit dem letzten Tag abrufen
let commits;
try {
  // Finde den letzten Git-Tag (z.B. v0.8.44)
  const latestTag = execSync("git describe --tags --abbrev=0").toString().trim();
  // Hole alle Commit-Nachrichten zwischen dem Tag und dem aktuellen Stand (HEAD)
  commits = execSync(`git log ${latestTag}..HEAD --pretty=format:"- %s"`)
    .toString()
    .trim();
} catch (e) {
  // Falls keine Tags existieren, nimm alle Commits (z.B. für das erste Release)
  console.warn(
    "Keine Git-Tags gefunden. Der Changelog-Eintrag wird aus allen Commits erstellt.",
  );
  commits = execSync(`git log --pretty=format:"- %s"`).toString().trim();
}

if (!commits) {
  console.log("Keine neuen Commits seit dem letzten Tag gefunden.");
  process.exit(0);
}

// 4. Duplikate bei den Commit-Nachrichten entfernen
const uniqueCommits = [...new Set(commits.split("\n"))].join("\n");

// 5. Neuen Changelog-Eintrag erstellen
const newEntry = `## [${version}] - ${date}\n${uniqueCommits}\n\n`;

// 6. Eintrag an den Anfang der CHANGELOG.md schreiben
const changelogPath = path.resolve(process.cwd(), "CHANGELOG.md");
const existingChangelog = fs.existsSync(changelogPath)
  ? fs.readFileSync(changelogPath, "utf8")
  : "# Changelog\n\nAlle nennenswerten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.\n\nDas Format basiert auf Keep a Changelog und dieses Projekt hält sich an Semantic Versioning.\n\n";
const newChangelog = existingChangelog.replace(/^# Changelog\n\n/m, `# Changelog\n\n${newEntry}`);

fs.writeFileSync(changelogPath, newChangelog);

console.log(`Changelog wurde für Version ${version} aktualisiert.`);