import { NavLink, Navigate, Outlet, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  House,
  Settings2,
  LogOut,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { api, ApiError, resetCsrf } from "@/lib/api";
import { Brand } from "@/components/PublicLayout";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Failure, Loading } from "@/components/Feedback";
import type { Settings } from "@/lib/types";
import { useState } from "react";
export default function AdminLayout() {
  const auth = useQuery({
    queryKey: ["auth"],
    queryFn: () => api<{ email: string }>("/api/auth/me"),
    retry: false,
    staleTime: 0,
  });
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<Settings>("/api/public/settings"),
  });
  const client = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState<unknown>(null);
  if (auth.isPending) return <Loading />;
  if (auth.error instanceof ApiError && auth.error.status === 401)
    return <Navigate to="/admin/login" replace />;
  if (auth.isError)
    return <Failure error={auth.error} retry={() => auth.refetch()} />;
  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
      resetCsrf();
      client.clear();
      navigate("/admin/login", { replace: true });
    } catch (e) {
      setError(e);
    }
  }
  return (
    <div className="admin-shell">
      <Seo
        title={`Painel de hospedagens | ${settings.data?.name ?? "Privê Lopes | Hospedagens"}`}
        description="Área administrativa para gerenciar hospedagens e conteúdo do site."
        noindex
      />
      <aside className="admin-sidebar">
        <Link to="/">
          <Brand settings={settings.data} />
        </Link>
        <span className="admin-section-label">
          <ShieldCheck size={13} /> ÁREA ADMINISTRATIVA
        </span>
        <nav aria-label="Navegação administrativa">
          <NavLink to="/admin" end>
            <LayoutDashboard size={19} />
            Visão geral
          </NavLink>
          <NavLink to="/admin/imoveis">
            <House size={19} />
            Minhas hospedagens
          </NavLink>
          <NavLink to="/admin/configuracoes">
            <Settings2 size={19} />
            Configurações
          </NavLink>
        </nav>
        <div className="admin-sidebar-bottom">
          <Button asChild variant="outline">
            <Link to="/">
              Ver meu site
              <ArrowUpRight />
            </Link>
          </Button>
          <p>{auth.data?.email}</p>
          <Button variant="ghost" onClick={logout}>
            <LogOut />
            Sair da conta
          </Button>
        </div>
      </aside>
      <div className="admin-main">
        <div className="admin-topbar">
          <span>Painel de hospedagens</span>
          <span className="admin-session">
            <span className="green-dot" />
            Sessão protegida
          </span>
        </div>
        {!!error && <Failure error={error} />}
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
