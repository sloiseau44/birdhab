package com.birdhab.tenant;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * Point d'entrée du microservice tenant.
 *
 * <p>{@code @EnableJpaAuditing} active le renseignement automatique des
 * champs {@code createdAt}/{@code updatedAt} de {@link com.birdhab.common.entity.BaseEntity}.</p>
 */
@SpringBootApplication(scanBasePackages = "com.birdhab")
@EnableJpaAuditing
public class TenantServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(TenantServiceApplication.class, args);
    }
}
