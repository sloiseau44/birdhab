package com.birdhab.lease.domain.exception;

/**
 * Levée lorsque la date de fin d'un bail n'est pas postérieure à sa date de
 * début. Mappée en HTTP 400 par le {@code GlobalExceptionHandler}.
 */
public class InvalidLeaseDatesException extends RuntimeException {

    public InvalidLeaseDatesException() {
        super("La date de fin doit être postérieure à la date de début");
    }
}
