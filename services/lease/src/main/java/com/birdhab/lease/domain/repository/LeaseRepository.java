package com.birdhab.lease.domain.repository;

import com.birdhab.lease.domain.entity.Lease;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Accès aux données pour {@link Lease}.
 */
public interface LeaseRepository extends JpaRepository<Lease, UUID> {

    List<Lease> findByOwnerId(UUID ownerId);

    Optional<Lease> findByIdAndOwnerId(UUID id, UUID ownerId);
}
