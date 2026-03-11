#!/bin/bash

# 1. Variablen-Definition
OUTPUT_FILE="collected.txt"

# Falls keine Ordner als Argument übergeben wurden, nutze das aktuelle Verzeichnis
if [ $# -eq 0 ]; then
    SEARCH_DIRS=(".")
else
    SEARCH_DIRS=("$@")
fi

# 2. Vorbereitung: Ausgabedatei leeren
> "$OUTPUT_FILE"

echo "Suche nach Dateien (*.ts, *.js, *.json) in: ${SEARCH_DIRS[*]}"

# 3. Hauptschleife über alle angegebenen Verzeichnisse
for DIR in "${SEARCH_DIRS[@]}"; do

    # Prüfen, ob das Verzeichnis existiert
    if [ ! -d "$DIR" ]; then
        echo "Warnung: Verzeichnis '$DIR' nicht gefunden. Überspringe..."
        continue
    fi

    # 4. 'find' mit logischem ODER (-o) für die Endungen
    # Die Backslashes vor den Klammern \( \) sind für die Shell notwendig
    find "$DIR" -type f \( -name "*.ts" -o -name "*.js" -o -name "*.json" \) | while read -r FILE_PATH; do

        # Den Pfad exakt im Format '# Dateipfad' schreiben
        echo "# $FILE_PATH" >> "$OUTPUT_FILE"

        # Den Dateiinhalt anhängen
        cat "$FILE_PATH" >> "$OUTPUT_FILE"

        # Optionale Leerzeile für bessere Trennung im Dokument
        echo "" >> "$OUTPUT_FILE"

        echo "Verarbeitet: $FILE_PATH"
    done
done

echo "----------------------------------------------------"
echo "Fertig! Alle Inhalte befinden sich in '$OUTPUT_FILE'."