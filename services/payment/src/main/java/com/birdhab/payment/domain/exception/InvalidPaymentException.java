package com.birdhab.payment.domain.exception;

/**
 * Levée lorsque {@code paidDate} et {@code paidAmount} ne sont pas renseignés
 * ensemble (les deux ou aucun). Mappée en HTTP 400 par le {@code GlobalExceptionHandler}.
 */
public class InvalidPaymentException extends RuntimeException {

    public InvalidPaymentException() {
        super("paidDate et paidAmount doivent être renseignés ensemble, ou aucun des deux");
    }
}
