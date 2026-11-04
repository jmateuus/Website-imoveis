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
interface MediaRepository extends JpaRepository<Media, UUID> {
    @Query("select m from Media m left join fetch m.property left join fetch m.experience where m.id = :id")
    Optional<Media> findWithOwnerById(UUID id);
}
interface AdministratorRepository extends JpaRepository<Administrator, UUID> {
    Optional<Administrator> findByEmail(String email);
}
interface SettingsRepository extends JpaRepository<SiteSettings, Integer> {}
interface DeletionRepository extends JpaRepository<PendingDeletion, String> {}
