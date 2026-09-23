// ── MarkFlow ──
// Lightweight markdown reader/editor with GFM support

// ── Toast Notifications ──
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

let currentFilePath = null;
let isPreviewMode = false;
let isSplitMode = false;
let isDarkMode = true;

// ── Autosave State ──
let autosaveEnabled = localStorage.getItem('markflow-autosave-enabled') !== 'false';
let autosaveTimer = null;
const AUTOSAVE_DELAY = 5000; // 5 seconds after last edit
const AUTOSAVE_KEY = 'markflow-autosave-session';

const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const editorPane = document.getElementById('editor-pane');
const previewPane = document.getElementById('preview-pane');
const modeIndicator = document.getElementById('mode-indicator');
const filenameDisplay = document.getElementById('filename');
const statusText = document.getElementById('status-text');
const autosaveStatus = document.getElementById('autosave-status');
const cursorPos = document.getElementById('cursor-pos');
const fileInput = document.getElementById('file-input');
const themeIcon = document.getElementById('theme-icon');
const autosaveCheckbox = document.getElementById('autosave-checkbox');

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
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark);
  }
}

// ── Mode Toggle ──
function toggleMode() {
  if (isSplitMode) {
    // In split view, E/Escape is a no-op
    return;
  }
  isPreviewMode = !isPreviewMode;
  updateMode();
}

function toggleSplitView() {
  isSplitMode = !isSplitMode;
  if (isSplitMode) {
    // Entering split view — show both panes
    isPreviewMode = false;
    editorPane.classList.remove('hidden');
    previewPane.classList.remove('hidden');
    preview.innerHTML = marked.parse(editor.value);
    modeIndicator.textContent = 'SPLIT';
    modeIndicator.className = 'split';
    editor.focus();
  } else {
    // Leaving split view — go back to edit mode
    isPreviewMode = false;
    updateMode();
  }
}

function updateMode() {
  if (isSplitMode) return; // split view is managed separately

  if (isPreviewMode) {
    editorPane.classList.add('hidden');
    previewPane.classList.remove('hidden');
    preview.innerHTML = marked.parse(editor.value);
    modeIndicator.textContent = 'PREVIEW';
    modeIndicator.className = 'preview';
  } else {
    previewPane.classList.add('hidden');
    editorPane.classList.remove('hidden');
    editor.focus();
    modeIndicator.textContent = 'EDIT';
    modeIndicator.className = '';
  }
}

// ── Toolbar Button Event Listeners ──
document.getElementById('btn-open').addEventListener('click', openFile);
document.getElementById('btn-save').addEventListener('click', saveFile);
document.getElementById('btn-preview').addEventListener('click', toggleMode);
document.getElementById('btn-split').addEventListener('click', toggleSplitView);
document.getElementById('btn-theme').addEventListener('click', toggleTheme);
document.getElementById('btn-export-pdf').addEventListener('click', exportPDF);
document.getElementById('btn-export-word').addEventListener('click', exportWord);

// ── Keyboard Shortcuts ──
document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();

  if (key === 'e' && !e.ctrlKey && !e.metaKey && !e.altKey && editor !== document.activeElement) {
    e.preventDefault();
    if (isPreviewMode) {
      isPreviewMode = false;
      updateMode();
    }
    return;
  }

  if (key === 'escape') {
    e.preventDefault();
    if (isSplitMode) {
      toggleSplitView();
    } else if (!isPreviewMode) {
      isPreviewMode = true;
      updateMode();
    }
    return;
  }

  if ((e.ctrlKey || e.metaKey) && key === 'o') {
    e.preventDefault();
    openFile();
    return;
  }

  if ((e.ctrlKey || e.metaKey) && key === 's') {
    e.preventDefault();
    saveFile();
    return;
  }

  // Ctrl+Enter: Toggle split view
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    toggleSplitView();
    return;
  }

  // Ctrl+Shift+S: Force autosave to localStorage
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 's') {
    e.preventDefault();
    forceAutosave();
    return;
  }

  // Ctrl+F: Find
  if ((e.ctrlKey || e.metaKey) && key === 'f') {
    e.preventDefault();
    openFindBar(false);
    return;
  }

  // Ctrl+H: Find & Replace
  if ((e.ctrlKey || e.metaKey) && key === 'h') {
    e.preventDefault();
    openFindBar(true);
    return;
  }

  // Escape: close find bar if open, otherwise toggle preview
  if (key === 'escape') {
    if (!findBar.classList.contains('hidden')) {
      e.preventDefault();
      closeFindBar();
      return;
    }
    e.preventDefault();
    if (!isPreviewMode) {
      isPreviewMode = true;
      updateMode();
    }
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
    scheduleAutosave();
  };
  reader.readAsText(file);
  fileInput.value = '';
});

function saveFile() {
  const blob = new Blob([editor.value], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = currentFilePath || 'untitled.md';
  a.click();
  URL.revokeObjectURL(a.href);
  statusText.textContent = `Saved: ${currentFilePath || 'untitled.md'}`;
}

// ── Autosave System ──
function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour12: false });
}

function saveSession() {
  const session = {
    content: editor.value,
    filename: currentFilePath,
    cursorPosition: editor.selectionStart,
    timestamp: Date.now()
  };

  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(session));
    autosaveStatus.textContent = `Saved ${formatTime(new Date())}`;
    // Clear the "Saved" message after 5 seconds
    setTimeout(() => {
      if (autosaveStatus.textContent.startsWith('Saved')) {
        autosaveStatus.textContent = '';
      }
    }, 5000);
  } catch (err) {
    console.error('Autosave failed:', err);
    autosaveStatus.textContent = 'Autosave error';
  }
}

