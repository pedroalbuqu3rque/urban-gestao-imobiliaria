import "@fontsource-variable/archivo/index.css";
import "@fontsource-variable/dm-sans/index.css";
import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "URBAN · Gestão Imobiliária",
  description: "Imóveis, clientes e contratos no mesmo painel.",
};
const initializeTheme = `(() => {
  const system = matchMedia("(prefers-color-scheme: dark)");
  function apply() {
    let saved;
    try { saved = localStorage.getItem("urban-theme"); } catch {}
    document.documentElement.dataset.theme = saved === "light" || saved === "dark"
      ? saved : system.matches ? "dark" : "light";
  }
  apply();
  system.addEventListener("change", apply);
  window.addEventListener("storage", e => { if (!e.key || e.key === "urban-theme") apply(); });
})();`;

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: initializeTheme }} /></head>
      <body>{children}</body>
    </html>
  );
}
