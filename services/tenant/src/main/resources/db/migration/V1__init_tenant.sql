-- Schéma initial du service tenant : tenants
-- Exécuté dans le schéma Postgres "tenant" (voir spring.flyway.schemas),
-- distinct des schémas "public" (auth) et "property", pour éviter toute
-- collision d'historique flyway_schema_history entre microservices partageant
-- la même base "birdhab" en dev.

CREATE TABLE tenants (
                         id              UUID PRIMARY KEY,
                         owner_id        UUID NOT NULL,
                         first_name      VARCHAR(100) NOT NULL,
                         last_name       VARCHAR(100) NOT NULL,
                         email           VARCHAR(255) NOT NULL,
                         phone           VARCHAR(20),
                         street          VARCHAR(255),
                         postal_code     VARCHAR(5),
                         city            VARCHAR(100),
                         created_at      TIMESTAMPTZ NOT NULL,
                         updated_at      TIMESTAMPTZ NOT NULL
);

-- Pas de contrainte FK vers auth.users(id) : tenant et auth sont des contextes
-- bornés indépendants (pas de dépendance directe entre services, voir CLAUDE.md).
-- owner_id référence l'id d'un User du service auth par convention applicative.

CREATE INDEX idx_tenants_owner_id ON tenants (owner_id);
