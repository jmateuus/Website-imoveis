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
import static org.mockito.Mockito.*;
import java.util.*;

@WebMvcTest(ReviewController.class) @Import(SecurityConfig.class)
class ReviewControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean ReviewService service;
    @MockitoBean AdministratorRepository administrators;
    @Test void publicCanReadButCannotManageReviews() throws Exception {
        when(service.list(0,6)).thenReturn(new ReviewPage(List.of(),0,0,0,0));
        mvc.perform(get("/api/public/reviews")).andExpect(status().isOk());
        mvc.perform(get("/api/admin/reviews")).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/admin/reviews/"+UUID.randomUUID()).with(csrf())).andExpect(status().isUnauthorized());
    }
    @Test void adminMutationsRequireCsrf() throws Exception {
        mvc.perform(delete("/api/admin/reviews/"+UUID.randomUUID()).with(user("admin").roles("ADMIN"))).andExpect(status().isForbidden());
    }
    @Test void createAndUpdateValidateMultipartAndAllowZero() throws Exception {
        String json="{\"customerName\":\"Ana\",\"rating\":0,\"comment\":\"Ótima estadia\",\"propertyName\":\"Casa\",\"contact\":\"@ana\"}";
        var part=new MockMultipartFile("review","","application/json",json.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        mvc.perform(multipart("/api/admin/reviews").file(part).with(user("admin").roles("ADMIN")).with(csrf())).andExpect(status().isCreated());
        mvc.perform(multipart(org.springframework.http.HttpMethod.PUT,"/api/admin/reviews/"+UUID.randomUUID()).file(part).with(user("admin").roles("ADMIN")).with(csrf())).andExpect(status().isOk());
        var invalid=new MockMultipartFile("review","","application/json",json.replace("\"rating\":0","\"rating\":6").getBytes(java.nio.charset.StandardCharsets.UTF_8));
        mvc.perform(multipart("/api/admin/reviews").file(invalid).with(user("admin").roles("ADMIN")).with(csrf())).andExpect(status().isBadRequest());
    }
}
