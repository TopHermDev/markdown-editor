<p align="center">
  <img src="src/icons/icon.png" alt="MarkFlow Logo" width="128">
</p>

<h1 align="center">MarkFlow</h1>

<p align="center">
  <strong>A lightweight, fast markdown editor built with Tauri</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#install">Install</a> •
  <a href="#build-from-source">Build</a> •
  <a href="#keyboard-shortcuts">Shortcuts</a> •
  <a href="#license">License</a>
</p>

---

MarkFlow is a minimal, performant markdown editor that runs natively on Linux, macOS, and Windows. Built with the [Tauri](https://tauri.app) framework, it pairs a lightweight Rust backend with a fast vanilla-JS frontend for an instant editing experience.

<!-- Screenshots will be added in a future release -->
<!-- ![MarkFlow Screenshot](docs/screenshot.png) -->

## Features

- **GitHub Flavored Markdown (GFM)** — tables, task lists, fenced code blocks, and more
- **Live preview** — toggle between edit and preview with a single keystroke
- **Dark & light mode** — automatic detection of system preference, or toggle manually
- **Export to PDF** — one-click PDF generation with styled headings, code blocks, and tables
- **Export to Word** — generate `.docx` documents with proper formatting
- **Autosave with recovery** — session data saved to localStorage; restore on restart
- **File associations** — right-click any `.md` file and open it with MarkFlow
- **Keyboard shortcuts** — fast mode switching and file operations
- **Tab support** — insert tab characters in the editor
- **Cross-platform** — native builds for Linux, macOS, and Windows

## Install

### Linux

**Debian / Ubuntu (.deb)**

```bash
sudo dpkg -i markflow_0.4.3_amd64.deb
sudo apt-get install -f   # install any missing dependencies
```

**AppImage**

```bash
chmod +x MarkFlow-0.4.3.AppImage
./MarkFlow-0.4.3.AppImage
```

**Arch Linux (AUR)**

```bash
# Clone and build with makepkg
git clone https://github.com/TopHermDev/markdown-editor.git
cd markdown-editor
makepkg -si
```

**install.sh (from source release)**

```bash
curl -sL https://github.com/TopHermDev/markdown-editor/releases/download/v0.4.3/install.sh | bash
```

Installs to `~/.local/bin` by default (no sudo needed). For a system-wide install to `/usr/local/bin`, pass `--system` (requires root):

```bash
curl -sL https://github.com/TopHermDev/markdown-editor/releases/download/v0.4.3/install.sh | bash -s -- --system
```

### macOS

1. Download `MarkFlow-0.4.3.dmg` from [Releases](https://github.com/TopHermDev/markdown-editor/releases)
2. Open the `.dmg` file
3. Drag **MarkFlow** to your Applications folder

### Windows

1. Download `MarkFlow-0.4.3-setup.exe` or `MarkFlow-0.4.3.msi` from [Releases](https://github.com/TopHermDev/markdown-editor/releases)
2. Run the installer and follow the on-screen prompts

### Updating

To update an existing installation, re-run the install command. The script detects your current version and skips if already up to date.

```bash
# User install
curl -sL https://github.com/TopHermDev/markdown-editor/releases/download/v0.4.3/install.sh | bash

# System-wide install
curl -sL https://github.com/TopHermDev/markdown-editor/releases/download/v0.4.3/install.sh | bash -s -- --system
```

For `.deb` packages, download and install the new version — `dpkg` will overwrite the existing files.

## Build from Source

### Prerequisites

| Dependency | Version |
|---|---|
| [Rust](https://rustup.rs/) | 1.70+ |
| [Node.js](https://nodejs.org/) | 18+ (optional, for dev tooling) |
| [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites/) | 2.x |
| `libwebkit2gtk-4.1-dev` | Linux only |

### Steps

```bash
# Clone the repository
git clone https://github.com/TopHermDev/markdown-editor.git
cd markdown-editor

# Install Tauri CLI (if not already installed)
cargo install tauri-cli --version "^2"

# Build the release binary
cargo tauri build

# The compiled binary and installers will be in src-tauri/target/release/
```

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `E` | Switch to Edit mode (when not focused on editor) |
| `Escape` | Switch to Preview mode |
| `Ctrl` + `O` | Open a file |
| `Ctrl` + `S` | Save current file |
| `Ctrl` + `Shift` + `S` | Force autosave to localStorage |
| `Tab` | Insert tab character in editor |

## Updating Dependencies

This project uses automated dependency management via [Dependabot](https://docs.github.com/en/code-security/dependabot). Dependabot checks for updates weekly and opens pull requests automatically.

To update dependencies manually:

```bash
# Rust dependencies
cd src-tauri
cargo update

# Frontend (if applicable)
npm update
```

See [`.github/dependabot.yml`](.github/dependabot.yml) for the full configuration.

## Contributing

Contributions are welcome! To get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run `cargo tauri build` to verify everything compiles
5. Commit your changes (`git commit -m 'Add my feature'`)
6. Push to the branch (`git push origin feature/my-feature`)
7. Open a Pull Request

Please follow existing code style and keep PRs focused on a single change.

## License

MarkFlow is licensed under the [MIT License](LICENSE).

```
MIT License

Copyright (c) 2026 MarkFlow Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
