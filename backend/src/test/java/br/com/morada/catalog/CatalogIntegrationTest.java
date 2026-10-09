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
    @Autowired ObjectMapper mapper;
    @Value("${app.admin-email}") String adminEmail;
    @Value("${app.admin-password}") String adminPassword;
    List<String> uploaded=new ArrayList<>();
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
