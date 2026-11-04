package br.com.morada.catalog;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockMultipartFile;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.util.UUID;

@WebMvcTest(ExperienceController.class) @Import(SecurityConfig.class)
class ExperienceControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean ExperienceService service;
    @MockitoBean MediaService media;
    @MockitoBean AdministratorRepository administrators;
    @Test void onlyAdminWithCsrfCanMutate() throws Exception {
        var path="/api/admin/experiences/"+UUID.randomUUID();
        mvc.perform(delete(path).with(csrf())).andExpect(status().isUnauthorized());
        mvc.perform(delete(path).with(user("admin").roles("ADMIN"))).andExpect(status().isForbidden());
        mvc.perform(delete(path).with(user("guest").roles("USER")).with(csrf())).andExpect(status().isForbidden());
        mvc.perform(delete(path).with(user("admin").roles("ADMIN")).with(csrf())).andExpect(status().isNoContent());
    }
    @Test void nestedReviewAndDurationAreValidated() throws Exception {
        String json="{\"title\":\"Viagem\",\"description\":\"Relato\",\"stayDuration\":\" \",\"review\":{\"customerName\":\"Ana\",\"rating\":6,\"comment\":\"Bom\",\"propertyName\":\"Casa\"}}";
        var part=new MockMultipartFile("experience","","application/json",json.getBytes());
        mvc.perform(multipart("/api/admin/experiences").file(part).with(user("admin").roles("ADMIN")).with(csrf())).andExpect(status().isBadRequest());
    }
}
