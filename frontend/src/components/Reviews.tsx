import { useRef, useState } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "./ui/button";
import { Failure, Loading } from "./Feedback";

import type { Review, ReviewPage } from "@/lib/types";
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
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
export function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="review-card">
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
  );
}
export default function Reviews() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const query = useQuery({
    queryKey: ["reviews", "public", 0],
    queryFn: () => api<ReviewPage>("/api/public/reviews?page=0&size=6"),
  });
  const all = useInfiniteQuery({
    queryKey: ["reviews", "all"],
    enabled: open,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      api<ReviewPage>(`/api/public/reviews?page=${pageParam}&size=30`),
    getNextPageParam: (last) =>
      last.page + 1 < last.totalPages ? last.page + 1 : undefined,
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
        {query.data.content.slice(0, 6).map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
      {query.data.totalElements > 6 && (
        <div className="review-pagination">
          <Button ref={trigger} variant="outline" onClick={() => setOpen(true)}>
            Visualizar todas as avaliações
          </Button>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="reviews-modal"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            trigger.current?.focus();
          }}
        >
          <DialogTitle>Todas as avaliações</DialogTitle>
          <DialogDescription>
            Leia os comentários completos dos nossos hóspedes.
          </DialogDescription>
          <div className="reviews-modal-scroll">
            {all.isPending ? (
              <Loading />
            ) : all.isError ? (
              <Failure error={all.error} retry={() => all.refetch()} />
            ) : (
              <>
                <div className="review-grid">
                  {all.data.pages
                    .flatMap((p) => p.content)
                    .map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                </div>
                {all.hasNextPage && (
                  <div className="review-pagination">
                    <Button
                      disabled={all.isFetchingNextPage}
                      onClick={() => all.fetchNextPage()}
                    >
                      {all.isFetchingNextPage
                        ? "Carregando…"
                        : "Carregar mais avaliações"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
