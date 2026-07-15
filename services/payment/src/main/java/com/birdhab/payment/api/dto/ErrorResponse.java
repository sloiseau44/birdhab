package com.birdhab.payment.api.dto;

import java.time.Instant;

/**
 * Forme d'erreur commune à tous les endpoints du service payment.
 */
public record ErrorResponse(Instant timestamp, int status, String error, String message, String path) {

    public static ErrorResponse of(int status, String error, String message, String path) {
        return new ErrorResponse(Instant.now(), status, error, message, path);
    }
}
