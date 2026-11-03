DO $$
DECLARE
  base_present integer;
  hole integer;
  shared_styles text;
  confirmed text;
  stored text;
BEGIN
  SELECT COUNT(*) INTO base_present
  FROM databasechangelog d
  WHERE
(d.id = '1' AND d.author = 'sitmun' AND d.filename = 'changelog/01_schema.postgresql.sql')
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
    OR (d.id = '17-literal-translations-varchar' AND d.author = 'sitmun' AND d.filename = 'changelog/17_literal_translations_varchar.sql')
    OR (d.id = '18-seed-mia-chrome-no-data-postgresql' AND d.author = 'sitmun' AND d.filename = 'changelog/18_mia_chrome_literals.sql')
    OR (d.id = '18-seed-mia-chrome-error-executing-task-postgresql' AND d.author = 'sitmun' AND d.filename = 'changelog/18_mia_chrome_literals.sql')
    OR (d.id = '18-seed-mia-chrome-query-postgresql' AND d.author = 'sitmun' AND d.filename = 'changelog/18_mia_chrome_literals.sql')
    OR (d.id = '18-seed-mia-chrome-invalid-child-task-id-postgresql' AND d.author = 'sitmun' AND d.filename = 'changelog/18_mia_chrome_literals.sql')
    OR (d.id = '18-seed-mia-chrome-task-not-executed-postgresql' AND d.author = 'sitmun' AND d.filename = 'changelog/18_mia_chrome_literals.sql')
    OR (d.id = '18-seed-mia-chrome-binary-access-message-postgresql' AND d.author = 'sitmun' AND d.filename = 'changelog/18_mia_chrome_literals.sql')
    OR (d.id = '18-seed-mia-chrome-binary-placeholder-postgresql' AND d.author = 'sitmun' AND d.filename = 'changelog/18_mia_chrome_literals.sql');
  IF base_present = 0 THEN
    IF to_regclass('stm_app') IS NOT NULL THEN
      RAISE EXCEPTION 'upgrade to 1.2.8 first';
    END IF;
    RETURN;
  END IF;
  IF base_present < 28 THEN
    RAISE EXCEPTION 'upgrade to 1.2.8 first';
  END IF;
  WITH slots(pos, filled) AS (
  SELECT 1, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '25-fix-auth-mode-swap' AND d.author = 'sitmun' AND d.filename = 'changelog/25_fix_auth_mode_swap.yaml')) THEN 1 ELSE 0 END
  UNION ALL
  SELECT 2, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '19-add-tno-default-postgresql' AND d.author = 'sitmun' AND d.filename = 'changelog/19_add_tree_node_default.yaml')) THEN 1 ELSE 0 END
  UNION ALL
  SELECT 3, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '20_application_tree_order_postgresql' AND d.author = 'sitmun' AND d.filename = 'changelog/20_application_tree_order.yaml')) THEN 1 ELSE 0 END
  UNION ALL
  SELECT 4, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '21-align-fgi-valuetype-postgresql' AND d.author = 'sitmun' AND d.filename = 'changelog/21_align_schema_with_development.yaml')) THEN 1 ELSE 0 END
  UNION ALL
  SELECT 5, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '21-align-geo-type-postgresql' AND d.author = 'sitmun' AND d.filename = 'changelog/21_align_schema_with_development.yaml')) THEN 1 ELSE 0 END
  UNION ALL
  SELECT 6, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '21-align-ggi-type-postgresql' AND d.author = 'sitmun' AND d.filename = 'changelog/21_align_schema_with_development.yaml')) THEN 1 ELSE 0 END
  UNION ALL
  SELECT 7, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '21-align-pse-name-postgresql' AND d.author = 'sitmun' AND d.filename = 'changelog/21_align_schema_with_development.yaml')) THEN 1 ELSE 0 END
  UNION ALL
  SELECT 8, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '21-align-ser-protocol-postgresql' AND d.author = 'sitmun' AND d.filename = 'changelog/21_align_schema_with_development.yaml')) THEN 1 ELSE 0 END
  UNION ALL
  SELECT 9, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '21-align-sgi-lurl-format-postgresql' AND d.author = 'sitmun' AND d.filename = 'changelog/21_align_schema_with_development.yaml')) THEN 1 ELSE 0 END
  UNION ALL
  SELECT 10, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '21-align-stm-log-fk-appid-postgresql' AND d.author = 'sitmun' AND d.filename = 'changelog/21_align_schema_with_development.yaml')) THEN 1 ELSE 0 END
  UNION ALL
  SELECT 11, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '21-align-stm-log-fk-giid-postgresql' AND d.author = 'sitmun' AND d.filename = 'changelog/21_align_schema_with_development.yaml')) THEN 1 ELSE 0 END
  UNION ALL
  SELECT 12, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '21-align-stm-log-fk-taskid-postgresql' AND d.author = 'sitmun' AND d.filename = 'changelog/21_align_schema_with_development.yaml')) THEN 1 ELSE 0 END
  UNION ALL
  SELECT 13, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '21-align-stm-log-fk-terid-postgresql' AND d.author = 'sitmun' AND d.filename = 'changelog/21_align_schema_with_development.yaml')) THEN 1 ELSE 0 END
  UNION ALL
  SELECT 14, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '21-align-stm-log-fk-userid-postgresql' AND d.author = 'sitmun' AND d.filename = 'changelog/21_align_schema_with_development.yaml')) THEN 1 ELSE 0 END
  UNION ALL
  SELECT 15, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '21-align-app-name-postgresql' AND d.author = 'sitmun' AND d.filename = 'changelog/21_align_schema_with_development.yaml')) THEN 1 ELSE 0 END
  UNION ALL
  SELECT 16, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '21-align-app-project-postgresql' AND d.author = 'sitmun' AND d.filename = 'changelog/21_align_schema_with_development.yaml')) THEN 1 ELSE 0 END
  UNION ALL
  SELECT 17, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '21-align-app-type-postgresql' AND d.author = 'sitmun' AND d.filename = 'changelog/21_align_schema_with_development.yaml')) THEN 1 ELSE 0 END
  UNION ALL
  SELECT 18, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '21-align-geo-source-postgresql' AND d.author = 'sitmun' AND d.filename = 'changelog/21_align_schema_with_development.yaml')) THEN 1 ELSE 0 END
  UNION ALL
  SELECT 19, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '21-align-tet-name-postgresql' AND d.author = 'sitmun' AND d.filename = 'changelog/21_align_schema_with_development.yaml')) THEN 1 ELSE 0 END
  UNION ALL
  SELECT 20, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '22_document_export_task_type' AND d.author = 'sitmun' AND d.filename = 'changelog/22_add_map_image_task_type.yaml') OR (d.id = '26_document_export_task_type' AND d.author = 'sitmun' AND d.filename = 'changelog/26_map_image_task_type_pre23.yaml')) THEN 1 ELSE 0 END
  UNION ALL
  SELECT 21, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '22_map_image_task_type' AND d.author = 'sitmun' AND d.filename = 'changelog/22_add_map_image_task_type.yaml') OR (d.id = '26_map_image_task_type' AND d.author = 'sitmun' AND d.filename = 'changelog/26_map_image_task_type_pre23.yaml')) THEN 1 ELSE 0 END
  UNION ALL
  SELECT 22, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '22b_map_image_task_type_seq' AND d.author = 'sitmun' AND d.filename = 'changelog/22_add_map_image_task_type.yaml') OR (d.id = '26b_map_image_task_type_seq' AND d.author = 'sitmun' AND d.filename = 'changelog/26_map_image_task_type_pre23.yaml')) THEN 1 ELSE 0 END
  UNION ALL
  SELECT 23, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '22c_document_export_codelists' AND d.author = 'sitmun' AND d.filename = 'changelog/22_add_map_image_task_type.yaml') OR (d.id = '26c_document_export_codelists' AND d.author = 'sitmun' AND d.filename = 'changelog/26_map_image_task_type_pre23.yaml')) THEN 1 ELSE 0 END
  UNION ALL
  SELECT 24, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '23_document_export_tasks' AND d.author = 'sitmun' AND d.filename = 'changelog/23_add_document_export_tasks.yaml')) THEN 1 ELSE 0 END
  UNION ALL
  SELECT 25, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE (d.id = '24_default_template_regions' AND d.author = 'sitmun' AND d.filename = 'changelog/24_add_default_template_regions.yaml')) THEN 1 ELSE 0 END
  )
  SELECT COUNT(*) INTO hole
  FROM slots later
  JOIN slots earlier ON earlier.pos = later.pos - 1
  WHERE later.filled = 1 AND earlier.filled = 0;
  IF hole > 0 THEN
    RAISE EXCEPTION 'upgrade to 1.2.8 first';
  END IF;
  confirmed := '${upgrade.defaultLanguage}';
  SELECT cnf_value INTO stored FROM stm_conf WHERE cnf_name = 'language.default';
  IF confirmed IS NULL OR btrim(confirmed) = '' THEN
    RAISE EXCEPTION 'set SITMUN_UPGRADE_DEFAULT_LANGUAGE to the language the database text is written in, and set STM_CONF language.default to the same value';
  END IF;
  IF stored IS NULL THEN
    RAISE EXCEPTION 'STM_CONF language.default is missing and SITMUN_UPGRADE_DEFAULT_LANGUAGE is %; set STM_CONF language.default to that value', confirmed;
  END IF;
  IF stored <> confirmed THEN
    RAISE EXCEPTION 'SITMUN_UPGRADE_DEFAULT_LANGUAGE is % but STM_CONF language.default is %; fix STM_CONF or the variable', confirmed, stored;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM stm_language WHERE lan_shortname = confirmed) THEN
    RAISE EXCEPTION 'SITMUN_UPGRADE_DEFAULT_LANGUAGE % is not in STM_LANGUAGE; fix STM_CONF or the variable', confirmed;
  END IF;
  SELECT string_agg(geo_id::text, ', ' ORDER BY geo_id) INTO shared_styles
  FROM stm_geoinfo
  WHERE geo_styid IN (
    SELECT geo_styid FROM stm_geoinfo
    WHERE geo_styid IS NOT NULL
    GROUP BY geo_styid
    HAVING COUNT(*) > 1
  );
  IF shared_styles IS NOT NULL THEN
    RAISE EXCEPTION 'shared geo_styid on cartography ids %', shared_styles;
  END IF;
END $$;
