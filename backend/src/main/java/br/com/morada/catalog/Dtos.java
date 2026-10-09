package br.com.morada.catalog;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

final class Dtos {
    private Dtos() {}
    record PropertyInput(
        @NotBlank @Size(max=160) String title,
        @Size(max=180) @Pattern(regexp="^$|[a-z0-9]+(?:-[a-z0-9]+)*") String slug,
        @NotBlank @Size(max=20000) String description,
        @NotNull PropertyType type,
        @NotNull @DecimalMin("0.01") @DecimalMax("9999999999.99") @Digits(integer=10, fraction=2) BigDecimal rent,
        @DecimalMin("0") @DecimalMax("9999999999.99") @Digits(integer=10, fraction=2) BigDecimal condoFee,
        @DecimalMin("0") @DecimalMax("9999999999.99") @Digits(integer=10, fraction=2) BigDecimal propertyTax,
        @DecimalMin("0.01") @DecimalMax("99999999.99") @Digits(integer=8, fraction=2) BigDecimal area,
        @Min(0) @Max(100) Integer bedrooms, @Min(0) @Max(100) Integer suites,
        @Min(0) @Max(100) Integer bathrooms, @Min(0) @Max(100) Integer parking,
        @Min(1) @Max(1000) Integer guests,
        @NotBlank @Size(max=100) String city,
        @NotNull @Pattern(regexp="AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO") String state,
        @NotBlank @Size(max=100) String neighborhood,
        @Size(max=255) String address, boolean showAddress, boolean furnished, boolean petsAllowed,
        boolean featured, @NotNull PropertyStatus status, @NotNull @Size(max=50) Set<UUID> amenityIds
    ) {}
    record AmenityView(UUID id, String name) {}
    record MediaView(UUID id, MediaType type, String url, String thumbnailUrl, String originalName,
                     String contentType, long size, int position, boolean primaryImage) {}
    record PropertyView(UUID id, String title, String slug, String description, PropertyType type,
        BigDecimal rent, BigDecimal condoFee, BigDecimal propertyTax, BigDecimal area,
        Integer bedrooms, Integer suites, Integer bathrooms, Integer parking, Integer guests,
        String city, String state, String neighborhood, String address, boolean showAddress,
        boolean furnished, boolean petsAllowed, boolean featured, PropertyStatus status,
        Instant createdAt, Instant updatedAt, List<AmenityView> amenities, List<MediaView> media) {}
    record PageResult<T>(List<T> content, long totalElements, int totalPages, int page, int size) {}
    record Dashboard(long total, long published, long drafts, long unavailable) {}
    record SettingsInput(@NotBlank @Size(max=120) String name,
        @NotNull @Pattern(regexp="^$|[1-9][0-9]{9,14}") String whatsapp,
        @Email @Size(max=254) String email, @NotBlank @Size(max=160) String heroTitle,
        @NotBlank @Size(max=500) String heroText, @NotBlank @Size(max=500) String footer) {}
    record SettingsView(String name, String whatsapp, String email, String heroTitle, String heroText, String footer, String logoUrl) {}
    record LoginInput(@NotBlank @Email String email, @NotBlank @Size(max=200) String password) {}
    record ErrorView(String message, Map<String, String> fields) {}
}
