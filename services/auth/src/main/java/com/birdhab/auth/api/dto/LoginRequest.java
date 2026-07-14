package com.birdhab.auth.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Corps de requête de {@code POST /auth/login}.
 */
public record LoginRequest(

        @NotBlank
        @Email
        String email,

        @NotBlank
        String password
) {
}
