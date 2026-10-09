import { Link } from "react-router-dom";
import {
  BedDouble,
  Bath,
  Users,
  Expand,
  MapPin,
  ArrowUpRight,
  House,
  MessageCircle,
} from "lucide-react";
import type { Property } from "@/lib/types";
import { propertyTypes } from "@/lib/types";
import { cover, whatsappUrl } from "@/lib/utils";
import { useSettings } from "@/components/PublicLayout";
export function PropertySpecs({ property }: { property: Property }) {
  const specs = [
    { value: property.bedrooms, icon: BedDouble, label: "quartos" },
    { value: property.bathrooms, icon: Bath, label: "banheiros" },
    { value: property.guests, icon: Users, label: "hóspedes" },
    { value: property.area, icon: Expand, label: "m²" },
  ];
  return (
    <div className="property-specs">
      {specs
        .filter((s) => s.value != null)
        .map(({ value, icon: Icon, label }) => (
          <span key={label} title={`${value} ${label}`}>
            <Icon size={16} strokeWidth={1.6} />
            <span>
              {value}
              {label === "m²" && " m²"}
            </span>
            <span className="sr-only">{label !== "m²" && label}</span>
          </span>
        ))}
    </div>
  );
}
export default function PropertyCard({ property }: { property: Property }) {
  const image = cover(property);
  const settings = useSettings();
  const contact = whatsappUrl(settings.whatsapp, property);
  return (
    <article className="property-card">
      <Link
        className="card-photo"
        to={`/imoveis/${property.slug}`}
        aria-label={`Ver ${property.title}`}
      >
        {image ? (
          <img
            src={image.thumbnailUrl ?? image.url}
            alt={property.title}
            loading="lazy"
          />
        ) : (
          <div className="photo-placeholder">
            <House size={48} strokeWidth={1} />
            <span>Fotos em breve</span>
          </div>
        )}
        <div className="photo-badges">
          {property.featured && (
            <span className="badge featured-badge">Destaque</span>
          )}
          {property.status === "INDISPONIVEL" && (
            <span className="badge unavailable-badge">Indisponível</span>
          )}
        </div>
        <span className="photo-type">{propertyTypes[property.type]}</span>
      </Link>
      <div className="card-body">
        <p className="card-location">
          <MapPin size={13} />
          {property.neighborhood}, {property.city}
        </p>
        <h3>
          <Link to={`/imoveis/${property.slug}`}>{property.title}</Link>
        </h3>
        <p className="card-description">{property.description}</p>
        <PropertySpecs property={property} />
        {property.amenities.length > 0 && (
          <div className="card-amenities">
            {property.amenities.slice(0, 2).map((amenity) => (
              <span key={amenity.id}>{amenity.name}</span>
            ))}
          </div>
        )}
        <div className="card-bottom">
          <p>
            <strong>Planeje sua estadia</strong>
          </p>
          <Link className="detail-link" to={`/imoveis/${property.slug}`}>
            Ver detalhes <ArrowUpRight size={16} />
          </Link>
        </div>
        {contact && (
          <a
            className="card-contact"
            href={contact}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Consultar ${property.title} pelo WhatsApp`}
          >
            <MessageCircle size={16} /> Consulte disponibilidade{" "}
            <ArrowUpRight size={15} />
          </a>
        )}
      </div>
    </article>
  );
}
