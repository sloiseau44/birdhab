-- Adresse postale du propriétaire, utilisée comme adresse du bailleur lors
-- de la génération d'une quittance par le service payment (voir
-- docs/api/payment.yml, ReceiptRequest). Absente à l'inscription : renseignée
-- ultérieurement via PUT /auth/me, donc colonnes nullable.

ALTER TABLE users
    ADD COLUMN street      VARCHAR(255),
    ADD COLUMN postal_code VARCHAR(5),
    ADD COLUMN city        VARCHAR(100);
