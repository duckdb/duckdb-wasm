// The public callback route can serve this document instead of oauth/callback/index.html.
if (location.pathname.replace(/\/$/, '') === '/oauth/callback') {
  const q = new URLSearchParams(location.search);
  history.replaceState(null, '', location.pathname);
  const state = q.get('state'), code = q.get('code'), error = q.get('error');
  let message = 'Invalid AWS Sign-In response. Return to the shell tab and run .aws login again.';
  if (state && ((code && !error) || (error && !code))) {
    let channel;
    try {
      channel = new BroadcastChannel('duckdb-shell-aws');
      channel.postMessage({ state, code, error, error_description: q.get('error_description') });
      if (!error) setTimeout(() => window.close(), 300);
      message = error ? 'AWS Sign-In failed. Return to the shell tab for details.' : 'Return to the shell tab to finish signing in. If it did not continue, run .aws login again.';
    } catch (e) {
      message = 'Could not contact the shell tab. Return there and run .aws login again.';
    } finally {
      if (channel) channel.close();
    }
  }
  document.documentElement.innerHTML = '<head><meta charset="utf-8"><title>DuckDB shell: AWS sign-in</title></head>' +
    '<body style="font-family:system-ui;padding:2rem;max-width:40rem;margin:auto"><h2>AWS sign-in</h2><p></p></body>';
  document.querySelector('p').textContent = message;
  window.stop();                          // no more parsing or loading: the rest of the page must not boot
  throw new Error('callback handled');
}
