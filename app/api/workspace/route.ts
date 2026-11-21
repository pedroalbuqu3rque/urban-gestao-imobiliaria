import { NextRequest } from "next/server";
export const dynamic = "force-dynamic";

async function workspace(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = request.headers.get("authorization");
  if (!token) return Response.json({error: "Entre para continuar."}, {status: 401});
  if (!url || !key) return Response.json({error: "Serviço indisponível."}, {status: 503});
  try {
    const result = await fetch(url + "/functions/v1/urban-workspace", {
      method: request.method,
      headers: {authorization: token, apikey: key, "Content-Type": "application/json"},
      body: request.method === "POST" ? await request.text() : undefined,
      cache: "no-store",
    });
    return new Response(result.body, {status: result.status, headers: {
      "Content-Type": "application/json", "Cache-Control": "private, no-store"
    }});
  } catch {
    return Response.json({error: "Serviço temporariamente indisponível. Tente novamente."}, {status: 503});
  }
}
export { workspace as GET, workspace as POST };
