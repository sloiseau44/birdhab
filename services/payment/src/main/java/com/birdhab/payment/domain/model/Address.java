package com.birdhab.payment.domain.model;

/**
 * Adresse postale, telle que fournie par l'appelant pour la génération d'une
 * quittance (voir {@code ReceiptRequest}). N'est pas persistée : payment ne
 * connaît ni le bailleur ni le bien loué, ces informations vivent dans les
 * services auth/property (voir CLAUDE.md).
 */
public record Address(String street, String postalCode, String city) {

    public String format() {
        return "%s, %s %s".formatted(street, postalCode, city);
    }
}
