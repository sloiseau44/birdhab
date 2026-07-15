package com.birdhab.payment.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Corps de requête de {@code POST /payments} et {@code PUT /payments/{id}}.
 *
 * <p>Ne porte volontairement pas de champ {@code ownerId} : le propriétaire est
 * toujours déterminé à partir du contexte d'authentification. La cohérence
 * {@code paidDate}/{@code paidAmount} (les deux ou aucun) est vérifiée en
 * couche service (voir {@code PaymentService}), pas ici, car elle porte sur
 * plusieurs champs.</p>
 */
public record PaymentRequest(

        @NotNull
        UUID leaseId,

        @NotNull
        LocalDate dueDate,

        @NotNull
        @DecimalMin(value = "0.0")
        BigDecimal amount,

        LocalDate paidDate,

        @DecimalMin(value = "0.0")
        BigDecimal paidAmount
) {
}
