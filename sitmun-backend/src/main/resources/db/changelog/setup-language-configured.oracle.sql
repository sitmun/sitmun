--liquibase formatted sql

-- A database created by the published 1.3.0 image ran the seed before this
-- row existed. The edited seed is not run again. Insert the fresh value
-- when the row is still absent. An upgrade that already set true is left.

--changeset sitmun:setup-language-configured-when-absent-oracle dbms:oracle
INSERT INTO stm_conf (cnf_id, cnf_name, cnf_value)
SELECT NVL((SELECT MAX(cnf_id) FROM stm_conf), 0) + 1,
       'setup.languageConfigured',
       'false'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM stm_conf WHERE cnf_name = 'setup.languageConfigured');

UPDATE stm_sequence
SET seq_count = GREATEST(seq_count, (SELECT NVL(MAX(cnf_id), 0) + 1 FROM stm_conf))
WHERE seq_name = 'CNF_ID';
