package com.birdhab.tenant.domain.exception;

/**
 * Levée lorsqu'un locataire est introuvable, ou existe mais n'appartient pas
 * au propriétaire authentifié (les deux cas sont indifférenciés côté API pour
 * ne pas révéler l'existence d'une fiche appartenant à un tiers). Mappée en
 * HTTP 404 par le {@code GlobalExceptionHandler}.
 */
public class TenantNotFoundException extends RuntimeException {

    public TenantNotFoundException() {
        super("Locataire introuvable");
    }
}
