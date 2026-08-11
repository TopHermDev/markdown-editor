#!/bin/bash
# Install markdown-editor on any Linux without makepkg
set -e

BINARY="/usr/local/bin/markdown-editor"
ICON="/usr/share/icons/hicolor/256x256/apps/markdown-editor.png"
DESKTOP="/usr/local/share/applications/markdown-editor.desktop"

echo "Installing Markdown Editor..."
install -Dm755 markdown-editor "$BINARY"
install -Dm644 icons/256x256.png "$ICON"
cat > "$DESKTOP" << EOF
[Desktop Entry]
Type=Application
Name=Markdown Editor
Exec=$BINARY
Icon=markdown-editor
Categories=TextEditor;Utility;
Terminal=false
EOF
echo "Installed to $BINARY — run: markdown-editor"
