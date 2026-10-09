package br.com.morada.catalog;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

enum PropertyType { CASA, APARTAMENTO, KITNET, FLAT, SOBRADO, OUTRO }
enum PropertyStatus { RASCUNHO, DISPONIVEL, INDISPONIVEL }
enum MediaType { IMAGEM, VIDEO }

@Entity @Table(name="imovel")
class Property {
    @Id UUID id = UUID.randomUUID();
    @Version Long version;
    @Column(name="titulo") String title;
    String slug;
    @Column(name="descricao", columnDefinition="text") String description;
    @Enumerated(EnumType.STRING) @Column(name="tipo") PropertyType type;
    @Column(name="aluguel", precision=12, scale=2) BigDecimal rent;
    @Column(name="condominio", precision=12, scale=2) BigDecimal condoFee;
    @Column(name="iptu", precision=12, scale=2) BigDecimal propertyTax;
    @Column(precision=10, scale=2) BigDecimal area;
    @Column(name="quartos") Integer bedrooms;
    @Column(name="suites") Integer suites;
    @Column(name="banheiros") Integer bathrooms;
    @Column(name="vagas") Integer parking;
    @Column(name="hospedes") Integer guests;
    @Column(name="cidade") String city;
    @Column(name="estado") String state;
    @Column(name="bairro") String neighborhood;
    @Column(name="endereco") String address;
    @Column(name="publicar_endereco") boolean showAddress;
    @Column(name="mobiliado") boolean furnished;
    @Column(name="aceita_animais") boolean petsAllowed;
    @Column(name="destaque") boolean featured;
    @Enumerated(EnumType.STRING) PropertyStatus status;
    @Column(name="criado_em") Instant createdAt = Instant.now();
    @Column(name="atualizado_em") Instant updatedAt = Instant.now();
    @ManyToMany
    @JoinTable(name="imovel_comodidade", joinColumns=@JoinColumn(name="imovel_id"), inverseJoinColumns=@JoinColumn(name="comodidade_id"))
    Set<Amenity> amenities = new LinkedHashSet<>();
    @OneToMany(mappedBy="property", cascade=CascadeType.ALL, orphanRemoval=true)
    @OrderBy("position ASC, createdAt ASC") List<Media> media = new ArrayList<>();
    protected Property() {}
}

@Entity @Table(name="comodidade")
class Amenity {
    @Id UUID id;
    @Column(name="nome") String name;
    protected Amenity() {}
}

@Entity @Table(name="midia")
class Media {
    @Id UUID id = UUID.randomUUID();
    @Version Long version;
    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="imovel_id") Property property;
    @Enumerated(EnumType.STRING) @Column(name="tipo") MediaType type;
    @Column(name="chave") String key;
    @Column(name="miniatura") String thumbnailKey;
    @Column(name="nome_original") String originalName;
    @Column(name="content_type") String contentType;
    @Column(name="tamanho") long size;
    @Column(name="ordem") int position;
    @Column(name="principal") boolean primaryImage;
    @Column(name="criado_em") Instant createdAt = Instant.now();
    protected Media() {}
}

@Entity @Table(name="administrador")
class Administrator {
    @Id UUID id = UUID.randomUUID();
    String email;
    @Column(name="senha_hash") String passwordHash;
    protected Administrator() {}
}

@Entity @Table(name="configuracao")
class SiteSettings {
    @Id Integer id = 1;
    @Column(name="nome") String name;
    String whatsapp;
    String email;
    @Column(name="titulo_principal") String heroTitle;
    @Column(name="texto_principal") String heroText;
    @Column(name="rodape") String footer;
    @Column(name="logo_chave") String logoKey;
    @Column(name="logo_content_type") String logoContentType;
    @Column(name="hero_chave") String heroKey;
    @Column(name="hero_content_type") String heroContentType;
    protected SiteSettings() {}
}

@Entity @Table(name="exclusao_objeto")
class PendingDeletion {
    @Id @Column(name="chave") String key;
    @Column(name="criado_em") Instant createdAt = Instant.now();
    protected PendingDeletion() {}
    PendingDeletion(String key) { this.key = key; }
}
