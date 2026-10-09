package br.com.morada.catalog;

import static br.com.morada.catalog.Dtos.*;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@RestController @RequestMapping("/api/auth")
class AuthController {
    private final AuthenticationManager manager;
    private final SecurityContextRepository contexts;
    private final Map<String, Attempts> attempts=new ConcurrentHashMap<>();
    private record Attempts(long since, int count) {}
    AuthController(AuthenticationManager manager, SecurityContextRepository contexts) { this.manager=manager;this.contexts=contexts; }
    @GetMapping("/csrf") Map<String,String> csrf(CsrfToken token) { return Map.of("token",token.getToken(),"headerName",token.getHeaderName()); }
    @GetMapping("/me") Map<String,String> me(Authentication authentication) {
        if (authentication==null || !authentication.isAuthenticated()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Entre para continuar.");
        return Map.of("email",authentication.getName());
    }
    @PostMapping("/login") Map<String,String> login(@Valid @RequestBody LoginInput body, HttpServletRequest req, HttpServletResponse res) {
        long now=System.currentTimeMillis();
        attempts.entrySet().removeIf(e->now-e.getValue().since()>900_000);
        String key=req.getRemoteAddr();
        Attempts current=attempts.compute(key,(k,v)->v==null?new Attempts(now,1):new Attempts(v.since(),v.count()+1));
        if (current.count()>10) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Muitas tentativas. Aguarde 15 minutos.");
        Authentication auth=manager.authenticate(UsernamePasswordAuthenticationToken.unauthenticated(body.email().toLowerCase(Locale.ROOT).trim(),body.password()));
        req.getSession(true); req.changeSessionId();
        var context=SecurityContextHolder.createEmptyContext(); context.setAuthentication(auth);
        SecurityContextHolder.setContext(context); contexts.saveContext(context,req,res);
        new HttpSessionCsrfTokenRepository().saveToken(null,req,res);
        attempts.remove(key);
        return Map.of("email",auth.getName());
    }
}
