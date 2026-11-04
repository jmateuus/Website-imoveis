package br.com.morada.catalog;

import jakarta.persistence.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.io.IOException;
import java.time.Instant;
import java.util.*;
import org.springframework.core.io.InputStreamResource;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.jpa.repository.Query;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@Entity @Table(name="avaliacao")
class Review {
    @Id UUID id=UUID.randomUUID();
    @Version Long version;
    @Column(name="cliente") String customerName;
    @Column(name="nota") int rating;
    @Column(name="comentario",columnDefinition="text") String comment;
    @Column(name="hospedagem") String propertyName;
    @Column(name="contato") String contact;
    @Column(name="foto_chave") String photoKey;
    @Column(name="criado_em") Instant createdAt=Instant.now();
}
interface ReviewRepository extends JpaRepository<Review,UUID> {
    @Query("select avg(r.rating) from Review r") Double averageRating();
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Review r where r.id=:id") Optional<Review> findLockedById(UUID id);
}
record ReviewInput(
    @NotBlank @Size(max=100) String customerName,
    @NotNull @Min(0) @Max(5) Integer rating,
    @NotBlank @Size(max=3000) String comment,
    @NotBlank @Size(max=160) String propertyName,
    @Size(max=160) String contact
) {}
record ReviewView(UUID id,String customerName,int rating,String comment,String propertyName,String contact,String photoUrl) {}
record ReviewPage(List<ReviewView> content,long totalElements,int totalPages,int page,double average) {}

@Service @Transactional
class ReviewService {
    private final ReviewRepository reviews;
    private final StorageService storage;
    private final CatalogService catalog;
    ReviewService(ReviewRepository reviews,StorageService storage,CatalogService catalog) {
        this.reviews=reviews;this.storage=storage;this.catalog=catalog;
    }
    static ReviewView view(Review r) {
        return new ReviewView(r.id,r.customerName,r.rating,r.comment,r.propertyName,r.contact,
            "/api/public/reviews/"+r.id+"/photo?v="+r.photoKey.substring("reviews/".length(),"reviews/".length()+36));
    }
    @Transactional(readOnly=true) ReviewPage list(int page,int size) {
        var result=reviews.findAll(PageRequest.of(Math.max(0,page),Math.max(1,Math.min(50,size)),Sort.by(Sort.Order.desc("createdAt"),Sort.Order.asc("id"))));
        Double average=reviews.averageRating();
        return new ReviewPage(result.getContent().stream().map(ReviewService::view).toList(),result.getTotalElements(),result.getTotalPages(),result.getNumber(),average==null?0:average);
    }
    ReviewView save(UUID id,ReviewInput input,MultipartFile file) throws IOException {
        Review r=id==null?new Review():reviews.findLockedById(id).orElseThrow(CatalogService::notFound);
        boolean newPhoto=file!=null && !file.isEmpty();
        if (id==null && !newPhoto) throw CatalogService.bad("Selecione uma foto do cliente.");
        if (newPhoto) {
            if (!Set.of("image/jpeg","image/png").contains(Optional.ofNullable(file.getContentType()).orElse("")))
                throw CatalogService.bad("Use uma foto JPG ou PNG de até 15 MB.");
            var photo=MediaService.optimize(file);
            String key="reviews/"+UUID.randomUUID()+".jpg";
            storage.put(key,"image/jpeg",photo.thumbnail());
            // The new object must not survive a failed database transaction.
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCompletion(int status) {
                    if (status!=STATUS_COMMITTED) {
                        try { storage.delete(key); }
                        catch (RuntimeException e) { org.slf4j.LoggerFactory.getLogger(ReviewService.class).warn("Falha ao limpar foto de avaliação não salva: {}",key); }
                    }
                }
            });
            if (r.photoKey!=null) catalog.queueDelete(r.photoKey);
            r.photoKey=key;
        }
        r.customerName=input.customerName().trim();r.rating=input.rating();r.comment=input.comment().trim();
        r.propertyName=input.propertyName().trim();r.contact=input.contact()==null?"":input.contact().trim();
        reviews.saveAndFlush(r);
        return view(r);
    }
    void delete(UUID id) {
        Review r=reviews.findLockedById(id).orElseThrow(CatalogService::notFound);
        catalog.queueDelete(r.photoKey);reviews.delete(r);
    }
    @Transactional(readOnly=true) ResponseEntity<InputStreamResource> photo(UUID id) {
        return storage.read(reviews.findById(id).orElseThrow(CatalogService::notFound).photoKey,null,false);
    }
}

@RestController
class ReviewController {
    private final ReviewService service;
    ReviewController(ReviewService service) { this.service=service; }
    @GetMapping({"/api/public/reviews","/api/admin/reviews"})
    ReviewPage list(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="6") int size) { return service.list(page,size); }
    @GetMapping("/api/public/reviews/{id}/photo")
    ResponseEntity<InputStreamResource> photo(@PathVariable UUID id) { return service.photo(id); }
    @PostMapping(value="/api/admin/reviews",consumes=org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    ReviewView create(@Valid @RequestPart("review") ReviewInput input,@RequestPart(value="file",required=false) MultipartFile file) throws IOException { return service.save(null,input,file); }
    @PutMapping(value="/api/admin/reviews/{id}",consumes=org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    ReviewView update(@PathVariable UUID id,@Valid @RequestPart("review") ReviewInput input,@RequestPart(value="file",required=false) MultipartFile file) throws IOException { return service.save(id,input,file); }
    @DeleteMapping("/api/admin/reviews/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable UUID id) { service.delete(id); }
}
