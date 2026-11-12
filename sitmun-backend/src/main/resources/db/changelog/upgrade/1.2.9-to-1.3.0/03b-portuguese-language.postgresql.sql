INSERT INTO stm_language (lan_id, lan_shortname, lan_name, lan_order, lan_enabled)
SELECT COALESCE((SELECT MAX(lan_id) FROM stm_language), 0) + 1, 'pt-PT', 'Português', 6, true
WHERE NOT EXISTS (SELECT 1 FROM stm_language WHERE lan_shortname = 'pt-PT');
