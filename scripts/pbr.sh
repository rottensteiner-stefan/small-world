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
    local IN="$1"
    local OUT_DIR="$2"
    local BASE
    local NAME
    local ORIG_EXT
    local EXT

    BASE=$(basename -- "$IN")
    ORIG_EXT="${BASE##*.}"
    NAME="${BASE%.*}"
    
    # Entferne _diffuse falls vorhanden
    NAME="${NAME%_diffuse}"

    # Bestimme das Ausgabeformat (Standard: png)
    EXT="${OUT_FORMAT:-png}"
    EXT="${EXT#.}" # Entferne evtl. führenden Punkt
    EXT=$(echo "$EXT" | tr '[:upper:]' '[:lower:]') # Immer klein

    # Bestimme die passenden ImageMagick Kompressions-Optionen
    local IM_QUALITY_OPTS=""
    if [ -n "$COMPRESSION_QUALITY" ]; then
        case "$EXT" in
            jpg|jpeg|webp) IM_QUALITY_OPTS="-quality $COMPRESSION_QUALITY" ;;
            png) IM_QUALITY_OPTS="-quality 90" ;; # Max Kompression für verlustfreies PNG
            tiff|tif) IM_QUALITY_OPTS="-compress LZW" ;;
            exr) IM_QUALITY_OPTS="-compress Zip" ;;
        esac
    else
        # Vernünftige Defaults, falls keine --quality übergeben wurde
        case "$EXT" in
            png) IM_QUALITY_OPTS="-quality 90" ;;
            tiff|tif) IM_QUALITY_OPTS="-compress LZW" ;;
        esac
    fi

    local IM_RESIZE_OPTS=""
    if [ -n "$RESIZE_VAL" ]; then
        IM_RESIZE_OPTS="-filter Lanczos -resize $RESIZE_VAL"
    fi

    echo "$LOG_PREFIX Erstelle Maps für: $BASE ..."

    local OUT_BASE="$OUT_DIR/$NAME"
    local ORIG_EXT_LOWER=$(echo "$ORIG_EXT" | tr '[:upper:]' '[:lower:]')

    # Originalbild konvertieren/skalieren, falls Format abweicht ODER Resize aktiv ist
    if [ "$ORIG_EXT_LOWER" != "$EXT" ] || [ -n "$RESIZE_VAL" ]; then
        if [ "$FORCE_OVERWRITE" = true ] || ( [ ! -f "${OUT_BASE}_diffuse.$EXT" ] && [ ! -f "${OUT_BASE}.$EXT" ] ); then
            echo "$LOG_PREFIX -> Konvertiere/Skaliere Original..."
            $MAGICK_EXE "$IN" $IM_RESIZE_OPTS $IM_QUALITY_OPTS "${OUT_BASE}.$EXT"
        fi
    fi

    # Hilfsfunktion: Prüft ob eine Datei mit einem der Suffixe existiert
    has_existing() {
        local obase="$1"
        local oext="$2"
        shift 2
        for s in "$@"; do
            if [ -f "${obase}${s}.${oext}" ]; then
                return 0
            fi
        done
        return 1
    }

    # HEIGHT
    local HEIGHT_FILE="${OUT_BASE}_height.$EXT"
    if [ "$FORCE_OVERWRITE" = true ] || ! has_existing "$OUT_BASE" "$EXT" "_height"; then
        echo "$LOG_PREFIX -> Height"
        $MAGICK_EXE "$IN" -colorspace gray $IM_RESIZE_OPTS -blur "$HEIGHT_BLUR" $IM_QUALITY_OPTS "$HEIGHT_FILE"
    else
        echo "$LOG_PREFIX -> Überspringe Height (existiert bereits)"
    fi

    # DISPLACEMENT
    local DISP_FILE="${OUT_BASE}_displacement.$EXT"
    if [ "$FORCE_OVERWRITE" = true ] || ! has_existing "$OUT_BASE" "$EXT" "_displacement" "_disp"; then
        echo "$LOG_PREFIX -> Displacement"
        $MAGICK_EXE "$HEIGHT_FILE" -blur "$DISP_BLUR" $IM_QUALITY_OPTS "$DISP_FILE"
    else
        echo "$LOG_PREFIX -> Überspringe Displacement (existiert bereits)"
    fi

    # NORMAL
    local NORM_FILE="${OUT_BASE}_normal.$EXT"
    if [ "$FORCE_OVERWRITE" = true ] || ! has_existing "$OUT_BASE" "$EXT" "_normal"; then
        echo "$LOG_PREFIX -> Normal"
        $MAGICK_EXE "$HEIGHT_FILE" \
            -define convolve:scale="$NORM_STRENGTH" \
            -bias 50% -convolve '0,-1,0,-1,0,1,0,1,0' \
            -solarize 50% -level 50%,0% \
            $IM_QUALITY_OPTS \
            "$NORM_FILE"
    else
        echo "$LOG_PREFIX -> Überspringe Normal (existiert bereits)"
    fi

    # SPECULAR
    local SPEC_FILE="${OUT_BASE}_specular.$EXT"
    if [ "$FORCE_OVERWRITE" = true ] || ! has_existing "$OUT_BASE" "$EXT" "_specular" "_spec"; then
        echo "$LOG_PREFIX -> Specular"
        $MAGICK_EXE "$HEIGHT_FILE" -sigmoidal-contrast $SPEC_CONTRAST $IM_QUALITY_OPTS "$SPEC_FILE"
    else
        echo "$LOG_PREFIX -> Überspringe Specular (existiert bereits)"
    fi

    # ROUGHNESS
    local ROUGH_FILE="${OUT_BASE}_roughness.$EXT"
    if [ "$FORCE_OVERWRITE" = true ] || ! has_existing "$OUT_BASE" "$EXT" "_roughness"; then
        echo "$LOG_PREFIX -> Roughness"
        local ACTUAL_SPEC=""
        if [ -f "$SPEC_FILE" ]; then
            ACTUAL_SPEC="$SPEC_FILE"
        elif [ -f "${OUT_BASE}_spec.$EXT" ]; then
            ACTUAL_SPEC="${OUT_BASE}_spec.$EXT"
        fi
        
        if [ -n "$ACTUAL_SPEC" ]; then
            $MAGICK_EXE "$ACTUAL_SPEC" -negate -gamma "$ROUGH_GAMMA" $IM_QUALITY_OPTS "$ROUGH_FILE"
        else
            echo "$LOG_PREFIX Warnung: Konnte Specular-Map für Roughness nicht finden!"
        fi
    else
        echo "$LOG_PREFIX -> Überspringe Roughness (existiert bereits)"
    fi

    # AMBIENT OCCLUSION
    local AO_FILE="${OUT_BASE}_ambient.$EXT"
    if [ "$FORCE_OVERWRITE" = true ] || ! has_existing "$OUT_BASE" "$EXT" "_ambient" "_ao"; then
        echo "$LOG_PREFIX -> Ambient Occlusion"
        $MAGICK_EXE "$HEIGHT_FILE" -negate -convolve '0,-1,0,-1,4,-1,0,-1,0' -threshold 10% -blur "$AO_FINE_BLUR" "${OUT_BASE}_ao_f.tmp"
        $MAGICK_EXE "$HEIGHT_FILE" -negate -blur "$AO_SOFT_BLUR" -level $AO_LEVEL "${OUT_BASE}_ao_s.tmp"
        $MAGICK_EXE "${OUT_BASE}_ao_s.tmp" "${OUT_BASE}_ao_f.tmp" -compose multiply -composite $IM_QUALITY_OPTS "$AO_FILE"
    else
        echo "$LOG_PREFIX -> Überspringe Ambient Occlusion (existiert bereits)"
    fi

    # EDGE MAP
    local EDGE_FILE="${OUT_BASE}_edge.$EXT"
    if [ "$FORCE_OVERWRITE" = true ] || ! has_existing "$OUT_BASE" "$EXT" "_edge"; then
        echo "$LOG_PREFIX -> Edge"
        $MAGICK_EXE "$HEIGHT_FILE" -edge 1 -negate -threshold "$EDGE_THRESHOLD" $IM_QUALITY_OPTS "$EDGE_FILE"
    else
        echo "$LOG_PREFIX -> Überspringe Edge (existiert bereits)"
    fi

    [ "$KEEP_TEMP_FILES" = false ] && rm -f "$OUT_DIR"/*.tmp
}

# --- 3. LOGIK ---

check_deps

# Argumente
INPUT=""
OUT_ARG=""
FORCE_OVERWRITE=false
OUT_FORMAT=""
COMPRESSION_QUALITY=""
RESIZE_VAL=""
declare -a OVERRIDES=()

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --in) INPUT="$2"; shift ;;
        --out) OUT_ARG="$2"; shift ;;
        --profile) SELECTED_PROFILE="$2"; shift ;;
        --force) FORCE_OVERWRITE=true ;;
        --out-format) OUT_FORMAT="$2"; shift ;;
        --quality) COMPRESSION_QUALITY="$2"; shift ;;
        --resize) RESIZE_VAL="$2"; shift ;;
        --set) OVERRIDES+=("$2"); shift ;;
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

# Wende manuelle Overrides an
if [ ${#OVERRIDES[@]} -gt 0 ]; then
    echo "$LOG_PREFIX Wende manuelle Parameter-Overrides an..."
    for ov in "${OVERRIDES[@]}"; do
        KEY="${ov%%=*}"
        VAL="${ov#*=}"
        eval "$KEY=\"$VAL\""
        echo "$LOG_PREFIX  -> $KEY = $VAL"
    done
fi

shopt -s nullglob nocaseglob nocasematch

# Verarbeitung starten
if [ -d "$INPUT" ]; then
    TARGET="${OUT_ARG:-$INPUT/$EXPORT_SUBFOLDER}"
    mkdir -p "$TARGET"
    for f in "$INPUT"/*.{jpg,jpeg,png,bmp,tga,gif,tiff,tif,webp,exr}; do
        [ -e "$f" ] || continue
        
        # Überspringe Dateien, die bereits Markierungen von generierten Maps haben (case insensitive)
        if [[ "$f" =~ _(height|disp|displacement|normal|spec|specular|roughness|ao|ambient|edge)\. ]]; then
            echo "$LOG_PREFIX Überspringe generierte Map als Input: $(basename "$f")"
            continue
        fi
        
        process_file "$f" "$TARGET"
    done
elif [ -f "$INPUT" ]; then
    TARGET="${OUT_ARG:-$(dirname "$INPUT")}"
    mkdir -p "$TARGET"
    process_file "$INPUT" "$TARGET"
else
    echo "Fehler: Kein Input. Nutze --in [Datei/Ordner]"
    exit 1
fi

echo "$LOG_PREFIX Fertig."