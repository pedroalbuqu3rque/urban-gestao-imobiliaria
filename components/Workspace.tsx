"use client";
import { ThemeToggle } from "./ThemeToggle";
import { useEffect, useState } from "react";
import {
  Member,
  View,
  Item,
  Kind,
  Command,
  stages,
  kinds,
  money,
  today,
} from "@/lib/domain";
import { fields, names, value, tabs, addLabel, Field } from "@/lib/forms";
import { Logo, Icon, Badge, Dialog, Form } from "./Shared";
import { Dashboard, palette, within } from "./Charts";
type Props = {
  v: View;
  tab: string;
  go: (t: string) => void;
  send: (c: Command) => Promise<void>;
  invite: (d: Record<string, string>) => Promise<void>;
  logout: () => void;
};
type Modal = {
  key:
    | "edit"
    | "detail"
    | "note"
    | "invite"
    | "lookup"
    | "notifications"
    | "profile";
  kind?: Kind;
  id?: string;
  initial?: Record<string, string>;
};
const subtitles: Record<string, string> = {
  home: "Visão geral da sua imobiliária",
  properties:
    "Consulte a carteira e acompanhe a disponibilidade de cada imóvel.",
  clients: "Acompanhe os interessados e o histórico de atendimento.",
  team: "Gerencie os profissionais, as equipes e os convites.",
  deals: "Do primeiro contato ao fechamento.",
  contracts: "Consulte as partes, os valores e a vigência de cada contrato.",
  operations: "Acompanhe as operações vinculadas aos contratos concluídos.",
  reports: "Consulte os resultados de vendas e locações por período.",
  settings: "Gerencie os dados da imobiliária e suas preferências.",
};
const columns: Record<Kind, string[]> = {
  properties: ["name", "code", "district", "mode", "price", "status"],
  clients: ["name", "email", "interest", "propertyId"],
  deals: ["name", "clientId", "price", "stage"],
  contracts: ["code", "name", "clientId", "mode", "price", "status"],
};
const csv = (rows: string[][]) => {
  const out = rows
    .map((row) =>
      row
        .map(
          (v) =>
            '"' +
            (/^[=+@-]/.test(v) ? "'" : "") +
            v.replaceAll('"', '""') +
            '"',
        )
        .join(";"),
    )
    .join("\r\n");
  let a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob(["\ufeff" + out], { type: "text/csv;charset=utf-8" }),
  );
  a.download = "urban-relatorio.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
