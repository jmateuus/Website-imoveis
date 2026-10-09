import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  House,
  KeyRound,
  MapPin,
  MessageCircle,
  Search,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import type { PageResult, Property } from "@/lib/types";
import { useSettings } from "@/components/PublicLayout";
import PropertyCard from "@/components/PropertyCard";
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
      <section className="container hero">
        <div className="hero-copy">
          <span className="hero-pill">
            <span className="green-dot" /> HOSPEDAGENS POR TEMPORADA NO NORDESTE
          </span>
          <h1>Seu próximo destino começa aqui.</h1>
          <p>Descubra hospedagens incríveis nas praias do Nordeste e aproveite cada momento da sua viagem.</p>
          <form
            className="hero-search"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(`/imoveis?search=${encodeURIComponent(search)}`);
            }}
          >
            <Search size={21} />
            <input
              aria-label="Qual praia ou destino você procura?"
              placeholder="Onde você quer morar?"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button type="submit">
              Encontrar
              <ArrowRight />
            </Button>
          </form>
          <div className="hero-assurances">
            <span>
              <Check size={14} />
              Contato direto
            </span>
            <span>
              <Check size={14} />
              Sem complicação
            </span>
            <span>
              <Check size={14} />
              Do seu jeito
            </span>
          </div>
        </div>
        <div className="hero-visual">
          <img
            src="/images/hero.jpg"
            alt="Casa contemporânea com varanda, jardim e palmeiras ao entardecer — imagem ilustrativa"
            fetchPriority="high"
          />
          <span className="hero-image-label">O seu refúgio à beira-mar.</span>
          <div className="hero-floating">
            <span>
              <KeyRound size={21} />
            </span>
            <div>
              <strong>Suas próximas férias</strong>
              <small>começam com uma boa hospedagem.</small>
            </div>
            <ArrowUpRight size={20} />
          </div>
          <span className="hero-caption">Imagem ilustrativa</span>
        </div>
      </section>
      <div className="values-strip">
        <div className="container">
          <span>
            <House />
            Hospedagens para relaxar
          </span>
          <i />
          <span>
            <MapPin />
            Destinos no Nordeste
          </span>
          <i />
          <span>
            <MessageCircle />
            Conversa de verdade
          </span>
        </div>
      </div>
      <section className="container section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              <Sparkles size={14} /> UMA SELEÇÃO ESPECIAL
            </span>
            <h2>Hospedagens em destaque</h2>
            <p>Alguns lugares merecem um olhar mais de perto.</p>
          </div>
          <Link className="text-link" to="/imoveis">
            Ver todos
            <ArrowUpRight size={18} />
          </Link>
        </div>
        {featured.isPending ? (
          <Loading />
        ) : featured.isError ? (
          <Failure error={featured.error} retry={() => featured.refetch()} />
        ) : featured.data.content.length ? (
          <div className="property-grid">
            {featured.data.content.map((p) => (
              <PropertyCard property={p} key={p.id} />
            ))}
          </div>
        ) : (
          <Empty
            title="Novos destaques em breve"
            text="Os imóveis selecionados pelo proprietário aparecerão aqui."
          />
        )}
      </section>
      <section className="all-properties">
        <div className="container section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">UM ESPAÇO QUE COMBINA COM VOCÊ</span>
              <h2>Encontre sua hospedagem ideal</h2>
              <p>Suas próximas férias começam com a escolha do lugar ideal.</p>
            </div>
          </div>
          <PropertyListing compact />
        </div>
      </section>
      <section className="container section how-section" id="como-funciona">
        <div className="how-intro">
          <span className="eyebrow">SIMPLES, COMO DEVE SER</span>
          <h2>
            Do primeiro olhar
            <br />à primeira conversa.
          </h2>
          <p>
            Você encontra o imóvel. A gente ajuda você a planejar sua próxima temporada.
          </p>
        </div>
        <div className="how-steps">
          {[
            {
              icon: Search,
              title: "Explore os imóveis",
              text: "Busque por localização e pelas características que importam para você.",
            },
            {
              icon: House,
              title: "Conheça cada detalhe",
              text: "Veja fotos, vídeos e comodidades para planejar seus dias de descanso.",
            },
            {
              icon: MessageCircle,
              title: "Converse diretamente",
              text: "Consulte valores e disponibilidade diretamente pelo WhatsApp.",
            },
          ].map(({ icon: Icon, title, text }, i) => (
            <div className="how-step" key={title}>
              <span className="step-icon">
                <Icon size={21} />
              </span>
              <div>
                <small>0{i + 1}</small>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="container contact-banner">
        <div>
          <span className="eyebrow">VAMOS PLANEJAR SUA TEMPORADA?</span>
          <h2>Sua próxima viagem merece uma hospedagem especial.</h2>
          <p>
            Encontrou o lugar ideal? Entre em contato e consulte a disponibilidade para sua próxima temporada.
          </p>
        </div>
        {contact ? (
          <Button asChild size="lg">
            <a href={contact} target="_blank" rel="noopener noreferrer">
              <MessageCircle />
              Conversar pelo WhatsApp
              <ArrowUpRight />
            </a>
          </Button>
        ) : (
          <Button asChild size="lg">
            <Link to="/imoveis">
              Explorar imóveis
              <ArrowRight />
            </Link>
          </Button>
        )}
      </section>
    </>
  );
}
