import { Link } from "react-router-dom";
import {
  MessageCircle,
  ArrowUpRight,
  ArrowRight,
  Mail,
  CalendarDays,
  Users,
  House,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/components/PublicLayout";
import Seo from "@/components/Seo";
import { whatsappUrl } from "@/lib/utils";
export default function Contacts() {
  const settings = useSettings();
  const contact = whatsappUrl(settings.whatsapp);
  return (
    <section className="container section contact-page">
      <Seo
        title={`Contatos | ${settings.name}`}
        description="Planeje sua temporada com a Privê Lopes. Fale pelo WhatsApp, informe seu período e consulte valores e disponibilidade."
        image={settings.heroImageUrl}
      />
      <div className="breadcrumb">
        <Link to="/">Início</Link>
        <span>/</span>
        <span>Contatos</span>
      </div>
      <div className="contact-intro">
        <span className="eyebrow">
          <Sun size={15} /> A SUA PRÓXIMA VIAGEM COMEÇA COM UMA CONVERSA
        </span>
        <h1>
          Vamos combinar
          <br />
          seus dias de descanso?
        </h1>
        <p>
          Fale com a gente para conhecer as hospedagens, tirar dúvidas e
          consultar disponibilidade para seu período.
        </p>
        <Link className="text-link" to="/imoveis">
          Explore as hospedagens <ArrowRight size={18} />
        </Link>
      </div>
      <div className="contact-columns">
        <div className="contact-direct">
          <span className="contact-icon">
            <MessageCircle size={30} />
          </span>
          <h2>Converse com a Privê Lopes</h2>
          <p>
            Conte o que você está procurando. As datas e os valores são
            combinados diretamente com nossa equipe.
          </p>
          {contact ? (
            <Button asChild size="lg">
              <a href={contact} target="_blank" rel="noopener noreferrer">
                <MessageCircle /> Falar pelo WhatsApp <ArrowUpRight />
              </a>
            </Button>
          ) : (
            <p className="muted">
              Nosso WhatsApp está em atualização. Volte em breve ou use o e-mail
              abaixo.
            </p>
          )}
          {settings.email && (
            <a className="contact-email" href={`mailto:${settings.email}`}>
              <Mail size={17} /> {settings.email}
            </a>
          )}
          <small>
            Seu período é confirmado no atendimento. Não há pagamentos pelo
            site.
          </small>
        </div>
        <div className="contact-guide">
          <span className="eyebrow">PARA PLANEJAR COM MAIS FACILIDADE</span>
          <h2>O que enviar na sua mensagem</h2>
          {[
            {
              icon: CalendarDays,
              title: "As suas datas",
              text: "Informe quando pretende chegar e sair.",
            },
            {
              icon: Users,
              title: "Quem vai com você",
              text: "Conte o número de hóspedes da estadia.",
            },
            {
              icon: House,
              title: "A hospedagem que gostou",
              text: "Compartilhe o anúncio ou diga o que procura.",
            },
          ].map(({ icon: Icon, title, text }) => (
            <div className="contact-guide-item" key={title}>
              <Icon size={22} />
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
