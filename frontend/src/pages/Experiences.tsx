import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Images } from "lucide-react";
import { api } from "@/lib/api";
import type { Experience, PageResult } from "@/lib/types";
import { Stars } from "@/components/Reviews";
import { Button } from "@/components/ui/button";
import { Empty, Loading, Failure } from "@/components/Feedback";
import Seo from "@/components/Seo";
import { useSettings } from "@/components/PublicLayout";
export default function Experiences() {
  const [page, setPage] = useState(0);
  const settings = useSettings();
  const query = useQuery({
    queryKey: ["experiences", page],
    queryFn: () =>
      api<PageResult<Experience>>(
        `/api/public/experiences?page=${page}&size=12`,
      ),
  });
  return (
    <section className="container section experiences-page">
      <Seo
        title={`Vivências | ${settings.name}`}
        description="Histórias, fotos e experiências compartilhadas por nossos hóspedes."
      />
      <div className="section-heading">
        <div>
          <span className="eyebrow">HISTÓRIAS DE QUEM ESTEVE AQUI</span>
          <h1>Vivências que viram boas lembranças.</h1>
          <p>Descubra momentos compartilhados pelos nossos hóspedes.</p>
        </div>
      </div>
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <Failure error={query.error} retry={() => query.refetch()} />
      ) : (
        <>
          {!query.data.content.length && (
            <Empty
              title="Novas vivências em breve"
              text="Estamos reunindo boas histórias para compartilhar com você."
            />
          )}
          <div className="experience-grid">
            {query.data.content.map((experience) => {
              const cover =
                experience.media.find(
                  (m) => m.primaryImage && m.type === "IMAGEM",
                ) ?? experience.media.find((m) => m.type === "IMAGEM");
              return (
                <article className="experience-card" key={experience.id}>
                  <Link
                    to={`/vivencias/${experience.id}`}
                    className="experience-cover"
                    aria-label={`Ler ${experience.title}`}
                  >
                    {cover ? (
                      <img
                        src={cover.thumbnailUrl ?? cover.url}
                        alt={experience.title}
                        loading="lazy"
                      />
                    ) : (
                      <span className="photo-placeholder">
                        <Images />
                        Ver vivência
                      </span>
                    )}
                  </Link>
                  <div className="experience-card-body">
                    <h2>
                      <Link to={`/vivencias/${experience.id}`}>
                        {experience.title}
                      </Link>
                    </h2>
                    <div className="review-person">
                      <img
                        src={experience.review.photoUrl}
                        alt=""
                        loading="lazy"
                      />
                      <span>{experience.review.customerName}</span>
                    </div>
                    <Stars rating={experience.review.rating} />
                    <p>
                      {experience.review.propertyName} ·{" "}
                      {experience.stayDuration}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
          {query.data.totalPages > 1 && (
            <nav
              className="review-pagination"
              aria-label="Páginas de vivências"
            >
              <Button
                variant="outline"
                disabled={!page}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <span>
                {page + 1} / {query.data.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page + 1 >= query.data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
