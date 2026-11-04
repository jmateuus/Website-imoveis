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
import static br.com.morada.catalog.Dtos.*;

@Entity @Table(name="vivencia")
class Experience {
    @Id UUID id=UUID.randomUUID(); @Version Long version;
    @Column(name="titulo") String title;
    @Column(name="descricao",columnDefinition="text") String description;
    @Column(name="duracao") String stayDuration;
    @Column(name="publicada") boolean published;
    @Column(name="imovel_id") UUID propertyId;
    @Column(name="cliente") String customerName;
    @Column(name="nota") int rating;
    @Column(name="comentario",columnDefinition="text") String comment;
    @Column(name="hospedagem") String propertyName;
    @Column(name="contato") String contact;
    @Column(name="foto_chave") String photoKey;
    @Column(name="criado_em") Instant createdAt=Instant.now();
    @OneToMany(mappedBy="experience",cascade=CascadeType.ALL,orphanRemoval=true)
    @OrderBy("position ASC, createdAt ASC") List<Media> media=new ArrayList<>();
}
interface ExperienceRepository extends JpaRepository<Experience,UUID> {
    Page<Experience> findByPublishedTrue(Pageable pageable);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select e from Experience e where e.id=:id") Optional<Experience> findLockedById(UUID id);
}
record ExperienceInput(@NotBlank @Size(max=160) String title,
    @NotBlank @Size(max=20000) String description,@NotBlank @Size(max=100) String stayDuration,
    boolean published, UUID propertyId, @NotNull @Valid ReviewInput review) {}
record ExperienceView(UUID id,String title,String description,String stayDuration,boolean published,
    UUID propertyId,String propertySlug,ReviewView review,List<MediaView> media) {}

@Service @Transactional
class ExperienceService {
    private final ExperienceRepository experiences;
    private final PropertyRepository properties;
    private final StorageService storage;
    private final CatalogService catalog;
    ExperienceService(ExperienceRepository experiences,PropertyRepository properties,StorageService storage,CatalogService catalog) {
        this.experiences=experiences;this.properties=properties;this.storage=storage;this.catalog=catalog;
    }
    Experience get(UUID id,boolean admin) {
        var e=experiences.findById(id).orElseThrow(CatalogService::notFound);
        if (!admin && !e.published) throw CatalogService.notFound();return e;
    }
    ExperienceView view(Experience e,boolean admin) {
        String slug=e.propertyId==null?null:properties.findById(e.propertyId).filter(p->p.status!=PropertyStatus.RASCUNHO).map(p->p.slug).orElse(null);
        return new ExperienceView(e.id,e.title,e.description,e.stayDuration,e.published,e.propertyId,slug,
            new ReviewView(e.id,e.customerName,e.rating,e.comment,e.propertyName,e.contact,
                "/api/"+(admin?"admin":"public")+"/experiences/"+e.id+"/photo?v="+e.photoKey.substring("experiences/portraits/".length(),"experiences/portraits/".length()+36)),
            e.media.stream().map(m->CatalogService.mediaView(m,admin)).toList());
    }
    @Transactional(readOnly=true) PageResult<ExperienceView> list(boolean admin,int page,int size) {
        if (page<0 || page>100000 || size<1 || size>50) throw CatalogService.bad("Paginação inválida.");
        var pageable=PageRequest.of(page,size,Sort.by(Sort.Order.desc("createdAt"),Sort.Order.asc("id")));
        var result=admin?experiences.findAll(pageable):experiences.findByPublishedTrue(pageable);
        return new PageResult<>(result.getContent().stream().map(e->view(e,admin)).toList(),result.getTotalElements(),result.getTotalPages(),page,size);
    }
    @Transactional(readOnly=true) ExperienceView detail(UUID id,boolean admin) { return view(get(id,admin),admin); }
    ExperienceView save(UUID id,ExperienceInput input,MultipartFile file) throws IOException {
        Experience e=id==null?new Experience():experiences.findLockedById(id).orElseThrow(CatalogService::notFound);
        if (input.propertyId()!=null && !properties.existsById(input.propertyId())) throw CatalogService.bad("Hospedagem não encontrada.");
        boolean photo=file!=null && !file.isEmpty();
        if (id==null && !photo) throw CatalogService.bad("Selecione uma foto do cliente.");
        if (photo) {
            if (!Set.of("image/jpeg","image/png").contains(Optional.ofNullable(file.getContentType()).orElse(""))) throw CatalogService.bad("Use foto JPG ou PNG de até 15 MB.");
            var optimized=MediaService.optimize(file);
            String key="experiences/portraits/"+UUID.randomUUID()+".jpg";
            storage.put(key,"image/jpeg",optimized.thumbnail());
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCompletion(int status) {
                    if (status!=STATUS_COMMITTED) try { storage.delete(key); } catch (RuntimeException ex) { org.slf4j.LoggerFactory.getLogger(ExperienceService.class).warn("Falha ao limpar retrato não salvo: {}",key); }
                }
            });
            if (e.photoKey!=null) catalog.queueDelete(e.photoKey);e.photoKey=key;
        }
        e.title=input.title().trim();e.description=input.description().trim();e.stayDuration=input.stayDuration().trim();e.published=input.published();e.propertyId=input.propertyId();
        var r=input.review();e.customerName=r.customerName().trim();e.rating=r.rating();e.comment=r.comment().trim();e.propertyName=r.propertyName().trim();e.contact=r.contact()==null?"":r.contact().trim();
        experiences.saveAndFlush(e);return view(e,true);
    }
    void delete(UUID id) {
        var e=experiences.findLockedById(id).orElseThrow(CatalogService::notFound);
        catalog.queueDelete(e.photoKey);for (var m:e.media) { catalog.queueDelete(m.key);catalog.queueDelete(m.thumbnailKey); }
        experiences.delete(e);
    }
    @Transactional(readOnly=true) ResponseEntity<InputStreamResource> photo(UUID id,boolean admin) { return storage.read(get(id,admin).photoKey,null,admin); }
}

