package com.birdhab.lease.api.dto;

import com.birdhab.lease.domain.entity.LeaseStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Représentation d'un bail renvoyée par l'API.
 */
public record LeaseResponse(
        UUID id,
        UUID ownerId,
        UUID propertyId,
        UUID tenantId,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal rentAmount,
        BigDecimal depositAmount,
        String irlReferenceQuarter,
        LeaseStatus status,
        Instant createdAt,
        Instant updatedAt
) {
}
