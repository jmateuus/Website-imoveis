import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  Search,
  SlidersHorizontal,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import type { PageResult, Property } from "@/lib/types";
import { propertyTypes } from "@/lib/types";
import PropertyCard from "@/components/PropertyCard";
import { Button } from "@/components/ui/button";
import { Empty, Failure, Loading } from "@/components/Feedback";
function Filters({
  params,
  apply,
}: {
  params: URLSearchParams;
  apply: (params: URLSearchParams) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(Object.fromEntries(params.entries()));
  const set = (name: string, value: string) =>
    setDraft((d) => ({ ...d, [name]: value }));
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const next = new URLSearchParams();
    Object.entries(draft).forEach(([k, v]) => {
      if (v && k !== "page") next.set(k, v);
    });
    next.set("status", draft.status ?? "DISPONIVEL");
    apply(next);
  }
  const count = [
    "city",
    "neighborhood",
    "type",
    "minPrice",
    "maxPrice",
    "minBedrooms",
  ].filter((k) => params.get(k)).length;
  return (
    <form className="catalog-filters" onSubmit={submit}>
      <div className="search-row">
        <div className="search-input">
          <Search size={19} />
          <input
            aria-label="Pesquisar hospedagens"
            placeholder="Cidade, bairro ou nome do imóvel"
            value={draft.search ?? ""}
            onChange={(e) => set("search", e.target.value)}
          />
          <button type="submit" aria-label="Buscar hospedagens">
            <ArrowRight size={20} />
          </button>
        </div>
        <Button
          variant="outline"
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          <SlidersHorizontal />
          Filtros {count > 0 && <span className="filter-count">{count}</span>}
        </Button>
        <label className="sort-select">
          <span className="sr-only">Ordenar imóveis</span>
          <select
            value={params.get("sort") ?? "recent"}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              next.set("sort", e.target.value);
              next.delete("page");
              apply(next);
            }}
          >
            <option value="recent">Mais recentes</option>
            <option value="price-asc">Menor preço</option>
            <option value="price-desc">Maior preço</option>
          </select>
        </label>
      </div>
      {open && (
        <div className="filter-panel">
          <div className="form-grid">
            <label>
              Cidade
              <input
                value={draft.city ?? ""}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Ex.: Recife"
              />
            </label>
            <label>
              Bairro
              <input
                value={draft.neighborhood ?? ""}
                onChange={(e) => set("neighborhood", e.target.value)}
                placeholder="Ex.: Boa Viagem"
              />
            </label>
            <label>
              Tipo de imóvel
              <select
                value={draft.type ?? ""}
                onChange={(e) => set("type", e.target.value)}
              >
                <option value="">Todos os tipos</option>
                {Object.entries(propertyTypes).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Valor mínimo informado (R$)
              <input
                type="number"
                min="0"
                step="0.01"
                value={draft.minPrice ?? ""}
                onChange={(e) => set("minPrice", e.target.value)}
              />
            </label>
            <label>
              Valor máximo informado (R$)
              <input
                type="number"
                min="0"
                step="0.01"
                value={draft.maxPrice ?? ""}
                onChange={(e) => set("maxPrice", e.target.value)}
              />
            </label>
            <label>
              Quartos
              <select
                value={draft.minBedrooms ?? ""}
                onChange={(e) => set("minBedrooms", e.target.value)}
              >
                <option value="">Qualquer quantidade</option>
                {[1, 2, 3, 4].map((v) => (
                  <option key={v} value={v}>
                    {v} ou mais
                  </option>
                ))}
              </select>
            </label>
            <label>
              Disponibilidade
              <select
                value={draft.status ?? "DISPONIVEL"}
                onChange={(e) => set("status", e.target.value)}
              >
                <option value="DISPONIVEL">Disponíveis</option>
                <option value="INDISPONIVEL">Indisponíveis</option>
                <option value="">Todos os publicados</option>
              </select>
            </label>
          </div>
          <div className="filter-actions">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDraft({});
                apply(new URLSearchParams());
              }}
            >
              <X />
              Limpar filtros
            </Button>
            <Button type="submit">Aplicar filtros</Button>
          </div>
        </div>
      )}
    </form>
  );
}
export function PropertyListing({ compact = false }: { compact?: boolean }) {
  const [params, setParams] = useSearchParams();
  const queryParams = new URLSearchParams(params);
  queryParams.set("size", compact ? "6" : "9");
  if (!queryParams.has("status")) queryParams.set("status", "DISPONIVEL");
  const query = useQuery({
    queryKey: ["properties", queryParams.toString()],
    queryFn: () =>
      api<PageResult<Property>>(`/api/public/properties?${queryParams}`),
    placeholderData: keepPreviousData,
  });
  const page = Math.max(0, Number(params.get("page")) || 0);
  function move(value: number) {
    const next = new URLSearchParams(params);
    next.set("page", String(value));
    setParams(next);
    document
      .getElementById("catalogo")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  return (
    <div id="catalogo">
      <Filters
        key={params.toString()}
        params={params}
        apply={(p) => setParams(p)}
      />
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <Failure error={query.error} retry={() => query.refetch()} />
      ) : (
        <>
          <div className="result-info" aria-live="polite">
            <span>
              <strong>{query.data.totalElements}</strong>{" "}
              {query.data.totalElements === 1
                ? "hospedagem encontrada"
                : "hospedagens encontradas"}
            </span>
            {query.isFetching && <span>Atualizando…</span>}
          </div>
          {query.data.content.length ? (
            <div className="property-grid">
              {query.data.content.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
          ) : (
            <Empty />
          )}
          {query.data.totalPages > 1 && (
            <nav className="pagination" aria-label="Paginação">
              <Button
                variant="outline"
                disabled={page === 0 || query.isFetching}
                onClick={() => move(page - 1)}
              >
                <ChevronLeft />
                Anterior
              </Button>
              <span>
                Página {page + 1} de {query.data.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page >= query.data.totalPages - 1 || query.isFetching}
                onClick={() => move(page + 1)}
              >
                Próxima
                <ChevronRight />
              </Button>
            </nav>
          )}
        </>
      )}
      {compact && (
        <div className="center-action">
          <Button asChild variant="outline">
            <Link to={`/imoveis?${params}`}>
              Explorar todas as hospedagens
              <ArrowRight />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
export default function Catalog() {
  return (
    <section className="container catalog-page">
      <div className="breadcrumb">
        <Link to="/">Início</Link>
        <span>/</span>
        <span>Hospedagens por temporada</span>
      </div>
      <span className="eyebrow">ENCONTRE SEU LUGAR</span>
      <h1>Sua próxima temporada começa aqui.</h1>
      <p className="section-description">
        Explore hospedagens nas praias do Nordeste e escolha o cenário das suas próximas férias.
      </p>
      <PropertyListing />
    </section>
  );
}
