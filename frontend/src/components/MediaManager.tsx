import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  UploadCloud,
  Star,
  Trash2,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Video,
  Check,
} from "lucide-react";
import { api, uploadFile } from "@/lib/api";
import type { Media } from "@/lib/types";
import { Button } from "./ui/button";
import { Failure } from "./Feedback";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
export default function MediaManager({
  propertyId,
  media,
}: {
  propertyId: string;
  media: Media[];
}) {
  const client = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<Record<number, number>>({});
  const [completed, setCompleted] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Media | null>(null);
  const previews = useMemo(
    () => files.map((file) => URL.createObjectURL(file)),
    [files],
  );
  useEffect(
    () => () => previews.forEach((url) => URL.revokeObjectURL(url)),
    [previews],
  );
  const base = `/api/admin/properties/${propertyId}/media`;
  const refresh = () =>
    client.invalidateQueries({ queryKey: ["admin-property", propertyId] });
  function select(selection: FileList | null) {
    if (!selection) return;
    const next = Array.from(selection);
    setError(null);
    if (next.length + media.length > 30) {
      setError(new Error("Cada imóvel pode conter até 30 mídias."));
      return;
    }
    const invalid = next.find(
      (file) =>
        !["image/jpeg", "image/png", "video/mp4", "video/webm"].includes(
          file.type,
        ) ||
        file.size > (file.type.startsWith("image/") ? 15 : 100) * 1024 * 1024,
    );
    if (invalid) {
      setError(
        new Error(
          `${invalid.name}: use JPG/PNG até 15 MB ou MP4/WebM até 100 MB.`,
        ),
      );
      return;
    }
    setFiles(next);
    setProgress({});
    setCompleted([]);
  }
  async function upload() {
    setBusy(true);
    setError(null);
    try {
      for (let i = 0; i < files.length; i++) {
        if (completed.includes(i)) continue;
        await uploadFile(base, files[i], (value) =>
          setProgress((p) => ({ ...p, [i]: value })),
        );
        setCompleted((c) => [...c, i]);
        await refresh();
      }
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function action(path: string, method: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      await api(path, {
        method,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      await refresh();
      await client.invalidateQueries({ queryKey: ["properties"] });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  function reorder(from: string, to: string) {
    if (busy || from === to) return;
    const ids = [...media]
      .sort((a, b) => a.position - b.position)
      .map((m) => m.id);
    const i = ids.indexOf(from),
      j = ids.indexOf(to);
    if (i < 0 || j < 0) return;
    ids.splice(i, 1);
    ids.splice(j, 0, from);
    void action(`${base}/order`, "PUT", ids);
  }
  const ordered = [...media].sort((a, b) => a.position - b.position);
  return (
    <>
      <div className="panel-heading">
        <div>
          <h2>Fotos e vídeos</h2>
          <p>Uma boa imagem aproxima o futuro morador.</p>
        </div>
        <span className="muted">{media.length} / 30 mídias</span>
      </div>
      <label className={`upload-zone ${busy ? "disabled" : ""}`}>
        <UploadCloud size={30} strokeWidth={1.4} />
        <strong>Selecione fotos e vídeos</strong>
        <span>JPG ou PNG até 15 MB · MP4 ou WebM até 100 MB</span>
        <input
          type="file"
          accept="image/jpeg,image/png,video/mp4,video/webm"
          multiple
          disabled={busy}
          onChange={(e) => select(e.target.files)}
          aria-label="Selecionar fotos e vídeos"
        />
      </label>
      {files.length > 0 && (
        <div className="upload-queue">
          {files.map((file, i) => (
            <div key={`${i}-${file.name}`} className="upload-preview">
              {file.type.startsWith("image/") ? (
                <img src={previews[i]} alt={file.name} />
              ) : (
                <video src={previews[i]} controls preload="metadata" />
              )}
              <span>{file.name}</span>
              {completed.includes(i) ? (
                <small>
                  <Check size={13} />
                  Enviado
                </small>
              ) : (
                <>
                  <progress
                    max="100"
                    value={progress[i] ?? 0}
                    aria-label={`Progresso de ${file.name}`}
                  />
                  <small>{progress[i] ?? 0}%</small>
                </>
              )}
            </div>
          ))}
          <Button
            type="button"
            onClick={upload}
            disabled={busy || completed.length === files.length}
          >
            <UploadCloud />
            {busy
              ? "Enviando…"
              : completed.length === files.length
                ? "Uploads concluídos"
                : "Enviar arquivos"}
          </Button>
        </div>
      )}
      {!!error && <Failure error={error} />}
      {media.length > 0 && (
        <>
          <p className="media-help">
            Arraste para reordenar ou use as setas. A estrela define a foto
            principal.
          </p>
          <div className="media-grid">
            {ordered.map((m, i) => (
              <div
                className="media-item"
                key={m.id}
                draggable={!busy}
                onDragStart={() => setDragging(m.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragging) reorder(dragging, m.id);
                  setDragging(null);
                }}
                onDragEnd={() => setDragging(null)}
              >
                {m.type === "IMAGEM" ? (
                  <img src={m.thumbnailUrl ?? m.url} alt={m.originalName} />
                ) : (
                  <video src={m.url} controls preload="metadata" />
                )}
                <span className="media-drag">
                  <GripVertical size={16} />
                  {i + 1}
                </span>
                {m.primaryImage && (
                  <span className="badge media-primary">Principal</span>
                )}
                <span className="media-filename" title={m.originalName}>
                  {m.originalName}
                </span>
                <div className="media-actions">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy || i === 0}
                    onClick={() => reorder(m.id, ordered[i - 1].id)}
                    aria-label={`Mover ${m.originalName} para trás`}
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy || i === ordered.length - 1}
                    onClick={() => reorder(m.id, ordered[i + 1].id)}
                    aria-label={`Mover ${m.originalName} para frente`}
                  >
                    <ChevronRight />
                  </Button>
                  {m.type === "IMAGEM" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy || m.primaryImage}
                      onClick={() => action(`${base}/${m.id}/primary`, "PUT")}
                      aria-label={`Definir ${m.originalName} como principal`}
                    >
                      <Star fill={m.primaryImage ? "currentColor" : "none"} />
                    </Button>
                  ) : (
                    <Video size={15} />
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => setRemoving(m)}
                    aria-label={`Excluir mídia ${m.originalName}`}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <Dialog
        open={!!removing}
        onOpenChange={(open) => {
          if (!open && !busy) setRemoving(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Excluir esta mídia?</DialogTitle>
          <DialogDescription>
            O arquivo “{removing?.originalName}” será removido permanentemente.
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
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                if (removing) {
                  await action(`${base}/${removing.id}`, "DELETE");
                  setRemoving(null);
                }
              }}
            >
              Excluir mídia
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
