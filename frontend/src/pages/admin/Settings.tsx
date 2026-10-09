import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, UploadCloud, MessageCircle } from "lucide-react";
import { api, uploadFile } from "@/lib/api";
import type { Settings as SiteSettings } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Loading, Failure } from "@/components/Feedback";
const schema = z.object({
  name: z.string().trim().min(1, "Informe o nome.").max(120),
  whatsapp: z
    .string()
    .regex(
      /^$|^[1-9]\d{9,14}$/,
      "Use o código do país + DDD + número, somente dígitos.",
    ),
  email: z.union([
    z.literal(""),
    z.string().email("E-mail inválido.").max(254),
  ]),
  heroTitle: z.string().trim().min(1).max(160),
  heroText: z.string().trim().min(1).max(500),
  footer: z.string().trim().min(1).max(500),
});
function SiteImageUploader({
  settings,
  kind,
}: {
  settings: SiteSettings;
  kind: "logo" | "hero";
}) {
  const client = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<unknown>(null);
  const current = kind === "logo" ? settings.logoUrl : settings.heroImageUrl;
  const title = kind === "logo" ? "Logotipo" : "Foto principal da home";
  const label =
    kind === "logo" ? "Selecionar logotipo" : "Selecionar foto principal";
  async function upload(file?: File) {
    if (!file) return;
    setError(null);
    if (
      !["image/jpeg", "image/png"].includes(file.type) ||
      file.size > 15 * 1024 * 1024
    ) {
      setError(new Error("Use JPG ou PNG de até 15 MB."));
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      await uploadFile(`/api/admin/settings/${kind}`, file, setProgress);
      await client.invalidateQueries({ queryKey: ["settings"] });
    } catch (failure) {
      setError(failure);
    } finally {
      setUploading(false);
    }
  }
  async function remove() {
    setError(null);
    setUploading(true);
    try {
      await api(`/api/admin/settings/${kind}`, { method: "DELETE" });
      await client.invalidateQueries({ queryKey: ["settings"] });
    } catch (failure) {
      setError(failure);
    } finally {
      setUploading(false);
    }
  }
  return (
    <section className="admin-panel editor-panel logo-panel">
      <h2>{title}</h2>
      <p className="muted">
        {kind === "logo"
          ? "Envie a logo oficial em JPG ou PNG. Ela aparece no cabeçalho, rodapé, painel e ícone do navegador. Sem uma logo, usamos um símbolo de sol."
          : "Envie a foto real da casa que vai abrir a página inicial. Sem uma foto configurada, usamos a imagem atual com a indicação de que é ilustrativa."}
      </p>
      {current && (
        <img
          className={kind === "logo" ? "logo-preview" : "hero-preview"}
          src={current}
          alt={title}
        />
      )}
      <label className="upload-zone">
        <UploadCloud />
        <strong>{uploading ? `Enviando… ${progress}%` : label}</strong>
        <input
          type="file"
          accept="image/jpeg,image/png"
          disabled={uploading}
          onChange={(event) => {
            upload(event.target.files?.[0]);
            event.target.value = "";
          }}
          aria-label={label}
        />
      </label>
      {current && (
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={remove}
        >
          {kind === "logo" ? "Usar símbolo padrão" : "Usar imagem ilustrativa"}
        </Button>
      )}
      {!!error && <Failure error={error} />}
    </section>
  );
}
function SettingsForm({ settings }: { settings: SiteSettings }) {
  const client = useQueryClient();
  const [saved, setSaved] = useState(false);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { ...settings, email: settings.email ?? "" },
  });
  async function submit(values: z.infer<typeof schema>) {
    setSaved(false);
    form.clearErrors("root");
    try {
      await api("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify(values),
      });
      await client.invalidateQueries({ queryKey: ["settings"] });
      form.reset(values);
      setSaved(true);
    } catch (e) {
      form.setError("root", {
        message: e instanceof Error ? e.message : "Não foi possível salvar.",
      });
    }
  }
  return (
    <>
      <form onSubmit={form.handleSubmit(submit)}>
        <div className="admin-heading">
          <div>
            <span className="eyebrow">DO SEU JEITO</span>
            <h1>Configurações do site</h1>
            <p>Personalize sua identidade e mantenha o contato atualizado.</p>
          </div>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            <Save />
            {form.formState.isSubmitting ? "Salvando…" : "Salvar alterações"}
          </Button>
        </div>
        {saved && (
          <div className="success-message" role="status">
            Configurações salvas com sucesso.
          </div>
        )}
        {form.formState.errors.root && (
          <p className="form-error" role="alert">
            {form.formState.errors.root.message}
          </p>
        )}
        <div className="settings-columns">
          <div>
            <section className="admin-panel editor-panel">
              <h2>Identidade e contato</h2>
              <label>
                Nome da marca
                <input {...form.register("name")} />
                {form.formState.errors.name && (
                  <small className="field-error">
                    {form.formState.errors.name.message}
                  </small>
                )}
              </label>
              <label>
                WhatsApp
                <input
                  inputMode="tel"
                  aria-label="WhatsApp"
                  aria-describedby="whatsapp-help"
                  placeholder="55 + DDD + número"
                  {...form.register("whatsapp")}
                />
                {form.formState.errors.whatsapp && (
                  <small className="field-error">
                    {form.formState.errors.whatsapp.message}
                  </small>
                )}
                <small id="whatsapp-help">
                  Somente dígitos, com código do país. Ex.: 5581999999999. Deixe
                  em branco para ocultar o contato.
                </small>
              </label>
              <label>
                E-mail de contato (opcional)
                <input type="email" {...form.register("email")} />
                {form.formState.errors.email && (
                  <small className="field-error">
                    {form.formState.errors.email.message}
                  </small>
                )}
              </label>
            </section>
            <section className="admin-panel editor-panel">
              <h2>Página inicial e rodapé</h2>
              <label>
                Chamada principal
                <input {...form.register("heroTitle")} />
                {form.formState.errors.heroTitle && (
                  <small className="field-error">
                    {form.formState.errors.heroTitle.message}
                  </small>
                )}
              </label>
              <label>
                Texto de apresentação
                <textarea rows={3} {...form.register("heroText")} />
                {form.formState.errors.heroText && (
                  <small className="field-error">
                    {form.formState.errors.heroText.message}
                  </small>
                )}
              </label>
              <label>
                Texto do rodapé
                <textarea rows={3} {...form.register("footer")} />
                {form.formState.errors.footer && (
                  <small className="field-error">
                    {form.formState.errors.footer.message}
                  </small>
                )}
              </label>
            </section>
          </div>
          <aside>
            <div className="editor-tip">
              <MessageCircle />
              <h3>Uma conversa começa com um clique.</h3>
              <p>
                O WhatsApp configurado será usado em todos os botões de contato,
                com mensagens personalizadas para cada hospedagem.
              </p>
            </div>
          </aside>
        </div>
      </form>
      <SiteImageUploader settings={settings} kind="logo" />
      <SiteImageUploader settings={settings} kind="hero" />
    </>
  );
}
export default function Settings() {
  const query = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<SiteSettings>("/api/public/settings"),
  });
  if (query.isPending) return <Loading />;
  if (query.isError)
    return <Failure error={query.error} retry={() => query.refetch()} />;
  return <SettingsForm settings={query.data} />;
}
