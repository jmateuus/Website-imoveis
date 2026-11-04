import { useState } from "react";
import { Play } from "lucide-react";
import type { Media } from "@/lib/types";

export default function VideoPreview({ media }: { media: Media }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="video-preview" aria-hidden="true">
      {!failed && (
        <video
          key={media.url}
          src={media.url}
          poster={media.thumbnailUrl}
          muted
          playsInline
          preload="metadata"
          tabIndex={-1}
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            if (Number.isFinite(video.duration) && video.duration > 0)
              video.currentTime = Math.min(0.1, video.duration / 2);
          }}
          onError={() => setFailed(true)}
        />
      )}
      <span className="video-preview-play">
        <Play size={22} fill="currentColor" />
      </span>
      <span className="video-preview-label">
        {failed ? "Prévia indisponível · Abrir vídeo" : "Vídeo"}
      </span>
    </span>
  );
}
