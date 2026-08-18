#!/bin/bash
set -e

VERSION="${1:-0.4.2}"
REPO="TopHermDev/markdown-editor"

# Default to user-local directories; use --system for system-wide install
if [[ "$*" == *"--system"* ]]; then
    BINARY="/usr/local/bin/markflow"
    DESKTOP="/usr/local/share/applications/markflow.desktop"
else
    BINARY="$HOME/.local/bin/markflow"
    DESKTOP="$HOME/.local/share/applications/markflow.desktop"
fi

ARCH=$(uname -m)
case "$ARCH" in
    x86_64|amd64)  ASSET="markflow-${VERSION}-linux-x86_64.tar.gz" ;;
    aarch64|arm64) ASSET="markflow-${VERSION}-linux-aarch64.tar.gz" ;;
    *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

echo "Installing MarkFlow v${VERSION} (${ARCH})..."

# Download tarball
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

echo "Downloading ${ASSET}..."
curl -sL "https://github.com/${REPO}/releases/download/v${VERSION}/${ASSET}" -o "${TMPDIR}/${ASSET}"

# Extract
echo "Extracting..."
tar xzf "${TMPDIR}/${ASSET}" -C "${TMPDIR}"

# Find the binary (may be named markflow or MarkFlow)
BIN=$(find "$TMPDIR" -maxdepth 1 -type f \( -name 'markflow' -o -name 'MarkFlow' \) | head -1)
if [ -z "$BIN" ]; then
    echo "Error: binary not found in archive"
    echo "Contents:"
    ls -la "$TMPDIR"
    exit 1
fi

# Install binary
echo "Installing to ${BINARY}..."
install -Dm755 "$BIN" "$BINARY"

# Create desktop entry
mkdir -p "$(dirname "$DESKTOP")"
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

# Check PATH
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]] && [[ "$BINARY" == "$HOME/.local/bin/markflow" ]]; then
    echo "NOTE: ~/.local/bin is not in your PATH."
    echo "Add this to your shell profile (~/.bashrc or ~/.zshrc):"
    echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
fi

echo "Run with: markflow"
