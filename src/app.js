// ── MarkFlow ──
// Lightweight markdown reader/editor with GFM support

let currentFilePath = null;
let isPreviewMode = false;
let isDarkMode = true;

const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const editorPane = document.getElementById('editor-pane');
const previewPane = document.getElementById('preview-pane');
const modeIndicator = document.getElementById('mode-indicator');
const filenameDisplay = document.getElementById('filename');
const statusText = document.getElementById('status-text');
const cursorPos = document.getElementById('cursor-pos');
const fileInput = document.getElementById('file-input');
const themeIcon = document.getElementById('theme-icon');

// Configure marked for GFM
marked.setOptions({
  gfm: true,
  breaks: false,
  pedantic: false,
  smartLists: true,
  smartypants: false
});

// ── Theme Toggle ──
function applyTheme(dark) {
  isDarkMode = dark;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  themeIcon.textContent = dark ? '☀️' : '🌙';
  localStorage.setItem('markflow-theme', dark ? 'dark' : 'light');
}

function toggleTheme() {
  applyTheme(!isDarkMode);
}

function initTheme() {
  const saved = localStorage.getItem('markflow-theme');
  if (saved === 'dark' || saved === 'light') {
    applyTheme(saved === 'dark');
  } else {
    // Respect system preference on first launch
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark);
  }
}

// ── Mode Toggle ──
function toggleMode() {
  isPreviewMode = !isPreviewMode;
  updateMode();
}

function updateMode() {
  if (isPreviewMode) {
    editorPane.classList.add('hidden');
    previewPane.classList.remove('hidden');
    preview.innerHTML = marked.parse(editor.value);
    modeIndicator.textContent = 'PREVIEW';
    modeIndicator.classList.add('preview');
  } else {
    previewPane.classList.add('hidden');
    editorPane.classList.remove('hidden');
    editor.focus();
    modeIndicator.textContent = 'EDIT';
    modeIndicator.classList.remove('preview');
  }
}

// ── Toolbar Button Event Listeners (Issue #1 fix) ──
document.getElementById('btn-open').addEventListener('click', openFile);
document.getElementById('btn-save').addEventListener('click', saveFile);
document.getElementById('btn-preview').addEventListener('click', toggleMode);
document.getElementById('btn-theme').addEventListener('click', toggleTheme);

// ── Keyboard Shortcuts ──
document.addEventListener('keydown', (e) => {
  // Prevent default for our shortcuts
  const key = e.key.toLowerCase();

  // E — toggle to edit mode (or stay in edit)
  if (key === 'e' && !e.ctrlKey && !e.metaKey && !e.altKey && editor !== document.activeElement) {
    e.preventDefault();
    if (isPreviewMode) {
      isPreviewMode = false;
      updateMode();
    }
    return;
  }

  // Escape — toggle to preview
  if (key === 'escape') {
    e.preventDefault();
    if (!isPreviewMode) {
      isPreviewMode = true;
      updateMode();
    }
    return;
  }

  // Ctrl+O — open file
  if ((e.ctrlKey || e.metaKey) && key === 'o') {
    e.preventDefault();
    openFile();
    return;
  }

  // Ctrl+S — save file
  if ((e.ctrlKey || e.metaKey) && key === 's') {
    e.preventDefault();
    saveFile();
    return;
  }
});

// ── File Operations ──
function openFile() {
  fileInput.click();
}

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    editor.value = ev.target.result;
    currentFilePath = file.name;
    filenameDisplay.textContent = file.name;
    statusText.textContent = `Opened: ${file.name}`;
    updateMode();
  };
  reader.readAsText(file);
  fileInput.value = '';
});

function saveFile() {
  if (!currentFilePath) {
    // No file path — show save dialog
    const blob = new Blob([editor.value], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = currentFilePath || 'untitled.md';
    a.click();
    URL.revokeObjectURL(a.href);
    statusText.textContent = `Downloaded: ${currentFilePath || 'untitled.md'}`;
  } else {
    // File path known — write directly
    const blob = new Blob([editor.value], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = currentFilePath;
    a.click();
    URL.revokeObjectURL(a.href);
    statusText.textContent = `Saved: ${currentFilePath}`;
  }
}

// ── Cursor Position Tracking ──
editor.addEventListener('input', () => {
  updateCursorPos();
});

editor.addEventListener('click', () => {
  updateCursorPos();
});

editor.addEventListener('keyup', () => {
  updateCursorPos();
});

function updateCursorPos() {
  const text = editor.value;
  const pos = editor.selectionStart;
  const lines = text.substring(0, pos).split('\n');
  const line = lines.length;
  const col = lines[lines.length - 1].length + 1;
  cursorPos.textContent = `Ln ${line}, Col ${col}`;
}

// ── Tab key support ──
editor.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.value = editor.value.substring(0, start) + '    ' + editor.value.substring(end);
    editor.selectionStart = editor.selectionEnd = start + 4;
  }
});

// ── Init ──
initTheme();
updateMode();
statusText.textContent = 'Ready — E to edit, Esc to preview, Ctrl+O to open';
