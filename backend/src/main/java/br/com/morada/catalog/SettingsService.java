package br.com.morada.catalog;

import static br.com.morada.catalog.Dtos.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.InputStreamResource;

@Service @Transactional
class SettingsService {
    private final SettingsRepository settings;
    private final StorageService storage;
    private final CatalogService catalog;
    SettingsService(SettingsRepository settings, StorageService storage, CatalogService catalog) { this.settings=settings;this.storage=storage;this.catalog=catalog; }
    @Transactional(readOnly=true) SettingsView get() { return view(settings.findById(1).orElseThrow()); }
    SettingsView update(SettingsInput input) {
        SiteSettings s=settings.findById(1).orElseThrow();
        s.name=input.name().trim();s.whatsapp=input.whatsapp();s.email=input.email();
        s.heroTitle=input.heroTitle().trim();s.heroText=input.heroText().trim();s.footer=input.footer().trim();
        return view(s);
    }
    SettingsView logo(MultipartFile file) throws IOException {
        if (!"image/png".equals(file.getContentType()) && !"image/jpeg".equals(file.getContentType())) throw CatalogService.bad("Use JPG ou PNG para o logotipo.");
        var optimized=MediaService.optimize(file);
        SiteSettings s=settings.findById(1).orElseThrow();
        String key="site/"+UUID.randomUUID()+".jpg";
        storage.put(key,"image/jpeg",optimized.thumbnail());
        catalog.queueDelete(s.logoKey);s.logoKey=key;s.logoContentType="image/jpeg";
        return view(s);
    }
    void removeLogo() { SiteSettings s=settings.findById(1).orElseThrow();catalog.queueDelete(s.logoKey);s.logoKey=null;s.logoContentType=null; }
    @Transactional(readOnly=true) ResponseEntity<InputStreamResource> readLogo() {
        var s=settings.findById(1).orElseThrow();
        if (s.logoKey==null) throw CatalogService.notFound();
        return storage.read(s.logoKey,null,false);
    }
    private SettingsView view(SiteSettings s) {
        return new SettingsView(s.name,s.whatsapp,s.email,s.heroTitle,s.heroText,s.footer,s.logoKey==null?null:"/api/public/logo?v="+s.logoKey.substring(5,41));
    }
}
