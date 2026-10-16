#!/bin/bash
set -e

REPO="TopHermDev/markdown-editor"
SYSTEM_INSTALL=false
UNINSTALL=false
VERSION=""

for arg in "$@"; do
    case "$arg" in
        --system) SYSTEM_INSTALL=true ;;
        --uninstall) UNINSTALL=true ;;
        -*) echo "Unknown option: $arg"; exit 1 ;;
        *) VERSION="$arg" ;;
    esac
done

if [ "$SYSTEM_INSTALL" = true ]; then
    BINARY="/usr/local/bin/markflow"
    DESKTOP="/usr/local/share/applications/markflow.desktop"
else
    BINARY="$HOME/.local/bin/markflow"
    DESKTOP="$HOME/.local/share/applications/markflow.desktop"
fi
VERSION_FILE="${BINARY}.version"

# --- Uninstall ----------------------------------------------------------
if [ "$UNINSTALL" = true ]; then
    REMOVED=false
    for f in "$BINARY" "$VERSION_FILE" "$DESKTOP"; do
        if [ -e "$f" ]; then rm -f "$f"; echo "Removed $f"; REMOVED=true; fi
    done
    if [ "$REMOVED" = false ]; then
        echo "Nothing to uninstall: no markflow binary or desktop entry found."
    else
        echo "MarkFlow uninstalled."
    fi
    exit 0
fi

# --- Resolve version: argument, else latest GitHub release ---------------
if [ -z "$VERSION" ]; then
    VERSION=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
        | grep -oE '"tag_name": *"v[0-9][0-9.]*"' | grep -oE '[0-9][0-9.]*' || true)
    # Fallback if the API is unreachable or rate-limited
    VERSION="${VERSION:-0.7.0}"
fi

# Releases ship an x86_64 AppImage only — no Linux arm64 build
ARCH=$(uname -m)
case "$ARCH" in
    x86_64|amd64) ASSET="MarkFlow_${VERSION}_amd64.AppImage" ;;
    *)
        echo "No Linux ${ARCH} build is published (releases are x86_64 only)."
        echo "Build from source instead: https://github.com/${REPO}#build-from-source"
        exit 1
        ;;
esac

# Check for an existing installation (tracked via a sidecar .version file;
# the app itself has no --version flag)
if [ -f "$BINARY" ]; then
    INSTALLED_VER=$(cat "$VERSION_FILE" 2>/dev/null || echo "unknown")
    echo "Found existing MarkFlow v${INSTALLED_VER} at ${BINARY}"
    if [ "$INSTALLED_VER" = "$VERSION" ]; then
        echo "Already up to date (v${VERSION})."
        exit 0
    fi
    echo "Updating to v${VERSION}..."
else
    echo "Installing MarkFlow v${VERSION} (${ARCH})..."
fi

# Download the AppImage
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

URL="https://github.com/${REPO}/releases/download/v${VERSION}/${ASSET}"
echo "Downloading ${ASSET}..."
if ! curl -fL "$URL" -o "${TMPDIR}/${ASSET}"; then
    echo "Error: could not download ${URL}"
    echo "Check that release v${VERSION} exists: https://github.com/${REPO}/releases"
    exit 1
fi

# Install
echo "Installing to ${BINARY}..."
install -Dm755 "${TMPDIR}/${ASSET}" "$BINARY"
echo "$VERSION" > "$VERSION_FILE"

# Desktop entry
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

echo ""
echo "MarkFlow v${VERSION} installed to ${BINARY}"

# Check PATH
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]] && [[ "$BINARY" == "$HOME/.local/bin/markflow" ]]; then
    echo ""
    echo "NOTE: ~/.local/bin is not in your PATH."
    echo "Add this to your shell profile (~/.bashrc or ~/.zshrc):"
    echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
fi

echo ""
echo "Run with: markflow"
echo "Uninstall with: bash install.sh --uninstall"
