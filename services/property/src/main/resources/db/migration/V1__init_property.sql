-- Schéma initial du service property : properties
-- Exécuté dans le schéma Postgres "property" (voir spring.flyway.schemas),
-- distinct du schéma "public" utilisé par le service auth, pour éviter toute
-- collision d'historique flyway_schema_history entre microservices partageant
-- la même base "birdhab" en dev.

CREATE TABLE properties (
                            id              UUID PRIMARY KEY,
                            owner_id        UUID NOT NULL,
                            street          VARCHAR(255) NOT NULL,
                            postal_code     VARCHAR(5) NOT NULL,
                            city            VARCHAR(100) NOT NULL,
                            type            VARCHAR(20) NOT NULL,
                            surface         NUMERIC(10,2) NOT NULL,
                            reference_rent  NUMERIC(10,2) NOT NULL,
                            created_at      TIMESTAMPTZ NOT NULL,
                            updated_at      TIMESTAMPTZ NOT NULL
);

-- Pas de contrainte FK vers auth.users(id) : property et auth sont des contextes
-- bornés indépendants (pas de dépendance directe entre services, voir CLAUDE.md).
-- owner_id référence l'id d'un User du service auth par convention applicative.

CREATE INDEX idx_properties_owner_id ON properties (owner_id);