const scheduleAutosave = debounce(() => {
  if (autosaveEnabled) {
    saveSession();
  }
}, AUTOSAVE_DELAY);

function forceAutosave() {
  saveSession();
}

function loadSession() {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function restoreSession(session) {
  editor.value = session.content;
  if (session.filename) {
    currentFilePath = session.filename;
    filenameDisplay.textContent = session.filename;
  }
  if (typeof session.cursorPosition === 'number') {
    editor.setSelectionRange(session.cursorPosition, session.cursorPosition);
  }
  updateMode();
}

function promptRestoreSession() {
  const session = loadSession();
  if (!session || !session.content) return;

  const timeStr = formatTime(new Date(session.timestamp));
  const filename = session.filename || 'Untitled';

  if (confirm(`Restore previous session?\n\nFile: ${filename}\nSaved at: ${timeStr}`)) {
    restoreSession(session);
    statusText.textContent = 'Session restored';
  } else {
    // Clear the saved session if user declines
    localStorage.removeItem(AUTOSAVE_KEY);
  }
}

// ── Autosave Toggle ──
autosaveCheckbox.checked = autosaveEnabled;

autosaveCheckbox.addEventListener('change', () => {
  autosaveEnabled = autosaveCheckbox.checked;
  localStorage.setItem('markflow-autosave-enabled', autosaveEnabled);
  if (autosaveEnabled) {
    scheduleAutosave();
  } else {
    autosaveStatus.textContent = '';
  }
});

// ── Trigger autosave on editor input ──
let splitUpdatePending = false;
editor.addEventListener('input', () => {
  scheduleAutosave();
  // Live update preview in split mode
  if (isSplitMode && !splitUpdatePending) {
    splitUpdatePending = true;
    requestAnimationFrame(() => {
      preview.innerHTML = marked.parse(editor.value);
      splitUpdatePending = false;
    });
  }
});

// ── Export: PDF ──
async function exportPDF() {
  const md = editor.value.trim();
  if (!md) {
    statusText.textContent = 'Nothing to export — editor is empty';
    return;
  }

  statusText.textContent = 'Generating PDF...';

  // Render markdown to HTML in a temporary container
  const container = document.createElement('div');
  container.innerHTML = marked.parse(md);
  container.style.cssText = 'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #1a1a1a; padding: 20px; max-width: 800px;';

  // Style elements inside the container
  container.querySelectorAll('h1').forEach(el => el.style.cssText = 'font-size: 24px; font-weight: 700; margin: 24px 0 12px; border-bottom: 1px solid #ddd; padding-bottom: 8px;');
  container.querySelectorAll('h2').forEach(el => el.style.cssText = 'font-size: 20px; font-weight: 600; margin: 20px 0 10px;');
  container.querySelectorAll('h3').forEach(el => el.style.cssText = 'font-size: 16px; font-weight: 600; margin: 16px 0 8px;');
  container.querySelectorAll('p').forEach(el => el.style.cssText = 'margin: 0 0 12px;');
  container.querySelectorAll('pre').forEach(el => el.style.cssText = 'background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; font-size: 13px; margin: 12px 0;');
  container.querySelectorAll('code').forEach(el => {
    if (el.parentElement.tagName !== 'PRE') {
      el.style.cssText = 'background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 13px;';
    }
  });
  container.querySelectorAll('blockquote').forEach(el => el.style.cssText = 'border-left: 3px solid #ccc; margin: 12px 0; padding: 4px 16px; color: #555;');
  container.querySelectorAll('table').forEach(el => el.style.cssText = 'border-collapse: collapse; margin: 12px 0; width: 100%;');
  container.querySelectorAll('th, td').forEach(el => el.style.cssText = 'border: 1px solid #ddd; padding: 8px 12px; text-align: left;');
  container.querySelectorAll('th').forEach(el => el.style.cssText += ' background: #f5f5f5; font-weight: 600;');
  container.querySelectorAll('ul, ol').forEach(el => el.style.cssText = 'margin: 8px 0; padding-left: 24px;');
  container.querySelectorAll('li').forEach(el => el.style.cssText = 'margin: 4px 0;');
  container.querySelectorAll('a').forEach(el => el.style.cssText = 'color: #0066cc;');

  const filename = (currentFilePath || 'untitled').replace(/\.(md|markdown|txt|rst)$/i, '');

  const opt = {
    margin: [10, 15, 10, 15],
    filename: `${filename}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  try {
    await html2pdf().set(opt).from(container).save();
    statusText.textContent = `Exported: ${filename}.pdf`;
    showToast(`Exported ${filename}.pdf`, 'success');
  } catch (err) {
    statusText.textContent = `PDF export failed: ${err.message}`;
    showToast(`PDF export failed: ${err.message}`, 'error');
    console.error('PDF export error:', err);
  }
}

// ── Export: Word ──
async function exportWord() {
  const md = editor.value.trim();
  if (!md) {
    statusText.textContent = 'Nothing to export — editor is empty';
    return;
  }

  statusText.textContent = 'Generating Word document...';

  try {
    const lines = md.split('\n');
    const children = [];
    let inCodeBlock = false;
    let codeLines = [];

    for (const line of lines) {
      // Code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          // End of code block
          children.push(new docx.Paragraph({
            children: [new docx.TextRun({ text: codeLines.join('\n'), font: 'Courier New', size: 20 })],
            spacing: { after: 120 }
          }));
          codeLines = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        continue;
      }

      // Empty lines = paragraph break
      if (line.trim() === '') {
        continue;
      }

      // Headings
      if (line.startsWith('######')) {
        children.push(new docx.Paragraph({
          children: [new docx.TextRun({ text: line.replace(/^#{6}\s*/, ''), bold: true, size: 20 })],
          spacing: { before: 80, after: 80 }
        }));
      } else if (line.startsWith('#####')) {
        children.push(new docx.Paragraph({
          children: [new docx.TextRun({ text: line.replace(/^#{5}\s*/, ''), bold: true, size: 22 })],
          spacing: { before: 100, after: 100 }
        }));
      } else if (line.startsWith('####')) {
        children.push(new docx.Paragraph({
          children: [new docx.TextRun({ text: line.replace(/^#{4}\s*/, ''), bold: true, size: 24 })],
          spacing: { before: 120, after: 100 }
        }));
      } else if (line.startsWith('###')) {
        children.push(new docx.Paragraph({
          children: [new docx.TextRun({ text: line.replace(/^#{3}\s*/, ''), bold: true, size: 26 })],
          spacing: { before: 160, after: 120 }
        }));
      } else if (line.startsWith('##')) {
        children.push(new docx.Paragraph({
          children: [new docx.TextRun({ text: line.replace(/^#{2}\s*/, ''), bold: true, size: 28 })],
          spacing: { before: 200, after: 120 }
        }));
      } else if (line.startsWith('#')) {
        children.push(new docx.Paragraph({
          children: [new docx.TextRun({ text: line.replace(/^#\s*/, ''), bold: true, size: 32 })],
          spacing: { before: 240, after: 160 }
        }));
      }
      // Blockquotes
      else if (line.startsWith('>')) {
        children.push(new docx.Paragraph({
          children: [new docx.TextRun({ text: line.replace(/^>\s*/, ''), italics: true, color: '666666' })],
          indent: { left: 720 },
          spacing: { after: 120 }
        }));
      }
      // Unordered lists
      else if (line.match(/^[\-\*]\s/)) {
        const text = line.replace(/^[\-\*]\s/, '');
        children.push(new docx.Paragraph({
          children: [new docx.TextRun({ text: '• ' + parseInlineMarkdown(text) })],
          indent: { left: 360 },
          spacing: { after: 60 }
        }));
      }
      // Ordered lists
      else if (line.match(/^\d+\.\s/)) {
        const match = line.match(/^(\d+)\.\s(.+)/);
        if (match) {
          children.push(new docx.Paragraph({
            children: [new docx.TextRun({ text: match[1] + '. ' + parseInlineMarkdown(match[2]) })],
            indent: { left: 360 },
            spacing: { after: 60 }
          }));
        }
      }
      // Horizontal rules
      else if (line.match(/^[\-\*_]{3,}$/)) {
        children.push(new docx.Paragraph({
          children: [new docx.TextRun({ text: '—' })],
          spacing: { before: 120, after: 120 }
        }));
      }
      // Regular paragraph
      else {
        children.push(new docx.Paragraph({
          children: [new docx.TextRun({ text: parseInlineMarkdown(line), size: 24 })],
          spacing: { after: 120 }
        }));
      }
    }

    const doc = new docx.Document({
      sections: [{
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        children: children
      }]
    });

    const blob = await docx.Packer.toBlob(doc);
    const filename = (currentFilePath || 'untitled').replace(/\.(md|markdown|txt|rst)$/i, '');
    saveAs(blob, `${filename}.docx`);
    statusText.textContent = `Exported: ${filename}.docx`;
    showToast(`Exported ${filename}.docx`, 'success');
  } catch (err) {
    statusText.textContent = `Word export failed: ${err.message}`;
    showToast(`Word export failed: ${err.message}`, 'error');
    console.error('Word export error:', err);
  }
}
// ── Export: HTML ──
function exportHTML() {
  const md = editor.value.trim();
  if (!md) {
    statusText.textContent = 'Nothing to export — editor is empty';
    return;
  }

  statusText.textContent = 'Generating HTML...';

  try {
    const rendered = marked.parse(md);
    const filename = (currentFilePath || 'untitled').replace(/\.(md|markdown|txt|rst)$/i, '');

    const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${filename}</title>
  <style>
    :root {
      --bg-primary: #1a1a2e;
      --bg-secondary: #16213e;
      --bg-editor: #0f0f23;
      --bg-code: #1a1a3e;
      --bg-pre: #0a0a1e;
      --bg-th: #16213e;
      --bg-blockquote: #0d1b3e;
      --border-main: #2a2a5a;
      --border-hr: #2a2a5a;
      --border-table: #333;
      --border-pre: #2a2a5a;
      --text-primary: #e0e0f0;
      --text-markdown: #d0d0e0;
      --text-strong: #fff;
      --text-em: #ccc;
      --text-h1: #fff;
      --text-h2: #f0f0ff;
      --text-h3: #e0e0ff;
      --text-h4: #d0d0ff;
      --text-link: #00d2ff;
      --text-code: #ff8c00;
      --text-pre: #d0d0e0;
      --text-blockquote: #aaa;
      --accent: #00d2ff;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans', sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      margin: 0;
      padding: 40px 20px;
      line-height: 1.7;
    }

    .markdown-body {
      max-width: 800px;
      margin: 0 auto;
      font-size: 15px;
      color: var(--text-markdown);
    }

    h1 { font-size: 2em; border-bottom: 1px solid var(--border-hr); padding-bottom: 8px; margin: 24px 0 16px; color: var(--text-h1); }
    h2 { font-size: 1.5em; border-bottom: 1px solid var(--border-main); padding-bottom: 6px; margin: 20px 0 12px; color: var(--text-h2); }
    h3 { font-size: 1.25em; margin: 16px 0 8px; color: var(--text-h3); }
    h4 { font-size: 1em; margin: 12px 0 6px; color: var(--text-h4); }
    p { margin: 12px 0; }
    a { color: var(--text-link); text-decoration: none; }
    a:hover { text-decoration: underline; }
    strong { color: var(--text-strong); }
    em { color: var(--text-em); font-style: italic; }
    code { background: var(--bg-code); padding: 2px 6px; border-radius: 4px; font-size: 0.9em; font-family: 'JetBrains Mono', monospace; color: var(--text-code); }
    pre { background: var(--bg-pre); border: 1px solid var(--border-pre); border-radius: 6px; padding: 16px; overflow-x: auto; margin: 16px 0; }
    pre code { background: none; padding: 0; color: var(--text-pre); font-size: 13px; }
    blockquote { border-left: 3px solid var(--accent); padding: 8px 16px; margin: 12px 0; background: var(--bg-blockquote); color: var(--text-blockquote); }
    ul, ol { margin: 12px 0; padding-left: 24px; }
    li { margin: 4px 0; }
    hr { border: none; border-top: 1px solid var(--border-hr); margin: 24px 0; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid var(--border-table); padding: 8px 12px; text-align: left; }
    th { background: var(--bg-th); color: var(--text-strong); font-weight: 600; }
    img { max-width: 100%; border-radius: 6px; }
    input[type="checkbox"] { margin-right: 6px; }
  </style>
</head>
<body>
  <div class="markdown-body">
${rendered}
  </div>
</body>
</html>`;

    const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
    saveAs(blob, `${filename}.html`);
    statusText.textContent = `Exported: ${filename}.html`;
    showToast(`Exported ${filename}.html`, 'success');
  } catch (err) {
    statusText.textContent = `HTML export failed: ${err.message}`;
    showToast(`HTML export failed: ${err.message}`, 'error');
    console.error('HTML export error:', err);
  }
}


// ── Inline Markdown Parser for Word ──
function parseInlineMarkdown(text) {
  // Simple inline parser: bold, italic, code, links
  // Returns an array of TextRun objects for docx
  // For simplicity, we strip markdown syntax and return plain text
  // with bold/italic markers noted in the text
  let result = text;
  // Bold: **text** or __text__
  result = result.replace(/\*\*(.+?)\*\*/g, '$1');
  result = result.replace(/__(.+?)__/g, '$1');
  // Italic: *text* or _text_
  result = result.replace(/\*(.+?)\*/g, '$1');
  result = result.replace(/_(.+?)_/g, '$1');
  // Inline code: `text`
  result = result.replace(/`(.+?)`/g, '$1');
  // Links: [text](url)
  result = result.replace(/\[(.+?)\]\((.+?)\)/g, '$1');
  // Images: ![alt](url) - skip
  result = result.replace(/!\[.*?\]\((.+?)\)/g, '');
  return result;
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

// ── Find & Replace ──
const findBar = document.getElementById('find-bar');
const findInput = document.getElementById('find-input');
const findCount = document.getElementById('find-count');
const findPrevBtn = document.getElementById('find-prev');
const findNextBtn = document.getElementById('find-next');
const findCaseBtn = document.getElementById('find-case');
const findWordBtn = document.getElementById('find-word');
const findReplaceToggle = document.getElementById('find-replace-toggle');
const findCloseBtn = document.getElementById('find-close');
const replaceBarRow = document.getElementById('replace-bar-row');
const replaceInput = document.getElementById('replace-input');
const replaceOneBtn = document.getElementById('replace-one');
const replaceAllBtn = document.getElementById('replace-all');

let findMatches = [];
let findIndex = -1;
let findCaseSensitive = false;
let findWholeWord = false;

function openFindBar(withReplace) {
  findBar.classList.remove('hidden');
  if (withReplace) replaceBarRow.classList.remove('hidden');
  findInput.focus();
  findInput.select();
}

function closeFindBar() {
  findBar.classList.add('hidden');
  replaceBarRow.classList.add('hidden');
  findMatches = [];
  findIndex = -1;
  findCount.textContent = '';
  editor.focus();
}

function getMatches(query) {
  if (!query) return [];
  const text = editor.value;
  const matches = [];
  let flags = findCaseSensitive ? 'g' : 'gi';
  let pattern = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (findWholeWord) pattern = '\\b' + pattern + '\\b';
  const regex = new RegExp(pattern, flags);
  let m;
  while ((m = regex.exec(text)) !== null) {
    matches.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
    if (matches.length > 10000) break; // safety limit
  }
  return matches;
}

function updateFindResults() {
  const query = findInput.value;
  findMatches = getMatches(query);
  findIndex = findMatches.length > 0 ? 0 : -1;
  updateFindCount();
  if (findMatches.length > 0) highlightCurrentMatch();
}

function updateFindCount() {
  if (!findInput.value) {
    findCount.textContent = '';
    return;
  }
  if (findMatches.length === 0) {
    findCount.textContent = 'No results';
    findCount.style.color = '#ff6b6b';
  } else {
    findCount.textContent = `${findIndex + 1} of ${findMatches.length}`;
    findCount.style.color = '';
  }
}

function highlightCurrentMatch() {
  if (findIndex < 0 || findIndex >= findMatches.length) return;
  const match = findMatches[findIndex];
  editor.focus();
  editor.setSelectionRange(match.start, match.end);
  // Scroll the match into view
  const text = editor.value.substring(0, match.start);
  const lines = text.split('\n');
  const lineNum = lines.length - 1;
  const lineHeight = parseInt(getComputedStyle(editor).lineHeight);
  const targetScroll = lineNum * lineHeight - editor.clientHeight / 3;
  editor.scrollTop = Math.max(0, targetScroll);
}

function findNext() {
  if (findMatches.length === 0) return;
  findIndex = (findIndex + 1) % findMatches.length;
  updateFindCount();
  highlightCurrentMatch();
}

function findPrev() {
  if (findMatches.length === 0) return;
  findIndex = (findIndex - 1 + findMatches.length) % findMatches.length;
  updateFindCount();
  highlightCurrentMatch();
}

function replaceCurrent() {
  if (findIndex < 0 || findMatches.length === 0) return;
  const match = findMatches[findIndex];
  const replacement = replaceInput.value;
  editor.value = editor.value.substring(0, match.start) + replacement + editor.value.substring(match.end);
  scheduleAutosave();
  updateFindResults();
}

function replaceAllMatches() {
  if (findMatches.length === 0) return;
  const query = findInput.value;
  const replacement = replaceInput.value;
  let flags = findCaseSensitive ? 'g' : 'gi';
  let pattern = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (findWholeWord) pattern = '\\b' + pattern + '\\b';
  const regex = new RegExp(pattern, flags);
  editor.value = editor.value.replace(regex, replacement);
  scheduleAutosave();
  updateFindResults();
}

// Event listeners for find bar
findInput.addEventListener('input', updateFindResults);

findInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    if (e.shiftKey) findPrev();
    else findNext();
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    closeFindBar();
  }
});

replaceInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    replaceCurrent();
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    closeFindBar();
  }
});

findNextBtn.addEventListener('click', findNext);
findPrevBtn.addEventListener('click', findPrev);
findCloseBtn.addEventListener('click', closeFindBar);
replaceOneBtn.addEventListener('click', replaceCurrent);
replaceAllBtn.addEventListener('click', replaceAllMatches);

findCaseBtn.addEventListener('click', () => {
  findCaseSensitive = !findCaseSensitive;
  findCaseBtn.classList.toggle('active', findCaseSensitive);
  updateFindResults();
});

findWordBtn.addEventListener('click', () => {
  findWholeWord = !findWholeWord;
  findWordBtn.classList.toggle('active', findWholeWord);
  updateFindResults();
});

findReplaceToggle.addEventListener('click', () => {
  const isVisible = !replaceBarRow.classList.contains('hidden');
  replaceBarRow.classList.toggle('hidden', isVisible);
});

// ── Keyboard Shortcuts ── (extended for find/replace)
// Override the existing keydown listener to add Ctrl+F / Ctrl+H
document.removeEventListener('keydown', null); // no-op; we extend below
editor.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.value = editor.value.substring(0, start) + '    ' + editor.value.substring(end);
    editor.selectionStart = editor.selectionEnd = start + 4;
    scheduleAutosave();
  }
});

