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

// ── Toolbar Button Event Listeners ──
document.getElementById('btn-open').addEventListener('click', openFile);
document.getElementById('btn-save').addEventListener('click', saveFile);
document.getElementById('btn-preview').addEventListener('click', toggleMode);
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
    if (!isPreviewMode) {
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
  const blob = new Blob([editor.value], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = currentFilePath || 'untitled.md';
  a.click();
  URL.revokeObjectURL(a.href);
  statusText.textContent = `Saved: ${currentFilePath || 'untitled.md'}`;
}

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
  } catch (err) {
    statusText.textContent = `PDF export failed: ${err.message}`;
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
  } catch (err) {
    statusText.textContent = `Word export failed: ${err.message}`;
    console.error('Word export error:', err);
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
