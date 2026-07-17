package com.birdhab.auth.api.dto;

import jakarta.validation.Valid;

/**
 * Corps de requête de {@code PUT /auth/me}. Tous les champs sont facultatifs,
 * mais la requête remplace intégralement le profil (pas de correctif partiel
 * champ par champ) : un champ absent efface la valeur précédemment enregistrée.
 */
public record UpdateProfileRequest(

        String firstName,

        String lastName,

        @Valid
        AddressDto address
) {
}
