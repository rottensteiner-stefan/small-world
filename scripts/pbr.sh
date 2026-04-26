#!/bin/bash

# --- 1. PFADE RELATIV ZUM SKRIPT ERMITTELN ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- 2. LADE UMGEBUNG (.env) ---
ENV_FILE="$SCRIPT_DIR/pbr.env"
if [ -f "$ENV_FILE" ]; then
    # shellcheck disable=SC1090
    source "$ENV_FILE"
else
    MAGICK_EXE=""
    DEFAULT_PROFILE="default"
    EXPORT_SUBFOLDER="pbr_export"
    KEEP_TEMP_FILES=false
    LOG_PREFIX="[PBR-GEN]"
fi

PROFILE_DIR="$SCRIPT_DIR/pbr.profiles"
SELECTED_PROFILE=$DEFAULT_PROFILE

# --- 2. FUNKTIONEN ---

check_deps() {
    if command -v magick &> /dev/null; then
        MAGICK_EXE="magick"
    elif command -v convert &> /dev/null; then
        MAGICK_EXE="convert"
    elif [ -n "$MAGICK_EXE" ] && command -v "$MAGICK_EXE" &> /dev/null; then
        # Behalte MAGICK_EXE falls es bereits (z.B. via .env als absoluter Pfad) gesetzt wurde
        :
    else
        echo "$LOG_PREFIX Fehler: ImageMagick (magick oder convert) nicht gefunden!"
        exit 1
    fi
    echo "$LOG_PREFIX Nutze: $MAGICK_EXE"
}

process_file() {
    local IN
    local OUT_DIR
    local BASE
    local NAME

    IN="$1"
    OUT_DIR="$2"
    BASE=$(basename -- "$IN")
    NAME="${BASE%.*}"

    echo "$LOG_PREFIX Erstelle Maps für: $BASE ..."

    # Height & Displacement
    $MAGICK_EXE "$IN" -colorspace gray -blur "$HEIGHT_BLUR" "$OUT_DIR/${NAME}_height.png"
    $MAGICK_EXE "$OUT_DIR/${NAME}_height.png" -blur "$DISP_BLUR" "$OUT_DIR/${NAME}_disp.png"

    # Normal Map
    $MAGICK_EXE "$OUT_DIR/${NAME}_height.png" \
        -define convolve:scale="$NORM_STRENGTH" \
        -bias 50% -convolve '0,-1,0,-1,0,1,0,1,0' \
        -solarize 50% -level 50%,0% \
        "$OUT_DIR/${NAME}_normal.png"

    # Specular & Roughness
    $MAGICK_EXE "$OUT_DIR/${NAME}_height.png" -sigmoidal-contrast $SPEC_CONTRAST "$OUT_DIR/${NAME}_spec.png"
    $MAGICK_EXE "$OUT_DIR/${NAME}_spec.png" -negate -gamma "$ROUGH_GAMMA" "$OUT_DIR/${NAME}_roughness.png"

    # Ambient Occlusion
    $MAGICK_EXE "$OUT_DIR/${NAME}_height.png" -negate -convolve '0,-1,0,-1,4,-1,0,-1,0' -threshold 10% -blur "$AO_FINE_BLUR" "$OUT_DIR/${NAME}_ao_f.tmp"
    $MAGICK_EXE "$OUT_DIR/${NAME}_height.png" -negate -blur "$AO_SOFT_BLUR" -level $AO_LEVEL "$OUT_DIR/${NAME}_ao_s.tmp"
    $MAGICK_EXE "$OUT_DIR/${NAME}_ao_s.tmp" "$OUT_DIR/${NAME}_ao_f.tmp" -compose multiply -composite "$OUT_DIR/${NAME}_ao.png"

    # Edge Map
    $MAGICK_EXE "$OUT_DIR/${NAME}_height.png" -edge 1 -negate -threshold "$EDGE_THRESHOLD" "$OUT_DIR/${NAME}_edge.png"

    [ "$KEEP_TEMP_FILES" = false ] && rm -f "$OUT_DIR"/*.tmp
}

# --- 3. LOGIK ---

check_deps

# Argumente
INPUT=""
OUT_ARG=""

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --in) INPUT="$2"; shift ;;
        --out) OUT_ARG="$2"; shift ;;
        --profile) SELECTED_PROFILE="$2"; shift ;;
        *) echo "Unbekannter Parameter: $1"; exit 1 ;;
    esac
    shift
done

# Lade Profil-Parameter
CONF="$PROFILE_DIR/${SELECTED_PROFILE}.conf"
if [ -f "$CONF" ]; then
    source "$CONF"
    echo "$LOG_PREFIX Profil '$SELECTED_PROFILE' aktiv."
else
    echo "$LOG_PREFIX Profil '$SELECTED_PROFILE' nicht gefunden. Nutze Defaults."
    source "$PROFILE_DIR/default.conf" 2>/dev/null
fi

# Verarbeitung starten
if [ -d "$INPUT" ]; then
    TARGET="${OUT_ARG:-$INPUT/$EXPORT_SUBFOLDER}"
    mkdir -p "$TARGET"
    for f in "$INPUT"/*.{jpg,jpeg,png,bmp,tga}; do
        [ -e "$f" ] || continue
        
        # Überspringe Dateien, die bereits Markierungen von generierten Maps haben
        if [[ "$f" =~ _(height|disp|normal|spec|roughness|ao|edge)\. ]]; then
            echo "$LOG_PREFIX Überspringe bereits generierte Map: $(basename "$f")"
            continue
        fi
        
        process_file "$f" "$TARGET"
    done
elif [ -f "$INPUT" ]; then
    TARGET="${OUT_ARG:-$(dirname "$INPUT")}"
    process_file "$INPUT" "$TARGET"
else
    echo "Fehler: Kein Input. Nutze --in [Datei/Ordner]"
    exit 1
fi

echo "$LOG_PREFIX Fertig."