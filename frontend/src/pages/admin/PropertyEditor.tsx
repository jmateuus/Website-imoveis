import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Save,
  ExternalLink,
  ImagePlus,
  ShieldCheck,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Amenity, Property } from "@/lib/types";
import { propertyTypes, statuses } from "@/lib/types";
import { propertySchema, type PropertyForm } from "@/lib/property-schema";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loading, Failure } from "@/components/Feedback";
import MediaManager from "@/components/MediaManager";
const defaults: PropertyForm = {
  title: "",
  slug: "",
  description: "",
  type: "APARTAMENTO",
  rent: 0,
  condoFee: null,
  propertyTax: null,
  area: null,
  bedrooms: null,
  suites: null,
  bathrooms: null,
  parking: null,
  guests: null,
  city: "",
  state: "",
  neighborhood: "",
  address: "",
  showAddress: false,
  furnished: false,
  petsAllowed: false,
  featured: false,
  status: "RASCUNHO",
  amenityIds: [],
};
const states =
  "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(
    " ",
  );
function EditorForm({
  property,
  amenities,
}: {
  property?: Property;
  amenities: Amenity[];
}) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [saved, setSaved] = useState(false);
  const initial: PropertyForm = property
    ? {
        ...defaults,
        ...property,
        area: property.area ?? null,
        condoFee: property.condoFee ?? null,
        propertyTax: property.propertyTax ?? null,
        bedrooms: property.bedrooms ?? null,
        suites: property.suites ?? null,
        bathrooms: property.bathrooms ?? null,
        parking: property.parking ?? null,
        guests: property.guests ?? null,
        address: property.address ?? "",
        amenityIds: property.amenities.map((a) => a.id),
      }
    : defaults;
  const form = useForm<PropertyForm>({
    resolver: zodResolver(propertySchema),
    defaultValues: initial,
  });
  const error = (name: FieldPath<PropertyForm>) =>
    form.getFieldState(name, form.formState).error?.message;
  const field = (
    name: FieldPath<PropertyForm>,
    label: string,
    type = "text",
  ) => (
    <label>
      {label}
      <input
        type={type}
        step={
          type === "number"
            ? ["bedrooms", "suites", "bathrooms", "parking", "guests"].includes(
                name,
              )
              ? "1"
              : "0.01"
            : undefined
        }
        min={type === "number" ? "0" : undefined}
        {...form.register(
          name,
          type === "number"
            ? {
                setValueAs: (v: string) =>
                  v === "" || v == null ? null : Number(v),
              }
            : {},
        )}
        aria-invalid={!!error(name)}
      />
      {error(name) && <small className="field-error">{error(name)}</small>}
    </label>
  );
  async function submit(values: PropertyForm) {
    setSaved(false);
    form.clearErrors("root");
    try {
      const result = await api<Property>(
        property
          ? `/api/admin/properties/${property.id}`
          : "/api/admin/properties",
        { method: property ? "PUT" : "POST", body: JSON.stringify(values) },
      );
      await client.invalidateQueries();
      form.reset(values);
      setSaved(true);
      if (!property) navigate(`/admin/imoveis/${result.id}`, { replace: true });
    } catch (e) {
      if (e instanceof ApiError)
        Object.entries(e.fields).forEach(([name, message]) =>
          form.setError(name as FieldPath<PropertyForm>, { message }),
        );
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
            <Link className="text-link" to="/admin/imoveis">
              <ArrowLeft size={15} />
              Meus imóveis
            </Link>
            <h1>
              {property
                ? "Editar imóvel"
                : "Um novo imóvel, novas possibilidades."}
            </h1>
            <p>
              Os campos com * são obrigatórios. Os demais aparecem somente
              quando preenchidos.
            </p>
          </div>
          <div className="heading-actions">
            {property && property.status !== "RASCUNHO" && (
              <Button variant="outline" asChild>
                <Link to={`/imoveis/${property.slug}`} target="_blank">
                  Ver anúncio
                  <ExternalLink />
                </Link>
              </Button>
            )}
            <Button type="submit" disabled={form.formState.isSubmitting}>
              <Save />
              {form.formState.isSubmitting ? "Salvando…" : "Salvar imóvel"}
            </Button>
          </div>
        </div>
        {saved && (
          <div className="success-message" role="status">
            Imóvel salvo com sucesso.
          </div>
        )}
        {form.formState.errors.root && (
          <p className="form-error" role="alert">
            {form.formState.errors.root.message}
          </p>
        )}
        <div className="editor-columns">
          <div>
            <section className="admin-panel editor-panel">
              <h2>O essencial sobre o imóvel</h2>
              <label>
                Título *
                <input
                  {...form.register("title")}
                  onBlur={() => {
                    if (!form.getValues("slug"))
                      form.setValue("slug", slugify(form.getValues("title")), {
                        shouldValidate: true,
                      });
                  }}
                  placeholder="Ex.: Apartamento com varanda em Boa Viagem"
                  aria-invalid={!!error("title")}
                />
                {error("title") && (
                  <small className="field-error">{error("title")}</small>
                )}
              </label>
              <label>
                URL do anúncio (slug)
                <input
                  {...form.register("slug")}
                  placeholder="apartamento-com-varanda-boa-viagem"
                  aria-invalid={!!error("slug")}
                />
                <small>/imoveis/{form.watch("slug") || "url-do-imovel"}</small>
                {error("slug") && (
                  <small className="field-error">{error("slug")}</small>
                )}
              </label>
              <div className="form-grid two-columns">
                <label>
                  Tipo *
                  <select {...form.register("type")}>
                    {Object.entries(propertyTypes).map(([v, label]) => (
                      <option key={v} value={v}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                {field("rent", "Aluguel mensal (R$) *", "number")}
                {field("condoFee", "Condomínio mensal (R$)", "number")}
                {field("propertyTax", "IPTU mensal (R$)", "number")}
              </div>
              <label>
                Descrição *
                <textarea
                  rows={7}
                  {...form.register("description")}
                  placeholder="Conte como é viver neste espaço. Descreva ambientes, iluminação, localização e diferenciais."
                  aria-invalid={!!error("description")}
                />
                {error("description") && (
                  <small className="field-error">{error("description")}</small>
                )}
              </label>
            </section>
            <section className="admin-panel editor-panel">
              <h2>Localização</h2>
              <div className="form-grid two-columns">
                {field("city", "Cidade *")}
                <label>
                  Estado *
                  <select
                    {...form.register("state")}
                    aria-invalid={!!error("state")}
                  >
                    <option value="">Selecione</option>
                    {states.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  {error("state") && (
                    <small className="field-error">{error("state")}</small>
                  )}
                </label>
                {field("neighborhood", "Bairro *")}
                {field("address", "Endereço complementar")}
              </div>
              <label className="checkbox">
                <input type="checkbox" {...form.register("showAddress")} />
                Exibir o endereço complementar publicamente
              </label>
              <p className="privacy-note">
                <ShieldCheck size={16} />O endereço é privado por padrão.
                Compartilhe-o durante a conversa com o interessado.
              </p>
            </section>
            <section className="admin-panel editor-panel">
              <h2>Características e comodidades</h2>
              <div className="form-grid three-columns">
                {field("area", "Área (m²)", "number")}
                {field("bedrooms", "Quartos", "number")}
                {field("suites", "Suítes", "number")}
                {field("bathrooms", "Banheiros", "number")}
                {field("parking", "Vagas", "number")}
                {field("guests", "Capacidade de hóspedes", "number")}
              </div>
              <div className="checkbox-row">
                <label className="checkbox">
                  <input type="checkbox" {...form.register("furnished")} />
                  Mobiliado
                </label>
                <label className="checkbox">
                  <input type="checkbox" {...form.register("petsAllowed")} />
                  Aceita animais
                </label>
              </div>
              <h3>O que este lugar oferece</h3>
              <div className="amenity-grid">
                {amenities.map((a) => (
                  <label className="checkbox" key={a.id}>
                    <input
                      type="checkbox"
                      value={a.id}
                      {...form.register("amenityIds")}
                    />
                    {a.name}
                  </label>
                ))}
              </div>
            </section>
          </div>
          <aside>
            <section className="admin-panel editor-panel publication-panel">
              <h2>Publicação</h2>
              <label>
                Situação do imóvel
                <select {...form.register("status")}>
                  {Object.entries(statuses).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <p className="muted">
                Rascunhos ficam visíveis somente aqui. Disponíveis e
                indisponíveis são publicados no catálogo.
              </p>
              <label className="checkbox">
                <input type="checkbox" {...form.register("featured")} />
                Destacar na página inicial
              </label>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                <Save />
                Salvar imóvel
              </Button>
              {property && (
                <small className="muted">
                  Atualizado em{" "}
                  {new Date(property.updatedAt).toLocaleDateString("pt-BR")}
                </small>
              )}
            </section>
            <div className="editor-tip">
              <ImagePlus />
              <h3>Mostre o melhor do seu imóvel.</h3>
              <p>
                Adicione fotos bem iluminadas, organize a galeria e escolha uma
                imagem principal.
              </p>
            </div>
          </aside>
        </div>
      </form>
      <section className="admin-panel editor-panel media-panel">
        {property ? (
          <MediaManager propertyId={property.id} media={property.media} />
        ) : (
          <div className="empty">
            <ImagePlus size={30} />
            <h3>As fotos entram no próximo passo.</h3>
            <p>Salve o imóvel para adicionar fotos e vídeos à galeria.</p>
          </div>
        )}
      </section>
    </>
  );
}
export default function PropertyEditor() {
  const { id } = useParams();
  const property = useQuery({
    queryKey: ["admin-property", id],
    queryFn: () => api<Property>(`/api/admin/properties/${id}`),
    enabled: !!id,
  });
  const amenities = useQuery({
    queryKey: ["amenities"],
    queryFn: () => api<Amenity[]>("/api/public/amenities"),
  });
  if (amenities.isPending || (id && property.isPending)) return <Loading />;
  if (amenities.isError) return <Failure error={amenities.error} />;
  if (property.isError)
    return <Failure error={property.error} retry={() => property.refetch()} />;
  return (
    <EditorForm
      key={id ?? "new"}
      property={property.data}
      amenities={amenities.data}
    />
  );
}
