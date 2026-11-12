INSERT INTO stm_language (lan_id, lan_shortname, lan_name, lan_order, lan_enabled)
SELECT COALESCE((SELECT MAX(lan_id) FROM stm_language), 0) + 1, 'pt-PT', 'Português', 6, 1
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM stm_language WHERE lan_shortname = 'pt-PT');
MERGE INTO stm_sequence t
USING (SELECT 'LAN_ID' n, COALESCE(MAX(lan_id), 0) + 1 v FROM stm_language) s
ON (t.seq_name = s.n)
WHEN MATCHED THEN UPDATE SET t.seq_count = GREATEST(t.seq_count, s.v)
WHEN NOT MATCHED THEN INSERT (seq_name, seq_count) VALUES (s.n, s.v);
