import { createContext, useContext, useState, useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Sun,
  ArrowUpRight,
  Menu,
  X,
  MessageCircle,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Settings } from "@/lib/types";
import { whatsappUrl } from "@/lib/utils";
import { Button } from "./ui/button";
import { Failure, Loading } from "./Feedback";
const SettingsContext = createContext<Settings | null>(null);
export function useSettings() {
  const settings = useContext(SettingsContext);
  if (!settings) throw new Error("Configurações indisponíveis.");
  return settings;
}
export function Brand({ settings }: { settings?: Settings }) {
  return (
    <span className="brand">
      {settings?.logoUrl ? (
        <img src={settings.logoUrl} alt="" />
      ) : (
        <span className="brand-mark">
          <Sun size={26} strokeWidth={1.7} />
        </span>
      )}
      <span>
        {settings?.name ?? "Privê Lopes | Hospedagens"}
        <small>sol, praia e bons momentos</small>
      </span>
    </span>
  );
}
export default function PublicLayout() {
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<Settings>("/api/public/settings"),
  });
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  useEffect(() => {
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (icon) {
      icon.href = settings.data?.logoUrl ?? "/favicon.svg";
      icon.type = settings.data?.logoUrl ? "image/jpeg" : "image/svg+xml";
    }
  }, [settings.data?.logoUrl]);
  useEffect(() => {
    setMenu(false);
    if (!location.hash) window.scrollTo(0, 0);
    else {
      const frame = requestAnimationFrame(() =>
        document
          .getElementById(location.hash.slice(1))
          ?.scrollIntoView({ behavior: "smooth" }),
      );
      return () => cancelAnimationFrame(frame);
    }
  }, [location.pathname, location.hash]);
  if (settings.isPending) return <Loading />;
  if (settings.isError)
    return <Failure error={settings.error} retry={() => settings.refetch()} />;
  const contact = whatsappUrl(settings.data.whatsapp);
  return (
    <SettingsContext.Provider value={settings.data}>
      <a className="skip-link" href="#main">
        Pular para o conteúdo
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" aria-label={`${settings.data.name} — página inicial`}>
            <Brand settings={settings.data} />
          </Link>
          <button
            className="mobile-menu"
            onClick={() => setMenu(!menu)}
            aria-label={menu ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menu}
          >
            {menu ? <X /> : <Menu />}
          </button>
          <nav
            className={menu ? "nav open" : "nav"}
            aria-label="Navegação principal"
          >
            <NavLink to="/" end>
              Início
            </NavLink>
            <NavLink to="/imoveis">Explorar hospedagens</NavLink>
            <NavLink to="/contatos">Contatos</NavLink>
            {contact && (
              <Button asChild variant="outline">
                <a href={contact} target="_blank" rel="noopener noreferrer">
                  Consulte disponibilidade <ArrowUpRight />
                </a>
              </Button>
            )}
          </nav>
        </div>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <Link to="/">
              <Brand settings={settings.data} />
            </Link>
            <p>{settings.data.footer}</p>
          </div>
          <div>
            <h3>Sua próxima temporada</h3>
            <Link to="/imoveis">Hospedagens disponíveis</Link>
            <Link to="/#como-funciona">Como funciona</Link>
            <Link to="/contatos">Fale com a gente</Link>
          </div>
          <div>
            <h3>Planeje sua viagem</h3>
            {contact ? (
              <a href={contact} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={16} /> Conversar pelo WhatsApp{" "}
                <ArrowUpRight size={14} />
              </a>
            ) : (
              <span>Contato em atualização</span>
            )}
            {settings.data.email && (
              <a href={`mailto:${settings.data.email}`}>
                <Mail size={16} />
                {settings.data.email}
              </a>
            )}
          </div>
        </div>
        <div className="container footer-bottom">
          <span>
            © {new Date().getFullYear()} {settings.data.name}. Todos os direitos
            reservados.
          </span>
          <Link to="/admin">
            <ShieldCheck size={13} /> Área administrativa
          </Link>
        </div>
      </footer>
      {contact && (
        <a
          className="whatsapp-float"
          href={contact}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Conversar pelo WhatsApp"
        >
          <MessageCircle size={24} />
          <span>Podemos ajudar?</span>
        </a>
      )}
    </SettingsContext.Provider>
  );
}
