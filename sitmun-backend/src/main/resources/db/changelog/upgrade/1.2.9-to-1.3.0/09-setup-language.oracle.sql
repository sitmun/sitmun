INSERT INTO stm_conf (cnf_id, cnf_name, cnf_value)
SELECT NVL((SELECT MAX(cnf_id) FROM stm_conf), 0) + 1,
       'setup.languageConfigured',
       'true'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM stm_conf WHERE cnf_name = 'setup.languageConfigured');

UPDATE stm_sequence
SET seq_count = GREATEST(seq_count, (SELECT NVL(MAX(cnf_id), 0) + 1 FROM stm_conf))
WHERE seq_name = 'CNF_ID';
