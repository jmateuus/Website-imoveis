import { AlertCircle, House, LoaderCircle } from "lucide-react";
import { Button } from "./ui/button";
export function Loading({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="feedback" role="status">
      <LoaderCircle className="spin" />
      <span>{label}</span>
    </div>
  );
}
export function Failure({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <div className="feedback error" role="alert">
      <AlertCircle />
      <p>
        {error instanceof Error
          ? error.message
          : "Não foi possível carregar os dados."}
      </p>
      {retry && (
        <Button variant="outline" onClick={retry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
export function Empty({
  title = "Nenhum imóvel encontrado",
  text = "Experimente ajustar os filtros ou volte em breve para conferir as novidades.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <House />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
