-- Schéma initial du service payment : payments
-- Exécuté dans le schéma Postgres "payment" (voir spring.flyway.schemas),
-- distinct des schémas des autres microservices, pour éviter toute collision
-- d'historique flyway_schema_history entre services partageant la même base
-- "birdhab" en dev.

CREATE TABLE payments (
                          id            UUID PRIMARY KEY,
                          owner_id      UUID NOT NULL,
                          lease_id      UUID NOT NULL,
                          due_date      DATE NOT NULL,
                          amount        NUMERIC(10,2) NOT NULL,
                          paid_date     DATE,
                          paid_amount   NUMERIC(10,2),
                          created_at    TIMESTAMPTZ NOT NULL,
                          updated_at    TIMESTAMPTZ NOT NULL
);

-- Pas de contrainte FK vers lease.leases(id) : payment et lease sont des
-- contextes bornés indépendants (pas de dépendance directe entre services,
-- voir CLAUDE.md). lease_id référence cette entité par convention applicative.

CREATE INDEX idx_payments_owner_id ON payments (owner_id);
CREATE INDEX idx_payments_lease_id ON payments (lease_id);
