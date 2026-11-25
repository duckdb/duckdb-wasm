// === Configuration === (the URLs live in SHELL_ASSETS in shell-boot, where they are preloaded)
const SHELL_WASM_JS_URL = SHELL_ASSETS.shellJs;
const WORKER_URL = SHELL_ASSETS.worker;
// Absolute: the worker resolves it against its own URL otherwise, and the preload would not be reused
const DUCKDB_WASM_URL = new URL(SHELL_ASSETS.engine, location.href).href;

// === Mobile hamburger toggle ===
const hamburgerBtn = document.querySelector('.hamburger');
const landingMenu = document.querySelector('.landingmenu');
if (hamburgerBtn && landingMenu) {
  hamburgerBtn.addEventListener('click', () => {
    hamburgerBtn.classList.toggle('is-active');
    landingMenu.classList.toggle('slidein');
  });
  // Close menu when a non-submenu nav link is tapped
  landingMenu.querySelectorAll('nav a').forEach(a => {
    a.addEventListener('click', () => {
      if (a.closest('.hasSub')) return; // submenu trigger handled below
      hamburgerBtn.classList.remove('is-active');
      landingMenu.classList.remove('slidein');
    });
  });
}

// === Submenu (Datasets) open/close on mobile ===
document.querySelectorAll('.landingmenu .hasSub').forEach(sub => {
  sub.addEventListener('click', (e) => {
    // Only intercept on mobile; desktop keeps native hover behavior.
    if (window.matchMedia('(min-width: 901px)').matches) return;
    e.preventDefault();
    sub.classList.toggle('open');
    sub.parentElement.classList.toggle('submenu-open');
  });
});

// === Nav actions ===
// === Demo mode ===
window.demoQueue = [];
window.demoRunning = false;

window.demoUpdateButton = () => {
  const btn = document.getElementById('nav-demo');
  if (window.demoQueue.length === 0 && window.demoPendingText === null) {
    btn.style.visibility = 'hidden';
  } else if (window.demoRunning) {
    btn.disabled = true;
    btn.style.opacity = '0.4';
    btn.removeAttribute('data-tooltip');
  } else {
    btn.disabled = false;
    btn.style.opacity = '1';
    if (window.demoPendingText !== null) {
      btn.setAttribute('data-tooltip', 'Run: ' + window.demoPendingText);
    } else if (window.demoQueue.length > 0) {
      btn.setAttribute('data-tooltip', window.demoQueue[0]);
    } else {
      btn.removeAttribute('data-tooltip');
    }
  }
};

window.demoPendingText = null; // text shown but not yet executed

document.getElementById('nav-demo').addEventListener('click', (e) => {
  e.preventDefault();
  if (window.demoRunning) return;

  if (window.demoPendingText !== null) {
    // Second click — execute the pending text
    window.demoRunning = true;
    window.demoPendingText = null;
    window.demoUpdateButton();
    // Send Enter to execute
    if (!wasmModule || !initDone || !wasmModule._wasm_is_editing()) return;
    const enc = new TextEncoder().encode('\n');
    const ptr = wasmModule._malloc(enc.length);
    wasmModule.HEAPU8.set(enc, ptr);
    wasmModule._wasm_feed_key(ptr, enc.length);
    wasmModule._free(ptr);
    flushPending();
  } else if (window.demoQueue.length > 0) {
    // First click — populate the command line (without Enter)
    const sql = window.demoQueue.shift();
    window.demoPendingText = sql;
    window.demoUpdateButton();
    if (!wasmModule || !initDone || !wasmModule._wasm_is_editing()) return;
    const enc = new TextEncoder().encode(sql);
    const ptr = wasmModule._malloc(enc.length);
    wasmModule.HEAPU8.set(enc, ptr);
    wasmModule._wasm_feed_key(ptr, enc.length);
    wasmModule._free(ptr);
    flushPending();
  }
});

document.getElementById('nav-new').addEventListener('click', (e) => {
  e.preventDefault();
  window.location.hash = '';
  window.location.reload();
});
function injectCommand(cmd) {
  if (!wasmModule || !initDone || !wasmModule._wasm_is_editing()) return;
  const encoded = new TextEncoder().encode(cmd + '\n');
  const ptr = wasmModule._malloc(encoded.length);
  wasmModule.HEAPU8.set(encoded, ptr);
  wasmModule._wasm_feed_key(ptr, encoded.length);
  wasmModule._free(ptr);
  flushPending();
  settleAfterFeed();
}
document.getElementById('nav-share').addEventListener('click', (e) => {
  e.preventDefault();
  injectCommand('.share');
  // .share is synchronous (JS-only) — restart editing immediately
  if (wasmModule && wasmModule._wasm_is_idle() && !wasmModule._wasm_is_editing()) {
    wasmModule._wasm_start_editing();
    flushPending();
  }
});
document.getElementById('nav-import').addEventListener('click', (e) => {
  e.preventDefault();
  injectCommand('.files add');
});
document.querySelectorAll('.example-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const queries = link.getAttribute('data-queries');
    window.location.hash = 'queries=v0,' + queries;
    window.location.reload();
  });
});

// === Reading one value back from the engine ===
// A query run through the worker, not the terminal; the frontend extracts the first value
function firstValueOf(data) {
  if (!data || data.length === 0) return null;
  const ptr = wasmModule._malloc(data.length);
  wasmModule.HEAPU8.set(data, ptr);
  const resultPtr = wasmModule._wasm_extract_first_value(ptr, data.length);
  wasmModule._free(ptr);
  if (!resultPtr) return null;   // error, no rows, or NULL
  // Read null-terminated string from WASM heap
  let end = resultPtr;
  while (wasmModule.HEAPU8[end] !== 0) end++;
  const value = new TextDecoder().decode(wasmModule.HEAPU8.subarray(resultPtr, end));
  wasmModule._free(resultPtr);
  return value || null;
}

// === The grammar of the engine's grammar extensions ===
// `SET active_grammar_extensions = ['duckpgq']` changes what the engine parses. The frontend checks syntax too, so
// once a statement mentions the setting the engine is asked for the changes of its active extensions
// (duckdb_grammar_changes(): rule definitions, fields joined by 0x1F and rows by 0x1E) and the frontend parses the
// same grammar, passing such statements on as text. The queue waits for the answer.
const GRAMMAR_CHANGES_SQL = "SELECT coalesce(string_agg(concat_ws(chr(31), type, rule_name, definition, " +
  "CASE WHEN collapsible THEN '1' ELSE '0' END, CASE WHEN suppress_suggestions THEN '1' ELSE '0' END, " +
  "CASE WHEN has_code THEN '1' ELSE '0' END), chr(30)), '')::VARCHAR FROM duckdb_grammar_changes()";
