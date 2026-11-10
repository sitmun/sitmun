--liquibase formatted sql

--changeset sitmun:86-dev-setup-language-configured
-- A populated development database is already configured. The first-run wizard stays off.
UPDATE stm_conf SET cnf_value = 'true' WHERE cnf_name = 'setup.languageConfigured';

--changeset sitmun:87-dev-remove-first-run
-- A populated development database is already in use. First-run stays off when the key is missing.
DELETE FROM stm_conf WHERE cnf_name IN ('sitmun.first-run', 'setup.languageConfigured');

--changeset sitmun:88-dev-restore-admin-password
-- The seeded admin password keeps first-run off. A custom password is left alone.
UPDATE stm_user
SET use_pwd = '$2a$10$fxkKe8bLwlWNitI49I6DBeNtOhjTqkMw2KKWg8pPd8k2jOT5dYc/W'
WHERE use_user = 'admin' AND use_pwd IS NULL;
