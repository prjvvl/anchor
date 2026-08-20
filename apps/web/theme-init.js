(function () {
  const stored = localStorage.getItem("anchor-theme");
  const theme = stored || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  document.documentElement.setAttribute("data-theme", theme);
})();
