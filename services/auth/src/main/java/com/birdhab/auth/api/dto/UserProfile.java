package com.birdhab.auth.api.dto;

import java.util.List;
import java.util.UUID;

/**
 * Réponse renvoyée par {@code GET /auth/me} et {@code PUT /auth/me}.
 */
public record UserProfile(
        UUID id, String email, String firstName, String lastName, AddressDto address, List<String> roles) {
}