export function Workspace({
  v,
  tab,
  go,
  send,
  invite,
  logout,
}: Props) {
  let s = v.state,
    kind = kinds.includes(tab as Kind) ? (tab as Kind) : null,
    admin = v.me.role === "admin";
  let [modal, setModal] = useState<Modal | null>(null),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState(""),
    [global, setGlobal] = useState(""),
    [nav, setNav] = useState(false),
    [days, setDays] = useState(30),
    [msg, setMsg] = useState(""),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState("");
  useEffect(() => {
    setSearch("");
    setFilter("");
    setNav(false);
    setModal(null);
    setMsg("");
  }, [tab]);
  const current =
    modal?.kind && modal.id
      ? s[modal.kind].find((r) => r.id === modal.id)
      : undefined;
  const edit = (k: Kind, initial?: Record<string, string>, id?: string) =>
    setModal({ key: "edit", kind: k, initial, id });
  const detail = (k: Kind, id: string) =>
    setModal({ key: "detail", kind: k, id });
  async function act(cmd: Command, message: string) {
    if (busy) return;
    setBusy(true);
    try {
      await send(cmd);
      setMsg(message);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const openTab = (t: string) => {
    setNav(false);
    setModal(null);
    go(t);
  };
  const fk =
    kind === "properties"
      ? "status"
      : kind === "clients"
        ? "interest"
        : kind === "contracts"
          ? "status"
          : "stage";
  const filtered = (
    kind ? s[kind] : s.contracts.filter((r) => r.data.status === "Concluído")
  ).filter(
    (r) =>
      (!filter || r.data[fk] === filter) &&
      Object.entries(r.data).some(([k, val]) =>
        value(s, k, val)
          .toLocaleLowerCase()
          .includes(search.toLocaleLowerCase()),
      ),
  );
  const ops = s.contracts.filter(
    (r) =>
      r.data.status === "Concluído" &&
      within(r.data.completed || r.created, days),
  );
  function table(rows: Item[], k: Kind) {
    return (
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              {columns[k].map((n) => (
                <th key={n}>{names[n]}</th>
              ))}
              <th>
                <span className="sr-only">Abrir</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                {columns[k].map((n, i) => (
                  <td key={n}>
                    {i === 0 ? (
                      <button
                        className="recordlink"
                        onClick={() => detail(k, r.id)}
                      >
                        {value(s, n, r.data[n])}
                      </button>
                    ) : ["status", "stage"].includes(n) ? (
                      <Badge text={r.data[n]} />
                    ) : (
                      value(s, n, r.data[n])
                    )}
                  </td>
                ))}
                <td>
                  <button
                    className="iconbtn"
                    aria-label={"Abrir " + r.data.name}
                    onClick={() => detail(k, r.id)}
                  >
                    <Icon name="abrir" size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="empty">Nenhum registro encontrado.</p>}
      </div>
    );
  }
  let title = tabs.find((x) => x[0] === tab)?.[1] || "Dashboard";
  return (
    <div className="desk">
      {nav && (
        <button
          className="shade"
          aria-label="Fechar menu"
          onClick={() => setNav(false)}
        />
      )}
      <aside className={"sidebar " + (nav ? "visible" : "")}>
        <Logo full />
        <nav>
          {tabs
            .filter(([k]) => k !== "settings" || admin)
            .map(([k, l, i]) => (
              <button
                className={k === tab ? "active" : ""}
                key={k}
                onClick={() => openTab(k)}
              >
                <Icon name={i} />
                {l}
              </button>
            ))}
        </nav>
        <button className="exit" onClick={logout}>
          Sair
        </button>
      </aside>
      <main className="workspace">
        <header className="bar">
          <button
            className="iconbtn burger"
            aria-label="Abrir menu"
            onClick={() => setNav(true)}
          >
            ☰
          </button>
          <button
            className="searchopen" aria-label="Buscar no sistema"
            onClick={() => {
              setGlobal("");
              setModal({ key: "lookup" });
            }}
          >
            <Icon name="busca" /> <span>Buscar no sistema…</span>
          </button>
          <strong className="tenant" title={s.name}>{s.name}</strong>
          <ThemeToggle />
          <button
            className="iconbtn bell"
            aria-label="Notificações"
            onClick={() => setModal({ key: "notifications" })}
          >
            <Icon name="notificacoes" />
            {s.alerts && s.deals.length > 0 && <i />}
          </button>
          <button
            className="avatar"
            aria-label="Perfil"
            onClick={() => setModal({ key: "profile" })}
          >
            {v.me.name
              .split(" ")
              .slice(0, 2)
              .map((x) => x[0])
              .join("")}
          </button>
        </header>
        <div className="content">
          <div className="pagehead">
            <div>
              <h1>{title}</h1>
              <p>{subtitles[tab]}</p>
            </div>
            {kind && (
              <button className="primary" onClick={() => edit(kind)}>
                {addLabel[kind]}
              </button>
            )}
            {tab === "team" && admin && (
              <button
                className="primary"
                onClick={() => setModal({ key: "invite" })}
              >
                Convidar membro
              </button>
            )}
            {["reports", "home"].includes(tab) && (
              <select
                aria-label="Período"
                value={days}
                onChange={(e) => setDays(+e.target.value)}
              >
                {[7, 30, 90, 365].map((d) => (
                  <option key={d} value={d}>
                    Últimos {d} dias
                  </option>
                ))}
              </select>
            )}
          </div>
          {msg && (
            <p role="status" className="notice">
              {msg}
              <button aria-label="Dispensar aviso" onClick={() => setMsg("")}>
                ×
              </button>
            </p>
          )}
          {tab === "home" && <Dashboard v={v} go={openTab} days={days} />}
          {(kind || tab === "operations") && (
            <section className="panel">
              <div className="filters">
                <input
                  aria-label="Buscar na carteira"
                  placeholder="Buscar por nome, código ou endereço…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {kind && (
                  <select
                    aria-label="Filtro de situação"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="">Todas as opções</option>
                    {[...new Set(s[kind].map((r) => r.data[fk]))]
                      .sort()
                      .map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                  </select>
                )}
                <small>{filtered.length} registros</small>
              </div>
              {kind === "deals" ? (
                <div className="kanban">
                  {stages.map((stage, i) => (
                    <section key={stage} style={{ borderTopColor: palette[i] }}>
                      <h3>{stage}</h3>
                      {filtered
                        .filter((r) => r.data.stage === stage)
                        .map((r) => (
                          <button
                            className="deal"
                            key={r.id}
                            onClick={() => detail("deals", r.id)}
                          >
                            <b>{r.data.name}</b>
                            <span>{value(s, "clientId", r.data.clientId)}</span>
                            <strong>{money(r.data.price)}</strong>
                          </button>
                        ))}
                    </section>
                  ))}
                </div>
              ) : (
                table(filtered, kind || "contracts")
              )}
            </section>
          )}
          {tab === "team" && (
            <section className="panel">
              <h2>Membros da equipe</h2>
              {v.members.map((m) => (
                <div className="row" key={m.id}>
                  <div>
                    <b>{m.name}</b>
                    <small>
                      {m.email} · {m.team || "Imobiliária"}
                    </small>
                  </div>
                  <span>
                    {m.role === "admin" ? "Administrador" : "Corretor"}
                  </span>
                  <Badge text="Ativo" />
                </div>
              ))}
              {v.invites.length > 0 && <h3>Convites pendentes</h3>}
              {v.invites.map((i) => (
                <div className="row" key={i.code}>
                  <div>
                    <b>{i.name}</b>
                    <small>
                      {i.email} · {i.team}
                    </small>
                  </div>
                  <Badge text="Pendente" />
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            location.origin + "/?invite=" + i.code,
                          );
                          setCopied(i.code);
                        } catch {
                          setMsg(location.origin + "/?invite=" + i.code);
                        }
                      }}
                    >
                      {copied === i.code ? "Copiado" : "Copiar link"}
                    </button>
                </div>
              ))}
            </section>
          )}
          {tab === "reports" && (
            <section className="panel">
              <div className="split">
                <h2>Operações concluídas</h2>
                <button
                  onClick={() =>
                    csv([
                      [
                        "Contrato",
                        "Imóvel",
                        "Modalidade",
                        "Valor (R$)",
                        "Conclusão",
                      ],
                      ...ops.map((r) => [
                        r.data.code,
                        r.data.name,
                        r.data.mode,
                        r.data.price,
                        r.data.completed,
                      ]),
                    ])
                  }
                >
                  Exportar CSV
                </button>
              </div>
              <div className="report-grid">
                {["Venda", "Locação"].map((mode, i) => {
                  let group = ops.filter((r) => r.data.mode === mode);
                  return (
                    <article key={mode}>
                      <small>{mode === "Venda" ? "Vendas" : "Locações"}</small>
                      <h2>{group.length}</h2>
                      <p>
                        {money(
                          group.reduce((n, r) => n + Number(r.data.price), 0),
                        )}
                        {i ? " / mês" : ""}
                      </p>
                      <div className="track">
                        <div
                          style={{
                            width:
                              (group.length / Math.max(1, ops.length)) * 100 +
                              "%",
                            background: palette[i],
                          }}
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
              {table(ops, "contracts")}
            </section>
          )}
          {tab === "settings" &&
            (admin ? (
              <section className="panel settings">
                <h2>Dados e preferências</h2>
                <Form
                  key={v.version}
                  fields={[
                    {
                      key: "name",
                      label: "Nome da imobiliária",
                      required: true,
                    },
                    { key: "city", label: "Cidade", required: true },
                    ...["alerts", "weekly"].map((key, i) => ({
                      key,
                      label: i
                        ? "Preferência de resumo semanal"
                        : "Exibir indicador de notificações",
                      options: [
                        ["Sim", "Sim"],
                        ["Não", "Não"],
                      ] as [string, string][],
                    })),
                  ]}
                  initial={{
                    name: s.name,
                    city: s.city,
                    alerts: s.alerts ? "Sim" : "Não",
                    weekly: s.weekly ? "Sim" : "Não",
                  }}
                  submit="Salvar alterações"
                  onSave={async (data) => {
                    await send({ action: "settings", data });
                    setMsg("Preferências salvas.");
                  }}
                />
              </section>
            ) : (
              <p>Acesso restrito ao administrador.</p>
            ))}
        </div>
      </main>
      {modal && (
        <Dialog
          title={
            modal.key === "edit"
              ? current
                ? "Editar registro"
                : addLabel[modal.kind!]
              : modal.key === "detail"
                ? current?.data.name || "Registro"
                : (
                    {
                      note: "Registrar atendimento",
                      invite: "Convidar membro",
                      lookup: "Busca no sistema",
                      notifications: "Notificações",
                      profile: "Seu perfil",
                    } as Record<string, string>
                  )[modal.key]
          }
          close={() => setModal(null)}
        >
          {modal.key === "edit" && (
            <Form
              fields={fields(modal.kind!, s)}
              initial={{ ...current?.data, ...modal.initial }}
              submit="Salvar"
              onSave={async (data) => {
                await send({
                  action: "save",
                  kind: modal.kind,
                  id: modal.id,
                  data,
                });
                setModal(null);
                setMsg("Registro salvo.");
              }}
            />
          )}
          {modal.key === "detail" && current && (
            <>
              <dl className="details">
                {Object.entries(current.data)
                  .filter(([, val]) => val)
                  .map(([k, val]) => (
                    <div key={k}>
                      <dt>{names[k] || k}</dt>
                      <dd>
                        {k === "status" || k === "stage" ? (
                          <Badge text={val} />
                        ) : (
                          value(s, k, val)
                        )}
                      </dd>
                    </div>
                  ))}
              </dl>
              <div className="buttons">
                {(admin || current.owner === v.me.id) && (
                  <>
                    {["properties", "clients"].includes(modal.kind!) && (
                      <button onClick={() => edit(modal.kind!, {}, current.id)}>
                        Editar
                      </button>
                    )}
                    {modal.kind === "properties" && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          act(
                            {
                              action: "save",
                              kind: "properties",
                              id: current.id,
                              data: {
                                ...current.data,
                                published:
                                  current.data.published === "Sim"
                                    ? "Não"
                                    : "Sim",
                              },
                            },
                            "Publicação atualizada.",
                          )
                        }
                      >
                        {current.data.published === "Sim"
                          ? "Retirar publicação"
                          : "Publicar imóvel"}
                      </button>
                    )}
                    {modal.kind === "clients" && (
                      <>
                        <button
                          onClick={() => setModal({ ...modal, key: "note" })}
                        >
                          Registrar atendimento
                        </button>
                        <button
                          onClick={() =>
                            edit("deals", {
                              name: "Negociação · " + current.data.name,
                              clientId: current.id,
                              propertyId: current.data.propertyId,
                            })
                          }
                        >
                          Criar negociação
                        </button>
                      </>
                    )}
                    {modal.kind === "deals" &&
                      (current.data.stage !== "Fechada" ? (
                        <button
                          disabled={busy}
                          className="primary"
                          onClick={() =>
                            act(
                              {
                                action: "advance",
                                kind: "deals",
                                id: current.id,
                                data: {},
                              },
                              "Etapa atualizada.",
                            )
                          }
                        >
                          Avançar para{" "}
                          {stages[stages.indexOf(current.data.stage) + 1]}
                        </button>
                      ) : s.contracts.some(
                          (r) => r.data.dealId === current.id,
                        ) ? (
                        <button
                          onClick={() =>
                            detail(
                              "contracts",
                              s.contracts.find(
                                (r) => r.data.dealId === current.id,
                              )!.id,
                            )
                          }
                        >
                          Ver contrato
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            edit("contracts", {
                              dealId: current.id,
                              start: today(),
                            })
                          }
                        >
                          Gerar contrato
                        </button>
                      ))}
                    {modal.kind === "contracts" &&
                      current.data.status !== "Concluído" && (
                        <button
                          className="primary"
                          disabled={busy}
                          onClick={() =>
                            act(
                              {
                                action: "advance",
                                kind: "contracts",
                                id: current.id,
                                data: {},
                              },
                              "Situação atualizada.",
                            )
                          }
                        >
                          {
                            {
                              "Em elaboração": "Enviar para assinatura",
                              "Em assinatura": "Registrar assinaturas",
                              Assinado: "Concluir operação",
                            }[current.data.status]
                          }
                        </button>
                      )}
                  </>
                )}
              </div>
              {msg && <p role="status">{msg}</p>}
              <h3>Histórico</h3>
              {current.history.map((h, i) => (
                <p className="history" key={i}>
                  <small>
                    {new Date(h.split(" | ")[0]).toLocaleString("pt-BR")}
                  </small>
                  {h.split(" | ")[1]}
                </p>
              ))}
            </>
          )}
          {modal.key === "note" && (
            <Form
              fields={[
                {
                  key: "note",
                  label: "Resumo do atendimento",
                  wide: true,
                  required: true,
                },
              ]}
              submit="Salvar atendimento"
              onSave={async (data) => {
                await send({
                  action: "note",
                  kind: "clients",
                  id: modal.id,
                  data,
                });
                setModal({ ...modal, key: "detail" });
              }}
            />
          )}
          {modal.key === "invite" && (
            <>
              <p>
                O convite é válido por sete dias. Compartilhe o link com o
                endereço convidado.
              </p>
              <Form
                fields={[
                  { key: "name", label: "Nome completo", required: true },
                  {
                    key: "email",
                    label: "E-mail",
                    type: "email",
                    required: true,
                  },
                  { key: "team", label: "Equipe", required: true, wide: true },
                ]}
                submit="Criar convite"
                onSave={async (d) => {
                  await invite(d);
                  setModal(null);
                  setMsg("Convite criado.");
                }}
              />
            </>
          )}
          {modal.key === "lookup" && (
            <>
              <input
                autoFocus
                className="full"
                aria-label="Busca global"
                placeholder="Digite um nome, endereço ou código"
                value={global}
                onChange={(e) => setGlobal(e.target.value)}
              />
              {global.trim() &&
                (() => {
                  const hits = kinds
                    .flatMap((k) =>
                      s[k]
                        .filter((r) =>
                          Object.values(r.data).some((val) =>
                            val
                              .toLowerCase()
                              .includes(global.trim().toLowerCase()),
                          ),
                        )
                        .map((r) => ({ k, r })),
                    )
                    .slice(0, 30);
                  return hits.length ? (
                    hits.map(({ k, r }) => (
                      <button
                        className="result"
                        key={k + r.id}
                        onClick={() => detail(k, r.id)}
                      >
                        {r.data.name}
                        <small>{tabs.find((t) => t[0] === k)?.[1]}</small>
                      </button>
                    ))
                  ) : (
                    <p>Nenhum resultado.</p>
                  );
                })()}
            </>
          )}
          {modal.key === "notifications" && (
            <>
              {["clients", "deals", "contracts"].flatMap((k) =>
                s[k as Kind].slice(0, 1).map((r) => (
                  <button
                    key={r.id}
                    className="result"
                    onClick={() => detail(k as Kind, r.id)}
                  >
                    {r.data.name}
                    <small>{r.history[0]?.split(" | ")[1]}</small>
                  </button>
                )),
              )}
              {!s.deals.length && !s.clients.length && !s.contracts.length && (
                <p>Nenhuma notificação.</p>
              )}
            </>
          )}
          {modal.key === "profile" && (
            <>
              <p>
                {v.me.name} · {admin ? "Administrador" : "Corretor"}
              </p>
              <p>{v.me.email}</p>
              <button onClick={logout}>Sair</button>
            </>
          )}
        </Dialog>
      )}
    </div>
  );
}
