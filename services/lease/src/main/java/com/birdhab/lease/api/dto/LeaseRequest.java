package com.birdhab.lease.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Corps de requête de {@code POST /leases} et {@code PUT /leases/{id}}.
 *
 * <p>Ne porte volontairement pas de champ {@code ownerId} : le propriétaire est
 * toujours déterminé à partir du contexte d'authentification. La cohérence
 * {@code endDate} postérieure à {@code startDate} est vérifiée en couche
 * service (voir {@code LeaseService}), pas ici, car elle porte sur plusieurs
 * champs.</p>
 */
public record LeaseRequest(

        @NotNull
        UUID propertyId,

        @NotNull
        UUID tenantId,

        @NotNull
        LocalDate startDate,

        LocalDate endDate,

        @NotNull
        @DecimalMin(value = "0.0")
        BigDecimal rentAmount,

        @NotNull
        @DecimalMin(value = "0.0")
        BigDecimal depositAmount,

        @Pattern(regexp = "^[0-9]{4}-T[1-4]$")
        String irlReferenceQuarter
) {
}
