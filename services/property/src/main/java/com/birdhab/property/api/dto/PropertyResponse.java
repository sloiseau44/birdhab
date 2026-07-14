package com.birdhab.property.api.dto;

import com.birdhab.property.domain.entity.PropertyType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Représentation d'un bien renvoyée par l'API.
 */
public record PropertyResponse(
        UUID id,
        UUID ownerId,
        AddressDto address,
        PropertyType type,
        BigDecimal surface,
        BigDecimal referenceRent,
        Instant createdAt,
        Instant updatedAt
) {
}
