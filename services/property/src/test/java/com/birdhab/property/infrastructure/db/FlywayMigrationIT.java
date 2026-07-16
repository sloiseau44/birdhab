package com.birdhab.property.infrastructure.db;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Vérifie que les migrations Flyway du service s'appliquent proprement sur
 * un Postgres réel (schéma "property"), sans démarrer le contexte Spring
 * complet (pas de sécurité, JWT...) : cible uniquement la cohérence entre
 * les fichiers de migration et le schéma qu'ils produisent, le seul point
 * que les tests unitaires (repositories mockés) ne peuvent pas couvrir.
 *
 * <p>Nécessite une instance Postgres accessible (voir docker/README.md en
 * local, ou le service "postgres" de la CI GitHub Actions) — exécuté par
 * {@code mvn verify} (failsafe), pas par {@code mvn test}.</p>
 */
class FlywayMigrationIT {

    @Test
    void migrations_applyCleanlyOnRealPostgres() {
        Flyway flyway = Flyway.configure()
                .dataSource(url(), username(), password())
                .schemas("property")
                .locations("classpath:db/migration")
                .load();

        flyway.migrate();

        assertThat(flyway.info().current()).isNotNull();
    }

    private String url() {
        return System.getenv().getOrDefault("SPRING_DATASOURCE_URL", "jdbc:postgresql://localhost:5432/birdhab");
    }

    private String username() {
        return System.getenv().getOrDefault("SPRING_DATASOURCE_USERNAME", "birdhab");
    }

    private String password() {
        return System.getenv().getOrDefault("SPRING_DATASOURCE_PASSWORD", "birdhab");
    }
}
