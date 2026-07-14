package com.birdhab.property.domain.repository;

import com.birdhab.property.domain.entity.Property;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Accès aux données pour {@link Property}.
 */
public interface PropertyRepository extends JpaRepository<Property, UUID> {

    List<Property> findByOwnerId(UUID ownerId);

    Optional<Property> findByIdAndOwnerId(UUID id, UUID ownerId);
}