// ── Init ──
initTheme();
updateMode();
statusText.textContent = 'Ready — E to edit, Esc to preview, Ctrl+Enter for split';

// Check for saved session on load
promptRestoreSession();

// ── Handle file opened via OS file association (Linux "Open with") ──
async function listenForOpenFile() {
  if (window.__TAURI__ && window.__TAURI__.event) {
    await window.__TAURI__.event.listen('open-file', (event) => {
      const filePath = event.payload;
      if (filePath) {
        window.__TAURI__.core.invoke('read_file', { path: filePath }).then((content) => {
          editor.value = content;
          currentFilePath = filePath;
          filenameDisplay.textContent = filePath.split('/').pop();
          statusText.textContent = `Opened: ${filePath}`;
          updateMode();
        }).catch((err) => {
          statusText.textContent = `Failed to open: ${err}`;
        });
      }
    });
  }
}
listenForOpenFile();

// ── File Tree Sidebar ──
const sidebar = document.getElementById('sidebar');
const fileTree = document.getElementById('file-tree');
const btnSidebar = document.getElementById('btn-sidebar');
const btnBrowse = document.getElementById('btn-browse');
const sidebarRootName = document.getElementById('sidebar-root-name');

let sidebarVisible = false;
let sidebarRootPath = null;
let activeFilePath = null;

