package com.birdhab.auth.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Corps de requête de {@code POST /auth/register}.
 */
public record RegisterRequest(

        @NotBlank
        @Email
        @Size(max = 255)
        String email,

        @NotBlank
        @Size(min = 8)
        String password,

        @Size(max = 100)
        String firstName,

        @Size(max = 100)
        String lastName
) {
}
