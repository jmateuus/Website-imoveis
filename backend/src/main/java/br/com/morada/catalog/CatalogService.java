package br.com.morada.catalog;

import static br.com.morada.catalog.Dtos.*;
import java.text.Normalizer;
import java.util.*;
import java.time.Instant;
import java.math.BigDecimal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import jakarta.persistence.criteria.Predicate;

@Service
@Transactional
class CatalogService {
    private final PropertyRepository properties;
    private final AmenityRepository amenities;
    private final DeletionRepository deletions;
    CatalogService(PropertyRepository properties, AmenityRepository amenities, DeletionRepository deletions) {
        this.properties=properties; this.amenities=amenities; this.deletions=deletions;
    }
    @Transactional(readOnly=true)
    PageResult<PropertyView> list(boolean admin, String search, String city, String neighborhood,
        PropertyType type, BigDecimal minPrice, BigDecimal maxPrice, Integer minBedrooms,
        PropertyStatus status, Boolean featured, int page, int size, String sort) {
        if (page < 0 || page > 100000 || size < 1 || size > 100) throw bad("Paginação inválida.");
        if ((minPrice != null && minPrice.signum()<0) || (maxPrice!=null && maxPrice.signum()<0)
            || (minPrice!=null && maxPrice!=null && minPrice.compareTo(maxPrice)>0)
            || (minBedrooms!=null && minBedrooms<0)) throw bad("Filtros inválidos.");
        var order = switch(sort) { case "price-asc" -> Sort.by("rent").ascending();
            case "price-desc" -> Sort.by("rent").descending(); case "recent" -> Sort.by("createdAt").descending();
            default -> throw bad("Ordenação inválida."); };
        Specification<Property> spec = (root, query, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            if (!admin) ps.add(cb.notEqual(root.get("status"), PropertyStatus.RASCUNHO));
            if (search!=null && !search.isBlank()) {
                String term="%"+escape(search.trim().toLowerCase(Locale.ROOT))+"%";
                ps.add(cb.or(cb.like(cb.lower(root.get("title")),term,'\\'),
                    cb.like(cb.lower(root.get("city")),term,'\\'),cb.like(cb.lower(root.get("neighborhood")),term,'\\')));
            }
            if (city!=null && !city.isBlank()) ps.add(cb.equal(cb.lower(root.get("city")),city.toLowerCase(Locale.ROOT).trim()));
            if (neighborhood!=null && !neighborhood.isBlank()) ps.add(cb.equal(cb.lower(root.get("neighborhood")),neighborhood.toLowerCase(Locale.ROOT).trim()));
            if (type!=null) ps.add(cb.equal(root.get("type"),type));
            if (minPrice!=null) ps.add(cb.greaterThanOrEqualTo(root.get("rent"),minPrice));
            if (maxPrice!=null) ps.add(cb.lessThanOrEqualTo(root.get("rent"),maxPrice));
            if (minBedrooms!=null) ps.add(cb.greaterThanOrEqualTo(root.get("bedrooms"),minBedrooms));
            if (status!=null) ps.add(cb.equal(root.get("status"),status));
            if (featured!=null) ps.add(cb.equal(root.get("featured"),featured));
            return cb.and(ps.toArray(Predicate[]::new));
        };
        var result=properties.findAll(spec,PageRequest.of(page,size,order.and(Sort.by("id"))));
        return new PageResult<>(result.map(p->view(p,admin)).getContent(),result.getTotalElements(),result.getTotalPages(),page,size);
    }
    private String escape(String s) { return s.replace("\\","\\\\").replace("%","\\%").replace("_","\\_"); }
    @Transactional(readOnly=true) PropertyView bySlug(String slug) {
        Property p=properties.findBySlug(slug).orElseThrow(CatalogService::notFound);
        if (p.status==PropertyStatus.RASCUNHO) throw notFound();
        return view(p,false);
    }
    @Transactional(readOnly=true) PropertyView byId(UUID id) { return view(get(id),true); }
    Property get(UUID id) { return properties.findById(id).orElseThrow(CatalogService::notFound); }
    Property locked(UUID id) { return properties.findLockedById(id).orElseThrow(CatalogService::notFound); }
    PropertyView save(UUID id, PropertyInput input) {
        Property p=id==null?new Property():locked(id);
        String slug=input.slug()==null || input.slug().isBlank()?slugify(input.title()):input.slug();
        if (slug.isBlank()) slug="imovel-"+p.id.toString().substring(0,8);
        if (properties.existsBySlugAndIdNot(slug,p.id)) throw new ResponseStatusException(HttpStatus.CONFLICT,"Esta URL já está em uso. Escolha outro slug.");
        if (input.suites()!=null && input.bedrooms()!=null && input.suites()>input.bedrooms()) throw bad("Suítes não podem superar o total de quartos.");
        var chosen=amenities.findAllById(input.amenityIds());
        if (chosen.size()!=input.amenityIds().size()) throw bad("Comodidade inexistente.");
        p.title=input.title().trim(); p.slug=slug; p.description=input.description().trim(); p.type=input.type();
        p.rent=input.rent(); p.condoFee=input.condoFee(); p.propertyTax=input.propertyTax(); p.area=input.area();
        p.bedrooms=input.bedrooms(); p.suites=input.suites(); p.bathrooms=input.bathrooms(); p.parking=input.parking(); p.guests=input.guests();
        p.city=input.city().trim(); p.state=input.state(); p.neighborhood=input.neighborhood().trim(); p.address=input.address();
        p.showAddress=input.showAddress(); p.furnished=input.furnished(); p.petsAllowed=input.petsAllowed();
        p.featured=input.featured(); p.status=input.status(); p.updatedAt=Instant.now();
        p.amenities.clear(); p.amenities.addAll(chosen);
        properties.saveAndFlush(p);
        return view(p,true);
    }
    void delete(UUID id) {
        Property p=locked(id);
        for (Media m:p.media) { queueDelete(m.key); queueDelete(m.thumbnailKey); }
        properties.delete(p);
    }
    void queueDelete(String key) { if (key!=null) deletions.save(new PendingDeletion(key)); }
    static String slugify(String s) {
        return Normalizer.normalize(s,Normalizer.Form.NFD).replaceAll("\\p{M}","").toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+","-").replaceAll("^-|-$","");
    }
    @Transactional(readOnly=true) Dashboard dashboard() {
        long drafts=properties.countByStatus(PropertyStatus.RASCUNHO), total=properties.count();
        return new Dashboard(total,total-drafts,drafts,properties.countByStatus(PropertyStatus.INDISPONIVEL));
    }
    @Transactional(readOnly=true) List<AmenityView> amenities() {
        return amenities.findAll(Sort.by("name")).stream().map(a->new AmenityView(a.id,a.name)).toList();
    }
    PropertyView view(Property p, boolean admin) {
        return new PropertyView(p.id,p.title,p.slug,p.description,p.type,p.rent,p.condoFee,p.propertyTax,p.area,
            p.bedrooms,p.suites,p.bathrooms,p.parking,p.guests,p.city,p.state,p.neighborhood,
            admin || p.showAddress?p.address:null,p.showAddress,p.furnished,p.petsAllowed,p.featured,p.status,
            p.createdAt,p.updatedAt,p.amenities.stream().map(a->new AmenityView(a.id,a.name)).sorted(Comparator.comparing(AmenityView::name)).toList(),
            p.media.stream().sorted(Comparator.comparingInt(m->m.position)).map(m->mediaView(m,admin)).toList());
    }
    static MediaView mediaView(Media m, boolean admin) {
        String base=admin?"/api/admin/media/":"/api/public/media/";
        return new MediaView(m.id,m.type,base+m.id,m.thumbnailKey==null?null:base+m.id+"?thumbnail=true",
            m.originalName,m.contentType,m.size,m.position,m.primaryImage);
    }
    static ResponseStatusException notFound() { return new ResponseStatusException(HttpStatus.NOT_FOUND,"Não encontrado."); }
    static ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST,message); }
}