function toggleSidebar() {
  sidebarVisible = !sidebarVisible;
  sidebar.classList.toggle('hidden', !sidebarVisible);
  btnSidebar.classList.toggle('active', sidebarVisible);
}

btnSidebar.addEventListener('click', toggleSidebar);

// Ctrl+B to toggle sidebar
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
    e.preventDefault();
    toggleSidebar();
  }
});

// Browse folder via Tauri dialog
btnBrowse.addEventListener('click', async () => {
  if (!window.__TAURI__ || !window.__TAURI__.dialog) {
    showToast('Folder picker requires Tauri runtime', 'error');
    return;
  }

  try {
    const selected = await window.__TAURI__.dialog.open({
      directory: true,
      multiple: false,
      title: 'Select folder to browse'
    });

    if (selected) {
      const folderPath = typeof selected === 'string' ? selected : selected;
      sidebarRootPath = folderPath;
      const folderName = folderPath.split('/').pop();
      sidebarRootName.textContent = folderName;
      await renderFileTree(folderPath, fileTree);
    }
  } catch (err) {
    showToast('Failed to open folder: ' + err, 'error');
  }
});

// Render a directory listing into a container element
async function renderFileTree(dirPath, container) {
  container.innerHTML = '';

  if (!window.__TAURI__ || !window.__TAURI__.core) {
    container.innerHTML = '<div class="tree-item" style="color:var(--text-muted)">Tauri not available</div>';
    return;
  }

  try {
    const entries = await window.__TAURI__.core.invoke('list_directory', { path: dirPath });

    if (!entries || entries.length === 0) {
      container.innerHTML = '<div class="tree-item" style="color:var(--text-muted)">Empty folder</div>';
      return;
    }

    for (const entry of entries) {
      const item = document.createElement('div');
      item.className = 'tree-item';
      item.dataset.path = entry.path;
      item.dataset.isDir = entry.is_dir;

      if (!entry.is_dir && entry.path === activeFilePath) {
        item.classList.add('active');
      }

      const icon = document.createElement('span');
      icon.className = 'tree-icon';
      icon.textContent = entry.is_dir ? '\u{1F4C1}' : getFileIcon(entry.name);

      const label = document.createElement('span');
      label.className = 'tree-label';
      label.textContent = entry.name;

      item.appendChild(icon);
      item.appendChild(label);

      if (entry.is_dir) {
        // Directory: toggle expand/collapse on click
        const childContainer = document.createElement('div');
        childContainer.className = 'tree-children collapsed';

        item.addEventListener('click', async (e) => {
          e.stopPropagation();
          const isCollapsed = childContainer.classList.contains('collapsed');
          if (isCollapsed) {
            childContainer.classList.remove('collapsed');
            icon.textContent = '\u{1F4C2}';
            // Lazy-load children if empty
            if (childContainer.children.length === 0) {
              await renderFileTree(entry.path, childContainer);
            }
          } else {
            childContainer.classList.add('collapsed');
            icon.textContent = '\u{1F4C1}';
          }
        });

        container.appendChild(item);
        container.appendChild(childContainer);
      } else {
        // File: open in editor on click
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          openFileFromTree(entry.path);
        });
        container.appendChild(item);
      }
    }
  } catch (err) {
    container.innerHTML = '<div class="tree-item" style="color:var(--text-muted)">Error: ' + err + '</div>';
  }
}

