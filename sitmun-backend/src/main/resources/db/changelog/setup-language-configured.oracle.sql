UPDATE stm_user
SET use_pwd = NULL
WHERE use_user = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM databasechangelog
    WHERE id = '1' AND filename = 'changelog/01_schema.oracle.sql'
  );

UPDATE stm_sequence
SET seq_count = (SELECT NVL(MAX(cnf_id), 0) + 1 FROM stm_conf)
WHERE seq_name = 'CNF_ID';
