"use client";
import { ThemeToggle } from "./ThemeToggle";
import { useState } from "react";
import { Logo, Form } from "./Shared";
import { cloud, api } from "@/lib/cloud";
import { View } from "@/lib/domain";
const email = {
    key: "email",
    label: "E-mail",
    type: "email",
    required: true,
    wide: true,
  },
  password = {
    key: "password",
    label: "Senha",
    type: "password",
    required: true,
    wide: true,
  };
export function Auth({
  page,
  go,
  ready,
  invite,
}: {
  page: string;
  go: (s: string) => void;
  ready: (v: View) => void;
  invite: string;
}) {
  const [note, setNote] = useState("");
  const org = page === "org",
    signup = page === "signup",
    reset = page === "reset",
    newPass = page === "password";
  const title = org
    ? "Sua imobiliária"
    : signup
      ? "Crie sua conta"
      : reset
        ? "Recuperar senha"
        : newPass
          ? "Definir nova senha"
          : "Entre na sua conta";
  return (
    <main className="auth">
      <aside>
        <button className="plain" onClick={() => go("landing")}>
          <Logo full />
        </button>
        <div>
          <h1>
            Sua imobiliária,
            <br />
            em um só lugar.
          </h1>
          <hr />
          {[
            "Carteira de imóveis",
            "Clientes e negociações",
            "Contratos e operações",
          ].map((s) => (
            <p key={s}>{s}</p>
          ))}
        </div>
      </aside>
      <section>
        <div className="auth-tools">
        <button className="quiet" onClick={() => go("landing")}>
          ← Voltar ao início
        </button>
          <ThemeToggle />
        </div>
        <h2>{title}</h2>
        <p>
          {invite
            ? "Acesse a conta do endereço convidado para integrar a equipe."
            : org
              ? "Identifique a empresa para abrir sua carteira."
              : reset
                ? "Enviaremos um link para o e-mail informado."
                : signup
                  ? "Comece pelos dados do administrador."
                  : "Acesse o espaço de trabalho da sua equipe."}
        </p>
        {note && (
          <p role="status" className="alert">
            {note}
          </p>
        )}
        <Form
          key={page}
          fields={
            org
              ? [
                  {
                    key: "org",
                    label: "Nome da imobiliária",
                    required: true,
                    wide: true,
                  },
                  { key: "name", label: "Seu nome", required: true },
                  { key: "city", label: "Cidade", required: true },
                ]
              : reset
                ? [email]
                : newPass
                  ? [
                      password,
                      {
                        ...password,
                        key: "repeat",
                        label: "Repita a nova senha",
                      },
                    ]
                  : signup
                    ? [
                        {
                          key: "name",
                          label: "Nome completo",
                          required: true,
                          wide: true,
                        },
                        email,
                        password,
                      ]
                    : [email, password]
          }
          submit={
            org
              ? "Criar imobiliária"
              : signup
                ? "Criar conta"
                : reset
                  ? "Solicitar link"
                  : newPass
                    ? "Salvar senha"
                    : "Entrar"
          }
          onSave={async (d) => {
            if (!cloud)
              throw Error("O serviço de acesso está indisponível. Tente novamente em instantes.");
            const base = location.origin;
            let link = invite ? "?invite=" + encodeURIComponent(invite) : "";
            setNote("");
            if (org) {
              ready(await api({ type: "bootstrap", ...d }));
              return;
            }
            if (reset) {
              let r = await cloud.auth.resetPasswordForEmail(d.email, {
                redirectTo: base + "/?page=password",
              });
              if (r.error)
                throw Error("Falha ao solicitar recuperação. Tente novamente.");
              setNote(
                "Se o endereço estiver cadastrado, confira o link no seu e-mail.",
              );
              return;
            }
            if (newPass) {
              if (d.password !== d.repeat || d.password.length < 8)
                throw Error(
                  "Use ao menos 8 caracteres e confirme a mesma senha.",
                );
              const r = await cloud.auth.updateUser({ password: d.password });
              if (r.error)
                throw Error("Link expirado ou inválido. Solicite outro.");
              await cloud.auth.signOut();
              go("login");
              return;
            }
            if (signup) {
              if (d.password.length < 8)
                throw Error("Use ao menos 8 caracteres.");
              const r = await cloud.auth.signUp({
                email: d.email,
                password: d.password,
                options: {
                  data: { name: d.name },
                  emailRedirectTo: base + "/" + link,
                },
              });
              if (r.error) {
                if (r.error.status === 429) throw Error("Aguarde alguns minutos antes de solicitar outro e-mail.");
                if (r.error.code === "email_address_invalid") throw Error("Informe um endereço de e-mail válido que possa receber a confirmação.");
                if (r.error.code === "weak_password") throw Error("Escolha uma senha mais forte.");
                if ((r.error.status ?? 0) >= 500) throw Error("O serviço de cadastro está indisponível. Tente novamente em instantes.");
                throw Error("Não foi possível cadastrar. Confira o e-mail ou tente entrar.");
              }
              if (!r.data.session) {
                setNote("Confira seu e-mail para confirmar a conta.");
                return;
              }
            } else {
              let r = await cloud.auth.signInWithPassword({
                email: d.email,
                password: d.password,
              });
              if (r.error?.code === "email_not_confirmed") throw Error("Confirme seu e-mail antes de entrar.");
              if (r.error?.status === 429) throw Error("Muitas tentativas. Aguarde alguns minutos.");
              if (r.error) throw Error("Não foi possível entrar. Confira o e-mail e a senha.");
            }
            let view = await api(
              invite ? { type: "accept", code: invite } : undefined,
            );
            if (view.needsOrg) go("org");
            else ready(view);
          }}
        />
        {!org && (
          <div className="authlinks">
            {!reset && !newPass && (
              <button onClick={() => go("reset")}>Esqueci minha senha</button>
            )}
            <button
              onClick={() =>
                go(signup || reset || newPass ? "login" : "signup")
              }
            >
              {signup || reset || newPass
                ? "Voltar ao login"
                : "Criar uma conta"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
