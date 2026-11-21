import { ThemeToggle } from "./ThemeToggle";
import { Logo, Icon } from "./Shared";
export function Landing({ go }: { go: (s: string) => void }) {
  return (
    <main className="landing">
      <nav aria-label="Navegação principal" className="publicnav">
        <Logo full />
        <ThemeToggle />
        <button onClick={() => go("login")}>Entrar</button>
        <button className="primary signup" onClick={() => go("signup")}>
          Cadastrar
        </button>
      </nav>
      <section className="hero">
        <div>
          <h1>
            Sua imobiliária,
            <br />
            em um só lugar.
          </h1>
          <p>
            Reúna imóveis, clientes e contratos no mesmo painel. Acompanhe sua
            equipe do primeiro contato ao fechamento.
          </p>
          <div className="buttons">
            <button className="primary" onClick={() => go("signup")}>
              Cadastrar imobiliária
            </button>
            <a className="feature-link" href="#recursos">Conhecer recursos <span aria-hidden="true">↓</span></a>
          </div>
        </div>
        <figure className="preview">
          <figcaption>
            <span className="windowdots" aria-hidden="true">● ● ●</span> Visão geral da imobiliária
          </figcaption>
          <img
            width={1422} height={800} src="/brand/dashboard.png"
            alt="Dashboard da URBAN com indicadores, funil de negociações e desempenho da equipe"
          />
        </figure>
      </section>
      <section className="features" id="recursos">
        <h2>Da captação ao contrato</h2>
        <div>
          {[
            [
              "imoveis",
              "Imóveis",
              "Organize a carteira e acompanhe preços e disponibilidade.",
            ],
            [
              "negociacoes",
              "Clientes e negociações",
              "Registre interessados e acompanhe cada etapa da negociação.",
            ],
            [
              "contratos",
              "Contratos",
              "Consulte as partes, os prazos e a situação de cada contrato.",
            ],
          ].map(([i, t, p]) => (
            <article key={i}>
              <Icon name={i} />
              <h3>{t}</h3>
              <p>{p}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="showcase dark" id="negociacoes">
        <div>
          <h2>
            Do interesse
            <br />à proposta.
          </h2>
          <p>
            Veja quem está atendendo cada cliente e em que etapa a negociação
            está.
          </p>
          
        </div>
        <article className="sample">
          <small>Negociação</small>
          <h3>Apartamento Alameda</h3>
          <p>Helena Costa · Ana Souza</p>
          {["Em prospecção", "Em atendimento", "Proposta enviada"].map(
            (s, i) => (
              <div className="sampleline" key={s}>
                <i
                  style={{ background: ["#416cc7", "#23859d", "#8964bd"][i] }}
                />
                {s}
              </div>
            ),
          )}
        </article>
      </section>
      <section className="showcase" id="resultados">
        <div>
          <h2>
            Os resultados
            <br />
            da sua equipe.
          </h2>
          <p>
            Compare vendas e locações e consulte os contratos fechados em cada
            período.
          </p>
          
        </div>
        <article className="sample">
          <small>Contratos fechados · Exemplo</small>
          <strong className="big">18</strong>
          <div className="samplebar" />
          <p>12 vendas · 6 locações</p>
        </article>
      </section>
      <footer className="landing-footer">
        <div className="footer-cta">
          <h2>Sua equipe começa por aqui.</h2>
          <button className="primary" onClick={() => go("signup")}>
            Cadastrar imobiliária
          </button>
        </div>
        <div className="footer-base">
          <Logo full />
          <nav aria-label="Navegação do rodapé">
            <a href="#recursos">Recursos</a>
            <a href="#negociacoes">Negociações</a>
            <a href="#resultados">Relatórios</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
