package br.com.morada.catalog;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static br.com.morada.catalog.Dtos.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.transaction.annotation.Transactional;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import java.math.BigDecimal;
import java.io.ByteArrayOutputStream;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;

@SpringBootTest(properties="app.demo-data=false") @AutoConfigureMockMvc @Transactional
class CatalogIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired CatalogService catalog;
    @Autowired MediaService media;
    @Autowired StorageService storage;
    @Autowired PropertyRepository properties;
    @Autowired MediaRepository mediaRepository;
    @Autowired SettingsRepository siteSettings;
    @Autowired ReviewRepository reviews;
    @Autowired ExperienceRepository experiences;
    @Autowired ExperienceService experienceService;
    @Autowired jakarta.persistence.EntityManager entityManager;
    @Autowired ObjectMapper mapper;
    @Value("${app.admin-email}") String adminEmail;
    @Value("${app.admin-password}") String adminPassword;
    List<String> uploaded=new ArrayList<>();
    @Test void experienceVideoCanBeCoverAndSurvivesPhotoUploads() throws Exception {
        var e=experience(true,null);
        var video=media.uploadExperience(e.id(),new MockMultipartFile("file","tour.mp4","video/mp4",java.nio.file.Files.readAllBytes(java.nio.file.Path.of("../frontend/e2e/fixtures/tour.mp4"))));track(video.id());
        assertThat(video.primaryImage()).isTrue();
        var photo=media.uploadExperience(e.id(),image("praia.png"));track(photo.id());
        assertThat(photo.primaryImage()).isFalse();
        media.primaryExperience(e.id(),photo.id());
        mvc.perform(put("/api/admin/experiences/"+e.id()+"/media/"+video.id()+"/primary").with(user("admin").roles("ADMIN")).with(csrf())).andExpect(status().isNoContent());
        entityManager.flush();entityManager.clear();
        var view=experienceService.detail(e.id(),false);
        assertThat(view.media().stream().filter(MediaView::primaryImage).map(MediaView::id).toList()).containsExactly(video.id());
        media.deleteExperience(e.id(),video.id());
        assertThat(mediaRepository.findById(photo.id()).orElseThrow().primaryImage).isTrue();
    }
    @Test void publishedExperienceMediaWorksFromFreshPersistenceContext() throws Exception {
        var e=experience(true,null);
        var photo=media.uploadExperience(e.id(),image("praia.png"));track(photo.id());
        var video=media.uploadExperience(e.id(),new MockMultipartFile("file","tour.mp4","video/mp4",java.nio.file.Files.readAllBytes(java.nio.file.Path.of("../frontend/e2e/fixtures/tour.mp4"))));track(video.id());
        entityManager.flush();entityManager.clear();
        String url=photo.url().replace("/admin/","/public/");
        mvc.perform(get(url)).andExpect(status().isOk()).andExpect(content().contentType("image/jpeg"));
        entityManager.clear();
        mvc.perform(get(url).param("thumbnail","true")).andExpect(status().isOk()).andExpect(content().contentType("image/jpeg"));
        entityManager.clear();
        mvc.perform(get(video.url().replace("/admin/","/public/")).header("Range","bytes=0-15")).andExpect(status().isPartialContent()).andExpect(content().contentType("video/mp4"));
    }
    @Test void draftMediaRemainsPrivateFromFreshPersistenceContext() throws Exception {
        var e=experience(false,null);var photo=media.uploadExperience(e.id(),image("privada.png"));track(photo.id());
        var p=create(PropertyStatus.RASCUNHO);var propertyPhoto=media.upload(p.id(),image("rascunho.png"));track(propertyPhoto.id());
        entityManager.flush();entityManager.clear();
        mvc.perform(get(photo.url().replace("/admin/","/public/"))).andExpect(status().isNotFound());
        entityManager.clear();
        mvc.perform(get(propertyPhoto.url().replace("/admin/","/public/"))).andExpect(status().isNotFound());
        entityManager.clear();
        mvc.perform(get(photo.url()).with(user("admin").roles("ADMIN"))).andExpect(status().isOk());
    }
    ExperienceView experience(boolean published,UUID propertyId) throws Exception {
        var input=new ExperienceInput("Dias de sol","Um relato completo da viagem.","4 noites",published,propertyId,new ReviewInput("Ana",0,"Casa confortável","Casa de praia","@ana"));
        var part=new MockMultipartFile("experience","","application/json",mapper.writeValueAsBytes(input));
        var response=mvc.perform(multipart("/api/admin/experiences").file(part).file(image("avatar.png")).with(user("admin").roles("ADMIN")).with(csrf())).andExpect(status().isCreated()).andReturn();
        UUID id=UUID.fromString(mapper.readTree(response.getResponse().getContentAsByteArray()).get("id").asText());
        uploaded.add(experiences.findById(id).orElseThrow().photoKey);
        return experienceService.detail(id,true);
    }
    @Test void experienceDraftPublicationMediaAndDeletion() throws Exception {
        var property=create(PropertyStatus.DISPONIVEL);var e=experience(false,property.id());
        mvc.perform(get("/api/public/experiences/"+e.id())).andExpect(status().isNotFound());
        mvc.perform(get(e.review().photoUrl().replace("/admin/","/public/"))).andExpect(status().isNotFound());
        mvc.perform(get("/api/public/experiences")).andExpect(jsonPath("$.totalElements").value(0));
        var first=media.uploadExperience(e.id(),image("praia.png"));track(first.id());
        var second=media.uploadExperience(e.id(),image("piscina.png"));track(second.id());
        mvc.perform(get(first.url().replace("/admin/","/public/"))).andExpect(status().isNotFound());
        media.primaryExperience(e.id(),second.id());media.reorderExperience(e.id(),List.of(second.id(),first.id()));
        var update=new ExperienceInput("Dias em família","Relato atualizado","5 noites",true,property.id(),new ReviewInput("Ana",5,"Maravilhoso","Casa de praia","@ana.nova"));
        var json=new MockMultipartFile("experience","","application/json",mapper.writeValueAsBytes(update));
        mvc.perform(multipart(org.springframework.http.HttpMethod.PUT,"/api/admin/experiences/"+e.id()).file(json).with(user("admin").roles("ADMIN")).with(csrf())).andExpect(status().isOk());
        mvc.perform(get("/api/public/experiences/"+e.id())).andExpect(status().isOk()).andExpect(jsonPath("$.review.rating").value(5)).andExpect(jsonPath("$.stayDuration").value("5 noites")).andExpect(jsonPath("$.propertySlug").value(property.slug()));
        mvc.perform(get(first.url().replace("/admin/","/public/"))).andExpect(status().isOk());
        media.deleteExperience(e.id(),second.id());assertThat(mediaRepository.findById(first.id()).orElseThrow().primaryImage).isTrue();
        mvc.perform(delete("/api/admin/experiences/"+e.id()).with(user("admin").roles("ADMIN")).with(csrf())).andExpect(status().isNoContent());
        mvc.perform(get(first.url().replace("/admin/","/public/"))).andExpect(status().isNotFound());
        assertThat(properties.existsById(property.id())).isTrue();assertThat(reviews.count()).isZero();
    }
    @Test void experienceMediaCannotBeChangedThroughAnotherOwner() throws Exception {
        var a=experience(true,null);var b=experience(false,null);var m=media.uploadExperience(a.id(),image("praia.png"));track(m.id());
        mvc.perform(delete("/api/admin/experiences/"+b.id()+"/media/"+m.id()).with(user("admin").roles("ADMIN")).with(csrf())).andExpect(status().isNotFound());
        assertThat(mediaRepository.existsById(m.id())).isTrue();
        mvc.perform(put("/api/admin/experiences/"+a.id()+"/media/order").contentType("application/json").content("[]").with(user("admin").roles("ADMIN")).with(csrf())).andExpect(status().isBadRequest());
    }
    @Test void reviewCrudPersistsPhotoContactAndZeroStars() throws Exception {
        var input=new ReviewInput("Ana",0,"Atendimento atencioso","Casa dos Carneiros","@ana");
        var json=new org.springframework.mock.web.MockMultipartFile("review","","application/json",mapper.writeValueAsBytes(input));
        var created=mvc.perform(multipart("/api/admin/reviews").file(json).file(image("cliente.png"))
            .with(user("admin").roles("ADMIN")).with(csrf())).andExpect(status().isCreated()).andReturn();
        var body=mapper.readTree(created.getResponse().getContentAsByteArray());
        UUID id=UUID.fromString(body.get("id").asText());
        uploaded.add(reviews.findById(id).orElseThrow().photoKey);
        org.junit.jupiter.api.Assertions.assertEquals(0,body.get("rating").asInt());
        org.junit.jupiter.api.Assertions.assertEquals("@ana",body.get("contact").asText());
        mvc.perform(get(body.get("photoUrl").asText())).andExpect(status().isOk()).andExpect(content().contentType("image/jpeg"));
        var updated=new ReviewInput("Ana",5,"Adoramos a estadia","Casa dos Carneiros","@ana.nova");
        var updateJson=new org.springframework.mock.web.MockMultipartFile("review","","application/json",mapper.writeValueAsBytes(updated));
        mvc.perform(multipart(org.springframework.http.HttpMethod.PUT,"/api/admin/reviews/"+id).file(updateJson)
            .with(user("admin").roles("ADMIN")).with(csrf())).andExpect(status().isOk())
            .andExpect(jsonPath("$.rating").value(5)).andExpect(jsonPath("$.contact").value("@ana.nova"));
        mvc.perform(get("/api/public/reviews")).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.average").value(5.0));
        mvc.perform(delete("/api/admin/reviews/"+id).with(user("admin").roles("ADMIN")).with(csrf())).andExpect(status().isNoContent());
        mvc.perform(get("/api/public/reviews/"+id+"/photo")).andExpect(status().isNotFound());
    }
    @AfterEach void cleanupObjects() { uploaded.forEach(storage::delete); }
    PropertyInput input(String title,PropertyStatus status) {
        return new PropertyInput(title,"teste-"+UUID.randomUUID(),"Descrição de um imóvel de teste.",PropertyType.CASA,
            new BigDecimal("1200.75"),null,null,new BigDecimal("80.00"),2,null,1,null,null,"Recife","PE","Casa Forte",
            "Rua privada 123",false,false,true,true,status,Set.of());
    }
    PropertyView create(PropertyStatus status) { return catalog.save(null,input("Imóvel teste "+UUID.randomUUID(),status)); }
    MockMultipartFile image(String name) throws Exception {
        var buffer=new ByteArrayOutputStream();ImageIO.write(new BufferedImage(2200,1100,BufferedImage.TYPE_INT_RGB),"png",buffer);
        return new MockMultipartFile("file",name,"image/png",buffer.toByteArray());
    }
    void track(UUID id) { var m=mediaRepository.findById(id).orElseThrow();uploaded.add(m.key);if(m.thumbnailKey!=null)uploaded.add(m.thumbnailKey); }
    @Test void publicCatalogExcludesDraftsAndAddress() throws Exception {
        var draft=create(PropertyStatus.RASCUNHO);var published=create(PropertyStatus.DISPONIVEL);
        mvc.perform(get("/api/public/properties").param("search",draft.title())).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(get("/api/public/properties/"+draft.slug())).andExpect(status().isNotFound());
        mvc.perform(get("/api/public/properties/"+published.slug())).andExpect(status().isOk()).andExpect(jsonPath("$.address").doesNotExist()).andExpect(jsonPath("$.parking").doesNotExist()).andExpect(jsonPath("$.rent").value(1200.75));
    }
    @Test void explicitAddressConsentIsRespected() throws Exception {
        var p=create(PropertyStatus.DISPONIVEL);var entity=properties.findById(p.id()).orElseThrow();entity.showAddress=true;
        mvc.perform(get("/api/public/properties/"+p.slug())).andExpect(status().isOk()).andExpect(jsonPath("$.address").value("Rua privada 123"));
    }
    @Test void filtersPaginationAndAvailabilityWork() throws Exception {
        var p=create(PropertyStatus.INDISPONIVEL);
        mvc.perform(get("/api/public/properties").param("search",p.title()).param("city","Recife").param("type","CASA").param("status","INDISPONIVEL").param("minPrice","1200").param("maxPrice","1300").param("minBedrooms","2").param("size","1").param("sort","price-desc"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.content[0].id").value(p.id().toString()));
        mvc.perform(get("/api/public/properties").param("minPrice","2000").param("maxPrice","1000")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/public/properties").param("size","101")).andExpect(status().isBadRequest());
    }
    @Test void adminEndpointsRequireAuthenticationAndCsrf() throws Exception {
        var p=create(PropertyStatus.RASCUNHO);
        mvc.perform(get("/api/admin/properties")).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/admin/properties/"+p.id()).with(user("admin").roles("ADMIN"))).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/properties/"+p.id()).with(user("admin").roles("ADMIN"))).andExpect(status().isOk()).andExpect(jsonPath("$.address").value("Rua privada 123"));
        mvc.perform(get("/api/admin/properties").param("search",p.title()).with(user("admin").roles("ADMIN"))).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
    }
    @Test void realLoginCreatesSessionAndLogoutRevokesIt() throws Exception {
        var response=mvc.perform(post("/api/auth/login").with(csrf()).contentType("application/json").content(mapper.writeValueAsString(new LoginInput(adminEmail,adminPassword))))
            .andExpect(status().isOk()).andReturn();
        var session=(MockHttpSession)response.getRequest().getSession(false);
        mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isOk()).andExpect(jsonPath("$.email").value(adminEmail));
        mvc.perform(post("/api/auth/logout").session(session).with(csrf())).andExpect(status().isNoContent());
        assertThat(session.isInvalid()).isTrue();
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }
    @Test void invalidCredentialsAreRejected() throws Exception {
        mvc.perform(post("/api/auth/login").with(csrf()).contentType("application/json").content("{\"email\":\"nobody@example.com\",\"password\":\"incorrect\"}"))
            .andExpect(status().isUnauthorized());
    }
    @Test void duplicateSlugsAndInvalidInputsFail() throws Exception {
        var body=input("Imóvel de teste",PropertyStatus.RASCUNHO);catalog.save(null,body);
        mvc.perform(post("/api/admin/properties").with(user("admin").roles("ADMIN")).with(csrf()).contentType("application/json").content(mapper.writeValueAsString(body))).andExpect(status().isConflict());
        var json=mapper.valueToTree(body);((com.fasterxml.jackson.databind.node.ObjectNode)json).put("rent",-1);
        mvc.perform(post("/api/admin/properties").with(user("admin").roles("ADMIN")).with(csrf()).contentType("application/json").content(json.toString())).andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.rent").exists());
    }
    @Test void optimizedImagesAndThumbnailsArePrivateUntilPublication() throws Exception {
        var p=create(PropertyStatus.RASCUNHO);var m=media.upload(p.id(),image("sala.png"));track(m.id());
        var stored=mediaRepository.findById(m.id()).orElseThrow();assertThat(stored.contentType).isEqualTo("image/jpeg");assertThat(stored.primaryImage).isTrue();
        mvc.perform(get("/api/public/media/"+m.id())).andExpect(status().isNotFound());
        var full=mvc.perform(get("/api/admin/media/"+m.id()).with(user("admin").roles("ADMIN"))).andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
        assertThat(ImageIO.read(new java.io.ByteArrayInputStream(full)).getWidth()).isEqualTo(1920);
        var thumb=mvc.perform(get("/api/admin/media/"+m.id()).param("thumbnail","true").with(user("admin").roles("ADMIN"))).andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
        assertThat(ImageIO.read(new java.io.ByteArrayInputStream(thumb)).getWidth()).isEqualTo(480);
        properties.findById(p.id()).orElseThrow().status=PropertyStatus.DISPONIVEL;
        mvc.perform(get("/api/public/media/"+m.id())).andExpect(status().isOk()).andExpect(content().contentType("image/jpeg"));
    }
    @Test void forgedMediaAreRejected() throws Exception {
        var p=create(PropertyStatus.RASCUNHO);
        var fake=new MockMultipartFile("file","fake.mp4","video/mp4","not a video".getBytes());
        mvc.perform(multipart("/api/admin/properties/"+p.id()+"/media").file(fake).with(user("admin").roles("ADMIN")).with(csrf())).andExpect(status().isBadRequest());
        var fakeImage=new MockMultipartFile("file","fake.png","image/png","<script>alert(1)</script>".getBytes());
        mvc.perform(multipart("/api/admin/properties/"+p.id()+"/media").file(fakeImage).with(user("admin").roles("ADMIN")).with(csrf())).andExpect(status().isBadRequest());
    }
    @Test void mediaReorderCoverAndDeletionRespectOwnership() throws Exception {
        var p=create(PropertyStatus.RASCUNHO);var other=create(PropertyStatus.RASCUNHO);
        var first=media.upload(p.id(),image("first.png"));track(first.id());var second=media.upload(p.id(),image("second.png"));track(second.id());
        media.primary(p.id(),second.id());mediaRepository.flush();
        assertThat(mediaRepository.findById(first.id()).orElseThrow().primaryImage).isFalse();
        media.reorder(p.id(),List.of(second.id(),first.id()));
        assertThat(mediaRepository.findById(second.id()).orElseThrow().position).isZero();
        mvc.perform(put("/api/admin/properties/"+p.id()+"/media/order").with(user("admin").roles("ADMIN")).with(csrf()).contentType("application/json").content(mapper.writeValueAsString(List.of(first.id(),first.id())))).andExpect(status().isBadRequest());
        mvc.perform(delete("/api/admin/properties/"+other.id()+"/media/"+first.id()).with(user("admin").roles("ADMIN")).with(csrf())).andExpect(status().isNotFound());
        media.delete(p.id(),second.id());mediaRepository.flush();
        assertThat(mediaRepository.findById(first.id()).orElseThrow().primaryImage).isTrue();
    }
    @Test void deletingPropertyQueuesAllStorageObjects() throws Exception {
        var p=create(PropertyStatus.RASCUNHO);var m=media.upload(p.id(),image("remove.png"));track(m.id());
        catalog.delete(p.id());properties.flush();
        assertThat(properties.findById(p.id())).isEmpty();assertThat(mediaRepository.findById(m.id())).isEmpty();
    }
    @Test void signedInAdministratorCanUpdateContact() throws Exception {
        var settings=new SettingsInput("Imóveis de teste","5581999999999",null,"Seu novo lugar","Boas histórias começam aqui.","Fale conosco.");
        mvc.perform(put("/api/admin/settings").with(user("admin").roles("ADMIN")).with(csrf()).contentType("application/json").content(mapper.writeValueAsString(settings))).andExpect(status().isOk()).andExpect(jsonPath("$.whatsapp").value("5581999999999"));
        mvc.perform(get("/api/public/settings")).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Imóveis de teste"));
    }
    @Test void siteHeroUploadRequiresAdminAndSupportsReplacementAndRemoval() throws Exception {
        var file=image("casa-principal.png");
        mvc.perform(multipart("/api/admin/settings/hero").file(file).with(csrf())).andExpect(status().isUnauthorized());
        mvc.perform(multipart("/api/admin/settings/hero").file(file).with(user("admin").roles("ADMIN"))).andExpect(status().isForbidden());
        mvc.perform(multipart("/api/admin/settings/hero").file(file).with(user("admin").roles("ADMIN")).with(csrf()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.heroImageUrl").value(org.hamcrest.Matchers.startsWith("/api/public/hero?v=")));
        String first=siteSettings.findById(1).orElseThrow().heroKey;uploaded.add(first);
        var bytes=mvc.perform(get("/api/public/hero")).andExpect(status().isOk()).andExpect(content().contentType("image/jpeg")).andReturn().getResponse().getContentAsByteArray();
        assertThat(ImageIO.read(new java.io.ByteArrayInputStream(bytes)).getWidth()).isEqualTo(1920);
        var forged=new MockMultipartFile("file","forged.png","image/png","not an image".getBytes());
        mvc.perform(multipart("/api/admin/settings/hero").file(forged).with(user("admin").roles("ADMIN")).with(csrf())).andExpect(status().isBadRequest());
        assertThat(siteSettings.findById(1).orElseThrow().heroKey).isEqualTo(first);
        mvc.perform(multipart("/api/admin/settings/hero").file(file).with(user("admin").roles("ADMIN")).with(csrf())).andExpect(status().isOk());
        String second=siteSettings.findById(1).orElseThrow().heroKey;uploaded.add(second);assertThat(second).isNotEqualTo(first);
        mvc.perform(delete("/api/admin/settings/hero").with(user("admin").roles("ADMIN")).with(csrf())).andExpect(status().isNoContent());
        mvc.perform(get("/api/public/hero")).andExpect(status().isNotFound());
        mvc.perform(get("/api/public/settings")).andExpect(jsonPath("$.heroImageUrl").doesNotExist());
    }
}
