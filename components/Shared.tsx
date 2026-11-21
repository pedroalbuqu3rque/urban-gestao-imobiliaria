"use client";
import { useEffect, useRef, useState, ReactNode } from "react";
import { useForm } from "react-hook-form";
import { Field } from "@/lib/forms";
const imageIcons = new Set([
  "dashboard", "imoveis", "clientes", "equipe", "negociacoes", "contratos", "configuracoes",
]);

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const mask = `url(/icons/${name}.${imageIcons.has(name) ? "png" : "svg"})`;
  return (
    <span
      aria-hidden="true"
      className="icon"
      style={{
        width: size,
        height: size,
        maskImage: mask,
        WebkitMaskImage: mask,
      }}
    />
  );
}
export function Logo({ full = false }: { full?: boolean }) {
  return (
    <img
      className="wordmark"
      alt="URBAN Gestão Imobiliária"
      src={"/brand/logo-" + (full ? "completa" : "simples") + ".svg"}
    />
  );
}
export function Badge({ text }: { text: string }) {
  const color =
    /disponível|ativo|assinado|fechada|concluído|vigente|publicado/i.test(text)
      ? "green"
      : /reservado|pendente|assinatura|final/i.test(text)
        ? "amber"
        : /proposta/i.test(text)
          ? "violet"
          : "blue";
  return <span className={"badge " + color}>{text}</span>;
}
export function Dialog({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const e = ref.current;
    e?.showModal();
    return () => {
      e?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="dialog-body">
        <header className="split">
          <h2>{title}</h2>
          <button className="iconbtn close" onClick={close} aria-label="Fechar">
            ×
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
export function Form({
  fields,
  initial = {},
  submit,
  onSave,
}: {
  fields: Field[];
  initial?: Record<string, string>;
  submit: string;
  onSave: (d: Record<string, string>) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Record<string, string>>({
    defaultValues: Object.fromEntries(
      fields.map((f) => [
        f.key,
        initial[f.key] ?? f.initial ?? f.options?.[0]?.[0] ?? "",
      ]),
    ),
  });
  const [err, setErr] = useState("");
  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (d) => {
        setErr("");
        try {
          await onSave(d);
        } catch (e) {
          setErr((e as Error).message);
        }
      })}
    >
      <div className="form-grid">
        {fields.map((f) => (
          <label key={f.key} className={f.wide ? "wide" : ""}>
            {f.label}
            {f.required && <span className="req"> *</span>}
            {f.options ? (
              <select
                aria-invalid={!!errors[f.key]}
                {...register(f.key, {
                  required: f.required ? "Selecione uma opção." : false,
                })}
              >
                {!f.options.length && (
                  <option value="">Nenhum registro disponível</option>
                )}
                {f.options.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            ) : (
              <input
                aria-invalid={!!errors[f.key]}
                type={f.type || "text"}
                step={f.type === "number" ? "0.01" : undefined}
                {...register(f.key, {
                  required: f.required ? "Campo obrigatório." : false,
                  pattern:
                    f.type === "email"
                      ? {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: "Informe um e-mail válido.",
                        }
                      : undefined,
                })}
              />
            )}
            <small className="error">{errors[f.key]?.message}</small>
          </label>
        ))}
      </div>
      {err && (
        <p role="alert" className="alert error">
          {err}
        </p>
      )}
      <button className="primary" disabled={isSubmitting}>
        {isSubmitting ? "Salvando…" : submit}
      </button>
    </form>
  );
}
