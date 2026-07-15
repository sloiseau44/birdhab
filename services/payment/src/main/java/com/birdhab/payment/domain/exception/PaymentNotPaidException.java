package com.birdhab.payment.domain.exception;

/**
 * Levée lorsqu'une génération de quittance est demandée pour une échéance non
 * payée. Mappée en HTTP 409 par le {@code GlobalExceptionHandler}.
 */
public class PaymentNotPaidException extends RuntimeException {

    public PaymentNotPaidException() {
        super("Cette échéance n'est pas encore payée, aucune quittance ne peut être générée");
    }
}
