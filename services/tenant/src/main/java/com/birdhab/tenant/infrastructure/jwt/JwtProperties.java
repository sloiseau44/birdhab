package com.birdhab.tenant.infrastructure.jwt;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Liaison de la configuration {@code birdhab.jwt.secret} (voir {@code application.yml}).
 *
 * <p>Doit rester alignée avec le secret configuré côté service auth : tenant
 * ne génère jamais de jetons, il valide uniquement ceux émis par auth.</p>
 */
@Component
@ConfigurationProperties(prefix = "birdhab.jwt")
public class JwtProperties {

    private String secret;

    public String getSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }
}
