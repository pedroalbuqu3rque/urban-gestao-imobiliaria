import { createClient } from "npm:@supabase/supabase-js@2.76.1";
import { randomBytes } from "node:crypto";
import { z } from "npm:zod@4.6.7";
import { change, empty, filterState, Member, State } from "../_shared/domain.ts";

type Row = {
  user_id: string;
  name: string;
  email: string | null;
  role: "admin" | "broker";
  team?: string | null;
  org_id: string;
};
const member = (r: Row): Member => ({
  id: r.user_id,
  name: r.name,
  email: r.email || "",
  role: r.role,
  team: r.team || "",
});
const response = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
async function handle(req: Request) {
  const url = Deno.env.get("SUPABASE_URL"),
    key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key)
    return response(
      { error: "Conecte o Supabase para usar contas reais." },
      503,
    );
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return response({ error: "Entre novamente." }, 401);
  const db = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
    error,
  } = await db.auth.getUser(token);
  if (error || !user || !user.email)
    return response({ error: "Sessão expirada." }, 401);
  const body = req.method === "POST" ? await req.json() : {};
  const text = z.string().trim().min(1).max(180);
  if (body.type === "accept") {
    let code = z
      .string()
      .regex(/^[a-f0-9]{48}$/)
      .parse(body.code);
    const a = await db.rpc("urban_accept", {
      p_user: user.id,
      p_email: user.email,
      p_code: code,
    });
    if (a.error)
      return response(
        { error: "Convite inválido, expirado ou incompatível com esta conta." },
        400,
      );
  }
  let mem = await db
    .from("urban_members")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (mem.error) throw mem.error;
  if (!mem.data && body.type === "bootstrap") {
    let name = text.parse(body.name),
      org = text.parse(body.org),
      city = text.parse(body.city);
    let a = await db.rpc("urban_bootstrap", {
      p_user: user.id,
      p_org: org,
      p_name: name,
      p_state: empty(org, city),
    });
    if (a.error) throw a.error;
    mem = await db
      .from("urban_members")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (mem.error) throw mem.error;
  }
  if (!mem.data) return response({ needsOrg: true });
  const me = member(mem.data),
    org = mem.data.org_id;
  const read = () =>
    db.from("urban_workspaces").select("state,version").eq("id", org).single();
  let w = await read();
  if (w.error) throw w.error;
  if (body.type === "command") {
    if (body.version !== w.data!.version)
      return response(
        { error: "Os dados mudaram. Atualize e tente novamente." },
        409,
      );
    let state: State;
    try {
      state = change(w.data!.state, me, body.command);
    } catch (e) {
      return response(
        {
          error:
            e instanceof z.ZodError
              ? e.issues[0].message
              : (e as Error).message,
        },
        400,
      );
    }
    const a = await db.rpc("urban_commit", {
      p_org: org,
      p_version: body.version,
      p_state: state,
      p_name: state.name,
    });
    if (a.error) throw a.error;
    if (!a.data)
      return response(
        { error: "Outra alteração ocorreu. Atualize a tela." },
        409,
      );
    w = await read();
    if (w.error) throw w.error;
  }
  if (body.type === "invite") {
    if (me.role !== "admin")
      return response({ error: "Acesso restrito ao administrador." }, 403);
    let invite = {
      org_id: org,
      name: text.parse(body.name),
      team: text.parse(body.team),
      email: z.email().parse(body.email).toLowerCase(),
      code: randomBytes(24).toString("hex"),
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    };
    let a = await db.from("urban_invitations").insert(invite);
    if (a.error)
      return response(
        {
          error:
            "Não foi possível criar o convite. Verifique convites pendentes.",
        },
        400,
      );
  }
  const members = await db.from("urban_members").select("*").eq("org_id", org);
  if (members.error) throw members.error;
  const invites =
    me.role === "admin"
      ? await db
          .from("urban_invitations")
          .select("name,email,team,code,expires_at")
          .eq("org_id", org)
          .gt("expires_at", new Date().toISOString())
      : { data: [], error: null };
  if (invites.error) throw invites.error;
  return response({
    state: filterState(w.data!.state, me),
    version: w.data!.version,
    me,
    members: members.data.map(member),
    invites: invites.data,
  });
}
async function route(req: Request) {
  try {
    return await handle(req);
  } catch (e) {
    if (e instanceof z.ZodError || e instanceof SyntaxError)
      return response({ error: "Confira os dados informados." }, 400);
    return response(
      {
        error:
          "Não foi possível acessar a imobiliária. Confira a configuração do banco e tente novamente.",
      },
      500,
    );
  }
}
Deno.serve(route);
