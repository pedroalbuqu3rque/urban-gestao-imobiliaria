"use client";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { View, stages } from "@/lib/domain";
import { Icon } from "./Shared";
export const palette = ["#416cc7", "#23859d", "#8964bd", "#bf852b", "#25825e"];
export const within = (date: string, days: number) => {
  let n = Date.parse(date);
  return (
    Number.isFinite(n) && n >= Date.now() - days * 86400000 && n <= Date.now()
  );
};
export function Dashboard({
  v,
  go,
  days,
}: {
  v: View;
  go: (s: string) => void;
  days: number;
}) {
  let s = v.state,
    activity = [...s.clients, ...s.properties, ...s.deals, ...s.contracts]
      .flatMap((r) =>
        r.history
          .filter((h) => within(h.split(" | ")[0], days))
          .map((h) => ({ h, n: r.data.name })),
      )
      .sort((a, b) => b.h.localeCompare(a.h))
      .slice(0, 4);
  let types = ["Apartamento", "Casa", "Comercial"].map((name, i) => ({
    name,
    value: s.properties.filter((r) => r.data.type === name).length,
    color: palette[i],
  }));
  let team = v.members
    .filter((m) => m.role === "broker" || s.deals.some((d) => d.owner === m.id))
    .map((m) => ({
      name: m.name.split(" ")[0],
      Negociações: s.deals.filter(
        (r) => r.owner === m.id && within(r.created, days),
      ).length,
    }));
  return (
    <>
      <div className="metrics">
        {[
          ["Imóveis cadastrados", s.properties.length, "imoveis", "properties"],
          ["Clientes no sistema", s.clients.length, "clientes", "clients"],
          [
            "Negociações ativas",
            s.deals.filter((r) => r.data.stage !== "Fechada").length,
            "negociacoes",
            "deals",
          ],
          [
            "Contratos assinados",
            s.contracts.filter((r) =>
              ["Assinado", "Concluído"].includes(r.data.status),
            ).length,
            "contratos",
            "contracts",
          ],
        ].map(([l, n, i, t]) => (
          <button key={l} className="metric" onClick={() => go(String(t))}>
            <Icon name={String(i)} size={27} />
            <div>
              <b>{n}</b>
              <span>{l}</span>
            </div>
          </button>
        ))}
      </div>
      <div className="panels">
        <section className="panel">
          <div className="split">
            <h2>Pipeline de negociações</h2>
            <button className="textbtn" onClick={() => go("deals")}>
              Ver todas
            </button>
          </div>
          {stages.map((st, i) => {
            let n = s.deals.filter((r) => r.data.stage === st).length;
            return (
              <div className="pipe" key={st}>
                <span>
                  <i style={{ background: palette[i] }} />
                  {st}
                </span>
                <b>{n}</b>
                <div className="track">
                  <div
                    style={{
                      width: (n / Math.max(1, s.deals.length)) * 100 + "%",
                      background: palette[i],
                    }}
                  />
                </div>
              </div>
            );
          })}
        </section>
        <section className="panel">
          <h2>Desempenho da equipe</h2>
          <small>Negociações abertas no período</small>
          {team.length ? (
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={team}>
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis stroke="var(--muted)" dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis stroke="var(--muted)" width={26} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "var(--paper)", borderColor: "var(--line)", color: "var(--ink)" }} itemStyle={{ color: "var(--ink)" }} />
                  <Bar
                    dataKey="Negociações"
                    fill={palette[0]}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="empty">Nenhuma negociação registrada.</p>
          )}
        </section>
        <section className="panel">
          <h2>Imóveis por tipo</h2>
          <div className="donut">
            <div style={{ width: 145, height: 145 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={types}
                    dataKey="value"
                    innerRadius="55%"
                    outerRadius="90%"
                  >
                    {types.map((a) => (
                      <Cell key={a.name} fill={a.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--paper)", borderColor: "var(--line)", color: "var(--ink)" }} itemStyle={{ color: "var(--ink)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              {types.map((a) => (
                <p key={a.name}>
                  <i style={{ background: a.color }} />
                  {a.name} <b>{a.value}</b>
                </p>
              ))}
            </div>
          </div>
        </section>
        <section className="panel">
          <h2>Atividades recentes</h2>
          {activity.length ? (
            activity.map((a, i) => (
              <p className="act" key={i}>
                <b>{a.n}</b>
                <br />
                {a.h.split(" | ")[1]}
              </p>
            ))
          ) : (
            <p className="empty">Nenhuma atividade no período.</p>
          )}
        </section>
      </div>
    </>
  );
}
