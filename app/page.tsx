"use client";
import { useEffect, useState } from "react";
import { Landing } from "@/components/Landing";
import { Workspace } from "@/components/Workspace";
import { Auth } from "@/components/Auth";
import { cloud, api } from "@/lib/cloud";
import { View, Command } from "@/lib/domain";
import { tabs } from "@/lib/forms";
const readParams = () => new URLSearchParams(location.search);
export default function Page() {
  const [page, P] = useState("landing"),
    [tab, T] = useState("home"),
    [v, V] = useState<View | null>(null),
    [invite, I] = useState(""),
    [error, E] = useState("");
  function route(p: string, t?: string, replace = false) {
    let u = new URL(location.href);
    u.hash = "";
    u.searchParams.delete("page");
    u.searchParams.delete("tab");
    if (!["landing", "app"].includes(p)) u.searchParams.set("page", p);
    if (p === "app") u.searchParams.set("tab", t || "home");
    if (p === "landing" || p === "app") u.searchParams.delete("invite");
    history[replace ? "replaceState" : "pushState"]({}, "", u);
    P(p);
    window.scrollTo(0, 0);
    if (t) T(t);
  }
  function go(p: string) {
    E("");
    route(p);
  }
  function ready(data: View) {
    V(data);
    I("");
    route("app", "home", true);
  }
  useEffect(() => {
    let live = true;
    async function sync() {
      const q = readParams(),
        inv = q.get("invite") || "",
        p = q.get("page") || "",
        raw = q.get("tab") || "home",
        t = tabs.some((x) => x[0] === raw) ? raw : "home";
      I(inv);
      if (["login", "signup", "reset", "password"].includes(p)) {
        P(p);
        return;
      }
      if (inv) {
        P("login");
      }
      if (cloud) {
        let session = await cloud.auth.getSession();
        if (!live) return;
        if (session.data.session && (inv || p === "org" || q.has("tab") || !p)) {
          try {
            let view = await api(
              inv ? { type: "accept", code: inv } : undefined,
            );
            if (!live) return;
            if (view.needsOrg) {
              route("org", undefined, true);
              return;
            }
            V(view);
            I("");
            route("app", t, true);
            return;
          } catch (e) {
            E((e as Error).message);
            P("login");
            return;
          }
        }
      }
      P(inv || p === "org" || q.has("tab") ? "login" : "landing");
    }
    const pop = () => {
      void sync();
    };
    void sync().catch((e) => E(e.message));
    const listener = cloud?.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        V(null);
        if (readParams().has("tab")) route("login", undefined, true);
      }
    });
    window.addEventListener("popstate", pop);
    return () => {
      live = false;
      listener?.data.subscription.unsubscribe();
      window.removeEventListener("popstate", pop);
    };
  }, []);
  async function send(cmd: Command) {
    if (!v) return;
    try {
      V(await api({ type: "command", version: v.version, command: cmd }));
    } catch (e) {
      try {
        V(await api());
      } catch {}
      throw e;
    }
  }
  async function createInvite(d: Record<string, string>) {
    if (!v) return;
    V(await api({ type: "invite", ...d }));
  }
  async function logout() {
    if (cloud) {
      const { error } = await cloud.auth.signOut({scope: "local"});
      if (error) { E("Não foi possível sair. Tente novamente."); return; }
    }
    V(null);
    I("");
    route("landing");
  }
  return (
    <>
      {error && (
        <p role="alert" className="alert error">
          {error}
        </p>
      )}
      {page === "app" && v ? (
        <Workspace
          v={v}
          tab={tab}
          go={(t) => route("app", t)}
          send={send}
          invite={createInvite}
          logout={logout}
        />
      ) : page === "landing" ? (
        <Landing go={go} />
      ) : (
        <Auth key={page} page={page} go={go} ready={ready} invite={invite} />
      )}
    </>
  );
}
