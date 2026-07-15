package com.birdhab.payment.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Adresse postale telle qu'échangée par l'API, utilisée pour la génération
 * d'une quittance ({@code ReceiptRequest}).
 */
public record AddressDto(

        @NotBlank
        @Size(max = 255)
        String street,

        @NotBlank
        @Pattern(regexp = "^[0-9]{5}$")
        String postalCode,

        @NotBlank
        @Size(max = 100)
        String city
) {
}