// Get an icon character based on file extension
function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const iconMap = {
    md: '\u{1F4DD}', markdown: '\u{1F4DD}', txt: '\u{1F4C4}', rst: '\u{1F4C4}',
    js: '\u{1F4DC}', ts: '\u{1F4DC}', jsx: '\u{1F4DC}', tsx: '\u{1F4DC}',
    json: '\u{2699}\u{FE0F}', yaml: '\u{2699}\u{FE0F}', yml: '\u{2699}\u{FE0F}', toml: '\u{2699}\u{FE0F}',
    css: '\u{1F3A8}', scss: '\u{1F3A8}', less: '\u{1F3A8}', html: '\u{1F310}',
    py: '\u{1F40D}', rs: '\u{1F980}', go: '\u{1F537}', rb: '\u{1F48E}',
    sh: '\u{1F5A5}\u{FE0F}', bash: '\u{1F5A5}\u{FE0F}', zsh: '\u{1F5A5}\u{FE0F}',
    png: '\u{1F5BC}\u{FE0F}', jpg: '\u{1F5BC}\u{FE0F}', jpeg: '\u{1F5BC}\u{FE0F}', gif: '\u{1F5BC}\u{FE0F}', svg: '\u{1F5BC}\u{FE0F}',
    pdf: '\u{1F155}', doc: '\u{1F4D8}', docx: '\u{1F4D8}',
  };
  return iconMap[ext] || '\u{1F4C4}';
}

// Open a file from the tree into the editor via Tauri read_file
async function openFileFromTree(filePath) {
  if (!window.__TAURI__ || !window.__TAURI__.core) {
    showToast('Tauri not available', 'error');
    return;
  }

  try {
    const content = await window.__TAURI__.core.invoke('read_file', { path: filePath });
    currentFilePath = filePath;
    activeFilePath = filePath;
    filenameDisplay.textContent = filePath.split('/').pop();
    editor.focus();
    editor.select();
    document.execCommand('insertText', false, content);
    statusText.textContent = 'Opened: ' + filePath;
    updateMode();
    scheduleAutosave();

    // Highlight the active file in the tree
    document.querySelectorAll('.tree-item.active').forEach(el => el.classList.remove('active'));
    const targetItem = document.querySelector('.tree-item[data-path="' + CSS.escape(filePath) + '"]');
    if (targetItem) targetItem.classList.add('active');
  } catch (err) {
    showToast('Failed to open file: ' + err, 'error');
  }
}

// ── Handle file opened via OS file association (Linux "Open with") ──

// ── Custom Preview CSS Themes ──
const CUSTOM_CSS_KEY = 'markflow-custom-css';

