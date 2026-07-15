-- Schéma initial du service lease : leases
-- Exécuté dans le schéma Postgres "lease" (voir spring.flyway.schemas),
-- distinct des schémas des autres microservices, pour éviter toute collision
-- d'historique flyway_schema_history entre services partageant la même base
-- "birdhab" en dev.

CREATE TABLE leases (
                        id                      UUID PRIMARY KEY,
                        owner_id                UUID NOT NULL,
                        property_id             UUID NOT NULL,
                        tenant_id               UUID NOT NULL,
                        start_date              DATE NOT NULL,
                        end_date                DATE,
                        rent_amount             NUMERIC(10,2) NOT NULL,
                        deposit_amount          NUMERIC(10,2) NOT NULL,
                        irl_reference_quarter   VARCHAR(7),
                        created_at              TIMESTAMPTZ NOT NULL,
                        updated_at              TIMESTAMPTZ NOT NULL
);

-- Pas de contrainte FK vers property.properties(id) ni tenant.tenants(id) :
-- lease, property et tenant sont des contextes bornés indépendants (pas de
-- dépendance directe entre services, voir CLAUDE.md). property_id et tenant_id
-- référencent ces entités par convention applicative.

CREATE INDEX idx_leases_owner_id ON leases (owner_id);
CREATE INDEX idx_leases_property_id ON leases (property_id);
CREATE INDEX idx_leases_tenant_id ON leases (tenant_id);
