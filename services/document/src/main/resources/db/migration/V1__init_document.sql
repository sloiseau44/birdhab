-- Schéma initial du service document : documents
-- Exécuté dans le schéma Postgres "document" (voir spring.flyway.schemas),
-- distinct des schémas des autres microservices, pour éviter toute collision
-- d'historique flyway_schema_history entre services partageant la même base
-- "birdhab" en dev.

CREATE TABLE documents (
                           id            UUID PRIMARY KEY,
                           owner_id      UUID NOT NULL,
                           tenant_id     UUID NOT NULL,
                           file_name     VARCHAR(255) NOT NULL,
                           content_type  VARCHAR(100) NOT NULL,
                           size_bytes    BIGINT NOT NULL,
                           storage_key   VARCHAR(255) NOT NULL,
                           created_at    TIMESTAMPTZ NOT NULL,
                           updated_at    TIMESTAMPTZ NOT NULL
);

-- Pas de contrainte FK vers tenant.tenants(id) : document et tenant sont des
-- contextes bornés indépendants (pas de dépendance directe entre services,
-- voir CLAUDE.md). tenant_id référence cette entité par convention applicative.
-- storage_key référence l'objet correspondant dans le bucket MinIO
-- (voir infrastructure.storage.MinioStorageService), sans lien SQL possible.

CREATE INDEX idx_documents_owner_id ON documents (owner_id);
CREATE INDEX idx_documents_tenant_id ON documents (tenant_id);
