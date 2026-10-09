import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, LockKeyhole, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { api, resetCsrf } from "@/lib/api";
import type { Settings } from "@/lib/types";
import { Brand } from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
const schema = z.object({
  email: z.string().email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe sua senha."),
});
export default function Login() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [show, setShow] = useState(false);
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<Settings>("/api/public/settings"),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });
  async function submit(values: z.infer<typeof schema>) {
    try {
      const auth = await api<{ email: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      });
      resetCsrf();
      client.setQueryData(["auth"], auth);
      navigate("/admin", { replace: true });
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error ? error.message : "Não foi possível entrar.",
      });
    }
  }
  return (
    <div className="login-page">
      <div className="login-image">
        <img src="/images/hero.jpg" alt="Casa com jardim e varanda" />
        <div>
          <Brand settings={settings.data} />
          <h1>
            Bons lugares.
            <br />
            Novos começos.
          </h1>
          <p>Cuide dos seus imóveis. Abra as portas para novas histórias.</p>
        </div>
      </div>
      <div className="login-area">
        <Link className="text-link" to="/">
          <ArrowLeft size={16} />
          Voltar ao site
        </Link>
        <div className="login-form">
          <span className="empty-icon">
            <LockKeyhole />
          </span>
          <span className="eyebrow">ÁREA DO PROPRIETÁRIO</span>
          <h2>Bem-vindo de volta.</h2>
          <p>Entre para cuidar dos seus imóveis.</p>
          <form onSubmit={form.handleSubmit(submit)}>
            <label>
              E-mail
              <input
                type="email"
                autoComplete="username"
                {...form.register("email")}
                aria-invalid={!!form.formState.errors.email}
              />
              {form.formState.errors.email && (
                <small className="field-error">
                  {form.formState.errors.email.message}
                </small>
              )}
            </label>
            <label>
              Senha
              <div className="password-field">
                <input
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  {...form.register("password")}
                  aria-invalid={!!form.formState.errors.password}
                />
                <button
                  type="button"
                  aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {form.formState.errors.password && (
                <small className="field-error">
                  {form.formState.errors.password.message}
                </small>
              )}
            </label>
            {form.formState.errors.root && (
              <p className="form-error" role="alert">
                {form.formState.errors.root.message}
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Entrando…" : "Entrar no painel"}
              <ArrowRight />
            </Button>
          </form>
          <p className="login-help">
            Acesso exclusivo do administrador do site.
          </p>
        </div>
      </div>
    </div>
  );
}
