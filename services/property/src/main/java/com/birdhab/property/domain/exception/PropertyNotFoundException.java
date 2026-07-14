package com.birdhab.property.domain.exception;

/**
 * Levée lorsqu'un bien est introuvable, ou existe mais n'appartient pas au
 * propriétaire authentifié (les deux cas sont indifférenciés côté API pour
 * ne pas révéler l'existence d'un bien appartenant à un tiers). Mappée en
 * HTTP 404 par le {@code GlobalExceptionHandler}.
 */
public class PropertyNotFoundException extends RuntimeException {

    public PropertyNotFoundException() {
        super("Bien introuvable");
    }
}
