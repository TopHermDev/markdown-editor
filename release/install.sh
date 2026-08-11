#!/bin/bash
set -e
BINARY="/usr/local/bin/markflow"
ICON="/usr/share/icons/hicolor/256x256/apps/markflow.png"
DESKTOP="/usr/local/share/applications/markflow.desktop"
echo "Installing MarkFlow..."
install -Dm755 markflow "$BINARY"
install -Dm644 icons/256x256.png "$ICON"
cat > "$DESKTOP" << EOF
[Desktop Entry]
Type=Application
Name=MarkFlow
Exec=$BINARY
Icon=markflow
Categories=TextEditor;Utility;
Terminal=false
StartupNotify=true
EOF
echo "Installed to $BINARY — run: markflow"
