package com.birdhab.lease.domain.exception;

/**
 * Levée lorsqu'un bail est introuvable, ou existe mais n'appartient pas au
 * propriétaire authentifié (les deux cas sont indifférenciés côté API pour
 * ne pas révéler l'existence d'un bail appartenant à un tiers). Mappée en
 * HTTP 404 par le {@code GlobalExceptionHandler}.
 */
public class LeaseNotFoundException extends RuntimeException {

    public LeaseNotFoundException() {
        super("Bail introuvable");
    }
}
