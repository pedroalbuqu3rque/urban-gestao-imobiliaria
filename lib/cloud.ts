"use client";
import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const cloud = url && key ? createClient(url, key) : null;
export async function api(body?: unknown) {
  if (!cloud)
    throw Error(
      "O serviço de acesso está indisponível. Tente novamente em instantes.",
    );
  const sess = await cloud.auth.getSession();
  if (!sess.data.session) throw Error("Entre para continuar.");
  const r = await fetch("/api/workspace", {
    method: body ? "POST" : "GET",
    cache: "no-store",
    headers: {
      authorization: "Bearer " + sess.data.session.access_token,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const d = await r.json();
  if (!r.ok) throw Error(d.error || "Não foi possível concluir.");
  return d;
}
