import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  House,
  MapPin,
  MessageCircle,
  Search,
  Sparkles,
  Sun,
  Waves,
} from "lucide-react";
import { api } from "@/lib/api";
import type { PageResult, Property } from "@/lib/types";
import { useSettings } from "@/components/PublicLayout";
import PropertyCard from "@/components/PropertyCard";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Empty, Failure, Loading } from "@/components/Feedback";
import { PropertyListing } from "./Catalog";
import { whatsappUrl } from "@/lib/utils";
export default function Home() {
  const settings = useSettings();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const featured = useQuery({
    queryKey: ["featured"],
    queryFn: () =>
      api<PageResult<Property>>(
        "/api/public/properties?featured=true&status=DISPONIVEL&size=3",
      ),
  });
  const contact = whatsappUrl(settings.whatsapp);
  return (
    <>
      <Seo
        title={`${settings.name} — Hospedagens por temporada`}
        description={settings.heroText}
        image={settings.heroImageUrl}
      />
      <div className="hero-background">
        <section className="container hero">
          <div className="hero-copy">
            <span className="hero-pill">
              <Sun size={15} /> SOL, DESCANSO E UMA BOA ESTADIA
            </span>
            <h1>{settings.heroTitle}</h1>
            <p>{settings.heroText}</p>
            <div className="hero-actions">
              {contact && (
                <Button asChild size="lg">
                  <a href={contact} target="_blank" rel="noopener noreferrer">
                    <MessageCircle /> Consulte disponibilidade <ArrowUpRight />
                  </a>
                </Button>
              )}
              <Link className="text-link" to="/imoveis">
                Conheça as hospedagens <ArrowRight size={17} />
              </Link>
            </div>
            <form
              className="hero-search"
              onSubmit={(event) => {
                event.preventDefault();
                navigate(`/imoveis?search=${encodeURIComponent(search)}`);
              }}
            >
              <Search size={21} />
              <input
                aria-label="Qual é o seu próximo destino?"
                placeholder="Praia, cidade ou hospedagem"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <Button type="submit">
                Encontrar <ArrowRight />
              </Button>
            </form>
            <div className="hero-assurances">
              <span>
                <Check size={14} /> Contato direto
              </span>
              <span>
                <Check size={14} /> Seu ritmo, suas datas
              </span>
              <span>
                <Check size={14} /> Nordeste para aproveitar
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <img
              src={settings.heroImageUrl ?? "/images/hero.jpg"}
              alt={
                settings.heroImageUrl
                  ? "Foto principal da hospedagem Privê Lopes"
                  : "Casa com varanda e palmeiras — imagem ilustrativa"
              }
              fetchPriority="high"
            />
            <span className="hero-image-label">
              <Sun size={14} /> Dias leves começam aqui.
            </span>
            <div className="hero-floating">
              <span>
                <Waves size={23} />
              </span>
              <div>
                <strong>Um tempo para você</strong>
                <small>conforto, descanso e bons momentos.</small>
              </div>
              <ArrowUpRight size={20} />
            </div>
            {!settings.heroImageUrl && (
              <span className="hero-caption">Imagem ilustrativa</span>
            )}
          </div>
        </section>
      </div>
      <div className="values-strip">
        <div className="container">
          <span>
            <House /> Um espaço para relaxar
          </span>
          <i />
          <span>
            <MapPin /> Destinos no Nordeste
          </span>
          <i />
          <span>
            <MessageCircle /> Atendimento pelo WhatsApp
          </span>
        </div>
      </div>
      <section className="container section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              <Sparkles size={14} /> ESCOLHAS PARA A SUA TEMPORADA
            </span>
            <h2>Hospedagens em destaque</h2>
            <p>Conheça os espaços e imagine seus próximos dias de descanso.</p>
          </div>
          <Link className="text-link" to="/imoveis">
            Ver todas <ArrowUpRight size={18} />
          </Link>
        </div>
        {featured.isPending ? (
          <Loading />
        ) : featured.isError ? (
          <Failure error={featured.error} retry={() => featured.refetch()} />
        ) : featured.data.content.length ? (
          <div className="property-grid">
            {featured.data.content.map((property) => (
              <PropertyCard property={property} key={property.id} />
            ))}
          </div>
        ) : (
          <Empty
            title="Novas hospedagens em breve"
            text="Estamos preparando novas opções para sua próxima viagem."
          />
        )}
      </section>
      <section className="all-properties">
        <div className="container section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">ENCONTRE O SEU REFÚGIO</span>
              <h2>Qual vai ser o seu próximo destino?</h2>
              <p>
                Explore fotos, comodidades e espaços para viajar com quem você
                gosta.
              </p>
            </div>
          </div>
          <PropertyListing compact />
        </div>
      </section>
      <section className="container section about-stays" id="sobre">
        <div className="about-symbol" aria-hidden="true">
          <Sun />
          <Waves />
        </div>
        <div>
          <span className="eyebrow">PRIVÊ LOPES | HOSPEDAGENS</span>
          <h2>Mais tempo para viver bons momentos.</h2>
          <p>
            Uma pausa na rotina, uma viagem em família ou alguns dias com os
            amigos. A Privê Lopes reúne hospedagens por temporada para você
            conhecer com calma e escolher o espaço que combina com a sua viagem.
          </p>
          <Link className="text-link" to="/contatos">
            Vamos planejar sua estadia? <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>
      <section className="container section how-section" id="como-funciona">
        <div className="how-intro">
          <span className="eyebrow">SUA VIAGEM, SEM COMPLICAÇÃO</span>
          <h2>
            Da primeira foto
            <br />
            ao seu próximo destino.
          </h2>
          <p>
            Explore as hospedagens e fale diretamente com a gente para combinar
            seu período.
          </p>
        </div>
        <div className="how-steps">
          {[
            {
              icon: Search,
              title: "Encontre seu refúgio",
              text: "Explore o catálogo por destino, tipo de hospedagem e características.",
            },
            {
              icon: House,
              title: "Conheça cada detalhe",
              text: "Veja fotos, vídeos, capacidade e comodidades para planejar a estadia.",
            },
            {
              icon: MessageCircle,
              title: "Consulte seu período",
              text: "Envie suas datas e o número de hóspedes pelo WhatsApp. Combine valores e disponibilidade diretamente.",
            },
          ].map(({ icon: Icon, title, text }, index) => (
            <div className="how-step" key={title}>
              <span className="step-icon">
                <Icon size={21} />
              </span>
              <div>
                <small>0{index + 1}</small>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="container contact-banner">
        <div>
          <span className="eyebrow">SEUS MELHORES MOMENTOS ESTÃO POR VIR</span>
          <h2>Vamos planejar sua próxima temporada?</h2>
          <p>
            Conte suas datas e com quem você vai viajar. A gente ajuda com os
            próximos passos.
          </p>
        </div>
        {contact ? (
          <Button asChild size="lg">
            <a href={contact} target="_blank" rel="noopener noreferrer">
              <MessageCircle /> Falar pelo WhatsApp <ArrowUpRight />
            </a>
          </Button>
        ) : (
          <Button asChild size="lg">
            <Link to="/contatos">
              Entre em contato <ArrowRight />
            </Link>
          </Button>
        )}
      </section>
    </>
  );
}
