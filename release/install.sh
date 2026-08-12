#!/bin/bash
set -e
BINARY="/usr/local/bin/markflow"
DESKTOP="/usr/local/share/applications/markflow.desktop"

echo "Installing MarkFlow..."

# Install binary
install -Dm755 markflow "$BINARY"

# Create desktop entry (no external icon needed — uses text icon)
cat > "$DESKTOP" << EOF
[Desktop Entry]
Type=Application
Name=MarkFlow
Exec=$BINARY
Categories=TextEditor;Utility;
MimeType=text/markdown;text/x-markdown;
Comment=Lightweight markdown reader and editor
Terminal=false
StartupNotify=true
EOF

echo "Installed to $BINARY"
echo "Run with: markflow"
