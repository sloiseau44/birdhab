package com.birdhab.common.security;

/**
 * Configuration minimale ({@code birdhab.jwt.secret}) pour un service qui ne
 * fait que valider des jetons émis par {@code auth} (voir {@link JwtValidatorService}).
 *
 * <p>N'est pas enregistrée automatiquement comme {@code @Component} : chaque
 * service consommateur la déclare explicitement en bean (voir {@code JwtConfig}
 * de chaque service), pour éviter tout conflit avec le {@code JwtProperties}
 * propre au service {@code auth} (qui a des champs supplémentaires pour
 * l'émission de jetons).</p>
 */
public class JwtProperties {

    private String secret;

    public String getSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }
}
