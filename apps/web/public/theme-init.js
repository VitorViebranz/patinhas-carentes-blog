/* global window, document */
(function () {
    try {
        var stored = window.localStorage.getItem('patinhas-theme');
        var systemDark =
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-color-scheme: dark)').matches;
        var dark = stored === 'dark' || (stored !== 'light' && systemDark);
        document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    } catch {
        document.documentElement.dataset.theme = 'light';
    }
})();
