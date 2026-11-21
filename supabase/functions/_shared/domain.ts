import { z } from "zod";

export type Member = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "broker";
  team: string;
};
export type Kind = "properties" | "clients" | "deals" | "contracts";
export type Item = {
  id: string;
  created: string;
  owner: string;
  history: string[];
  data: Record<string, string>;
};
export type State = {
  name: string;
  city: string;
  weekly: boolean;
  alerts: boolean;
  properties: Item[];
  clients: Item[];
  deals: Item[];
  contracts: Item[];
};
export type Invite = {
  code: string;
  email: string;
  name: string;
  team: string;
  expires_at: string;
};
export type View = {
  state: State;
  me: Member;
  members: Member[];
  invites: Invite[];
  version: number;
};
export const kinds = ["properties", "clients", "deals", "contracts"] as const;
export const stages = [
  "Em prospecção",
  "Em atendimento",
  "Proposta enviada",
  "Negociação final",
  "Fechada",
];
export const money = (n: unknown) =>
  Number(n || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
export const today = () => new Date().toISOString().slice(0, 10);
export const empty = (name: string, city = ""): State => ({
  name,
  city,
  weekly: false,
  alerts: true,
  properties: [],
  clients: [],
  deals: [],
  contracts: [],
});
const str = z.string().trim().min(1, "Campo obrigatório").max(300);
const optional = z.string().trim().max(300).optional().default("");
const amount = z
  .string()
  .refine(
    (s) => Number.isFinite(Number(s)) && Number(s) > 0 && Number(s) <= 1e12,
    "Informe um valor positivo.",
  );
const date = z.iso.date("Informe uma data válida.");
export const schemas = {
  properties: z.object({
    name: str,
    code: str.transform((s) => s.toUpperCase()),
    type: z.enum(["Apartamento", "Casa", "Comercial"]),
    mode: z.enum(["Venda", "Locação"]),
    street: str,
    district: str,
    price: amount,
    status: z.enum(["Disponível", "Reservado", "Vendido", "Locado"]),
    published: z.enum(["Sim", "Não"]).default("Não"),
  }),
  clients: z.object({
    name: str,
    email: z.email("Informe um e-mail válido."),
    phone: optional,
    interest: z.enum(["Comprar", "Alugar"]),
    district: optional,
    propertyId: optional,
  }),
  deals: z.object({ name: str, clientId: str, propertyId: str, price: amount }),
  contracts: z.object({
    dealId: str,
    seller: str,
    start: date,
    end: z
      .union([date, z.literal("")])
      .optional()
      .default(""),
  }),
};
export const commandSchema = z.object({
  action: z.enum(["save", "advance", "note", "settings"]),
  kind: z.enum(kinds).optional(),
  id: z.string().max(100).optional(),
  data: z.record(z.string(), z.string().max(1200)).default({}),
});
export type Command = z.infer<typeof commandSchema>;
export function filterState(s: State, m: Member): State {
  if (m.role === "admin") return s;
  return {
    ...s,
    clients: s.clients.filter((r) => r.owner === m.id),
    deals: s.deals.filter((r) => r.owner === m.id),
    contracts: s.contracts.filter((r) => r.owner === m.id),
  };
}
function assert(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
function item(s: State, k: Kind, id: string | undefined) {
  const r = s[k].find((r) => r.id === id);
  assert(r, "Registro não encontrado.");
  return r;
}
function owned(r: Item, m: Member) {
  assert(
    m.role === "admin" || r.owner === m.id,
    "Ação restrita ao responsável ou administrador.",
  );
}
export function change(
  input: State,
  m: Member,
  raw: Command,
  now = new Date().toISOString(),
): State {
  const cmd = commandSchema.parse(raw),
    s = structuredClone(input),
    { action, kind, id, data } = cmd;
  const log = (r: Item, msg: string) =>
    r.history.unshift(now + " | " + m.name + " · " + msg);
  if (action === "settings") {
    assert(m.role === "admin", "Acesso restrito ao administrador.");
    s.name = str.parse(data.name);
    s.city = str.parse(data.city);
    s.weekly = data.weekly === "Sim";
    s.alerts = data.alerts === "Sim";
    return s;
  }
  assert(kind, "Selecione o módulo.");
  const existing = id ? item(s, kind, id) : undefined;
  if (existing) owned(existing, m);
  if (action === "note") {
    assert(existing && kind === "clients", "Selecione um cliente.");
    log(existing, "Atendimento: " + str.parse(data.note));
    return s;
  }
  if (action === "advance") {
    assert(existing, "Selecione um registro.");
    const r = existing;
    if (kind === "deals") {
      let i = stages.indexOf(r.data.stage);
      assert(i >= 0 && i < 4, "Negociação já fechada.");
      r.data.stage = stages[i + 1];
      log(r, r.data.stage);
    } else if (kind === "contracts") {
      const a = ["Em elaboração", "Em assinatura", "Assinado", "Concluído"];
      let i = a.indexOf(r.data.status);
      assert(i >= 0 && i < 3, "Operação já concluída.");
      r.data.status = a[i + 1];
      log(r, a[i + 1]);
      if (i === 2) {
        const p = item(s, "properties", r.data.propertyId);
        assert(
          !["Locado", "Vendido"].includes(p.data.status),
          "Imóvel indisponível para conclusão.",
        );
        p.data.status = r.data.mode === "Venda" ? "Vendido" : "Locado";
        p.data.published = "Não";
        log(p, "Operação concluída · " + r.data.code);
        r.data.completed = now.slice(0, 10);
      }
    } else throw new Error("Ação incompatível.");
    return s;
  }
  let parsed: Record<string, string> = schemas[kind].parse(data);
  if (kind === "properties") {
    assert(
      !s.properties.some((r) => r.id !== id && r.data.code === parsed.code),
      "Código de imóvel já cadastrado nesta imobiliária.",
    );
    if (existing && s.deals.some((r) => r.data.propertyId === id))
      assert(
        parsed.mode === existing.data.mode,
        "A modalidade está vinculada a uma negociação.",
      );
  }
  if (kind === "clients" && parsed.propertyId)
    item(s, "properties", parsed.propertyId);
  if (kind === "deals") {
    assert(!id, "Use a mudança de etapa.");
    const c = item(s, "clients", parsed.clientId);
    owned(c, m);
    const p = item(s, "properties", parsed.propertyId);
    assert(
      ["Disponível", "Reservado"].includes(p.data.status),
      "Imóvel indisponível.",
    );
    parsed = { ...parsed, stage: stages[0], mode: p.data.mode };
  }
  let owner = existing?.owner || m.id;
  if (kind === "contracts") {
    assert(!id, "Use a mudança de situação.");
    const d = item(s, "deals", parsed.dealId);
    owned(d, m);
    assert(
      d.data.stage === "Fechada",
      "Feche a negociação antes de gerar o contrato.",
    );
    assert(
      !s.contracts.some((r) => r.data.dealId === d.id),
      "Esta negociação já possui contrato.",
    );
    if (d.data.mode === "Locação")
      assert(
        parsed.end && parsed.end > parsed.start,
        "O término deve ser posterior ao início.",
      );
    owner = d.owner;
    parsed = {
      ...parsed,
      code: "CT-" + String(s.contracts.length + 1).padStart(3, "0"),
      name: d.data.name,
      clientId: d.data.clientId,
      propertyId: d.data.propertyId,
      price: d.data.price,
      mode: d.data.mode,
      status: "Em elaboração",
    };
  }
  const linked =
    kind === "clients" &&
    parsed.propertyId &&
    parsed.propertyId !== existing?.data.propertyId
      ? item(s, "properties", parsed.propertyId)
      : undefined;
  if (existing) {
    existing.data = parsed;
    log(existing, "Dados atualizados");
  } else {
    const r: Item = {
      id: crypto.randomUUID(),
      created: now,
      owner,
      data: parsed,
      history: [],
    };
    log(r, "Registro criado");
    s[kind].unshift(r);
  }
  if (linked)
    log(
      existing || s[kind][0],
      "Imóvel vinculado: " + linked.data.code + " · " + linked.data.name,
    );
  return s;
}
