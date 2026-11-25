// The shell's assets, in one place: the data- attributes of this script's tag in index.html, which is
// cached for minutes where this file is cached for hours. Preloaded from here, so that all four downloads
// start as soon as this script has loaded; the fetches later on reuse them
// (same-origin credentials, which is what the emscripten glue and the worker use).
const SHELL_ASSETS = {
  shellJs: document.currentScript.dataset.shellJs,       // the frontend shell (linenoise, parser, box renderer)
  shellWasm: document.currentScript.dataset.shellWasm,
  worker: document.currentScript.dataset.worker,         // the experimental wire worker
  engine: document.currentScript.dataset.engine,         // duckdb-wasm, fetched by the worker
};
for (const [key, url] of Object.entries(SHELL_ASSETS)) {
  if (!url) throw new Error('index.html: the shell-boot script tag has no data-' + key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()));
}
for (const [key, href] of [['shellJs', SHELL_ASSETS.shellJs], ['shellWasm', SHELL_ASSETS.shellWasm], ['worker', SHELL_ASSETS.worker]]) {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = key === 'shellJs' ? 'script' : key === 'worker' ? 'worker' : 'fetch';
  if (link.as === 'fetch') link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
}
// The engine is not preloaded: a document preload is not shared with a worker's fetch and it would
// download twice. The worker that uses it is started right here instead, with its instantiate request
// (tag 0); the shell's code adopts the worker and the queued answer later.
const ENGINE_URL = new URL(SHELL_ASSETS.engine, location.href).href;
const EARLY_WORKER = new Worker(SHELL_ASSETS.worker);
// A Worker's message event fires whether or not anyone listens: the engine's answer can arrive before the
// shell's code installs its handler (initWorker), so it waits here and is replayed then.
const EARLY_MESSAGES = [];
EARLY_WORKER.onmessage = (event) => { EARLY_MESSAGES.push(event); };
EARLY_WORKER.postMessage({ op: 'instantiate', tag: 0, mainModuleURL: ENGINE_URL });

// Embedding. A page that puts the shell in an iframe hands it the SQL to run as a plain string, so nothing
// has to be URL-encoded:
//   iframe.contentWindow.postMessage({ type: 'duckdb-shell', run: 'INSTALL AND LOAD h3 FROM community; ...' }, '*')
// Only the framing page is heard. A shell in a tab of its own takes no message, also not from the window that
// opened it: .aws login works only there, so SQL handed over by another page never runs next to AWS credentials.
// The shell answers { type: 'duckdb-shell', status: 'ready' } once the engine is up. The listener is installed
// here, before the frame's load event, and the scripts wait in EMBED_QUEUE until the shell takes them.
// `?embed` trims the page to the terminal, Share and the color mode.
const EMBED_QUEUE = [];
window.addEventListener('message', (event) => {
  if (window.parent === window || event.source !== window.parent) return;
  const data = event.data;
  if (!data || data.type !== 'duckdb-shell' || typeof data.run !== 'string') return;
  EMBED_QUEUE.push({ sql: data.run, origin: event.origin });
  if (window.embedTakeQueue) window.embedTakeQueue();
});
if (new URLSearchParams(location.search).has('embed')) {
  document.documentElement.classList.add('embed');
}
