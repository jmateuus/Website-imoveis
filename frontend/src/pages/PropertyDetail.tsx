import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin,
  ArrowLeft,
  ArrowUpRight,
  MessageCircle,
  Images,
  ChevronLeft,
  ChevronRight,
  Check,
  House,
  Share2,
  BedDouble,
  Bath,
  CarFront,
  Expand,
  Users,
  Armchair,
  PawPrint,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Media, PageResult, Property } from "@/lib/types";
import { propertyTypes } from "@/lib/types";
import { whatsappUrl } from "@/lib/utils";
import { useSettings } from "@/components/PublicLayout";
import PropertyCard from "@/components/PropertyCard";
import { Loading, Failure } from "@/components/Feedback";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
function MediaItem({ media }: { media: Media }) {
  return media.type === "VIDEO" ? (
    <video src={media.url} controls preload="metadata" playsInline />
  ) : (
    <img src={media.url} alt={media.originalName} />
  );
}
function Gallery({ media, title }: { media: Media[]; title: string }) {
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
        <p>Fotos deste imóvel em breve</p>
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
              <span className="video-tile">
                <Images />
                Assistir vídeo
              </span>
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
export default function PropertyDetail() {
  const { slug } = useParams();
  const settings = useSettings();
  const [copied, setCopied] = useState(false);
  const query = useQuery({
    queryKey: ["property", slug],
    queryFn: () => api<Property>(`/api/public/properties/${slug}`),
  });
  const related = useQuery({
    queryKey: ["related", slug],
    queryFn: () =>
      api<PageResult<Property>>(
        "/api/public/properties?status=DISPONIVEL&size=4",
      ),
  });
  useEffect(() => {
    if (query.data) document.title = `${query.data.title} | ${settings.name}`;
    return () => {
      document.title = `${settings.name} — Hospedagens por temporada`;
    };
  }, [query.data, settings.name]);
  if (query.isPending) return <Loading />;
  if (query.isError)
    return (
      <section className="container section">
        <Button asChild variant="ghost">
          <Link to="/imoveis">
            <ArrowLeft />
            Voltar às hospedagens
          </Link>
        </Button>
        <Failure error={query.error} retry={() => query.refetch()} />
      </section>
    );
  const property = query.data;
  const contact = whatsappUrl(settings.whatsapp, property);
  const specs = [
    { icon: Expand, value: property.area, label: "m² de área" },
    { icon: BedDouble, value: property.bedrooms, label: "quartos" },
    { icon: Bath, value: property.bathrooms, label: "banheiros" },
    { icon: CarFront, value: property.parking, label: "vagas" },
    { icon: BedDouble, value: property.suites, label: "suítes" },
    { icon: Users, value: property.guests, label: "hóspedes" },
  ].filter((s) => s.value != null);
  const others =
    related.data?.content.filter((p) => p.id !== property.id).slice(0, 3) ?? [];
  return (
    <section className="container detail-page">
      <div className="breadcrumb">
        <Link to="/">Início</Link>
        <span>/</span>
        <Link to="/imoveis">Hospedagens</Link>
        <span>/</span>
        <span>{propertyTypes[property.type]}</span>
      </div>
      <div className="detail-heading">
        <div>
          <div className="inline-badges">
            <span className="badge status-badge">
              {propertyTypes[property.type]}
            </span>
            {property.featured && (
              <span className="badge featured-badge">Destaque</span>
            )}
            <span
              className={`badge ${property.status === "DISPONIVEL" ? "available-badge" : "unavailable-badge"}`}
            >
              {property.status === "DISPONIVEL"
                ? "Hospedagem disponível"
                : "Indisponível no momento"}
            </span>
          </div>
          <h1>{property.title}</h1>
          <p className="location">
            <MapPin size={17} />
            {property.neighborhood}, {property.city} — {property.state}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(window.location.href);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          <Share2 />
          {copied ? "Link copiado!" : "Compartilhar"}
        </Button>
      </div>
      <Gallery
        key={property.id}
        media={property.media}
        title={property.title}
      />
      <div className="detail-columns">
        <div className="detail-information">
          <h2>Seu refúgio para descansar.</h2>
          <div className="detail-specs">
            {specs.map(({ icon: Icon, value, label }) => (
              <div key={label}>
                <Icon size={23} strokeWidth={1.5} />
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <section className="detail-section">
            <h2>Sobre a hospedagem</h2>
            <p className="description-text">{property.description}</p>
          </section>
          {property.amenities.length > 0 && (
            <section className="detail-section">
              <h2>O que este lugar oferece</h2>
              <div className="amenity-grid">
                {property.amenities.map((a) => (
                  <span key={a.id}>
                    <Check size={18} />
                    {a.name}
                  </span>
                ))}
              </div>
            </section>
          )}
          <section className="detail-section">
            <h2>Mais informações</h2>
            <div className="amenity-grid">
              <span>
                <Armchair size={18} />
                {property.furnished
                  ? "Imóvel mobiliado"
                  : "Imóvel não mobiliado"}
              </span>
              <span>
                <PawPrint size={18} />
                {property.petsAllowed ? "Aceita animais" : "Não aceita animais"}
              </span>
            </div>
            {property.address ? (
              <p className="address">
                <MapPin size={16} />
                {property.address}
              </p>
            ) : (
              <p className="privacy-note">
                <ShieldCheck size={16} />
                Para sua segurança, o endereço completo é informado pelo
                proprietário.
              </p>
            )}
          </section>
        </div>
        <aside className="interest-card">
          <span className="eyebrow">SUA PRÓXIMA TEMPORADA</span>
          <p className="detail-price">
            <strong>Valores sob consulta</strong>
          </p>
          {false && (property.condoFee != null || property.propertyTax != null) && (
            <div className="extra-costs">
              {property.condoFee != null && (
                <p>
                  <span>Condomínio / mês</span>
                  <strong>{preciseMoney(property.condoFee)}</strong>
                </p>
              )}
              {property.propertyTax != null && (
                <p>
                  <span>IPTU / mês</span>
                  <strong>{preciseMoney(property.propertyTax)}</strong>
                </p>
              )}
              <p className="total-cost">
                <span>Total mensal informado</span>
                <strong>
                  {preciseMoney(
                    property.rent +
                      (property.condoFee ?? 0) +
                      (property.propertyTax ?? 0),
                  )}
                </strong>
              </p>
            </div>
          )}
          <p className="interest-copy">
            Gostou desta hospedagem? Consulte valores e disponibilidade diretamente com a Privê Lopes.
          </p>
          {contact ? (
            <>
              <Button asChild size="lg">
                <a href={contact} target="_blank" rel="noopener noreferrer">
                  Consultar disponibilidade pelo WhatsApp
                  <ArrowUpRight />
                </a>
              </Button>
              <a
                className="whatsapp-secondary"
                href={contact}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={18} />
                Conversar pelo WhatsApp
              </a>
            </>
          ) : (
            <p className="privacy-note">
              Contato em atualização.
            </p>
          )}
          <div className="direct-note">
            <ShieldCheck size={16} />
            <span>
              Contato direto, sem intermediários.
              <br />
              Nenhum pagamento é feito pelo site.
            </span>
          </div>
        </aside>
      </div>
      {others.length > 0 && (
        <section className="section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                OUTROS LUGARES, NOVAS POSSIBILIDADES
              </span>
              <h2>Você também pode gostar</h2>
            </div>
            <Link className="text-link" to="/imoveis">
              Ver todos
              <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="property-grid">
            {others.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
