import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Experience } from "@/lib/types";
import Gallery from "@/components/Gallery";
import { ReviewCard } from "@/components/Reviews";
import { Loading, Failure } from "@/components/Feedback";
import { Button } from "@/components/ui/button";
import Seo from "@/components/Seo";
import { useSettings } from "@/components/PublicLayout";
export default function ExperienceDetail() {
  const { id } = useParams();
  const settings = useSettings();
  const query = useQuery({
    queryKey: ["experience", id],
    queryFn: () => api<Experience>(`/api/public/experiences/${id}`),
  });
  if (query.isPending) return <Loading />;
  if (query.isError)
    return (
      <section className="container section">
        <Link to="/vivencias">Voltar às vivências</Link>
        <Failure error={query.error} retry={() => query.refetch()} />
      </section>
    );
  const experience = query.data;
  return (
    <section className="container section experience-detail">
      <Seo
        title={`${experience.title} | ${settings.name}`}
        description={experience.description.slice(0, 160)}
        image={experience.media.find((m) => m.primaryImage)?.url}
      />
      <div className="breadcrumb">
        <Link to="/vivencias">Vivências</Link>
        <span>/</span>
        <span>{experience.title}</span>
      </div>
      <h1>{experience.title}</h1>
      <p className="experience-duration">
        {experience.review.propertyName} · {experience.stayDuration}
      </p>
      <Gallery
        key={experience.id}
        media={experience.media}
        title={experience.title}
      />
      <div className="experience-detail-columns">
        <div>
          <h2>Nossa vivência</h2>
          <p className="description-text">{experience.description}</p>
          {experience.propertySlug && (
            <Button asChild variant="outline">
              <Link to={`/imoveis/${experience.propertySlug}`}>
                Conhecer a hospedagem
              </Link>
            </Button>
          )}
        </div>
        <aside>
          <p className="experience-duration">
            <strong>Tempo de hospedagem:</strong> {experience.stayDuration}
          </p>
          <ReviewCard review={experience.review} />
        </aside>
      </div>
    </section>
  );
}
