package com.birdhab.tenant.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Corps de requête de {@code POST /tenants} et {@code PUT /tenants/{id}}.
 *
 * <p>Ne porte volontairement pas de champ {@code ownerId} : le propriétaire est
 * toujours déterminé à partir du contexte d'authentification.</p>
 */
public record TenantRequest(

        @NotBlank
        @Size(max = 100)
        String firstName,

        @NotBlank
        @Size(max = 100)
        String lastName,

        @NotBlank
        @Email
        @Size(max = 255)
        String email,

        @Size(max = 20)
        String phone,

        @Valid
        AddressDto address
) {
}
