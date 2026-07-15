package com.birdhab.document;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * Point d'entrée du microservice document.
 *
 * <p>{@code @EnableJpaAuditing} active le renseignement automatique des
 * champs {@code createdAt}/{@code updatedAt} de {@link com.birdhab.common.entity.BaseEntity}.</p>
 */
@SpringBootApplication(scanBasePackages = "com.birdhab")
@EnableJpaAuditing
public class DocumentServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(DocumentServiceApplication.class, args);
    }
}
