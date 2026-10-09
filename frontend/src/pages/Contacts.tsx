import { MessageCircle, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/components/PublicLayout";
import { whatsappUrl } from "@/lib/utils";

export default function Contacts() {
  const settings = useSettings();
  const contact = whatsappUrl(settings.whatsapp || "5581995809198");
  return (
    <section className="container section contact-page">
      <span className="eyebrow">PRIVÊ LOPES | HOSPEDAGENS</span>
      <h1>Vamos planejar sua próxima temporada?</h1>
      <p>Fale com a Privê Lopes | Hospedagens para conhecer nossas opções e consultar valores e disponibilidade.</p>
      <p>As consultas e negociações são realizadas diretamente pelo WhatsApp, sem reservas ou pagamentos pelo site.</p>
      {contact && <Button asChild size="lg"><a href={contact} target="_blank" rel="noopener noreferrer"><MessageCircle /> Falar pelo WhatsApp <ArrowUpRight /></a></Button>}
    </section>
  );
}
