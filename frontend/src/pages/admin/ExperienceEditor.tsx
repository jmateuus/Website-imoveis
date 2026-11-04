import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Experience, PageResult, Property } from "@/lib/types";
import { Loading, Failure } from "@/components/Feedback";
import { Button } from "@/components/ui/button";
import MediaManager from "@/components/MediaManager";

function Editor({ experience }: { experience?: Experience }) {
  const navigate = useNavigate(),
    client = useQueryClient();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [saved, setSaved] = useState(false);
  const [search, setSearch] = useState(""),
    [propertyId, setPropertyId] = useState(experience?.propertyId ?? ""),
    [propertyName, setPropertyName] = useState(
      experience?.review.propertyName ?? "",
    );
  const properties = useQuery({
    queryKey: ["experience-property-options", search],
    queryFn: () =>
      api<PageResult<Property>>(
        `/api/admin/properties?search=${encodeURIComponent(search)}&size=100`,
      ),
  });
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    const form = new FormData(event.currentTarget),
      file = form.get("file") as File;
    if (
      file?.size &&
      (!["image/jpeg", "image/png"].includes(file.type) ||
        file.size > 15 * 1024 * 1024)
    ) {
      setError(new Error("Use foto JPG ou PNG de até 15 MB."));
      return;
    }
    const value = (name: string) => String(form.get(name) ?? "").trim();
    const input = {
      title: value("title"),
      description: value("description"),
      stayDuration: value("stayDuration"),
      published: form.get("published") === "on",
      propertyId: propertyId || null,
      review: {
        customerName: value("customerName"),
        rating: Number(value("rating")),
        comment: value("comment"),
        propertyName: propertyName.trim(),
        contact: value("contact"),
      },
    };
    const data = new FormData();
    data.append(
      "experience",
      new Blob([JSON.stringify(input)], { type: "application/json" }),
    );
    if (file?.size) data.append("file", file);
    setBusy(true);
    try {
      const result = await api<Experience>(
        experience
          ? `/api/admin/experiences/${experience.id}`
          : "/api/admin/experiences",
        { method: experience ? "PUT" : "POST", body: data },
      );
      client.setQueryData(["admin-experience", result.id], result);
      await client.invalidateQueries({ queryKey: ["admin-experiences"] });
      await client.invalidateQueries({ queryKey: ["experiences"] });
      await client.invalidateQueries({ queryKey: ["experience", result.id] });
      setSaved(true);
      if (!experience)
        navigate(`/admin/vivencias/${result.id}`, { replace: true });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="admin-heading">
        <div>
          <Link to="/admin/vivencias">Voltar às vivências</Link>
          <h1>{experience ? "Editar vivência" : "Cadastrar vivência"}</h1>
          <p>
            Cadastre a história, o hóspede e sua avaliação. Após salvar,
            adicione fotos e vídeos.
          </p>
        </div>
      </div>
      {saved && (
        <p className="success-message" role="status">
          Vivência salva com sucesso.
        </p>
      )}
      <form
        onSubmit={save}
        className="admin-panel editor-panel experience-form"
      >
        <fieldset disabled={busy}>
          <h2>A história</h2>
          <label>
            Título
            <input
              name="title"
              required
              maxLength={160}
              defaultValue={experience?.title}
            />
          </label>
          <label>
            Descrição da vivência
            <textarea
              name="description"
              required
              rows={7}
              maxLength={20000}
              defaultValue={experience?.description}
            />
          </label>
          <label>
            Tempo de hospedagem
            <input
              name="stayDuration"
              required
              maxLength={100}
              placeholder="Ex.: 4 noites"
              defaultValue={experience?.stayDuration}
            />
          </label>
          <label>
            Buscar hospedagem cadastrada
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Digite parte do nome"
            />
          </label>
          <label>
            Vincular hospedagem
            <select
              aria-label="Vincular hospedagem"
              value={propertyId}
              onChange={(e) => {
                setPropertyId(e.target.value);
                const p = properties.data?.content.find(
                  (p) => p.id === e.target.value,
                );
                if (p) setPropertyName(p.title);
              }}
            >
              <option value="">Sem vínculo — informar nome abaixo</option>
              {propertyId &&
                !properties.data?.content.some((p) => p.id === propertyId) && (
                  <option value={propertyId}>{propertyName}</option>
                )}
              {properties.data?.content.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
          {properties.isError && (
            <Failure
              error={properties.error}
              retry={() => properties.refetch()}
            />
          )}
          <label>
            Nome da hospedagem
            <input
              required
              maxLength={160}
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
            />
          </label>
          <h2>Hóspede e avaliação</h2>
          <p className="muted">
            Publique os relatos, a foto e o contato com autorização do cliente.
            Esta avaliação pertence à vivência; as avaliações da home continuam
            sendo administradas em Configurações.
          </p>
          <label>
            Nome do cliente
            <input
              name="customerName"
              required
              maxLength={100}
              defaultValue={experience?.review.customerName}
            />
          </label>
          {experience && (
            <img
              className="review-current-photo"
              src={experience.review.photoUrl}
              alt="Foto atual do cliente"
            />
          )}
          <label>
            Foto do cliente
            <input
              aria-label="Foto do cliente"
              type="file"
              name="file"
              required={!experience}
              accept="image/jpeg,image/png"
            />
            <small>
              JPG/PNG até 15 MB. Ao editar, deixe vazio para manter a foto
              atual.
            </small>
          </label>
          <label>
            Nota
            <select
              name="rating"
              aria-label="Nota"
              defaultValue={experience?.review.rating ?? 5}
            >
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <option value={n} key={n}>
                  {n} de 5 estrelas
                </option>
              ))}
            </select>
          </label>
          <label>
            Comentário da avaliação
            <textarea
              name="comment"
              required
              rows={4}
              maxLength={3000}
              defaultValue={experience?.review.comment}
            />
          </label>
          <label>
            Contato do cliente (opcional)
            <input
              name="contact"
              maxLength={160}
              placeholder="@instagram_do_cliente"
              defaultValue={experience?.review.contact}
            />
          </label>
          <label className="experience-publish">
            <input
              name="published"
              type="checkbox"
              defaultChecked={experience?.published ?? false}
            />
            Publicar vivência no site
          </label>
          <Button type="submit">
            {busy ? "Salvando…" : "Salvar vivência"}
          </Button>
        </fieldset>
      </form>
      {!!error && <Failure error={error} />}
      {experience && (
        <section className="admin-panel editor-panel">
          <MediaManager
            ownerType="experiences"
            propertyId={experience.id}
            media={experience.media}
          />
        </section>
      )}
    </>
  );
}
export default function ExperienceEditor() {
  const { id } = useParams();
  const query = useQuery({
    queryKey: ["admin-experience", id],
    enabled: !!id,
    queryFn: () => api<Experience>(`/api/admin/experiences/${id}`),
  });
  if (!id) return <Editor key="new" />;
  if (query.isPending) return <Loading />;
  if (query.isError)
    return <Failure error={query.error} retry={() => query.refetch()} />;
  return <Editor key={id} experience={query.data} />;
}
