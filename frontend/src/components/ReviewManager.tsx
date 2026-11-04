import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Stars } from "./Reviews";
import type { Review, ReviewPage } from "@/lib/types";
import { Button } from "./ui/button";
import { Loading, Failure } from "./Feedback";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";

export default function ReviewManager() {
  const client = useQueryClient();
  const [page, setPage] = useState(0);
  const query = useQuery({
    queryKey: ["reviews", "admin", page],
    queryFn: () => api<ReviewPage>(`/api/admin/reviews?page=${page}&size=20`),
  });
  const [editing, setEditing] = useState<Review | "new" | null>(null);
  const [removing, setRemoving] = useState<Review | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState("");
  async function refresh() {
    await client.invalidateQueries({ queryKey: ["reviews"] });
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("file") as File;
    if (
      file?.size &&
      (!["image/jpeg", "image/png"].includes(file.type) ||
        file.size > 15 * 1024 * 1024)
    ) {
      setError(new Error("Use uma foto JPG ou PNG de até 15 MB."));
      return;
    }
    const data = new FormData();
    data.append(
      "review",
      new Blob(
        [
          JSON.stringify({
            customerName: String(form.get("customerName")).trim(),
            rating: Number(form.get("rating")),
            comment: String(form.get("comment")).trim(),
            propertyName: String(form.get("propertyName")).trim(),
            contact: String(form.get("contact")).trim(),
          }),
        ],
        { type: "application/json" },
      ),
    );
    if (file?.size) data.append("file", file);
    setBusy(true);
    setError(null);
    setSaved("");
    try {
      await api(
        editing === "new"
          ? "/api/admin/reviews"
          : `/api/admin/reviews/${(editing as Review).id}`,
        { method: editing === "new" ? "POST" : "PUT", body: data },
      );
      setEditing(null);
      await refresh();
      setSaved("Avaliação salva com sucesso.");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    setError(null);
    setSaved("");
    try {
      await api(`/api/admin/reviews/${removing!.id}`, { method: "DELETE" });
      setRemoving(null);
      if (query.data?.content.length === 1 && page > 0) setPage((p) => p - 1);
      await refresh();
      setSaved("Avaliação excluída.");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  const current = editing && editing !== "new" ? editing : undefined;
  return (
    <section className="admin-panel editor-panel review-manager">
      <div className="section-heading">
        <h2>Avaliações de hóspedes</h2>
        <Button
          type="button"
          onClick={() => {
            setEditing("new");
            setError(null);
          }}
        >
          Cadastrar avaliação
        </Button>
      </div>
      <p className="muted">
        Cadastre depoimentos recebidos dos hóspedes. Publique foto e contato
        somente com autorização do cliente. O contato será visível no site.
      </p>
      {saved && (
        <p role="status" className="success-message">
          {saved}
        </p>
      )}
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <Failure error={query.error} retry={() => query.refetch()} />
      ) : (
        <>
          {!query.data.totalElements && <p>Nenhuma avaliação cadastrada.</p>}
          {query.data.content.map((review) => (
            <div className="review-admin-row" key={review.id}>
              <img src={review.photoUrl} alt="" />
              <div>
                <strong>{review.customerName}</strong>
                <Stars rating={review.rating} />
                <small>{review.propertyName}</small>
              </div>
              <Button
                type="button"
                variant="outline"
                aria-label={`Editar avaliação de ${review.customerName}`}
                onClick={() => {
                  setEditing(review);
                  setError(null);
                }}
              >
                Editar
              </Button>
              <Button
                type="button"
                variant="outline"
                aria-label={`Excluir avaliação de ${review.customerName}`}
                onClick={() => {
                  setRemoving(review);
                  setError(null);
                }}
              >
                Excluir
              </Button>
            </div>
          ))}
          {query.data.totalPages > 1 && (
            <nav
              className="review-pagination"
              aria-label="Avaliações cadastradas"
            >
              <Button
                type="button"
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
                type="button"
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
      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!busy && !open) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogTitle>
            {editing === "new" ? "Cadastrar avaliação" : "Editar avaliação"}
          </DialogTitle>
          <DialogDescription>
            Foto, nota e depoimento que aparecerão na página inicial.
          </DialogDescription>
          <form
            key={current?.id ?? "new"}
            onSubmit={save}
            className="review-form"
          >
            <fieldset disabled={busy}>
              <label>
                Nome do cliente
                <input
                  name="customerName"
                  required
                  maxLength={100}
                  defaultValue={current?.customerName}
                />
              </label>
              {current && (
                <img
                  className="review-current-photo"
                  src={current.photoUrl}
                  alt="Foto atual do cliente"
                />
              )}
              <label>
                Foto do cliente
                <input
                  aria-label="Foto do cliente"
                  name="file"
                  type="file"
                  accept="image/jpeg,image/png"
                  required={!current}
                />
                <small>
                  JPG ou PNG, até 15 MB. Ao editar, deixe vazio para manter a
                  foto.
                </small>
              </label>
              <label>
                Nota
                <select
                  aria-label="Nota"
                  name="rating"
                  defaultValue={current?.rating ?? 5}
                >
                  {[0, 1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n} de 5 estrelas
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Hospedagem
                <input
                  name="propertyName"
                  required
                  maxLength={160}
                  placeholder="Ex.: Casa Praia dos Carneiros"
                  defaultValue={current?.propertyName}
                />
              </label>
              <label>
                Comentário
                <textarea
                  name="comment"
                  required
                  rows={4}
                  maxLength={3000}
                  defaultValue={current?.comment}
                />
              </label>
              <label>
                Contato do cliente (opcional)
                <input
                  aria-label="Contato do cliente (opcional)"
                  name="contact"
                  maxLength={160}
                  placeholder="Ex.: @instagram_do_cliente"
                  defaultValue={current?.contact}
                />
                <small>
                  Use @usuario para gerar um link para o Instagram, ou informe
                  um texto curto.
                </small>
              </label>
              <div className="dialog-actions">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(null)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {busy ? "Salvando…" : "Salvar avaliação"}
                </Button>
              </div>
            </fieldset>
          </form>
          {!!error && <Failure error={error} />}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!removing}
        onOpenChange={(open) => {
          if (!busy && !open) setRemoving(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Excluir avaliação?</DialogTitle>
          <DialogDescription>
            A avaliação de {removing?.customerName} e sua foto serão removidas
            do site.
          </DialogDescription>
          <div className="dialog-actions">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setRemoving(null)}
            >
              Cancelar
            </Button>
            <Button type="button" disabled={busy} onClick={remove}>
              {busy ? "Excluindo…" : "Confirmar exclusão"}
            </Button>
          </div>
          {!!error && <Failure error={error} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}
