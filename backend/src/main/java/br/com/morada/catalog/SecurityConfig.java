package br.com.morada.catalog;

import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.authentication.*;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.context.*;
import java.util.Locale;

@Configuration
class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }
    @Bean UserDetailsService users(AdministratorRepository repository) {
        return email -> repository.findByEmail(email.toLowerCase(Locale.ROOT).trim())
            .map(a->User.withUsername(a.email).password(a.passwordHash).roles("ADMIN").build())
            .orElseThrow(()->new UsernameNotFoundException("Credenciais inválidas."));
    }
    @Bean AuthenticationManager authenticationManager(UserDetailsService users, PasswordEncoder encoder) {
        var provider=new DaoAuthenticationProvider(users); provider.setPasswordEncoder(encoder);
        return new ProviderManager(provider);
    }
    @Bean SecurityContextRepository securityContextRepository() { return new HttpSessionSecurityContextRepository(); }
    @Bean SecurityFilterChain security(HttpSecurity http, SecurityContextRepository contexts) throws Exception {
        return http
            .csrf(csrf->csrf.csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
            .securityContext(sc->sc.securityContextRepository(contexts))
            .authorizeHttpRequests(auth->auth
                .requestMatchers("/api/public/**","/api/auth/**","/actuator/health","/error").permitAll()
                .requestMatchers("/api/admin/**","/v3/api-docs/**","/swagger-ui/**","/swagger-ui.html").hasRole("ADMIN")
                .anyRequest().denyAll())
            .exceptionHandling(e->e
                .authenticationEntryPoint((req,res,ex)->{res.setStatus(401);res.setContentType("application/json");res.getWriter().write("{\"message\":\"Entre para continuar.\"}");})
                .accessDeniedHandler((req,res,ex)->{res.setStatus(403);res.setContentType("application/json");res.getWriter().write("{\"message\":\"Acesso negado ou sessão expirada. Atualize a página.\"}");}))
            .logout(l->l.logoutUrl("/api/auth/logout").deleteCookies("JSESSIONID").logoutSuccessHandler((req,res,a)->res.setStatus(204)))
            .headers(h->h.contentSecurityPolicy(c->c.policyDirectives("default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'; object-src 'none'")))
            .build();
    }
}
