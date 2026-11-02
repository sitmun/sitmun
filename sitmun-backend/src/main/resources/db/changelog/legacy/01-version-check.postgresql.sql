DO $$
DECLARE
  present integer;
  shared_styles text;
  confirmed text;
  stored text;
BEGIN
  SELECT COUNT(*) INTO present
  FROM databasechangelog d
  WHERE EXISTS (
    SELECT 1 FROM (
    SELECT '1' AS id, 'sitmun' AS author, 'changelog/01_schema.postgresql.sql' AS filename
    UNION ALL
    SELECT '25-fix-auth-mode-swap' AS id, 'sitmun' AS author, 'changelog/25_fix_auth_mode_swap.yaml' AS filename
    UNION ALL
    SELECT '2' AS id, 'sitmun' AS author, 'changelog/02_codelists.yaml' AS filename
    UNION ALL
    SELECT '3' AS id, 'sitmun' AS author, 'changelog/03_task_types.yaml' AS filename
    UNION ALL
    SELECT '4' AS id, 'sitmun' AS author, 'changelog/04_seed_data.yaml' AS filename
    UNION ALL
    SELECT '5' AS id, 'sitmun' AS author, 'changelog/05_translations.yaml' AS filename
    UNION ALL
    SELECT '6' AS id, 'sitmun' AS author, 'changelog/06_params.yaml' AS filename
    UNION ALL
    SELECT '7' AS id, 'sitmun' AS author, 'changelog/07_sequences.yaml' AS filename
    UNION ALL
    SELECT '08-application-responsible-institution' AS id, 'sitmun' AS author, 'changelog/08_application_responsible_institution.sql' AS filename
    UNION ALL
    SELECT '09_language_order_column' AS id, 'sitmun' AS author, 'changelog/09_language_order_enabled_and_labels.yaml' AS filename
    UNION ALL
    SELECT '09_language_order_and_labels' AS id, 'sitmun' AS author, 'changelog/09_language_order_enabled_and_labels.yaml' AS filename
    UNION ALL
    SELECT '10_language_enabled_column' AS id, 'sitmun' AS author, 'changelog/09_language_order_enabled_and_labels.yaml' AS filename
    UNION ALL
    SELECT '10_language_enabled_backfill' AS id, 'sitmun' AS author, 'changelog/09_language_order_enabled_and_labels.yaml' AS filename
    UNION ALL
    SELECT '10_template_task_type' AS id, 'sitmun' AS author, 'changelog/10_add_template_task_type.yaml' AS filename
    UNION ALL
    SELECT '11_template_reference_alias' AS id, 'sitmun' AS author, 'changelog/11_add_template_reference_alias.yaml' AS filename
    UNION ALL
    SELECT '11b_template_reference_alias_uk' AS id, 'sitmun' AS author, 'changelog/11_add_template_reference_alias.yaml' AS filename
    UNION ALL
    SELECT '12_more_info_advanced_ui_control' AS id, 'sitmun' AS author, 'changelog/12_add_more_info_advanced_ui_control.yaml' AS filename
    UNION ALL
    SELECT '13_more_info_advanced_task_type' AS id, 'sitmun' AS author, 'changelog/13_add_more_info_advanced_task_type.yaml' AS filename
    UNION ALL
    SELECT '14' AS id, 'sitmun' AS author, 'changelog/14_add_literal_translations.sql' AS filename
    UNION ALL
    SELECT '15' AS id, 'sitmun' AS author, 'changelog/15_add_literal_translation_source_language.sql' AS filename
    UNION ALL
    SELECT '16' AS id, 'sitmun' AS author, 'changelog/16_add_translation_sequences.sql' AS filename
    UNION ALL
    SELECT '17-literal-translations-varchar' AS id, 'sitmun' AS author, 'changelog/17_literal_translations_varchar.sql' AS filename
    UNION ALL
    SELECT '18-seed-mia-chrome-no-data-postgresql' AS id, 'sitmun' AS author, 'changelog/18_mia_chrome_literals.sql' AS filename
    UNION ALL
    SELECT '18-seed-mia-chrome-error-executing-task-postgresql' AS id, 'sitmun' AS author, 'changelog/18_mia_chrome_literals.sql' AS filename
    UNION ALL
    SELECT '18-seed-mia-chrome-query-postgresql' AS id, 'sitmun' AS author, 'changelog/18_mia_chrome_literals.sql' AS filename
    UNION ALL
    SELECT '18-seed-mia-chrome-invalid-child-task-id-postgresql' AS id, 'sitmun' AS author, 'changelog/18_mia_chrome_literals.sql' AS filename
    UNION ALL
    SELECT '18-seed-mia-chrome-task-not-executed-postgresql' AS id, 'sitmun' AS author, 'changelog/18_mia_chrome_literals.sql' AS filename
    UNION ALL
    SELECT '18-seed-mia-chrome-binary-access-message-postgresql' AS id, 'sitmun' AS author, 'changelog/18_mia_chrome_literals.sql' AS filename
    UNION ALL
    SELECT '18-seed-mia-chrome-binary-placeholder-postgresql' AS id, 'sitmun' AS author, 'changelog/18_mia_chrome_literals.sql' AS filename
    UNION ALL
    SELECT '19-add-tno-default-postgresql' AS id, 'sitmun' AS author, 'changelog/19_add_tree_node_default.yaml' AS filename
    UNION ALL
    SELECT '20_application_tree_order_postgresql' AS id, 'sitmun' AS author, 'changelog/20_application_tree_order.yaml' AS filename
    UNION ALL
    SELECT '21-align-fgi-valuetype-postgresql' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename
    UNION ALL
    SELECT '21-align-geo-type-postgresql' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename
    UNION ALL
    SELECT '21-align-ggi-type-postgresql' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename
    UNION ALL
    SELECT '21-align-pse-name-postgresql' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename
    UNION ALL
    SELECT '21-align-ser-protocol-postgresql' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename
    UNION ALL
    SELECT '21-align-sgi-lurl-format-postgresql' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename
    UNION ALL
    SELECT '21-align-stm-log-fk-appid-postgresql' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename
    UNION ALL
    SELECT '21-align-stm-log-fk-giid-postgresql' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename
    UNION ALL
    SELECT '21-align-stm-log-fk-taskid-postgresql' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename
    UNION ALL
    SELECT '21-align-stm-log-fk-terid-postgresql' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename
    UNION ALL
    SELECT '21-align-stm-log-fk-userid-postgresql' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename
    UNION ALL
    SELECT '21-align-app-name-postgresql' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename
    UNION ALL
    SELECT '21-align-app-project-postgresql' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename
    UNION ALL
    SELECT '21-align-app-type-postgresql' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename
    UNION ALL
    SELECT '21-align-geo-source-postgresql' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename
    UNION ALL
    SELECT '21-align-tet-name-postgresql' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename
    UNION ALL
    SELECT '22_document_export_task_type' AS id, 'sitmun' AS author, 'changelog/22_add_map_image_task_type.yaml' AS filename
    UNION ALL
    SELECT '22_map_image_task_type' AS id, 'sitmun' AS author, 'changelog/22_add_map_image_task_type.yaml' AS filename
    UNION ALL
    SELECT '22b_map_image_task_type_seq' AS id, 'sitmun' AS author, 'changelog/22_add_map_image_task_type.yaml' AS filename
    UNION ALL
    SELECT '22c_document_export_codelists' AS id, 'sitmun' AS author, 'changelog/22_add_map_image_task_type.yaml' AS filename
    UNION ALL
    SELECT '23_document_export_tasks' AS id, 'sitmun' AS author, 'changelog/23_add_document_export_tasks.yaml' AS filename
    UNION ALL
    SELECT '24_default_template_regions' AS id, 'sitmun' AS author, 'changelog/24_add_default_template_regions.yaml' AS filename
    ) required
    WHERE required.id = d.id
      AND required.author = d.author
      AND required.filename = d.filename
  );
  IF present = 0 THEN
    IF to_regclass('stm_app') IS NOT NULL THEN
      RAISE EXCEPTION 'upgrade to 1.2.9 first';
    END IF;
    RETURN;
  END IF;
  IF present < 53 THEN
    RAISE EXCEPTION 'upgrade to 1.2.9 first';
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
