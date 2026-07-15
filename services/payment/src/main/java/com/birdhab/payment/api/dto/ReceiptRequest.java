package com.birdhab.payment.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Corps de requête de {@code POST /payments/{id}/receipt}.
 *
 * <p>payment n'appelle jamais les services auth/property pour récupérer les
 * informations bailleur/bien : elles doivent être fournies ici par
 * l'appelant, qui les a préalablement agrégées (voir CONTEXT.md).</p>
 */
public record ReceiptRequest(

        @NotBlank
        @Size(max = 200)
        String ownerFullName,

        @NotNull
        @Valid
        AddressDto ownerAddress,

        @NotBlank
        @Size(max = 200)
        String tenantFullName,

        @NotNull
        @Valid
        AddressDto propertyAddress
) {
}