const grammarCheckTags = new Set();
let grammarSyncing = false;
async function syncGrammar() {
  grammarSyncing = true;
  try {
    const encoded = firstValueOf(await sendToWorkerAsync('query', { sql: GRAMMAR_CHANGES_SQL, castMode: 0 })) || '';
    const bytes = new TextEncoder().encode(encoded);
    const ptr = wasmModule._malloc(bytes.length + 1);
    wasmModule.HEAPU8.set(bytes, ptr);
    wasmModule._wasm_set_grammar(ptr, bytes.length);
    wasmModule._free(ptr);
  } catch (e) {
    console.warn('grammar sync failed', e);
  } finally {
    grammarSyncing = false;
  }
}

// === Dark mode ===
const LIGHT_THEME = {
  background: '#fafafa', foreground: '#1e1e1e', cursor: '#1e1e1e', cursorAccent: '#fafafa',
  brightBlack: '#808080', selectionBackground: '#b5d5ff', selectionForeground: '#000000',
};
const DARK_THEME = {
  background: '#0d0d0d', foreground: '#d4d4d4', cursor: '#d4d4d4', cursorAccent: '#0d0d0d',
  brightBlack: '#808080', selectionBackground: '#264f78', selectionForeground: '#ffffff',
};

function isDark() { return document.documentElement.classList.contains('darkmode'); }

// Dark mode toggle — matches duckdb.org (uses localStorage key "mode", button class ".mode")
document.querySelector('.mode').addEventListener('click', function() {
  var dark = this.getAttribute('data-mode') === 'dark';
  document.documentElement.classList.toggle('darkmode', dark);
  this.setAttribute('data-mode', dark ? 'light' : 'dark');
  localStorage.setItem('mode', dark ? 'dark' : 'light');
  document.documentElement.classList.add('disable-transitions');
  setTimeout(() => document.documentElement.classList.remove('disable-transitions'), 300);
  // Update xterm theme
  if (typeof term !== 'undefined') {
    term.options.theme = dark ? DARK_THEME : LIGHT_THEME;
  }
  // Update shell highlight mode
  if (wasmModule && wasmModule._wasm_set_dark_mode) {
    wasmModule._wasm_set_dark_mode(dark ? 1 : 0);
  }
});
// Set initial data-mode attribute based on current state
document.querySelector('.mode').setAttribute('data-mode', isDark() ? 'light' : 'dark');

// === xterm.js setup ===
const linkHandler = {
  activate: (e, uri) => {
    if (uri.startsWith('https://shell.duckdb.org/drop/') && wasmModule && wasmModule._wasm_is_editing()) {
      const name = decodeURIComponent(uri.slice(30));
      const quoted = name.includes(' ') ? "'" + name + "'" : name;
      const cmd = '.files drop ' + quoted + '\n';
      const encoded = new TextEncoder().encode(cmd);
      const ptr = wasmModule._malloc(encoded.length);
      wasmModule.HEAPU8.set(encoded, ptr);
      wasmModule._wasm_feed_key(ptr, encoded.length);
      wasmModule._free(ptr);
      flushPending();
    } else if (uri.startsWith('https://shell.duckdb.org/download/') && wasmModule && wasmModule._wasm_is_editing()) {
      const name = decodeURIComponent(uri.slice(34));
      const quoted = name.includes(' ') ? "'" + name + "'" : name;
      const cmd = '.files download ' + quoted + '\n';
      const encoded = new TextEncoder().encode(cmd);
      const ptr = wasmModule._malloc(encoded.length);
      wasmModule.HEAPU8.set(encoded, ptr);
      wasmModule._wasm_feed_key(ptr, encoded.length);
      wasmModule._free(ptr);
      flushPending();
    } else if (uri.includes('#queries=')) {
      // Share link — navigate in current tab
      window.location.href = uri;
      window.location.reload();
    } else {
      // Default: open link in new tab
      window.open(uri, '_blank');
    }
  }
};
const term = new Terminal({
  cursorBlink: true,
  fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", "SF Mono", Menlo, Monaco, "Courier New", monospace',
  fontSize: 13,
  allowProposedApi: true,
  linkHandler: linkHandler,
  theme: isDark() ? DARK_THEME : LIGHT_THEME,
});
term.open(document.getElementById('terminal'));

const fitAddon = new FitAddon.FitAddon();
term.loadAddon(fitAddon);
fitAddon.fit();
window.addEventListener('resize', () => fitAddon.fit());

window.termCols = term.cols;
window.termRows = term.rows;
window.termReset = () => { term.clear(); term.write('\x1b[2J\x1b[H'); };

window.asyncBusy = false;
window.pendingFiles = {};
window.pendingFolders = new Set();

// === .share: session URL encoding ===
window.shareHistory = [];
const SHARE_ALLOWED_DOT = ['.mode', '.timer', '.maxrows', '.maxwidth', '.nullvalue', '.separator', '.headers', '.changes',
  '.tables', '.schema', '.indexes', '.columns', '.describe', '.functions', '.types'];

function isShareable(line) {
  if (!line.startsWith('.')) return true; // SQL
  return SHARE_ALLOWED_DOT.some(ex => line.startsWith(ex));
}

// Same encoding as the live duckdb-wasm shell (v0 format)
function extraswaps(s) {
  let r = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === ' ') r += '-';
    else if (s[i] === '-') r += ' ';
    else if (s[i] === ';') r += '~';
    else if (s[i] === '~') r += ';';
    else r += s[i];
  }
  return r;
}

// An input that creates a secret or names an S3 credential setting stays out of the link, and .share says so
const SHARE_CREDENTIAL_RE = /\bcreate\s+(or\s+replace\s+)?((temporary|temp|persistent)\s+)?secret\b|\bs3_(access_key_id|secret_access_key|session_token)\b/i;
let shareLeftOutCredential = false;

window.shareTrack = (line) => {
  if (SHARE_CREDENTIAL_RE.test(line)) {
    shareLeftOutCredential = true;
  } else if (isShareable(line)) {
    window.shareHistory.push(line);
  }
};

window.shareGenerate = () => {
  const leftOut = shareLeftOutCredential ? '\x1b[90mStatements that set credentials are not in the link.\x1b[0m\r\n' : '';
  if (window.shareHistory.length === 0) {
    term.write('No commands to share.\r\n' + leftOut);
    return;
  }
  const parts = window.shareHistory.map(s => encodeURIComponent(extraswaps(s)));
  const hash = 'queries=v0,' + parts.join(',');
  const baseUrl = window.location.origin + window.location.pathname;
  const url = baseUrl + '#' + hash;
  window.location.hash = hash;
  // Print as clickable OSC 8 link
  term.write('\x1b]8;;' + url + '\x07' + url + '\x1b]8;;\x07\r\n' + leftOut);
};

// Unified file registration — called from .files add, .pick, and drag-and-drop.
// args: space-separated names. If pending files exist for them, use those (drop flow).
// Otherwise open the file picker.
// Parse space-separated names, respecting single quotes for names with spaces
function parseFileNames(args) {
  const names = [];
  let i = 0;
  while (i < args.length) {
    if (args[i] === ' ') { i++; continue; }
    if (args[i] === "'") {
      const end = args.indexOf("'", i + 1);
      if (end === -1) { names.push(args.slice(i + 1)); break; }
      names.push(args.slice(i + 1, end));
      i = end + 1;
    } else {
      const end = args.indexOf(' ', i);
      if (end === -1) { names.push(args.slice(i)); break; }
      names.push(args.slice(i, end));
      i = end + 1;
    }
  }
  return names;
}