const PRESET_THEMES = {
  github: `/* GitHub Style */
.markdown-body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 1.5;
  color: #24292e;
  background: #fff;
}
.markdown-body h1, .markdown-body h2 { border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
.markdown-body h1 { font-size: 2em; }
.markdown-body h2 { font-size: 1.5em; }
.markdown-body h3 { font-size: 1.25em; }
.markdown-body code { background: #f6f8fa; padding: 0.2em 0.4em; border-radius: 3px; font-size: 85%; }
.markdown-body pre { background: #f6f8fa; border-radius: 6px; padding: 16px; overflow-x: auto; }
.markdown-body pre code { background: none; padding: 0; }
.markdown-body blockquote { border-left: 0.25em solid #dfe2e5; color: #6a737d; padding: 0 1em; margin: 16px 0; }
.markdown-body a { color: #0366d6; text-decoration: none; }
.markdown-body a:hover { text-decoration: underline; }
.markdown-body table { border-collapse: collapse; width: 100%; }
.markdown-body th, .markdown-body td { border: 1px solid #dfe2e5; padding: 6px 13px; }
.markdown-body th { background: #f6f8fa; font-weight: 600; }
.markdown-body hr { border: none; border-top: 1px solid #e1e4e8; margin: 24px 0; }`,

  'solarized-dark': `/* Solarized Dark */
.markdown-body {
  background: #002b36;
  color: #839496;
  font-family: 'Menlo', 'Consolas', 'DejaVu Sans Mono', monospace;
  font-size: 15px;
  line-height: 1.6;
}
.markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4 {
  color: #93a1a1;
  border-bottom-color: #586e75;
}
.markdown-body h1 { font-size: 2em; border-bottom: 1px solid #586e75; padding-bottom: 0.3em; }
.markdown-body h2 { font-size: 1.5em; border-bottom: 1px solid #586e75; padding-bottom: 0.2em; }
.markdown-body h3 { font-size: 1.25em; }
.markdown-body a { color: #268bd2; text-decoration: none; }
.markdown-body a:hover { text-decoration: underline; }
.markdown-body code { background: #073642; padding: 0.15em 0.4em; border-radius: 3px; color: #cb4b16; }
.markdown-body pre { background: #073642; border: 1px solid #586e75; border-radius: 6px; padding: 16px; overflow-x: auto; }
.markdown-body pre code { background: none; color: #839496; padding: 0; }
.markdown-body blockquote { border-left: 3px solid #268bd2; padding: 0.5em 1em; color: #657b83; margin: 16px 0; }
.markdown-body strong { color: #93a1a1; }
.markdown-body em { color: #93a1a1; font-style: italic; }
.markdown-body table { border-collapse: collapse; width: 100%; }
.markdown-body th, .markdown-body td { border: 1px solid #586e75; padding: 8px 12px; }
.markdown-body th { background: #073642; }
.markdown-body hr { border: none; border-top: 1px solid #586e75; margin: 24px 0; }`,

  'solarized-light': `/* Solarized Light */
.markdown-body {
  background: #fdf6e3;
  color: #657b83;
  font-family: 'Menlo', 'Consolas', 'DejaVu Sans Mono', monospace;
  font-size: 15px;
  line-height: 1.6;
}
.markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4 {
  color: #586e75;
  border-bottom-color: #eee8d5;
}
.markdown-body h1 { font-size: 2em; border-bottom: 1px solid #eee8d5; padding-bottom: 0.3em; }
.markdown-body h2 { font-size: 1.5em; border-bottom: 1px solid #eee8d5; padding-bottom: 0.2em; }
.markdown-body h3 { font-size: 1.25em; }
.markdown-body a { color: #268bd2; text-decoration: none; }
.markdown-body a:hover { text-decoration: underline; }
.markdown-body code { background: #eee8d5; padding: 0.15em 0.4em; border-radius: 3px; color: #cb4b16; }
.markdown-body pre { background: #eee8d5; border: 1px solid #93a1a1; border-radius: 6px; padding: 16px; overflow-x: auto; }
.markdown-body pre code { background: none; color: #657b83; padding: 0; }
.markdown-body blockquote { border-left: 3px solid #268bd2; padding: 0.5em 1em; color: #93a1a1; margin: 16px 0; }
.markdown-body strong { color: #586e75; }
.markdown-body em { color: #586e75; font-style: italic; }
.markdown-body table { border-collapse: collapse; width: 100%; }
.markdown-body th, .markdown-body td { border: 1px solid #93a1a1; padding: 8px 12px; }
.markdown-body th { background: #eee8d5; }
.markdown-body hr { border: none; border-top: 1px solid #eee8d5; margin: 24px 0; }`,

  nord: `/* Nord */
.markdown-body {
  background: #2e3440;
  color: #d8dee9;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 15px;
  line-height: 1.6;
}
.markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4 {
  color: #eceff4;
  border-bottom-color: #4c566a;
}
.markdown-body h1 { font-size: 2em; border-bottom: 2px solid #88c0d0; padding-bottom: 0.3em; }
.markdown-body h2 { font-size: 1.5em; border-bottom: 1px solid #4c566a; padding-bottom: 0.2em; }
.markdown-body h3 { font-size: 1.25em; color: #88c0d0; }
.markdown-body a { color: #88c0d0; text-decoration: none; }
.markdown-body a:hover { text-decoration: underline; }
.markdown-body code { background: #3b4252; padding: 0.15em 0.4em; border-radius: 3px; color: #bf616a; font-size: 0.9em; }
.markdown-body pre { background: #3b4252; border: 1px solid #4c566a; border-radius: 6px; padding: 16px; overflow-x: auto; }
.markdown-body pre code { background: none; color: #d8dee9; padding: 0; }
.markdown-body blockquote { border-left: 3px solid #81a1c1; padding: 0.5em 1em; color: #7b88a1; margin: 16px 0; background: rgba(59, 66, 82, 0.5); }
.markdown-body strong { color: #eceff4; }
.markdown-body em { color: #a3be8c; font-style: italic; }
.markdown-body table { border-collapse: collapse; width: 100%; }
.markdown-body th, .markdown-body td { border: 1px solid #4c566a; padding: 8px 12px; }
.markdown-body th { background: #3b4252; color: #eceff4; font-weight: 600; }
.markdown-body hr { border: none; border-top: 1px solid #4c566a; margin: 24px 0; }
.markdown-body ul, .markdown-body ol { margin: 12px 0; padding-left: 24px; }
.markdown-body li { margin: 4px 0; }`,

  dracula: `/* Dracula */
.markdown-body {
  background: #282a36;
  color: #f8f8f2;
  font-family: 'Fira Code', 'JetBrains Mono', monospace;
  font-size: 15px;
  line-height: 1.6;
}
.markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4 {
  color: #ff79c6;
  border-bottom-color: #44475a;
}
.markdown-body h1 { font-size: 2em; border-bottom: 2px solid #bd93f9; padding-bottom: 0.3em; }
.markdown-body h2 { font-size: 1.5em; border-bottom: 1px solid #44475a; padding-bottom: 0.2em; color: #bd93f9; }
.markdown-body h3 { font-size: 1.25em; color: #50fa7b; }
.markdown-body h4 { color: #f1fa8c; }
.markdown-body a { color: #8be9fd; text-decoration: none; }
.markdown-body a:hover { text-decoration: underline; }
.markdown-body code { background: #44475a; padding: 0.15em 0.4em; border-radius: 3px; color: #50fa7b; }
.markdown-body pre { background: #44475a; border: 1px solid #6272a4; border-radius: 6px; padding: 16px; overflow-x: auto; }
.markdown-body pre code { background: none; color: #f8f8f2; padding: 0; }
.markdown-body blockquote { border-left: 3px solid #bd93f9; padding: 0.5em 1em; color: #6272a4; margin: 16px 0; }
.markdown-body strong { color: #ff79c6; }
.markdown-body em { color: #ffb86c; font-style: italic; }
.markdown-body table { border-collapse: collapse; width: 100%; }
.markdown-body th, .markdown-body td { border: 1px solid #44475a; padding: 8px 12px; }
.markdown-body th { background: #44475a; color: #ff79c6; font-weight: 600; }
.markdown-body hr { border: none; border-top: 1px solid #44475a; margin: 24px 0; }
.markdown-body ul, .markdown-body ol { margin: 12px 0; padding-left: 24px; }
.markdown-body li { margin: 4px 0; }
.markdown-body li::marker { color: #bd93f9; }`
};

