-- Les jetons de renouvellement ne sont plus stockés en clair : seul leur
-- hash SHA-256 est persisté (voir AuthService.hashToken / RefreshToken).
-- Une fuite de la base ne suffit donc plus à obtenir des jetons exploitables,
-- cohérent avec le hachage BCrypt déjà appliqué à password_hash sur users.

ALTER TABLE refresh_tokens RENAME COLUMN token TO token_hash;
