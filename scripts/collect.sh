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

echo "Suche nach Dateien (*.ts, *.js, *.json, *.obj, *.html) in: ${SEARCH_DIRS[*]}"

# 3. Hauptschleife über alle angegebenen Verzeichnisse
for DIR in "${SEARCH_DIRS[@]}"; do

    # Prüfen, ob das Verzeichnis existiert
    if [ ! -d "$DIR" ]; then
        echo "Warnung: Verzeichnis '$DIR' nicht gefunden. Überspringe..."
        continue
    fi

    # 4. 'find' mit logischem ODER (-o) für die Endungen
    # Korrigierte Syntax für find: -o zwischen allen -name Argumenten
    find "$DIR" -type f \( -name "*.ts" -o -name "*.js" -o -name "*.json" -o -name "*.obj" -o -name "*.html" \) | while read -r FILE_PATH; do

        echo "Verarbeite: $FILE_PATH"

        # Den Pfad relativ zum aktuellen Suchverzeichnis machen und führendes './' entfernen
        # Annahme: Das Skript wird aus dem Projekt-Root ausgeführt oder $DIR ist relativ zum Root.
        RELATIVE_PATH="${FILE_PATH#./}"

        # Den erwarteten Header generieren
        EXPECTED_HEADER="/// $RELATIVE_PATH"

        # Die erste Zeile der Quelldatei lesen
        # head -n 1 ist sicher, auch wenn die Datei leer ist
        FIRST_LINE=$(head -n 1 "$FILE_PATH" 2>/dev/null) # 2>/dev/null unterdrückt Fehler bei leeren/nicht existierenden Dateien

        # Prüfen, ob die erste Zeile bereits der erwartete Header ist
        if [[ "$FIRST_LINE" != "$EXPECTED_HEADER" ]]; then
            # Wenn nicht, füge den Header zur Ausgabedatei hinzu
            echo "$EXPECTED_HEADER" >> "$OUTPUT_FILE"
        fi

        # Den Dateiinhalt anhängen
        cat "$FILE_PATH" >> "$OUTPUT_FILE"

        # Optionale Leerzeile für bessere Trennung im Dokument
        echo "" >> "$OUTPUT_FILE"
        echo "/// EOF" >> "$OUTPUT_FILE"
    done
done

echo "----------------------------------------------------"
echo "Fertig! Alle Inhalte befinden sich in '$OUTPUT_FILE'."