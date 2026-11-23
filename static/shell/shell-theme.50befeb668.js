// Early dark mode init (from duckdb.org) — prevents flash
(function() {
  function setDarkMode() {
    document.documentElement.classList.add("darkmode");
    document.documentElement.classList.add('disable-transitions');
    document.documentElement.style.backgroundColor = '#0d0d0d';
    document.documentElement.style.colorScheme = 'dark';
  }
  try {
    var userColorSchemePref = localStorage.getItem("mode");
    if (userColorSchemePref !== null) {
      if (userColorSchemePref === 'dark') { setDarkMode(); }
      return;
    }
  } catch (e) {}
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    setDarkMode();
  }
})();
