package br.com.morada.catalog;

import static br.com.morada.catalog.Dtos.*;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import java.util.*;
import java.math.BigDecimal;
import java.io.IOException;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.*;
import org.springframework.core.io.InputStreamResource;

@RestController
class CatalogController {
    private final CatalogService catalog;
    private final MediaService media;
    private final SettingsService settings;
    CatalogController(CatalogService catalog, MediaService media, SettingsService settings) { this.catalog=catalog;this.media=media;this.settings=settings; }
    @GetMapping({"/api/public/properties","/api/admin/properties"})
    PageResult<PropertyView> list(HttpServletRequest request,
        @RequestParam(required=false) String search, @RequestParam(required=false) String city,
        @RequestParam(required=false) String neighborhood, @RequestParam(required=false) PropertyType type,
        @RequestParam(required=false) BigDecimal minPrice, @RequestParam(required=false) BigDecimal maxPrice,
        @RequestParam(required=false) Integer minBedrooms, @RequestParam(required=false) PropertyStatus status,
        @RequestParam(required=false) Boolean featured, @RequestParam(defaultValue="0") int page,
        @RequestParam(defaultValue="9") int size, @RequestParam(defaultValue="recent") String sort) {
        return catalog.list(request.getRequestURI().startsWith(request.getContextPath()+"/api/admin/"),search,city,neighborhood,type,minPrice,maxPrice,minBedrooms,status,featured,page,size,sort);
    }
    @GetMapping("/api/public/properties/{slug}") PropertyView publicDetail(@PathVariable String slug) { return catalog.bySlug(slug); }
    @GetMapping("/api/admin/properties/{id}") PropertyView detail(@PathVariable UUID id) { return catalog.byId(id); }
    @PostMapping("/api/admin/properties") @ResponseStatus(HttpStatus.CREATED)
    PropertyView create(@Valid @RequestBody PropertyInput input) { return catalog.save(null,input); }
    @PutMapping("/api/admin/properties/{id}") PropertyView update(@PathVariable UUID id,@Valid @RequestBody PropertyInput input) { return catalog.save(id,input); }
    @DeleteMapping("/api/admin/properties/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable UUID id) { catalog.delete(id); }
    @GetMapping("/api/admin/dashboard") Dashboard dashboard() { return catalog.dashboard(); }
    @GetMapping("/api/public/amenities") List<AmenityView> amenities() { return catalog.amenities(); }
    @PostMapping("/api/admin/properties/{id}/media") @ResponseStatus(HttpStatus.CREATED)
    MediaView upload(@PathVariable UUID id,@RequestParam MultipartFile file) throws IOException { return media.upload(id,file); }
    @DeleteMapping("/api/admin/properties/{id}/media/{mediaId}") @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteMedia(@PathVariable UUID id,@PathVariable UUID mediaId) { media.delete(id,mediaId); }
    @PutMapping("/api/admin/properties/{id}/media/{mediaId}/primary") @ResponseStatus(HttpStatus.NO_CONTENT)
    void primary(@PathVariable UUID id,@PathVariable UUID mediaId) { media.primary(id,mediaId); }
    @PutMapping("/api/admin/properties/{id}/media/order") @ResponseStatus(HttpStatus.NO_CONTENT)
    void order(@PathVariable UUID id,@RequestBody List<UUID> ids) { media.reorder(id,ids); }
    @GetMapping({"/api/public/media/{id}","/api/admin/media/{id}"})
    ResponseEntity<InputStreamResource> readMedia(@PathVariable UUID id,@RequestParam(defaultValue="false") boolean thumbnail,
        @RequestHeader(value="Range",required=false) String range, HttpServletRequest req) {
        return media.read(id,req.getRequestURI().startsWith(req.getContextPath()+"/api/admin/"),thumbnail,range);
    }
    @GetMapping("/api/public/settings") SettingsView settings() { return settings.get(); }
    @PutMapping("/api/admin/settings") SettingsView updateSettings(@Valid @RequestBody SettingsInput input) { return settings.update(input); }
    @PostMapping("/api/admin/settings/logo") SettingsView logo(@RequestParam MultipartFile file) throws IOException { return settings.logo(file); }
    @DeleteMapping("/api/admin/settings/logo") @ResponseStatus(HttpStatus.NO_CONTENT) void deleteLogo() { settings.removeLogo(); }
    @GetMapping("/api/public/logo") ResponseEntity<InputStreamResource> readLogo() { return settings.readLogo(); }
    @PostMapping("/api/admin/settings/hero") SettingsView hero(@RequestParam MultipartFile file) throws IOException { return settings.hero(file); }
    @DeleteMapping("/api/admin/settings/hero") @ResponseStatus(HttpStatus.NO_CONTENT) void deleteHero() { settings.removeHero(); }
    @GetMapping("/api/public/hero") ResponseEntity<InputStreamResource> readHero() { return settings.readHero(); }
}