window.filesAdd = (args) => {
  window.asyncBusy = true;
  const names = args ? parseFileNames(args) : [];

  // Check if names match pending files (drop flow)
  const hasPending = names.length > 0 && names.every(n =>
    n.endsWith('/') ? window.pendingFolders.has(n) : window.pendingFiles[n]
  );
  if (hasPending) {
    (async () => {
      for (const name of names) {
        if (name.endsWith('/')) {
          // Folder — register all pending files under this prefix
          const keys = Object.keys(window.pendingFiles).filter(k => k.startsWith(name)).sort();
          if (keys.length === 0) {
            term.write('Empty folder: ' + name + '\r\n');
          }
          for (const key of keys) {
            const buffer = window.pendingFiles[key];
            delete window.pendingFiles[key];
            await sendToWorkerAsync('register_file', { fileName: key, buffer });
            term.write('Registered: ' + key + ' (' + buffer.length + ' bytes)\r\n');
          }
          window.pendingFolders.delete(name);
        } else {
          const buffer = window.pendingFiles[name];
          delete window.pendingFiles[name];
          await sendToWorkerAsync('register_file', { fileName: name, buffer });
          term.write('Registered: ' + name + ' (' + buffer.length + ' bytes)\r\n');
        }
      }
      window.asyncBusy = false;
      wasmModule._wasm_start_editing();
      flushPending();
    })();
    return;
  }

  // Picker flow
  const isFolder = names.length === 1 && names[0].endsWith('/');
  const input = document.createElement('input');
  input.type = 'file';
  if (isFolder) {
    input.webkitdirectory = true;
  } else {
    input.multiple = names.length !== 1;
  }
  input.onchange = async () => {
    const files = Array.from(input.files);
    for (let i = 0; i < files.length; i++) {
      let registerName;
      if (isFolder) {
        // webkitRelativePath gives "foldername/subdir/file.csv"
        // Replace the original folder name with the requested prefix
        const relPath = files[i].webkitRelativePath;
        const firstSlash = relPath.indexOf('/');
        registerName = names[0] + (firstSlash >= 0 ? relPath.slice(firstSlash + 1) : relPath);
      } else {
        registerName = (names.length > 0 && i < names.length) ? names[i] : files[i].name;
      }
      const buffer = new Uint8Array(await files[i].arrayBuffer());
      await sendToWorkerAsync('register_file', { fileName: registerName, buffer });
      term.write('Registered: ' + registerName + ' (' + buffer.length + ' bytes)\r\n');
    }
    window.asyncBusy = false;
    wasmModule._wasm_start_editing();
    flushPending();
  };
  input.addEventListener('cancel', () => {
    window.asyncBusy = false;
    wasmModule._wasm_start_editing();
    flushPending();
  });
  input.click();
};
window.filesDownload = (name_) => {
  let name = name_.trim();
  // Strip surrounding single quotes (for filenames with spaces)
  if (name.startsWith("'") && name.endsWith("'")) {
    name = name.slice(1, -1);
  }
  window.asyncBusy = true;
  (async () => {
    try {
      // Check if file exists first
      const listData = await sendToWorkerAsync('list_files');
      const files = listData ? JSON.parse(new TextDecoder().decode(listData)) : [];
      const fileInfo = files.find(f => f.fileName === name);
      if (!fileInfo) {
        term.write('File not found: ' + name + '\r\n');
        window.asyncBusy = false;
        wasmModule._wasm_start_editing();
        flushPending();
        return;
      }
      const data = await sendToWorkerAsync('download_file', { fileName: name });
      if (data && data.length > 0) {
        const blob = new Blob([data]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name.includes('/') ? name.split('/').pop() : name;
        a.click();
        URL.revokeObjectURL(url);
        term.write('Downloaded: ' + name + ' (' + data.length + ' bytes)\r\n');
      } else {
        term.write('Error: could not read file ' + name + '\r\n');
      }
    } catch (e) {
      term.write('Error downloading: ' + name + ' (' + e.message + ')\r\n');
    }
    window.asyncBusy = false;
    wasmModule._wasm_start_editing();
    flushPending();
  })();
};
// Shared file list renderer
function renderFileList(files) {
  if (files.length === 0) return;
  const names = files.map(f => f.fileName);
  const maxLen = Math.max(...names.map(n => n.length));
  const colWidth = maxLen + 4;
  const termWidth = window.termCols || 80;
  const numCols = Math.max(1, Math.floor(termWidth / colWidth));
  function fileLink(name) {
    const uri = 'https://shell.duckdb.org/download/' + encodeURIComponent(name);
    return '\x1b]8;;' + uri + '\x07' + name + '\x1b]8;;\x07';
  }
  function dropLink(name) {
    const uri = 'https://shell.duckdb.org/drop/' + encodeURIComponent(name);
    return '\x1b]8;;' + uri + '\x07\x1b[90m✕\x1b[0m\x1b]8;;\x07';
  }
  for (let i = 0; i < names.length; i += numCols) {
    let line = '';
    for (let j = 0; j < numCols && i + j < names.length; j++) {
      const n = names[i + j];
      line += dropLink(n) + ' ' + fileLink(n) + ' '.repeat(colWidth - n.length - 2);
    }
    term.write(line.trimEnd() + '\r\n');
  }
}

window.filesDrop = (name_) => {
  let name = name_.trim();
  if (name.startsWith("'") && name.endsWith("'")) name = name.slice(1, -1);
  window.asyncBusy = true;
  (async () => {
    try {
      const listData = await sendToWorkerAsync('list_files');
      const files = listData ? JSON.parse(new TextDecoder().decode(listData)) : [];
      if (!files.find(f => f.fileName === name)) {
        term.write('File not found: ' + name + '\r\n');
      } else {
        await sendToWorkerAsync('drop_file', { fileName: name });
        term.write('Dropped: ' + name + '\r\n');
        const refreshData = await sendToWorkerAsync('list_files');
        const refreshFiles = refreshData ? JSON.parse(new TextDecoder().decode(refreshData)) : [];
        renderFileList(refreshFiles);
      }
    } catch (e) {
      term.write('Error: ' + e.message + '\r\n');
    }
    window.asyncBusy = false;
    wasmModule._wasm_start_editing();
    flushPending();
  })();
};
window.filesDropAll = () => {
  window.asyncBusy = true;
  (async () => {
    try {
      await sendToWorkerAsync('drop_files');
      term.write('All files dropped.\r\n');
    } catch (e) {
      term.write('Error: ' + e.message + '\r\n');
    }
    window.asyncBusy = false;
    wasmModule._wasm_start_editing();
    flushPending();
  })();
};
window.filesList = () => {
  window.asyncBusy = true;
  (async () => {
    const data = await sendToWorkerAsync('list_files');
    if (data) {
      const files = JSON.parse(new TextDecoder().decode(data));
      if (files.length === 0) {
        term.write('No files registered.\r\n');
      } else {
        renderFileList(files);
      }
    }
    window.asyncBusy = false;
    wasmModule._wasm_start_editing();
    flushPending();
  })();
};
term.onResize(({ cols, rows }) => {
  window.termCols = cols;
  window.termRows = rows;
});

// Drag-and-drop: only accept on empty prompt (idle + editing)
const termEl = document.getElementById('terminal');
termEl.addEventListener('dragover', (e) => {
  e.preventDefault();
});
termEl.addEventListener('drop', async (e) => {
  e.preventDefault();
  if (!initDone || !wasmModule._wasm_is_editing() || !wasmModule._wasm_is_line_empty() || window.asyncBusy) {
    console.warn('Cannot drop files — clear the prompt first');
    return;
  }
  // Recursively read a directory entry into pendingFiles
  async function readEntry(entry, prefix) {
    if (entry.isFile) {
      const file = await new Promise(r => entry.file(r));
      const path = prefix + file.name;
      window.pendingFiles[path] = new Uint8Array(await file.arrayBuffer());
      return [path];
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const entries = await new Promise(r => reader.readEntries(r));
      const paths = [];
      for (const child of entries) {
        paths.push(...await readEntry(child, prefix + entry.name + '/'));
      }
      return paths;
    }
    return [];
  }

  // Collect all entries synchronously BEFORE any await
  // (DataTransfer is invalidated after the first async yield)
  const collected = [];
  const items = Array.from(e.dataTransfer.items);
  for (const item of items) {
    const entry = item.webkitGetAsEntry && item.webkitGetAsEntry();
    if (entry && entry.isDirectory) {
      collected.push({ type: 'dir', entry });
    } else {
      const file = item.getAsFile();
      if (file) collected.push({ type: 'file', file });
    }
  }

  // Now process async
  const parts = [];
  for (const c of collected) {
    if (c.type === 'dir') {
      const paths = await readEntry(c.entry, '');
      const folderName = c.entry.name + '/';
      window.pendingFolders.add(folderName);
      parts.push(folderName.includes(' ') ? "'" + folderName + "'" : folderName);
    } else {
      window.pendingFiles[c.file.name] = new Uint8Array(await c.file.arrayBuffer());
      parts.push(c.file.name.includes(' ') ? "'" + c.file.name + "'" : c.file.name);
    }
  }
  const cmd = '.files add ' + parts.join(' ') + '\n';
  const encoded = new TextEncoder().encode(cmd);
  const ptr = wasmModule._malloc(encoded.length);
  wasmModule.HEAPU8.set(encoded, ptr);
  wasmModule._wasm_feed_key(ptr, encoded.length);
  wasmModule._free(ptr);
  flushPending();
});

function setStatus(msg) {
  console.log('[status]', msg);
}

// === WASM output callbacks ===
function onWasmPrint(text) {
  term.write(text.replaceAll('\n', '\r\n') + '\r\n');
}

function onStdoutChar(charCode) {
  if (charCode === null) return;
  const ch = String.fromCharCode(charCode);
  if (ch === '\n') {
    term.write('\r\n');
  } else {
    term.write(ch);
  }
}

function onWasmPrintErr(text) {
  term.write('\x1b[31m' + text + '\x1b[0m\r\n');
}

// === Worker transport ===
// Translates between the frontend WASM's binary wire messages and
// the worker's structured postMessage API.

let worker = null;
let workerReady = false;
let nextTag = 1;

// Adopts the worker started in <head> and resolves with its answer to the early instantiate (tag 0);
// the answer may already be queued on the port, it is delivered once onmessage is set.
function initWorker() {
  worker = EARLY_WORKER;
  const instantiated = new Promise((resolve, reject) => {
    pendingCallbacks[0] = (status, data, error) => {
      if (status !== 0) reject(new Error(error || 'worker error'));
      else resolve(data);
    };
  });

  worker.onmessage = (event) => {
    const { tag, status, data, error, duration } = event.data;

    if (error) {
      console.error('[worker] error:', error);
    }

    // Accumulate worker-side duration for the timer
    if (duration !== undefined) {
      window.workerTimeMs = (window.workerTimeMs || 0) + duration;
    }

    // Route response to the frontend WASM shell.
    // We need to translate the worker response back into the binary wire format
    // that the frontend WASM expects (tag + status + payload).
    // Check pending callbacks first (used by sendToWorkerAsync for JS-only ops like register_file)
    if (pendingCallbacks[tag]) {
      pendingCallbacks[tag](status, data, error);
      delete pendingCallbacks[tag];
    } else if (wasmModule && initDone) {
      deliverToFrontend(tag, status, data);
    }
  };
  // what the engine answered before this handler existed (see shell-boot)
  for (const event of EARLY_MESSAGES.splice(0)) {
    worker.onmessage(event);
  }

  worker.onerror = (e) => {
    console.error('[worker] error event:', e);
    setStatus('worker error');
  };
  return instantiated;
}

// Pending callbacks for init-phase messages
const pendingCallbacks = {};

function sendToWorker(op, params = {}) {
  const tag = nextTag++;
  worker.postMessage({ op, tag, ...params });
  return tag;
}

function sendToWorkerAsync(op, params = {}) {
  return new Promise((resolve, reject) => {
    const tag = nextTag++;
    pendingCallbacks[tag] = (status, data, error) => {
      if (status !== 0) reject(new Error(error || 'worker error'));
      else resolve(data);
    };
    worker.postMessage({ op, tag, ...params });
  });
}

// === Deliver worker response to frontend WASM ===
// The frontend WASM expects responses in wire format:
// [8B tag (LE)] [1B status] [payload...]
// We reconstruct this envelope from the worker's structured response.

function deliverToFrontend(tag, status, data) {
  inflightQueries.delete(tag);
  if (grammarCheckTags.delete(tag)) {
    grammarSyncing = true; // until the sync below settles, so nothing is parsed with the old grammar
    setTimeout(syncGrammar, 0);
  }
  const payload = data || new Uint8Array(0);
  const envelope = new Uint8Array(8 + 1 + payload.length);
  const view = new DataView(envelope.buffer);
  // Write tag as uint64 LE
  view.setUint32(0, tag & 0xFFFFFFFF, true);
  view.setUint32(4, Math.floor(tag / 0x100000000), true);
  // Status byte: 0 = SUCCESS
  view.setUint8(8, status);
  // Payload
  if (payload.length > 0) {
    envelope.set(payload, 9);
  }

  const ptr = wasmModule._malloc(envelope.length);
  wasmModule.HEAPU8.set(envelope, ptr);
  wasmModule._wasm_on_ws_response(ptr, envelope.length);
  wasmModule._free(ptr);

  flushPending();
  settleAfterFeed();

  // After editing started (possibly from prompt response), drain buffered input
  if (wasmModule._wasm_is_editing() && wasmModule._wasm_has_buffered_input()) {
    wasmModule._wasm_feed_key(0, 0);
    flushPending();
    settleAfterFeed();
  }

  // Drain next startup command if queued
  if (wasmModule._wasm_is_editing() && startupQueue.length > 0) {
    drainStartupQueue();
  }

  // Demo mode: mark query as done when shell returns to editing
  if (wasmModule._wasm_is_editing() && window.demoRunning) {
    window.demoRunning = false;
    window.demoUpdateButton();
  }
}

// === Flush pending messages from frontend WASM to worker ===
// The frontend WASM buffers outbound wire messages. We parse the opcode
// from each message and translate to a worker postMessage call.

// Wire opcodes (must match wire_protocol.hpp)
const WIRE_OP = {
  1: 'create_connection',
  2: 'close_connection',
  3: 'query',
  4: 'send_query',
  5: 'prepare',
  6: 'execute',
  7: 'fetch',
  8: 'cast_to_varchar',
  9: 'begin_transaction',
  10: 'commit',
  11: 'rollback',
  12: 'is_auto_commit',
  13: 'interrupt',
  14: 'clear_interrupt',
  15: 'table_info',
  16: 'fetch_chunk_at',
};

function readU64(data, offset) {
  const view = new DataView(data.buffer, data.byteOffset + offset);
  const lo = view.getUint32(0, true);
  const hi = view.getUint32(4, true);
  return lo + hi * 0x100000000;
}

function readU32(data, offset) {
  const view = new DataView(data.buffer, data.byteOffset + offset);
  return view.getUint32(0, true);
}

// Queries the frontend sent whose answer has not come back: its prompt is made of queries too, and a statement fed
// while one is out gets the prompt printed before its result.
const inflightQueries = new Set();

function flushPending() {
  // before the engine is up the shell's requests stay queued in the frontend; boot() flushes them
  if (!wasmModule || !workerReady) return;
  while (wasmModule._wasm_has_pending()) {
    const ptr = wasmModule._wasm_take_pending();
    const size = wasmModule._wasm_pending_size();
    const raw = new Uint8Array(wasmModule.HEAPU8.buffer, ptr, size).slice();

    // Parse the wire message: [8B tag] [1B opcode] [payload...]
    const tag = readU64(raw, 0);
    const opcode = raw[8];
    const opName = WIRE_OP[opcode];
    // console.log('[wire→transport]', opName, 'tag=' + tag, size + 'B');

    // Translate wire message to worker postMessage
    switch (opcode) {
      case 3: // QUERY: [tag(8)] [op(1)] [conn(8)] [castMode(1)] [sqlLen(4)] [sql...]
      case 4: { // SEND_QUERY: same format
        window.workerTimeMs = 0; // reset accumulator for new query
        inflightQueries.add(tag);
        const connId = readU64(raw, 9);
        const castMode = raw[17];
        const sqlLen = readU32(raw, 18);
        const sql = new TextDecoder().decode(raw.subarray(22, 22 + sqlLen));
        if (/active_grammar_extensions|\breset\s+all\b/i.test(sql)) grammarCheckTags.add(tag);
        worker.postMessage({
          op: opcode === 3 ? 'query' : 'send_query',
          tag, sql, castMode,
        });
        break;
      }
      case 7: { // FETCH: [tag(8)] [op(1)] [conn(8)]
        worker.postMessage({ op: 'fetch', tag });
        break;
      }
      case 16: { // FETCH_CHUNK_AT: [tag(8)] [op(1)] [conn(8)] [chunkIdx(8)]
        const chunkIdx = readU64(raw, 17);
        worker.postMessage({ op: 'fetch_chunk_at', tag, chunkIdx });
        break;
      }
      case 13: { // INTERRUPT: [tag(8)] [op(1)] [conn(8)]
        worker.postMessage({ op: 'interrupt', tag });
        break;
      }
      case 14: { // CLEAR_INTERRUPT
        worker.postMessage({ op: 'clear_interrupt', tag });
        break;
      }
      default:
        console.warn('[wire→worker] unhandled opcode', opcode, opName);
    }
  }
}

// === Frontend WASM shell ===

let wasmModule = null;
let initDone = false;
// A share link is URL-encoded by the shell, but a hand-written one carries SQL format strings (strftime '%G',
// printf '%s') as they are: a '%' that does not start an escape stands for itself.
function decodeShareComponent(s) {
  try {
    return decodeURIComponent(s.replace(/%(?![0-9a-fA-F]{2})/g, '%25'));
  } catch (e) {
    return s; // an escape that is not UTF-8: the text as it is
  }
}

let startupQueue = [];  // queued commands from URL hash, fed one at a time
// The URL hash queued statements: the author of the link chose them, so this session may not sign in to AWS
let startedFromLink = false;
// The link switched the extension signature check off (boot passes it to the engine)
const ALLOW_UNSIGNED_EXTENSIONS = new URLSearchParams(location.search).get('allowUnsignedExtensions') === 'true';

let drainTimer = null;
function drainStartupQueue() {
  // the queries of a link or an embedding page start once the engine is up, not while the shell still loads
  if (startupQueue.length === 0 || !wasmModule || !initDone || !workerReady) return;
  clearTimeout(drainTimer);
  drainTimer = null;
  if (!wasmModule._wasm_is_editing()) {
    // Shell not ready yet (e.g. waiting for prompt query after USE) — retry
    drainTimer = setTimeout(drainStartupQueue, 50);
    return;
  }
  if (inflightQueries.size > 0 || grammarSyncing) {
    // the prompt is still being worked out: the statement goes after it
    drainTimer = setTimeout(drainStartupQueue, 20);
    return;
  }
  const sql = startupQueue.shift();
  const cmd = sql + '\n';
  const enc = new TextEncoder().encode(cmd);
  const p = wasmModule._malloc(enc.length);
  wasmModule.HEAPU8.set(enc, p);
  wasmModule._wasm_feed_key(p, enc.length);
  wasmModule._free(p);
  flushPending();
  settleAfterFeed();
  // a line that only continues a statement gets no answer to wake the queue: go on with the next one
  if (startupQueue.length > 0) drainTimer = setTimeout(drainStartupQueue, 0);
}

// The rest of the startup banner: the engine's version (the release codename is the 2.0 line's) and the help hint
let engineVersion = null;
let bannerPrinted = false;
function printBanner() {
  if (bannerPrinted) return;
  bannerPrinted = true;
  term.write('DuckDB' + (engineVersion ? ' ' + engineVersion : '') + ' (Cyanoptera)\r\n');
  term.write('\x1b[90mEnter ".help" for usage hints.\x1b[0m\r\n');
}

function loadFrontendWasm() {
  setStatus('loading shell WASM...');
  window.Module = {
    // the content-hashed frontend: emscripten's glue asks for 'duckdb.wasm'
    locateFile: (path, prefix) => path === 'duckdb.wasm' ? SHELL_ASSETS.shellWasm : prefix + path,
    print: onWasmPrint,
    printErr: onWasmPrintErr,
    onRuntimeInitialized: () => {
      wasmModule = window.Module;
      wasmModule.onWasmOutput = function(bytes) {
        const text = new TextDecoder().decode(bytes);
        term.write(text.replaceAll('\n', '\r\n'));
      };
      // Use connId=1 — the worker manages the real connection internally
      wasmModule._wasm_init(1n); // uint64_t: a BigInt under WASM_BIGINT
      // the engine may or may not be up yet: with it the prompt is query-backed, without it static
      wasmModule._wasm_set_backend_ready(workerReady ? 1 : 0);
      initDone = true;
      term.write('\r\n\x1b[90mDuckDB Web Shell running...\x1b[0m\r\n');
      // the version line is the engine's: with the engine up the rest of the banner follows now, otherwise
      // when it comes up
      if (workerReady) printBanner();
      wasmModule._wasm_start_editing();
      flushPending();

      // Queue commands from URL hash (e.g. #queries=v0,SELECT-42,FROM-range(10))
      const hash = window.location.hash;
      const isDemo = new URLSearchParams(location.search).has('demo');

      if (hash.includes('queries=v0')) {
        // the queries are separated by raw commas (a comma inside a query is %2C); a newline inside a query stays one,
        // so a multi-line statement is fed whole, as a paste, and not as one query per line
        const splits = hash.replace(/^#(savequeries&)?/, '').split(',');
        for (let i = 1; i < splits.length; i++) {
          const sql = extraswaps(decodeShareComponent(splits[i]));
          if (sql) {
            startedFromLink = true;
            if (isDemo) {
              window.demoQueue.push(sql);
            } else {
              startupQueue.push(sql);
            }
          }
        }
      }

      // Scripts handed over by an embedding page (see shell-boot); they run after the URL hash ones,
      // whole: the frontend splits the statements and continues incomplete lines, as it does for a paste.
      window.embedTakeQueue = () => {
        while (EMBED_QUEUE.length > 0) {
          const { sql, origin } = EMBED_QUEUE.shift();
          term.write('\x1b[90m-- queries from ' + origin + '\x1b[0m\r\n');
          (isDemo ? window.demoQueue : startupQueue).push(sql);
        }
        if (!isDemo) drainStartupQueue();
      };
      window.embedTakeQueue();

      if (isDemo && window.demoQueue.length > 0) {
        // Show play button
        const demoBtn = document.getElementById('nav-demo');
        demoBtn.style.visibility = 'visible';
        if (window.demoQueue.length > 0) demoBtn.setAttribute('data-tooltip', window.demoQueue[0]);
        demoBtn.title = window.demoQueue.length > 0 ? window.demoQueue[0] : '';
        window.demoUpdateButton();
      } else {
        drainStartupQueue();
      }
    },
  };

  const script = document.createElement('script');
  script.src = SHELL_WASM_JS_URL;
  document.body.appendChild(script);
}

// === .aws: sign in to AWS from the page; the credentials reach DuckDB as a hidden secret ===
// Credentials live in page memory only and do not survive a reload.
// Testing profile; production use requires AWS approval of this client, endpoint and callback.
const AWS_SIGNIN_CONFIG = Object.freeze({
  endpoint: 'https://us-east-1.testing.oauth.signin.aws',
  clientId: 'arn:aws:signin:::devtools/duckdb-testing',
  redirectUri: location.origin + '/oauth/callback', // TODO: Before production, remove temporary any-origin login and restore the approved origin check and fixed registered callback.
});
const AWS_REGION_RE = /^[a-z]{2}(-gov)?-[a-z]+-\d$/;
window.awsSession = null;

const awsB64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const awsUtf8 = (s) => new TextEncoder().encode(s);
const awsLink = (url, label) => '\x1b]8;;' + url + '\x07' + (label || url) + '\x1b]8;;\x07';
// AWS Sign-In's error codes, in the user's terms
const AWS_ERRORS = {
  AUTHCODE_EXPIRED: 'the code has expired or was already used; run .aws login again',
  INSUFFICIENT_PERMISSIONS: 'this principal may not use AWS Sign-In for developer tools (it needs the SignInLocalDevelopmentAccess policy, actions signin:AuthorizeOAuth2Access and signin:CreateOAuth2Token)',
  TOKEN_EXPIRED: 'the console session has ended',
  USER_CREDENTIALS_CHANGED: 'the password of this principal changed, the session is no longer valid',
};

// RFC 9449 proof: ES256 JWS over {htm, htu, iat, jti} carrying the public key, signed with the session's
// non-extractable key (WebCrypto returns the raw r||s signature JWS expects)
async function awsDpopProof(keys, url) {
  const jwk = await crypto.subtle.exportKey('jwk', keys.publicKey);
  const header = { typ: 'dpop+jwt', alg: 'ES256', jwk: { kty: 'EC', x: jwk.x, y: jwk.y, crv: 'P-256' } };
  const payload = { htm: 'POST', htu: url, iat: Math.floor(Date.now() / 1000), jti: crypto.randomUUID() };
  const input = awsB64url(awsUtf8(JSON.stringify(header))) + '.' + awsB64url(awsUtf8(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, keys.privateKey, awsUtf8(input));
  return input + '.' + awsB64url(signature);
}

async function awsTokenRequest(session, body) {
  const url = AWS_SIGNIN_CONFIG.endpoint + '/v1/token';
  const proof = await awsDpopProof(session.keys, url);
  let res;
  try {
    res = await fetch(url, { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json', 'DPoP': proof }, body: JSON.stringify({ ...body, clientId: AWS_SIGNIN_CONFIG.clientId }) });
  } catch (e) {
    throw new Error('Could not reach AWS Sign-In at ' + url + '. Check network access and browser CORS support.');
  }
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) { /* not JSON */ }
  if (!res.ok) {
    const code = json && json.error;
    throw new Error('AWS Sign-In: ' + (code ? (AWS_ERRORS[code] || code + (json.message ? ' — ' + json.message : '')) : res.status + ' ' + text.slice(0, 200)));
  }
  return json.tokenOutput || json;
}

// The worker answers a query with the wire metadata: [has_error u8] [u32 len] [message]
function awsWireError(data) {
  if (!data || data.length < 5 || data[0] === 0) return null;
  const len = new DataView(data.buffer, data.byteOffset + 1, 4).getUint32(0, true);
  return new TextDecoder().decode(data.subarray(5, 5 + len));
}

async function awsRunHidden(sql) {
  const data = await sendToWorkerAsync('query', { sql, castMode: 0 });
  const error = awsWireError(data);
  if (error) throw new Error(error);
}

const awsQuote = (v) => "'" + String(v).replace(/'/g, "''") + "'";

let awsSecretUpdate = Promise.resolve();
function awsUpdateSecrets(operation) {
  const pending = awsSecretUpdate.then(operation);
  // Logout must finish after any in-flight CREATE, even when that CREATE fails.
  awsSecretUpdate = pending.catch(() => {});
  return pending;
}

// Two secrets from the same credentials: `aws` (TYPE s3) signs s3:// through httpfs, `aws_sdk` (TYPE aws) signs
// the aws extension's own calls (CloudFormation, Redshift, RDS, ...). The second needs the aws extension, which
// CREATE SECRET autoloads; where that is not possible the s3 secret stands alone and the status says why.
function awsInstallSecret(s) {
  return awsUpdateSecrets(async () => {
    if (window.awsSession !== s) return;
    const creds = `KEY_ID ${awsQuote(s.creds.accessKeyId)}, SECRET ${awsQuote(s.creds.secretAccessKey)}, SESSION_TOKEN ${awsQuote(s.creds.sessionToken)}, REGION ${awsQuote(s.region)}`;
    await awsRunHidden(`CREATE OR REPLACE SECRET aws (TYPE s3, ${creds})`);
    if (window.awsSession !== s) return;
    try {
      await awsRunHidden(`CREATE OR REPLACE SECRET aws_sdk (TYPE aws, ${creds})`);
      s.sdkSecret = true;
      delete s.sdkSecretError;
    } catch (e) {
      s.sdkSecret = false;
      s.sdkSecretError = e.message;
    }
  });
}

const awsSecretsLine = (s) => 'Secret \x1b[1maws\x1b[0m (TYPE s3, REGION ' + s.region + ') is active for s3://' + (s.sdkSecret ? ' and \x1b[1maws_sdk\x1b[0m (TYPE aws) for the aws extension' : '');
const awsSdkSecretNote = (s) => s.sdkSecret ? '' : '\x1b[90m(no aws_sdk secret: ' + s.sdkSecretError + ')\x1b[0m\r\n';

function awsTakeTokens(s, out) {
  s.creds = out.accessToken;
  s.refreshToken = out.refreshToken;
  s.expiresAt = Date.now() + (out.expiresIn || 900) * 1000;
  if (out.idToken) {
    const claims = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(out.idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))));
    s.identity = claims.sub || '';
    s.accountId = (s.identity.split(':')[4]) || '';
  }
}

function awsScheduleRefresh(s) {
  if (window.awsSession !== s) return;
  clearTimeout(s.timer);
  s.timer = setTimeout(async () => {
    if (window.awsSession !== s) return;
    try {
      const out = await awsTokenRequest(s, { grantType: 'refresh_token', refreshToken: s.refreshToken });
      if (window.awsSession !== s) return;
      awsTakeTokens(s, out);
      await awsInstallSecret(s);
      awsScheduleRefresh(s);
    } catch (e) {
      if (window.awsSession !== s) return;
      await awsLogout(false);
      term.write('\r\n\x1b[31mAWS credentials not refreshed (' + e.message + '); secrets aws and aws_sdk dropped. Run .aws login again.\x1b[0m\r\n');
      if (wasmModule && wasmModule._wasm_is_editing() && wasmModule._wasm_is_line_empty()) {
        wasmModule._wasm_start_editing();
      }
    }
  }, Math.max(5000, s.expiresAt - Date.now() - 60000));
}

async function awsLoginStart(region) {
  let channel;
  try {
    channel = new BroadcastChannel('duckdb-shell-aws');
  } catch (e) {
    throw new Error('AWS sign-in requires BroadcastChannel support. Use a browser that allows communication between shell tabs.');
  }
  try {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const codeVerifier = Array.from(crypto.getRandomValues(new Uint8Array(64)), b => alphabet[b % alphabet.length]).join('');
    const challenge = awsB64url(await crypto.subtle.digest('SHA-256', awsUtf8(codeVerifier)));
    const keys = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
    const state = crypto.randomUUID();
    if (window.awsSession) await awsLogout(false);
    const s = window.awsSession = { region, codeVerifier, state, keys, startedAt: Date.now(), channel };
    channel.onmessage = (e) => {
      if (!e.data || e.data.state !== s.state) return;
      if (typeof e.data.error === 'string' && e.data.error) awsCallbackFailed(s, e.data.error, e.data.error_description);
      else if (typeof e.data.code === 'string' && e.data.code) return awsCallbackArrived(s, e.data.code);
    };
    const params = new URLSearchParams({ response_type: 'code', client_id: AWS_SIGNIN_CONFIG.clientId, state, code_challenge_method: 'SHA-256', scope: 'openid', redirect_uri: AWS_SIGNIN_CONFIG.redirectUri, code_challenge: challenge });
    const url = AWS_SIGNIN_CONFIG.endpoint + '/v1/authorize?' + params.toString();
    // The link also works when the browser blocks the sign-in tab.
    window.open(url, '_blank', 'noopener');
    term.write('Use the AWS tab to sign in, or open ' + awsLink(url, 'AWS Sign-In') + ' in a new tab. Return here after signing in.\r\n');
  } catch (e) {
    channel.close();
    if (window.awsSession && window.awsSession.channel === channel) window.awsSession = null;
    throw e;
  }
}

// The code reached this tab: exchange it, install the secret, say so
async function awsExchange(s, code) {
  const out = await awsTokenRequest(s, { grantType: 'authorization_code', code, codeVerifier: s.codeVerifier, redirectUri: AWS_SIGNIN_CONFIG.redirectUri });
  if (window.awsSession !== s) return;
  delete s.codeVerifier;
  delete s.state;
  if (s.channel) { s.channel.close(); delete s.channel; }
  awsTakeTokens(s, out);
  await awsInstallSecret(s);
  if (window.awsSession !== s) return;
  awsScheduleRefresh(s);
  term.write('Signed in as \x1b[1m' + s.identity + '\x1b[0m\r\n');
  term.write(awsSecretsLine(s) + '; credentials rotate every ' + Math.round((out.expiresIn || 900) / 60) + ' min until the console session ends. .aws for status, .aws logout to end.\r\n');
  term.write(awsSdkSecretNote(s));
}

// The callback page posted the code while the user sits at the prompt: finish in the background and redraw
async function awsCallbackArrived(s, code) {
  if (window.awsSession !== s || !s.codeVerifier || s.exchanging) return;
  s.exchanging = true;
  const wasEditing = wasmModule && wasmModule._wasm_is_editing();
  if (wasEditing) term.write('\r\x1b[2K');
  window.asyncBusy = true;
  try {
    await awsExchange(s, code);
  } catch (e) {
    if (window.awsSession === s) await awsLogout(false);
    term.write('\x1b[31m' + e.message + ' Run .aws login again.\x1b[0m\r\n');
  } finally {
    window.asyncBusy = false;
    if (wasEditing) { wasmModule._wasm_start_editing(); flushPending(); }
  }
}

// The sign-in tab came back with an error (the user denied, the client may not use this redirect, ...)
function awsCallbackFailed(s, error, description) {
  if (window.awsSession !== s || !s.codeVerifier) return;
  const wasEditing = wasmModule && wasmModule._wasm_is_editing();
  if (wasEditing) term.write('\r\x1b[2K');
  term.write('\x1b[31mAWS Sign-In: ' + (AWS_ERRORS[error] || error + (description ? ' — ' + description : '')) + '\x1b[0m\r\n');
  if (s.channel) s.channel.close();
  window.awsSession = null;
  if (wasEditing) { wasmModule._wasm_start_editing(); flushPending(); }
}

async function awsLogout(say) {
  const s = window.awsSession;
  window.awsSession = null;
  if (!s) { if (say) term.write('Not signed in to AWS.\r\n'); return; }
  clearTimeout(s.timer);
  if (s.channel) s.channel.close();
  if (s.creds && workerReady) {
    await awsUpdateSecrets(async () => {
      for (const name of ['aws', 'aws_sdk']) {
        try { await awsRunHidden('DROP SECRET IF EXISTS ' + name); } catch (e) { /* the engine may be mid-query; the secrets die with the page anyway */ }
      }
    });
  }
  if (say) term.write('Signed out of AWS; secrets aws and aws_sdk dropped.\r\n');
}

function awsStatus() {
  const s = window.awsSession;
  if (!s || !s.creds) {
    term.write(s ? 'AWS sign-in started; waiting for the callback.\r\n' : 'Not signed in to AWS. Run .aws login [region].\r\n');
    return;
  }
  const left = Math.max(0, Math.round((s.expiresAt - 60000 - Date.now()) / 1000));
  const since = Math.round((Date.now() - s.startedAt) / 60000);
  term.write('Signed in as \x1b[1m' + s.identity + '\x1b[0m (account ' + s.accountId + ', region ' + s.region + ') since ' + (since < 1 ? 'less than a minute' : since + ' min') + '\r\n');
  term.write(awsSecretsLine(s) + '; credentials rotate in ' + Math.floor(left / 60) + 'm' + String(left % 60).padStart(2, '0') + 's, directly with AWS. .aws logout ends the session.\r\n');
  term.write(awsSdkSecretNote(s));
}

// Sign-in needs a session that only the user typed into. Statements queued by a link ran unread, and a link can
// switch the extension signature check off: both would act with the credentials.
function awsRequireCleanSession() {
  const reason = startedFromLink ? 'this session was opened with queries in its link'
    : ALLOW_UNSIGNED_EXTENSIONS ? 'this session allows unsigned extensions' : null;
  if (!reason) return;
  throw new Error('.aws login is not available: ' + reason + '. Open ' + awsLink(location.origin + location.pathname) + ' in a new tab and sign in there.');
}

window.awsCommand = (args) => {
  const parts = args.trim().split(/\s+/).filter(Boolean);
  const run = async () => {
    if (window.parent !== window) throw new Error('.aws is not available while the shell is embedded in another page');
    const sub = parts[0] || 'status';
    const usage = 'usage: .aws login [region]  |  .aws  |  .aws status  |  .aws logout';
    if (sub === 'login') {
      const arg = parts[1];
      if (parts.length > 2 || (arg && !AWS_REGION_RE.test(arg))) throw new Error(usage);
      awsRequireCleanSession();
      await awsLoginStart(arg || 'us-east-1');
    } else if (sub === 'logout' && parts.length === 1) {
      await awsLogout(true);
    } else if (sub === 'status' && parts.length <= 1) {
      awsStatus();
    } else {
      throw new Error(usage);
    }
  };
  window.asyncBusy = true;
  return run().catch(e => term.write('\x1b[31m' + e.message + '\x1b[0m\r\n')).finally(() => {
    window.asyncBusy = false;
    wasmModule._wasm_start_editing();
    flushPending();
  });
};

// === xterm.js input handling ===

term.onData((data) => {
  if (!initDone) return;

  // TODO: Ctrl+D normally exits the shell, but there's nowhere to "exit" in the browser.
  // Ignoring for now — could show a "Session ended" message or reset the terminal.
  if (data === '\x04') {
    return;
  }

  // Ctrl+L — clear screen and redraw prompt
  if (data === '\x0c') {
    window.termReset();
    if (wasmModule._wasm_is_editing()) {
      wasmModule._wasm_start_editing();
      flushPending();
    }
    return;
  }

  // Ctrl+C handling
  if (data === '\x03') {
    if (!wasmModule._wasm_is_editing()) {
      wasmModule._wasm_interrupt();
      flushPending();
    } else {
      // Clear any autocomplete artifacts below the cursor, then start fresh
      term.write('\x1b[J\r\n');
      wasmModule._wasm_start_editing();
      flushPending();
    }
    return;
  }

  const encoded = new TextEncoder().encode(data);
  const ptr = wasmModule._malloc(encoded.length);
  wasmModule.HEAPU8.set(encoded, ptr);
  wasmModule._wasm_feed_key(ptr, encoded.length);
  wasmModule._free(ptr);

  flushPending();

  settleAfterFeed();
});

// A synchronous dot command (.timer, .mode, ...) answers without the engine, so no response comes back to
// restart the prompt: do it here, and go on with input still buffered behind it (the rest of a paste).
function settleAfterFeed() {
  // bounded: each round consumes buffered input, and a frontend that declines to edit (a statement is in
  // flight) is left to the response that will restart it
  for (let round = 0; round < 10000; round++) {
    if (window.asyncBusy || !wasmModule._wasm_is_idle() || wasmModule._wasm_has_pending() || wasmModule._wasm_is_editing()) return;
    wasmModule._wasm_start_editing();
    flushPending();
    if (!wasmModule._wasm_is_editing() || !wasmModule._wasm_has_buffered_input()) return;
    wasmModule._wasm_feed_key(0, 0);
    flushPending();
  }
}

// === Boot sequence ===

async function boot() {
  // The shell frontend first: it is small and the prompt, highlighting and completion work without the
  // engine. The engine loads meanwhile; requests the shell issues before it is up wait in its queue.
  loadFrontendWasm();
  try {
    setStatus('loading DuckDB engine...');
    // the worker and its instantiate request were started in <head>; this awaits that answer
    await initWorker();

    setStatus('opening database...');
    const openConfig = ALLOW_UNSIGNED_EXTENSIONS ? JSON.stringify({ allowUnsignedExtensions: true }) : '';
    await sendToWorkerAsync('open', { config: openConfig });
    await sendToWorkerAsync('connect');
    try {
      engineVersion = firstValueOf(await sendToWorkerAsync('query', { sql: 'SELECT version()', castMode: 0 }));
    } catch (e) { /* the banner goes without it */ }

    workerReady = true;
    setStatus('');
    let promptRefreshed = false;
    if (wasmModule && initDone) {
      wasmModule._wasm_set_backend_ready(1);
      // an untouched static prompt becomes the real one; anything typed meanwhile is sent now
      if (wasmModule._wasm_is_editing() && wasmModule._wasm_is_line_empty()) {
        term.write('\r\x1b[2K');
        printBanner();
        wasmModule._wasm_start_editing();
        promptRefreshed = true;
      }
      flushPending();
    }
    // the queued queries of a link start after the real prompt is up: the answer to its query continues the
    // queue; with no prompt refresh to wait for, continue it here
    if (!promptRefreshed) drainStartupQueue();
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'duckdb-shell', status: 'ready' }, '*');
    }
  } catch (e) {
    setStatus('error: ' + e.message);
    console.error(e);
    if (initDone) printBanner();
  }
}

boot();
