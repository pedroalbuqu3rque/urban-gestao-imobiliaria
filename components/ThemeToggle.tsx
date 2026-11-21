"use client";

export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const theme = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = theme;
    try { localStorage.setItem("urban-theme", theme); } catch {}
  }
  return (
    <button type="button" className="theme-toggle" onClick={toggle}>
      <span className="when-light" title="Ativar modo escuro">
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20.5 14a8.6 8.6 0 0 1-10.6-10.5A9 9 0 1 0 20.5 14Z" /></svg>
        <span className="sr-only">Ativar modo escuro</span>
      </span>
      <span className="when-dark" title="Ativar modo claro">
        <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>
        <span className="sr-only">Ativar modo claro</span>
      </span>
    </button>
  );
}
