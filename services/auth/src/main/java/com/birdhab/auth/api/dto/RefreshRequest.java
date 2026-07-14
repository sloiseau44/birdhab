package com.birdhab.auth.api.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Corps de requête de {@code POST /auth/refresh} et {@code POST /auth/logout}.
 */
public record RefreshRequest(

        @NotBlank
        String refreshToken
) {
}
