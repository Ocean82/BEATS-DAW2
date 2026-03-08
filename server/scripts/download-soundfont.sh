#!/bin/bash
# Download FluidR3 SoundFont for MIDI rendering

SOUNDFONT_DIR="$(dirname "$0")/../soundfonts"
mkdir -p "$SOUNDFONT_DIR"

SOUNDFONT_URL="https://github.com/FluidSynth/fluid-soundfont/raw/main/FluidR3_GM.sf2"
ALT_URL="https://github.com/michaeljonesons/midi-soundfonts/raw/master/FluidR3_GM.sf2"

echo "Downloading FluidR3 SoundFont..."
echo "This is ~10MB, please wait..."

if command -v curl &> /dev/null; then
    curl -L -o "$SOUNDFONT_DIR/FluidR3_GM.sf2" "$SOUNDFONT_URL" --progress-bar || \
    curl -L -o "$SOUNDFONT_DIR/FluidR3_GM.sf2" "$ALT_URL" --progress-bar
elif command -v wget &> /dev/null; then
    wget -O "$SOUNDFONT_DIR/FluidR3_GM.sf2" "$SOUNDFONT_URL" || \
    wget -O "$SOUNDFONT_DIR/FluidR3_GM.sf2" "$ALT_URL"
else
    echo "Error: curl or wget required"
    exit 1
fi

if [ -f "$SOUNDFONT_DIR/FluidR3_GM.sf2" ]; then
    echo "SoundFont downloaded successfully!"
    echo "Location: $SOUNDFONT_DIR/FluidR3_GM.sf2"
else
    echo "Failed to download SoundFont"
    exit 1
fi
