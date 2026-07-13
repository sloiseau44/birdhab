-- Schéma initial du service auth : users, roles, refresh_tokens

CREATE TABLE roles (
                       id          UUID PRIMARY KEY,
                       name        VARCHAR(50) NOT NULL UNIQUE,
                       created_at  TIMESTAMPTZ NOT NULL,
                       updated_at  TIMESTAMPTZ NOT NULL
);

CREATE TABLE users (
                       id              UUID PRIMARY KEY,
                       email           VARCHAR(255) NOT NULL UNIQUE,
                       password_hash   VARCHAR(255) NOT NULL,
                       first_name      VARCHAR(100),
                       last_name       VARCHAR(100),
                       enabled         BOOLEAN NOT NULL DEFAULT TRUE,
                       created_at      TIMESTAMPTZ NOT NULL,
                       updated_at      TIMESTAMPTZ NOT NULL
);

CREATE TABLE user_roles (
                            user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
                            role_id UUID NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
                            PRIMARY KEY (user_id, role_id)
);

CREATE TABLE refresh_tokens (
                                id          UUID PRIMARY KEY,
                                user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
                                token       VARCHAR(512) NOT NULL UNIQUE,
                                expires_at  TIMESTAMPTZ NOT NULL,
                                revoked     BOOLEAN NOT NULL DEFAULT FALSE,
                                created_at  TIMESTAMPTZ NOT NULL,
                                updated_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);

-- Rôles de base
INSERT INTO roles (id, name, created_at, updated_at) VALUES
                                                         (gen_random_uuid(), 'OWNER', now(), now()),
                                                         (gen_random_uuid(), 'ADMIN', now(), now()),
                                                         (gen_random_uuid(), 'TENANT', now(), now());