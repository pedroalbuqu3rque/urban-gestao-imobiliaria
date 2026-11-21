import { State, Kind, Item, Member } from "./domain";
export type Field = {
  key: string;
  label: string;
  type?: string;
  options?: [string, string][];
  required?: boolean;
  initial?: string;
  wide?: boolean;
};
const choices = (list: string[]) => list.map((v) => [v, v] as [string, string]);
export function fields(kind: Kind, s: State): Field[] {
  const prop = s.properties.map(
    (r) => [r.id, r.data.code + " · " + r.data.name] as [string, string],
  );
  if (kind === "properties")
    return [
      { key: "name", label: "Nome do imóvel", required: true, wide: true },
      { key: "code", label: "Código", required: true },
      {
        key: "type",
        label: "Tipo",
        options: choices(["Apartamento", "Casa", "Comercial"]),
      },
      {
        key: "mode",
        label: "Finalidade",
        options: choices(["Venda", "Locação"]),
      },
      {
        key: "price",
        label: "Valor anunciado (R$)",
        type: "number",
        required: true,
      },
      { key: "street", label: "Endereço", required: true },
      { key: "district", label: "Bairro", required: true },
      {
        key: "status",
        label: "Disponibilidade",
        options: choices(["Disponível", "Reservado", "Vendido", "Locado"]),
      },
      {
        key: "published",
        label: "Publicado",
        options: choices(["Não", "Sim"]),
      },
    ];
  if (kind === "clients")
    return [
      { key: "name", label: "Nome completo", required: true, wide: true },
      { key: "email", label: "E-mail", type: "email", required: true },
      { key: "phone", label: "Telefone" },
      {
        key: "interest",
        label: "Interesse",
        options: choices(["Comprar", "Alugar"]),
      },
      { key: "district", label: "Bairro de interesse" },
      {
        key: "propertyId",
        label: "Imóvel de interesse",
        options: [["", "Sem vínculo"], ...prop],
        wide: true,
      },
    ];
  if (kind === "deals")
    return [
      { key: "name", label: "Nome da negociação", required: true, wide: true },
      {
        key: "clientId",
        label: "Cliente",
        options: s.clients.map((r) => [r.id, r.data.name]),
        required: true,
      },
      {
        key: "propertyId",
        label: "Imóvel",
        options: prop.filter(([id]) =>
          ["Disponível", "Reservado"].includes(
            s.properties.find((r) => r.id === id)!.data.status,
          ),
        ),
        required: true,
      },
      {
        key: "price",
        label: "Valor negociado (R$)",
        required: true,
        type: "number",
      },
    ];
  return [
    {
      key: "dealId",
      label: "Negociação fechada",
      options: s.deals
        .filter(
          (r) =>
            r.data.stage === "Fechada" &&
            !s.contracts.some((c) => c.data.dealId === r.id),
        )
        .map((r) => [r.id, r.data.name]),
      wide: true,
      required: true,
    },
    {
      key: "seller",
      label: "Proprietário ou vendedor",
      required: true,
      wide: true,
    },
    { key: "start", label: "Data de início", type: "date", required: true },
    { key: "end", label: "Término (locações)", type: "date" },
  ];
}
export const names: Record<string, string> = {
  name: "Nome",
  code: "Código",
  type: "Tipo",
  mode: "Modalidade",
  street: "Endereço",
  district: "Bairro",
  status: "Situação",
  published: "Publicado",
  price: "Valor",
  phone: "Telefone",
  email: "E-mail",
  interest: "Interesse",
  stage: "Etapa",
  propertyId: "Imóvel",
  clientId: "Cliente",
  dealId: "Negociação",
  seller: "Proprietário",
  start: "Início",
  end: "Término",
  completed: "Conclusão",
};
export function value(s: State, k: string, v: string) {
  if (!v) return "—";
  if (k === "propertyId")
    return s.properties.find((r) => r.id === v)?.data.name || "—";
  if (k === "clientId")
    return s.clients.find((r) => r.id === v)?.data.name || "—";
  if (k === "dealId") return s.deals.find((r) => r.id === v)?.data.name || "—";
  if (k === "price")
    return Number(v).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  if (["start", "end", "completed"].includes(k))
    return v.split("-").reverse().join("/");
  return v;
}
export const tabs = [
  ["home", "Dashboard", "dashboard"],
  ["properties", "Imóveis", "imoveis"],
  ["clients", "Clientes", "clientes"],
  ["team", "Equipe", "equipe"],
  ["deals", "Negociações", "negociacoes"],
  ["contracts", "Contratos", "contratos"],
  ["operations", "Locações e vendas", "imoveis"],
  ["reports", "Relatórios", "relatorios"],
  ["settings", "Configurações", "configuracoes"],
] as const;
export const addLabel: Record<Kind, string> = {
  properties: "Cadastrar imóvel",
  clients: "Cadastrar cliente",
  deals: "Nova negociação",
  contracts: "Novo contrato",
};
