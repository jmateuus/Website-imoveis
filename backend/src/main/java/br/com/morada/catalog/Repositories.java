package br.com.morada.catalog;

import java.util.*;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;

interface PropertyRepository extends JpaRepository<Property, UUID>, JpaSpecificationExecutor<Property> {
    Optional<Property> findBySlug(String slug);
    boolean existsBySlugAndIdNot(String slug, UUID id);
    long countByStatus(PropertyStatus status);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Property p where p.id = :id")
    Optional<Property> findLockedById(UUID id);
}
interface AmenityRepository extends JpaRepository<Amenity, UUID> {}
interface MediaRepository extends JpaRepository<Media, UUID> {}
interface AdministratorRepository extends JpaRepository<Administrator, UUID> {
    Optional<Administrator> findByEmail(String email);
}
interface SettingsRepository extends JpaRepository<SiteSettings, Integer> {}
interface DeletionRepository extends JpaRepository<PendingDeletion, String> {}
