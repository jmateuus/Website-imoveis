import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Experience, PageResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Loading, Failure } from "@/components/Feedback";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
export default function Experiences() {
  const [page, setPage] = useState(0),
    [removing, setRemoving] = useState<Experience | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-experiences", page],
    queryFn: () =>
      api<PageResult<Experience>>(
        `/api/admin/experiences?page=${page}&size=12`,
      ),
  });
  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/experiences/${removing!.id}`, { method: "DELETE" });
      setRemoving(null);
      if (query.data?.content.length === 1 && page) setPage((p) => p - 1);
      await client.invalidateQueries({ queryKey: ["admin-experiences"] });
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
          <span className="eyebrow">HISTÓRIAS DOS HÓSPEDES</span>
          <h1>Vivências</h1>
          <p>Cadastre relatos, mídias e avaliações de quem se hospedou.</p>
        </div>
        <Button asChild>
          <Link to="/admin/vivencias/nova">Cadastrar vivência</Link>
        </Button>
      </div>
      <section className="admin-panel editor-panel">
        {query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <Failure error={query.error} retry={() => query.refetch()} />
        ) : (
          <>
            {!query.data.content.length && <p>Nenhuma vivência cadastrada.</p>}
            {query.data.content.map((e) => (
              <div className="review-admin-row" key={e.id}>
                <img src={e.review.photoUrl} alt="" />
                <div>
                  <strong>{e.title}</strong>
                  <small>
                    {e.review.customerName} ·{" "}
                    {e.published ? "Publicada" : "Rascunho"}
                  </small>
                </div>
                <Button asChild variant="outline">
                  <Link to={`/admin/vivencias/${e.id}`}>Editar {e.title}</Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRemoving(e);
                    setError(null);
                  }}
                >
                  Excluir {e.title}
                </Button>
              </div>
            ))}
            {query.data.totalPages > 1 && (
              <nav
                className="review-pagination"
                aria-label="Vivências cadastradas"
              >
                <Button
                  variant="outline"
                  disabled={!page}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </Button>
                <span>
                  {page + 1} / {query.data.totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={page + 1 >= query.data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próxima
                </Button>
              </nav>
            )}
          </>
        )}
      </section>
      <Dialog
        open={!!removing}
        onOpenChange={(open) => {
          if (!busy && !open) setRemoving(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Excluir vivência?</DialogTitle>
          <DialogDescription>
            O relato “{removing?.title}”, a avaliação e suas mídias serão
            removidos. A hospedagem e as avaliações da home serão preservadas.
          </DialogDescription>
          <div className="dialog-actions">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setRemoving(null)}
            >
              Cancelar
            </Button>
            <Button disabled={busy} onClick={remove}>
              {busy ? "Excluindo…" : "Confirmar exclusão"}
            </Button>
          </div>
          {!!error && <Failure error={error} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
