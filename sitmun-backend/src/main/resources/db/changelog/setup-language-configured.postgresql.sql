-- A new 1.3.0 database has no admin password, so first-run can set one.
-- A 1.2.9 upgrade already has changelog id 1, so this update does nothing.
UPDATE stm_user
SET use_pwd = NULL
WHERE use_user = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM databasechangelog
    WHERE id = '1' AND filename = 'changelog/01_schema.postgresql.sql'
  );

UPDATE stm_sequence
SET seq_count = (SELECT COALESCE(MAX(cnf_id), 0) + 1 FROM stm_conf)
WHERE seq_name = 'CNF_ID';
