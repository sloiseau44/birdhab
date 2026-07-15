package com.birdhab.document.domain.repository;

import com.birdhab.document.domain.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Accès aux données pour {@link Document}.
 */
public interface DocumentRepository extends JpaRepository<Document, UUID> {

    List<Document> findByOwnerId(UUID ownerId);

    List<Document> findByOwnerIdAndTenantId(UUID ownerId, UUID tenantId);

    Optional<Document> findByIdAndOwnerId(UUID id, UUID ownerId);
}
