import { useEffect, useState } from "react";
import { Images, ChevronLeft, ChevronRight, House } from "lucide-react";
import type { Media } from "@/lib/types";
import { Button } from "./ui/button";
import VideoPreview from "./VideoPreview";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
function MediaItem({ media }: { media: Media }) {
  return media.type === "VIDEO" ? (
    <video src={media.url} controls preload="metadata" playsInline />
  ) : (
    <img src={media.url} alt={media.originalName} />
  );
}
export default function Gallery({
  media,
  title,
}: {
  media: Media[];
  title: string;
}) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const ordered = [...media].sort(
    (a, b) =>
      Number(b.primaryImage) - Number(a.primaryImage) ||
      a.position - b.position,
  );
  const move = (direction: number) =>
    setIndex((i) => (i + direction + ordered.length) % ordered.length);
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft")
        setIndex((i) => (i - 1 + ordered.length) % ordered.length);
      if (event.key === "ArrowRight") setIndex((i) => (i + 1) % ordered.length);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, ordered.length]);
  if (!ordered.length)
    return (
      <div className="gallery-empty">
        <House size={50} strokeWidth={1} />
        <p>Mídias em breve</p>
      </div>
    );
  return (
    <>
      <div className={`gallery ${ordered.length < 3 ? "gallery-single" : ""}`}>
        {ordered.slice(0, ordered.length < 3 ? 1 : 3).map((m, i) => (
          <button
            key={m.id}
            className={i === 0 ? "gallery-main" : "gallery-side"}
            onClick={() => {
              setIndex(i);
              setOpen(true);
            }}
            aria-label={`Abrir mídia ${i + 1} de ${title}`}
          >
            {m.type === "IMAGEM" ? (
              <img src={m.url} alt={`${title} — foto ${i + 1}`} />
            ) : (
              <VideoPreview key={m.url} media={m} />
            )}
          </button>
        ))}
        <Button
          className="gallery-all"
          variant="outline"
          onClick={() => {
            setIndex(0);
            setOpen(true);
          }}
        >
          <Images />
          Ver todas as mídias ({ordered.length})
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="lightbox">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Galeria de fotos e vídeos. Use as setas para navegar.
          </DialogDescription>
          <div className="lightbox-media">
            <MediaItem
              key={ordered[index]?.id}
              media={ordered[index] ?? ordered[0]}
            />
          </div>
          <div className="lightbox-controls">
            <Button
              variant="outline"
              size="icon"
              aria-label="Mídia anterior"
              onClick={() => move(-1)}
              disabled={ordered.length < 2}
            >
              <ChevronLeft />
            </Button>
            <span>
              {index + 1} / {ordered.length}
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Próxima mídia"
              onClick={() => move(1)}
              disabled={ordered.length < 2}
            >
              <ChevronRight />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
