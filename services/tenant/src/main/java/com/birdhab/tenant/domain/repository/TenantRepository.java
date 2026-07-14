package com.birdhab.tenant.domain.repository;

import com.birdhab.tenant.domain.entity.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Accès aux données pour {@link Tenant}.
 */
public interface TenantRepository extends JpaRepository<Tenant, UUID> {

    List<Tenant> findByOwnerId(UUID ownerId);

    Optional<Tenant> findByIdAndOwnerId(UUID id, UUID ownerId);
}
