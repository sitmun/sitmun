DECLARE
  base_present NUMBER;
  hole NUMBER;
  app_exists NUMBER;
  shared_styles VARCHAR2(4000);
  confirmed VARCHAR2(20);
  stored VARCHAR2(20);
  lang_known NUMBER;
BEGIN
  SELECT COUNT(*) INTO base_present
  FROM databasechangelog d
  WHERE
(d.id = '1' AND d.author = 'sitmun' AND d.filename = 'changelog/01_schema.oracle.sql')
    OR (d.id = '2' AND d.author = 'sitmun' AND d.filename = 'changelog/02_codelists.yaml')
    OR (d.id = '3' AND d.author = 'sitmun' AND d.filename = 'changelog/03_task_types.yaml')
    OR (d.id = '4' AND d.author = 'sitmun' AND d.filename = 'changelog/04_seed_data.yaml')
    OR (d.id = '5' AND d.author = 'sitmun' AND d.filename = 'changelog/05_translations.yaml')
    OR (d.id = '6' AND d.author = 'sitmun' AND d.filename = 'changelog/06_params.yaml')
    OR (d.id = '7' AND d.author = 'sitmun' AND d.filename = 'changelog/07_sequences.yaml')
    OR (d.id = '08-application-responsible-institution' AND d.author = 'sitmun' AND d.filename = 'changelog/08_application_responsible_institution.sql')
    OR (d.id = '09_language_order_column' AND d.author = 'sitmun' AND d.filename = 'changelog/09_language_order_enabled_and_labels.yaml')
    OR (d.id = '09_language_order_and_labels' AND d.author = 'sitmun' AND d.filename = 'changelog/09_language_order_enabled_and_labels.yaml')
    OR (d.id = '10_language_enabled_column' AND d.author = 'sitmun' AND d.filename = 'changelog/09_language_order_enabled_and_labels.yaml')
    OR (d.id = '10_language_enabled_backfill' AND d.author = 'sitmun' AND d.filename = 'changelog/09_language_order_enabled_and_labels.yaml')
    OR (d.id = '10_template_task_type' AND d.author = 'sitmun' AND d.filename = 'changelog/10_add_template_task_type.yaml')
    OR (d.id = '11_template_reference_alias' AND d.author = 'sitmun' AND d.filename = 'changelog/11_add_template_reference_alias.yaml')
    OR (d.id = '11b_template_reference_alias_uk' AND d.author = 'sitmun' AND d.filename = 'changelog/11_add_template_reference_alias.yaml')
    OR (d.id = '12_more_info_advanced_ui_control' AND d.author = 'sitmun' AND d.filename = 'changelog/12_add_more_info_advanced_ui_control.yaml')
    OR (d.id = '13_more_info_advanced_task_type' AND d.author = 'sitmun' AND d.filename = 'changelog/13_add_more_info_advanced_task_type.yaml')
    OR (d.id = '14' AND d.author = 'sitmun' AND d.filename = 'changelog/14_add_literal_translations.sql')
    OR (d.id = '15' AND d.author = 'sitmun' AND d.filename = 'changelog/15_add_literal_translation_source_language.sql')
    OR (d.id = '16' AND d.author = 'sitmun' AND d.filename = 'changelog/16_add_translation_sequences.sql')
    OR (d.id = '17-literal-translations-varchar-literal' AND d.author = 'sitmun' AND d.filename = 'changelog/17_literal_translations_varchar.sql')
    OR (d.id = '17-literal-translations-varchar-value' AND d.author = 'sitmun' AND d.filename = 'changelog/17_literal_translations_varchar.sql')
    OR (d.id = '18-seed-mia-chrome-no-data-oracle' AND d.author = 'sitmun' AND d.filename = 'changelog/18_mia_chrome_literals.sql')
    OR (d.id = '18-seed-mia-chrome-error-executing-task-oracle' AND d.author = 'sitmun' AND d.filename = 'changelog/18_mia_chrome_literals.sql')
    OR (d.id = '18-seed-mia-chrome-query-oracle' AND d.author = 'sitmun' AND d.filename = 'changelog/18_mia_chrome_literals.sql')
    OR (d.id = '18-seed-mia-chrome-invalid-child-task-id-oracle' AND d.author = 'sitmun' AND d.filename = 'changelog/18_mia_chrome_literals.sql')
    OR (d.id = '18-seed-mia-chrome-task-not-executed-oracle' AND d.author = 'sitmun' AND d.filename = 'changelog/18_mia_chrome_literals.sql')
    OR (d.id = '18-seed-mia-chrome-binary-access-message-oracle' AND d.author = 'sitmun' AND d.filename = 'changelog/18_mia_chrome_literals.sql')
    OR (d.id = '18-seed-mia-chrome-binary-placeholder-oracle' AND d.author = 'sitmun' AND d.filename = 'changelog/18_mia_chrome_literals.sql');
  IF base_present = 0 THEN
    SELECT COUNT(*) INTO app_exists FROM user_tables WHERE table_name = 'STM_APP';
    IF app_exists > 0 THEN
      RAISE_APPLICATION_ERROR(-20001, 'upgrade to 1.2.8 first');
    END IF;
    RETURN;
  END IF;
  IF base_present < 29 THEN
    RAISE_APPLICATION_ERROR(-20001, 'upgrade to 1.2.8 first');
  END IF;
  WITH slots(pos, filled) AS (
  SELECT 1, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '25-fix-auth-mode-swap' AND d.author = 'sitmun' AND d.filename = 'changelog/25_fix_auth_mode_swap.yaml')) THEN 1 ELSE 0 END FROM dual
  UNION ALL
  SELECT 2, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '19-add-tno-default-oracle' AND d.author = 'sitmun' AND d.filename = 'changelog/19_add_tree_node_default.yaml')) THEN 1 ELSE 0 END FROM dual
  UNION ALL
  SELECT 3, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '20_application_tree_order_oracle' AND d.author = 'sitmun' AND d.filename = 'changelog/20_application_tree_order.yaml')) THEN 1 ELSE 0 END FROM dual
  UNION ALL
  SELECT 4, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '21-align-bac-name-oracle' AND d.author = 'sitmun' AND d.filename = 'changelog/21_align_schema_with_development.yaml')) THEN 1 ELSE 0 END FROM dual
  UNION ALL
  SELECT 5, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '21-align-pap-name-oracle' AND d.author = 'sitmun' AND d.filename = 'changelog/21_align_schema_with_development.yaml')) THEN 1 ELSE 0 END FROM dual
  UNION ALL
  SELECT 6, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '21-align-fgi-valuetype-oracle' AND d.author = 'sitmun' AND d.filename = 'changelog/21_align_schema_with_development.yaml')) THEN 1 ELSE 0 END FROM dual
  UNION ALL
  SELECT 7, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '21-align-geo-type-oracle' AND d.author = 'sitmun' AND d.filename = 'changelog/21_align_schema_with_development.yaml')) THEN 1 ELSE 0 END FROM dual
  UNION ALL
  SELECT 8, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '21-align-ggi-type-oracle' AND d.author = 'sitmun' AND d.filename = 'changelog/21_align_schema_with_development.yaml')) THEN 1 ELSE 0 END FROM dual
  UNION ALL
  SELECT 9, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '21-align-pse-name-oracle' AND d.author = 'sitmun' AND d.filename = 'changelog/21_align_schema_with_development.yaml')) THEN 1 ELSE 0 END FROM dual
  UNION ALL
  SELECT 10, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '21-align-ser-protocol-oracle' AND d.author = 'sitmun' AND d.filename = 'changelog/21_align_schema_with_development.yaml')) THEN 1 ELSE 0 END FROM dual
  UNION ALL
  SELECT 11, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '21-align-sgi-lurl-format-oracle' AND d.author = 'sitmun' AND d.filename = 'changelog/21_align_schema_with_development.yaml')) THEN 1 ELSE 0 END FROM dual
  UNION ALL
  SELECT 12, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '21-align-stm-log-fk-appid-oracle' AND d.author = 'sitmun' AND d.filename = 'changelog/21_align_schema_with_development.yaml')) THEN 1 ELSE 0 END FROM dual
  UNION ALL
  SELECT 13, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '21-align-stm-log-fk-giid-oracle' AND d.author = 'sitmun' AND d.filename = 'changelog/21_align_schema_with_development.yaml')) THEN 1 ELSE 0 END FROM dual
  UNION ALL
  SELECT 14, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '21-align-stm-log-fk-taskid-oracle' AND d.author = 'sitmun' AND d.filename = 'changelog/21_align_schema_with_development.yaml')) THEN 1 ELSE 0 END FROM dual
  UNION ALL
  SELECT 15, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '21-align-stm-log-fk-terid-oracle' AND d.author = 'sitmun' AND d.filename = 'changelog/21_align_schema_with_development.yaml')) THEN 1 ELSE 0 END FROM dual
  UNION ALL
  SELECT 16, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '21-align-stm-log-fk-userid-oracle' AND d.author = 'sitmun' AND d.filename = 'changelog/21_align_schema_with_development.yaml')) THEN 1 ELSE 0 END FROM dual
  UNION ALL
  SELECT 17, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '21-align-pgi-type-oracle' AND d.author = 'sitmun' AND d.filename = 'changelog/21_align_schema_with_development.yaml')) THEN 1 ELSE 0 END FROM dual
  UNION ALL
  SELECT 18, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '22_document_export_task_type' AND d.author = 'sitmun' AND d.filename = 'changelog/22_add_map_image_task_type.yaml') OR (d.id = '26_document_export_task_type' AND d.author = 'sitmun' AND d.filename = 'changelog/26_map_image_task_type_pre23.yaml')) THEN 1 ELSE 0 END FROM dual
  UNION ALL
  SELECT 19, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '22_map_image_task_type' AND d.author = 'sitmun' AND d.filename = 'changelog/22_add_map_image_task_type.yaml') OR (d.id = '26_map_image_task_type' AND d.author = 'sitmun' AND d.filename = 'changelog/26_map_image_task_type_pre23.yaml')) THEN 1 ELSE 0 END FROM dual
  UNION ALL
  SELECT 20, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '22b_map_image_task_type_seq' AND d.author = 'sitmun' AND d.filename = 'changelog/22_add_map_image_task_type.yaml') OR (d.id = '26b_map_image_task_type_seq' AND d.author = 'sitmun' AND d.filename = 'changelog/26_map_image_task_type_pre23.yaml')) THEN 1 ELSE 0 END FROM dual
  UNION ALL
  SELECT 21, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '22c_document_export_codelists' AND d.author = 'sitmun' AND d.filename = 'changelog/22_add_map_image_task_type.yaml') OR (d.id = '26c_document_export_codelists' AND d.author = 'sitmun' AND d.filename = 'changelog/26_map_image_task_type_pre23.yaml')) THEN 1 ELSE 0 END FROM dual
  UNION ALL
  SELECT 22, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '23_document_export_tasks' AND d.author = 'sitmun' AND d.filename = 'changelog/23_add_document_export_tasks.yaml')) THEN 1 ELSE 0 END FROM dual
  UNION ALL
  SELECT 23, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '24_default_template_regions' AND d.author = 'sitmun' AND d.filename = 'changelog/24_add_default_template_regions.yaml')) THEN 1 ELSE 0 END FROM dual
  )
  SELECT COUNT(*) INTO hole
  FROM slots later
  JOIN slots earlier ON earlier.pos = later.pos - 1
  WHERE later.filled = 1 AND earlier.filled = 0;
  IF hole > 0 THEN
    RAISE_APPLICATION_ERROR(-20001, 'upgrade to 1.2.8 first');
  END IF;
  confirmed := '${upgrade.defaultLanguage}';
  -- Dynamic SQL: a fresh database has no stm_conf or stm_language yet.
  -- Oracle compiles static queries in this block before those tables exist.
  BEGIN
    EXECUTE IMMEDIATE
      'SELECT cnf_value FROM stm_conf WHERE cnf_name = ''language.default'''
      INTO stored;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      stored := NULL;
  END;
  IF confirmed IS NULL OR LENGTH(TRIM(confirmed)) IS NULL OR LENGTH(TRIM(confirmed)) = 0 THEN
    RAISE_APPLICATION_ERROR(-20003, 'set SITMUN_UPGRADE_DEFAULT_LANGUAGE to the language the database text is written in, and set STM_CONF language.default to the same value');
  END IF;
  IF stored IS NULL THEN
    RAISE_APPLICATION_ERROR(-20003, 'STM_CONF language.default is missing and SITMUN_UPGRADE_DEFAULT_LANGUAGE is ' || confirmed || '; set STM_CONF language.default to that value');
  END IF;
  IF stored <> confirmed THEN
    RAISE_APPLICATION_ERROR(-20003, 'SITMUN_UPGRADE_DEFAULT_LANGUAGE is ' || confirmed || ' but STM_CONF language.default is ' || stored || '; fix STM_CONF or the variable');
  END IF;
  EXECUTE IMMEDIATE
    'SELECT COUNT(*) FROM stm_language WHERE lan_shortname = :confirmed'
    INTO lang_known
    USING confirmed;
  IF lang_known = 0 THEN
    RAISE_APPLICATION_ERROR(-20003, 'SITMUN_UPGRADE_DEFAULT_LANGUAGE ' || confirmed || ' is not in STM_LANGUAGE; fix STM_CONF or the variable');
  END IF;
  -- Dynamic SQL: a fresh database has no stm_geoinfo, and Oracle compiles
  -- static queries in this block before that table exists.
  EXECUTE IMMEDIATE
    'SELECT LISTAGG(geo_id, '', '') WITHIN GROUP (ORDER BY geo_id) FROM stm_geoinfo WHERE geo_styid IN (SELECT geo_styid FROM stm_geoinfo WHERE geo_styid IS NOT NULL GROUP BY geo_styid HAVING COUNT(*) > 1)'
    INTO shared_styles;
  IF shared_styles IS NOT NULL THEN
    RAISE_APPLICATION_ERROR(-20002, 'shared geo_styid on cartography ids ' || shared_styles);
  END IF;
END;