@RestController
class ExperienceController {
    private final ExperienceService service;private final MediaService media;
    ExperienceController(ExperienceService service,MediaService media) { this.service=service;this.media=media; }
    @GetMapping("/api/public/experiences") PageResult<ExperienceView> list(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="12") int size) { return service.list(false,page,size); }
    @GetMapping("/api/admin/experiences") PageResult<ExperienceView> adminList(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="12") int size) { return service.list(true,page,size); }
    @GetMapping("/api/public/experiences/{id}") ExperienceView detail(@PathVariable UUID id) { return service.detail(id,false); }
    @GetMapping("/api/admin/experiences/{id}") ExperienceView adminDetail(@PathVariable UUID id) { return service.detail(id,true); }
    @GetMapping("/api/public/experiences/{id}/photo") ResponseEntity<InputStreamResource> photo(@PathVariable UUID id) { return service.photo(id,false); }
    @GetMapping("/api/admin/experiences/{id}/photo") ResponseEntity<InputStreamResource> adminPhoto(@PathVariable UUID id) { return service.photo(id,true); }
    @PostMapping(value="/api/admin/experiences",consumes="multipart/form-data") @ResponseStatus(HttpStatus.CREATED)
    ExperienceView create(@Valid @RequestPart("experience") ExperienceInput input,@RequestPart(value="file",required=false) MultipartFile file) throws IOException { return service.save(null,input,file); }
    @PutMapping(value="/api/admin/experiences/{id}",consumes="multipart/form-data")
    ExperienceView update(@PathVariable UUID id,@Valid @RequestPart("experience") ExperienceInput input,@RequestPart(value="file",required=false) MultipartFile file) throws IOException { return service.save(id,input,file); }
    @DeleteMapping("/api/admin/experiences/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) void delete(@PathVariable UUID id) { service.delete(id); }
    @PostMapping("/api/admin/experiences/{id}/media") @ResponseStatus(HttpStatus.CREATED)
    MediaView upload(@PathVariable UUID id,@RequestParam MultipartFile file) throws IOException { return media.uploadExperience(id,file); }
    @DeleteMapping("/api/admin/experiences/{id}/media/{mediaId}") @ResponseStatus(HttpStatus.NO_CONTENT) void deleteMedia(@PathVariable UUID id,@PathVariable UUID mediaId) { media.deleteExperience(id,mediaId); }
    @PutMapping("/api/admin/experiences/{id}/media/{mediaId}/primary") @ResponseStatus(HttpStatus.NO_CONTENT) void primary(@PathVariable UUID id,@PathVariable UUID mediaId) { media.primaryExperience(id,mediaId); }
    @PutMapping("/api/admin/experiences/{id}/media/order") @ResponseStatus(HttpStatus.NO_CONTENT) void order(@PathVariable UUID id,@RequestBody List<UUID> ids) { media.reorderExperience(id,ids); }
}
