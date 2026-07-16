package com.birdhab.payment.infrastructure.jwt;

import com.birdhab.common.security.JwtProperties;
import com.birdhab.common.security.JwtValidator;
import com.birdhab.common.security.JwtValidatorService;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Déclare explicitement les beans {@link JwtProperties}/{@link JwtValidator}
 * partagés (voir shared/common) : payment ne génère jamais de jetons, il
 * valide uniquement ceux émis par le service auth (même secret partagé).
 *
 * <p>Déclaration explicite plutôt que component-scan automatique, pour ne
 * pas entrer en conflit avec le {@code JwtService} propre à auth (qui
 * implémente aussi {@link JwtValidator}, mais avec sa propre configuration
 * de jetons plus riche).</p>
 */
@Configuration
public class JwtConfig {

    @Bean
    @ConfigurationProperties(prefix = "birdhab.jwt")
    public JwtProperties jwtProperties() {
        return new JwtProperties();
    }

    @Bean
    public JwtValidator jwtValidator(JwtProperties properties) {
        return new JwtValidatorService(properties);
    }
}
