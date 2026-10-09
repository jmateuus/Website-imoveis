import { useState } from "react";
import { Link } from "react-router-dom";
import {
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  House,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import type { PageResult, Property } from "@/lib/types";
import { statuses } from "@/lib/types";
import { cover, money } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Empty, Failure, Loading } from "@/components/Feedback";
export default function Properties() {
  const [search, setSearch] = useState("");
  const [draftSearch, setDraftSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [deleting, setDeleting] = useState<Property | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const client = useQueryClient();
  const params = new URLSearchParams({
    search,
    status,
    page: String(page),
    size: "10",
  });
  const query = useQuery({
    queryKey: ["admin-properties", params.toString()],
    queryFn: () => api<PageResult<Property>>(`/api/admin/properties?${params}`),
    placeholderData: keepPreviousData,
  });
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/properties/${deleting.id}`, { method: "DELETE" });
      setDeleting(null);
      setPage(0);
      await client.invalidateQueries();
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
          <span className="eyebrow">SEU CATÁLOGO</span>
          <h1>Minhas hospedagens</h1>
          <p>Cadastre, atualize e dê visibilidade aos seus espaços.</p>
        </div>
        <Button asChild>
          <Link to="/admin/imoveis/novo">
            <Plus />
            Cadastrar hospedagem
          </Link>
        </Button>
      </div>
      <div className="admin-panel">
        <form
          className="admin-search"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(0);
            setSearch(draftSearch);
          }}
        >
          <div className="search-input">
            <Search size={18} />
            <input
              placeholder="Buscar por título, bairro ou cidade"
              aria-label="Buscar hospedagens no painel"
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
            />
            <button type="submit" aria-label="Pesquisar">
              <Search size={17} />
            </button>
          </div>
          <select
            aria-label="Filtrar por situação"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Todas as situações</option>
            {Object.entries(statuses).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </form>
        {query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <Failure error={query.error} retry={() => query.refetch()} />
        ) : (
          <>
            {query.data.content.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Hospedagem</th>
                      <th>Valor de referência</th>
                      <th>Situação</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.content.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className="table-property">
                            {cover(p) ? (
                              <img
                                src={cover(p)?.thumbnailUrl ?? cover(p)?.url}
                                alt=""
                              />
                            ) : (
                              <span className="table-placeholder">
                                <House />
                              </span>
                            )}
                            <div>
                              <Link to={`/admin/imoveis/${p.id}`}>
                                {p.title}
                              </Link>
                              <small>
                                {p.neighborhood}, {p.city}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>{money(p.rent)}</td>
                        <td>
                          <span className={`badge status-${p.status}`}>
                            {statuses[p.status]}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <Button asChild variant="outline" size="sm">
                              <Link to={`/admin/imoveis/${p.id}`}>
                                <Pencil />
                                Editar
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Excluir ${p.title}`}
                              onClick={() => {
                                setError(null);
                                setDeleting(p);
                              }}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty />
            )}
            {query.data.totalPages > 1 && (
              <div className="pagination">
                <Button
                  variant="outline"
                  disabled={page === 0 || query.isFetching}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft />
                  Anterior
                </Button>
                <span>
                  {page + 1} de {query.data.totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={
                    page >= query.data.totalPages - 1 || query.isFetching
                  }
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próxima
                  <ChevronRight />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      <Dialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!busy && !open) setDeleting(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Excluir esta hospedagem?</DialogTitle>
          <DialogDescription>
            A hospedagem “{deleting?.title}” e todas as suas mídias serão
            removidas. Esta ação não pode ser desfeita.
          </DialogDescription>
          {!!error && <Failure error={error} />}
          <div className="dialog-actions">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" disabled={busy} onClick={remove}>
              {busy ? "Excluindo…" : "Sim, excluir hospedagem"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
