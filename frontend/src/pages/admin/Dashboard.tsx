import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  House,
  Globe,
  FilePenLine,
  CirclePause,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import { api } from "@/lib/api";
import type {
  Dashboard as DashboardData,
  PageResult,
  Property,
} from "@/lib/types";
import { statuses } from "@/lib/types";
import { money, cover } from "@/lib/utils";
import { Loading, Failure, Empty } from "@/components/Feedback";
import { Button } from "@/components/ui/button";
export default function Dashboard() {
  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<DashboardData>("/api/admin/dashboard"),
  });
  const recent = useQuery({
    queryKey: ["admin-properties", "recent"],
    queryFn: () => api<PageResult<Property>>("/api/admin/properties?size=5"),
  });
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">TUDO SOB SEU CONTROLE</span>
          <h1>Visão geral</h1>
          <p>Um bom dia para encontrar novos hóspedes.</p>
        </div>
        <Button asChild>
          <Link to="/admin/imoveis/novo">
            <Plus />
            Cadastrar hospedagem
          </Link>
        </Button>
      </div>
      {dashboard.isPending ? (
        <Loading />
      ) : dashboard.isError ? (
        <Failure error={dashboard.error} retry={() => dashboard.refetch()} />
      ) : (
        <div className="stats-grid">
          {[
            {
              label: "Hospedagens cadastradas",
              value: dashboard.data.total,
              icon: House,
            },
            {
              label: "Publicados no site",
              value: dashboard.data.published,
              icon: Globe,
            },
            {
              label: "Em rascunho",
              value: dashboard.data.drafts,
              icon: FilePenLine,
            },
            {
              label: "Indisponíveis",
              value: dashboard.data.unavailable,
              icon: CirclePause,
            },
          ].map(({ label, value, icon: Icon }) => (
            <div className="stat-card" key={label}>
              <span>
                <Icon size={19} />
              </span>
              <strong>{value}</strong>
              <p>{label}</p>
            </div>
          ))}
        </div>
      )}
      <div className="admin-panel">
        <div className="panel-heading">
          <div>
            <h2>Suas hospedagens mais recentes</h2>
            <p>Continue de onde parou.</p>
          </div>
          <Link className="text-link" to="/admin/imoveis">
            Gerenciar todos
            <ArrowUpRight size={16} />
          </Link>
        </div>
        {recent.isPending ? (
          <Loading />
        ) : recent.isError ? (
          <Failure error={recent.error} />
        ) : recent.data.content.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Hospedagem</th>
                  <th>Valor de referência</th>
                  <th>Situação</th>
                  <th>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {recent.data.content.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="table-property">
                        {cover(p) ? (
                          <img
                            src={cover(p)?.thumbnailUrl ?? cover(p)?.url}
                            alt=""
                          />
                        ) : (
                          <span className="table-placeholder">
                            <House />
                          </span>
                        )}
                        <div>
                          <Link to={`/admin/imoveis/${p.id}`}>{p.title}</Link>
                          <small>
                            {p.neighborhood}, {p.city}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>{money(p.rent)}</td>
                    <td>
                      <span className={`badge status-${p.status}`}>
                        {statuses[p.status]}
                      </span>
                    </td>
                    <td>
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/admin/imoveis/${p.id}`}>
                          Editar
                          <ArrowUpRight />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Vamos cadastrar a primeira hospedagem?"
            text="Adicione as informações e publique quando estiver tudo pronto."
          />
        )}
      </div>
      <div className="admin-tip">
        <House size={28} strokeWidth={1.4} />
        <div>
          <h3>Uma boa apresentação convida a viajar.</h3>
          <p>
            Boas fotos, uma descrição clara e informações atualizadas ajudam sua
            hospedagem a receber novos hóspedes.
          </p>
        </div>
      </div>
    </>
  );
}
