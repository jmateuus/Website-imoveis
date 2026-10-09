package br.com.morada.catalog;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import java.util.Locale;
import java.nio.charset.StandardCharsets;

@Component
class Bootstrap implements ApplicationRunner {
    private final AdministratorRepository admins;
    private final PasswordEncoder encoder;
    private final String email,password;
    Bootstrap(AdministratorRepository admins,PasswordEncoder encoder,@Value("${app.admin-email}") String email,@Value("${app.admin-password}") String password) {
        this.admins=admins;this.encoder=encoder;this.email=email;this.password=password;
    }
    @Override @Transactional public void run(ApplicationArguments args) {
        if (admins.count()>0) return;
        if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$") || password.length()<12 || password.getBytes(StandardCharsets.UTF_8).length>72)
            throw new IllegalStateException("Defina ADMIN_EMAIL e ADMIN_PASSWORD (12 caracteres mínimos, 72 bytes máximos) para criar o administrador inicial.");
        Administrator a=new Administrator();a.email=email.trim().toLowerCase(Locale.ROOT);a.passwordHash=encoder.encode(password);admins.save(a);
    }
}
