package com.birdhab.property.api.dto;

import com.birdhab.property.domain.entity.PropertyType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Corps de requête de {@code POST /properties} et {@code PUT /properties/{id}}.
 *
 * <p>Ne porte volontairement pas de champ {@code ownerId} : le propriétaire est
 * toujours déterminé à partir du contexte d'authentification.</p>
 */
public record PropertyRequest(

        @NotNull
        @Valid
        AddressDto address,

        @NotNull
        PropertyType type,

        @NotNull
        @DecimalMin(value = "0.01")
        BigDecimal surface,

        @NotNull
        @DecimalMin(value = "0.0")
        BigDecimal referenceRent
) {
}
