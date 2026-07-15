package com.birdhab.payment.domain.exception;

/**
 * Levée lorsqu'une échéance est introuvable, ou existe mais n'appartient pas
 * au propriétaire authentifié (les deux cas sont indifférenciés côté API
 * pour ne pas révéler l'existence d'une échéance appartenant à un tiers).
 * Mappée en HTTP 404 par le {@code GlobalExceptionHandler}.
 */
public class PaymentNotFoundException extends RuntimeException {

    public PaymentNotFoundException() {
        super("Échéance introuvable");
    }
}