// Create or get the <style> element for custom preview CSS
let customStyleEl = document.getElementById('custom-theme-style');
if (!customStyleEl) {
  customStyleEl = document.createElement('style');
  customStyleEl.id = 'custom-theme-style';
  document.head.appendChild(customStyleEl);
}

function applyCustomCSS(css) {
  if (css && css.trim()) {
    customStyleEl.textContent = css;
  } else {
    customStyleEl.textContent = '';
  }
}

function loadCustomCSS() {
  return localStorage.getItem(CUSTOM_CSS_KEY) || '';
}

function saveCustomCSS(css) {
  if (css && css.trim()) {
    localStorage.setItem(CUSTOM_CSS_KEY, css);
  } else {
    localStorage.removeItem(CUSTOM_CSS_KEY);
  }
}

// ── Theme Modal ──
const themeModalOverlay = document.getElementById('theme-modal-overlay');
const themeModalClose = document.getElementById('theme-modal-close');
const themeCssEditor = document.getElementById('theme-css-editor');
const themeApplyBtn = document.getElementById('theme-apply-btn');
const themeResetBtn = document.getElementById('theme-reset-btn');
const presetBtns = document.querySelectorAll('.preset-btn');

function openThemeModal() {
  themeCssEditor.value = loadCustomCSS();
  themeModalOverlay.classList.remove('hidden');
  themeCssEditor.focus();
}

function closeThemeModal() {
  themeModalOverlay.classList.add('hidden');
}

function applyThemeCSS() {
  const css = themeCssEditor.value;
  saveCustomCSS(css);
  applyCustomCSS(css);
  closeThemeModal();
  showToast('Preview theme applied');
}

function resetThemeCSS() {
  themeCssEditor.value = '';
  saveCustomCSS('');
  applyCustomCSS('');
  closeThemeModal();
  showToast('Preview theme reset');
}

// Apply saved CSS on load
applyCustomCSS(loadCustomCSS());

// Event listeners
document.getElementById('btn-custom-theme').addEventListener('click', openThemeModal);
themeModalClose.addEventListener('click', closeThemeModal);
themeApplyBtn.addEventListener('click', applyThemeCSS);
themeResetBtn.addEventListener('click', resetThemeCSS);

themeModalOverlay.addEventListener('click', (e) => {
  if (e.target === themeModalOverlay) closeThemeModal();
});

presetBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const presetName = btn.getAttribute('data-preset');
    if (PRESET_THEMES[presetName]) {
      themeCssEditor.value = PRESET_THEMES[presetName];
    }
  });
});
