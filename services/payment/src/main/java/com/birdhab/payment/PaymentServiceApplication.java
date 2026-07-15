package com.birdhab.payment;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * Point d'entrée du microservice payment.
 *
 * <p>{@code @EnableJpaAuditing} active le renseignement automatique des
 * champs {@code createdAt}/{@code updatedAt} de {@link com.birdhab.common.entity.BaseEntity}.</p>
 */
@SpringBootApplication(scanBasePackages = "com.birdhab")
@EnableJpaAuditing
public class PaymentServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(PaymentServiceApplication.class, args);
    }
}
