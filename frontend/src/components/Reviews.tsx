import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "./ui/button";
import { Failure, Loading } from "./Feedback";

import type { ReviewPage } from "@/lib/types";
export function Stars({ rating }: { rating: number }) {
  return (
    <span
      className="review-stars"
      role="img"
      aria-label={`${rating} de 5 estrelas`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={17}
          fill={i < rating ? "currentColor" : "none"}
          aria-hidden="true"
        />
      ))}
      <span aria-hidden="true">{rating}/5</span>
    </span>
  );
}
// Only an explicit Instagram handle becomes a link; free text stays plain text.
export function instagramUrl(contact: string) {
  const match = contact.trim().match(/^@([a-zA-Z0-9._]{1,30})$/);
  return match ? `https://www.instagram.com/${match[1]}/` : undefined;
}
export default function Reviews() {
  const [page, setPage] = useState(0);
  const query = useQuery({
    queryKey: ["reviews", "public", page],
    queryFn: () => api<ReviewPage>(`/api/public/reviews?page=${page}&size=6`),
  });
  if (query.isPending)
    return (
      <section className="container section">
        <Loading />
      </section>
    );
  if (query.isError)
    return (
      <section className="container section">
        <Failure error={query.error} retry={() => query.refetch()} />
      </section>
    );
  if (!query.data.totalElements) return null;
  return (
    <section
      className="container section guest-reviews"
      id="avaliacoes"
      aria-labelledby="reviews-title"
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">QUEM JÁ SE HOSPEDOU</span>
          <h2 id="reviews-title">Boas lembranças de quem passou por aqui.</h2>
          <p>Experiências compartilhadas pelos nossos hóspedes.</p>
        </div>
      </div>
      <p className="reviews-summary">
        <strong>
          {query.data.average.toLocaleString("pt-BR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })}{" "}
          de 5
        </strong>{" "}
        · {query.data.totalElements}{" "}
        {query.data.totalElements === 1 ? "avaliação" : "avaliações"}
      </p>
      <div className="review-grid">
        {query.data.content.map((review) => (
          <article className="review-card" key={review.id}>
            <div className="review-person">
              <img src={review.photoUrl} alt="" loading="lazy" />
              <h3>{review.customerName}</h3>
            </div>
            <Stars rating={review.rating} />
            <p className="review-comment">{review.comment}</p>
            <div className="review-details">
              <p>Hospedagem: {review.propertyName}</p>
              {review.contact && (
                <small>
                  Contato do hóspede:{" "}
                  {instagramUrl(review.contact) ? (
                    <a
                      href={instagramUrl(review.contact)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {review.contact}
                    </a>
                  ) : (
                    review.contact
                  )}
                </small>
              )}
            </div>
          </article>
        ))}
      </div>
      {query.data.totalPages > 1 && (
        <nav className="review-pagination" aria-label="Páginas de avaliações">
          <Button
            variant="outline"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Avaliações anteriores
          </Button>
          <span>
            {page + 1} / {query.data.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page + 1 >= query.data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Mais avaliações
          </Button>
        </nav>
      )}
    </section>
  );
}
