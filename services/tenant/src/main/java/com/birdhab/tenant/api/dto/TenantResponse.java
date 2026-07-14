package com.birdhab.tenant.api.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Représentation d'un locataire renvoyée par l'API.
 */
public record TenantResponse(
        UUID id,
        UUID ownerId,
        String firstName,
        String lastName,
        String email,
        String phone,
        AddressDto address,
        Instant createdAt,
        Instant updatedAt
) {
}
