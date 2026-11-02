DECLARE
  present_23 NUMBER;
  present_pre23 NUMBER;
  known NUMBER;
  app_exists NUMBER;
  shared_styles VARCHAR2(4000);
  confirmed VARCHAR2(20);
  stored VARCHAR2(20);
  lang_known NUMBER;
BEGIN
  SELECT COUNT(*) INTO present_23
  FROM databasechangelog d
  WHERE EXISTS (
    SELECT 1 FROM (
    SELECT '1' AS id, 'sitmun' AS author, 'changelog/01_schema.oracle.sql' AS filename FROM dual
    UNION ALL
    SELECT '25-fix-auth-mode-swap' AS id, 'sitmun' AS author, 'changelog/25_fix_auth_mode_swap.yaml' AS filename FROM dual
    UNION ALL
    SELECT '2' AS id, 'sitmun' AS author, 'changelog/02_codelists.yaml' AS filename FROM dual
    UNION ALL
    SELECT '3' AS id, 'sitmun' AS author, 'changelog/03_task_types.yaml' AS filename FROM dual
    UNION ALL
    SELECT '4' AS id, 'sitmun' AS author, 'changelog/04_seed_data.yaml' AS filename FROM dual
    UNION ALL
    SELECT '5' AS id, 'sitmun' AS author, 'changelog/05_translations.yaml' AS filename FROM dual
    UNION ALL
    SELECT '6' AS id, 'sitmun' AS author, 'changelog/06_params.yaml' AS filename FROM dual
    UNION ALL
    SELECT '7' AS id, 'sitmun' AS author, 'changelog/07_sequences.yaml' AS filename FROM dual
    UNION ALL
    SELECT '08-application-responsible-institution' AS id, 'sitmun' AS author, 'changelog/08_application_responsible_institution.sql' AS filename FROM dual
    UNION ALL
    SELECT '09_language_order_column' AS id, 'sitmun' AS author, 'changelog/09_language_order_enabled_and_labels.yaml' AS filename FROM dual
    UNION ALL
    SELECT '09_language_order_and_labels' AS id, 'sitmun' AS author, 'changelog/09_language_order_enabled_and_labels.yaml' AS filename FROM dual
    UNION ALL
    SELECT '10_language_enabled_column' AS id, 'sitmun' AS author, 'changelog/09_language_order_enabled_and_labels.yaml' AS filename FROM dual
    UNION ALL
    SELECT '10_language_enabled_backfill' AS id, 'sitmun' AS author, 'changelog/09_language_order_enabled_and_labels.yaml' AS filename FROM dual
    UNION ALL
    SELECT '10_template_task_type' AS id, 'sitmun' AS author, 'changelog/10_add_template_task_type.yaml' AS filename FROM dual
    UNION ALL
    SELECT '11_template_reference_alias' AS id, 'sitmun' AS author, 'changelog/11_add_template_reference_alias.yaml' AS filename FROM dual
    UNION ALL
    SELECT '11b_template_reference_alias_uk' AS id, 'sitmun' AS author, 'changelog/11_add_template_reference_alias.yaml' AS filename FROM dual
    UNION ALL
    SELECT '12_more_info_advanced_ui_control' AS id, 'sitmun' AS author, 'changelog/12_add_more_info_advanced_ui_control.yaml' AS filename FROM dual
    UNION ALL
    SELECT '13_more_info_advanced_task_type' AS id, 'sitmun' AS author, 'changelog/13_add_more_info_advanced_task_type.yaml' AS filename FROM dual
    UNION ALL
    SELECT '14' AS id, 'sitmun' AS author, 'changelog/14_add_literal_translations.sql' AS filename FROM dual
    UNION ALL
    SELECT '15' AS id, 'sitmun' AS author, 'changelog/15_add_literal_translation_source_language.sql' AS filename FROM dual
    UNION ALL
    SELECT '16' AS id, 'sitmun' AS author, 'changelog/16_add_translation_sequences.sql' AS filename FROM dual
    UNION ALL
    SELECT '17-literal-translations-varchar-literal' AS id, 'sitmun' AS author, 'changelog/17_literal_translations_varchar.sql' AS filename FROM dual
    UNION ALL
    SELECT '17-literal-translations-varchar-value' AS id, 'sitmun' AS author, 'changelog/17_literal_translations_varchar.sql' AS filename FROM dual
    UNION ALL
    SELECT '18-seed-mia-chrome-no-data-oracle' AS id, 'sitmun' AS author, 'changelog/18_mia_chrome_literals.sql' AS filename FROM dual
    UNION ALL
    SELECT '18-seed-mia-chrome-error-executing-task-oracle' AS id, 'sitmun' AS author, 'changelog/18_mia_chrome_literals.sql' AS filename FROM dual
    UNION ALL
    SELECT '18-seed-mia-chrome-query-oracle' AS id, 'sitmun' AS author, 'changelog/18_mia_chrome_literals.sql' AS filename FROM dual
    UNION ALL
    SELECT '18-seed-mia-chrome-invalid-child-task-id-oracle' AS id, 'sitmun' AS author, 'changelog/18_mia_chrome_literals.sql' AS filename FROM dual
    UNION ALL
    SELECT '18-seed-mia-chrome-task-not-executed-oracle' AS id, 'sitmun' AS author, 'changelog/18_mia_chrome_literals.sql' AS filename FROM dual
    UNION ALL
    SELECT '18-seed-mia-chrome-binary-access-message-oracle' AS id, 'sitmun' AS author, 'changelog/18_mia_chrome_literals.sql' AS filename FROM dual
    UNION ALL
    SELECT '18-seed-mia-chrome-binary-placeholder-oracle' AS id, 'sitmun' AS author, 'changelog/18_mia_chrome_literals.sql' AS filename FROM dual
    UNION ALL
    SELECT '19-add-tno-default-oracle' AS id, 'sitmun' AS author, 'changelog/19_add_tree_node_default.yaml' AS filename FROM dual
    UNION ALL
    SELECT '20_application_tree_order_oracle' AS id, 'sitmun' AS author, 'changelog/20_application_tree_order.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-bac-name-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-pap-name-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-fgi-valuetype-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-geo-type-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-ggi-type-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-pse-name-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-ser-protocol-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-sgi-lurl-format-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-stm-log-fk-appid-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-stm-log-fk-giid-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-stm-log-fk-taskid-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-stm-log-fk-terid-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-stm-log-fk-userid-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-pgi-type-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '22_document_export_task_type' AS id, 'sitmun' AS author, 'changelog/22_add_map_image_task_type.yaml' AS filename FROM dual
    UNION ALL
    SELECT '22_map_image_task_type' AS id, 'sitmun' AS author, 'changelog/22_add_map_image_task_type.yaml' AS filename FROM dual
    UNION ALL
    SELECT '22b_map_image_task_type_seq' AS id, 'sitmun' AS author, 'changelog/22_add_map_image_task_type.yaml' AS filename FROM dual
    UNION ALL
    SELECT '22c_document_export_codelists' AS id, 'sitmun' AS author, 'changelog/22_add_map_image_task_type.yaml' AS filename FROM dual
    UNION ALL
    SELECT '23_document_export_tasks' AS id, 'sitmun' AS author, 'changelog/23_add_document_export_tasks.yaml' AS filename FROM dual
    UNION ALL
    SELECT '24_default_template_regions' AS id, 'sitmun' AS author, 'changelog/24_add_default_template_regions.yaml' AS filename FROM dual
    ) required
    WHERE required.id = d.id
      AND required.author = d.author
      AND required.filename = d.filename
  );
  SELECT COUNT(*) INTO present_pre23
  FROM databasechangelog d
  WHERE EXISTS (
    SELECT 1 FROM (
    SELECT '1' AS id, 'sitmun' AS author, 'changelog/01_schema.oracle.sql' AS filename FROM dual
    UNION ALL
    SELECT '25-fix-auth-mode-swap' AS id, 'sitmun' AS author, 'changelog/25_fix_auth_mode_swap.yaml' AS filename FROM dual
    UNION ALL
    SELECT '2' AS id, 'sitmun' AS author, 'changelog/02_codelists.yaml' AS filename FROM dual
    UNION ALL
    SELECT '3' AS id, 'sitmun' AS author, 'changelog/03_task_types.yaml' AS filename FROM dual
    UNION ALL
    SELECT '4' AS id, 'sitmun' AS author, 'changelog/04_seed_data.yaml' AS filename FROM dual
    UNION ALL
    SELECT '5' AS id, 'sitmun' AS author, 'changelog/05_translations.yaml' AS filename FROM dual
    UNION ALL
    SELECT '6' AS id, 'sitmun' AS author, 'changelog/06_params.yaml' AS filename FROM dual
    UNION ALL
    SELECT '7' AS id, 'sitmun' AS author, 'changelog/07_sequences.yaml' AS filename FROM dual
    UNION ALL
    SELECT '08-application-responsible-institution' AS id, 'sitmun' AS author, 'changelog/08_application_responsible_institution.sql' AS filename FROM dual
    UNION ALL
    SELECT '09_language_order_column' AS id, 'sitmun' AS author, 'changelog/09_language_order_enabled_and_labels.yaml' AS filename FROM dual
    UNION ALL
    SELECT '09_language_order_and_labels' AS id, 'sitmun' AS author, 'changelog/09_language_order_enabled_and_labels.yaml' AS filename FROM dual
    UNION ALL
    SELECT '10_language_enabled_column' AS id, 'sitmun' AS author, 'changelog/09_language_order_enabled_and_labels.yaml' AS filename FROM dual
    UNION ALL
    SELECT '10_language_enabled_backfill' AS id, 'sitmun' AS author, 'changelog/09_language_order_enabled_and_labels.yaml' AS filename FROM dual
    UNION ALL
    SELECT '10_template_task_type' AS id, 'sitmun' AS author, 'changelog/10_add_template_task_type.yaml' AS filename FROM dual
    UNION ALL
    SELECT '11_template_reference_alias' AS id, 'sitmun' AS author, 'changelog/11_add_template_reference_alias.yaml' AS filename FROM dual
    UNION ALL
    SELECT '11b_template_reference_alias_uk' AS id, 'sitmun' AS author, 'changelog/11_add_template_reference_alias.yaml' AS filename FROM dual
    UNION ALL
    SELECT '12_more_info_advanced_ui_control' AS id, 'sitmun' AS author, 'changelog/12_add_more_info_advanced_ui_control.yaml' AS filename FROM dual
    UNION ALL
    SELECT '13_more_info_advanced_task_type' AS id, 'sitmun' AS author, 'changelog/13_add_more_info_advanced_task_type.yaml' AS filename FROM dual
    UNION ALL
    SELECT '14' AS id, 'sitmun' AS author, 'changelog/14_add_literal_translations.sql' AS filename FROM dual
    UNION ALL
    SELECT '15' AS id, 'sitmun' AS author, 'changelog/15_add_literal_translation_source_language.sql' AS filename FROM dual
    UNION ALL
    SELECT '16' AS id, 'sitmun' AS author, 'changelog/16_add_translation_sequences.sql' AS filename FROM dual
    UNION ALL
    SELECT '17-literal-translations-varchar-literal' AS id, 'sitmun' AS author, 'changelog/17_literal_translations_varchar.sql' AS filename FROM dual
    UNION ALL
    SELECT '17-literal-translations-varchar-value' AS id, 'sitmun' AS author, 'changelog/17_literal_translations_varchar.sql' AS filename FROM dual
    UNION ALL
    SELECT '18-seed-mia-chrome-no-data-oracle' AS id, 'sitmun' AS author, 'changelog/18_mia_chrome_literals.sql' AS filename FROM dual
    UNION ALL
    SELECT '18-seed-mia-chrome-error-executing-task-oracle' AS id, 'sitmun' AS author, 'changelog/18_mia_chrome_literals.sql' AS filename FROM dual
    UNION ALL
    SELECT '18-seed-mia-chrome-query-oracle' AS id, 'sitmun' AS author, 'changelog/18_mia_chrome_literals.sql' AS filename FROM dual
    UNION ALL
    SELECT '18-seed-mia-chrome-invalid-child-task-id-oracle' AS id, 'sitmun' AS author, 'changelog/18_mia_chrome_literals.sql' AS filename FROM dual
    UNION ALL
    SELECT '18-seed-mia-chrome-task-not-executed-oracle' AS id, 'sitmun' AS author, 'changelog/18_mia_chrome_literals.sql' AS filename FROM dual
    UNION ALL
    SELECT '18-seed-mia-chrome-binary-access-message-oracle' AS id, 'sitmun' AS author, 'changelog/18_mia_chrome_literals.sql' AS filename FROM dual
    UNION ALL
    SELECT '18-seed-mia-chrome-binary-placeholder-oracle' AS id, 'sitmun' AS author, 'changelog/18_mia_chrome_literals.sql' AS filename FROM dual
    UNION ALL
    SELECT '19-add-tno-default-oracle' AS id, 'sitmun' AS author, 'changelog/19_add_tree_node_default.yaml' AS filename FROM dual
    UNION ALL
    SELECT '20_application_tree_order_oracle' AS id, 'sitmun' AS author, 'changelog/20_application_tree_order.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-bac-name-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-pap-name-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-fgi-valuetype-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-geo-type-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-ggi-type-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-pse-name-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-ser-protocol-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-sgi-lurl-format-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-stm-log-fk-appid-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-stm-log-fk-giid-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-stm-log-fk-taskid-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-stm-log-fk-terid-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-stm-log-fk-userid-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-pgi-type-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '23_document_export_tasks' AS id, 'sitmun' AS author, 'changelog/23_add_document_export_tasks.yaml' AS filename FROM dual
    UNION ALL
    SELECT '24_default_template_regions' AS id, 'sitmun' AS author, 'changelog/24_add_default_template_regions.yaml' AS filename FROM dual
    UNION ALL
    SELECT '26_document_export_task_type' AS id, 'sitmun' AS author, 'changelog/26_map_image_task_type_pre23.yaml' AS filename FROM dual
    UNION ALL
    SELECT '26_map_image_task_type' AS id, 'sitmun' AS author, 'changelog/26_map_image_task_type_pre23.yaml' AS filename FROM dual
    UNION ALL
    SELECT '26b_map_image_task_type_seq' AS id, 'sitmun' AS author, 'changelog/26_map_image_task_type_pre23.yaml' AS filename FROM dual
    UNION ALL
    SELECT '26c_document_export_codelists' AS id, 'sitmun' AS author, 'changelog/26_map_image_task_type_pre23.yaml' AS filename FROM dual
    ) required
    WHERE required.id = d.id
      AND required.author = d.author
      AND required.filename = d.filename
  );
  IF present_23 = 52 OR present_pre23 = 52 THEN
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
    RETURN;
  END IF;
  SELECT COUNT(*) INTO known
  FROM databasechangelog d
  WHERE EXISTS (
    SELECT 1 FROM (
    SELECT '1' AS id, 'sitmun' AS author, 'changelog/01_schema.oracle.sql' AS filename FROM dual
    UNION ALL
    SELECT '25-fix-auth-mode-swap' AS id, 'sitmun' AS author, 'changelog/25_fix_auth_mode_swap.yaml' AS filename FROM dual
    UNION ALL
    SELECT '2' AS id, 'sitmun' AS author, 'changelog/02_codelists.yaml' AS filename FROM dual
    UNION ALL
    SELECT '3' AS id, 'sitmun' AS author, 'changelog/03_task_types.yaml' AS filename FROM dual
    UNION ALL
    SELECT '4' AS id, 'sitmun' AS author, 'changelog/04_seed_data.yaml' AS filename FROM dual
    UNION ALL
    SELECT '5' AS id, 'sitmun' AS author, 'changelog/05_translations.yaml' AS filename FROM dual
    UNION ALL
    SELECT '6' AS id, 'sitmun' AS author, 'changelog/06_params.yaml' AS filename FROM dual
    UNION ALL
    SELECT '7' AS id, 'sitmun' AS author, 'changelog/07_sequences.yaml' AS filename FROM dual
    UNION ALL
    SELECT '08-application-responsible-institution' AS id, 'sitmun' AS author, 'changelog/08_application_responsible_institution.sql' AS filename FROM dual
    UNION ALL
    SELECT '09_language_order_column' AS id, 'sitmun' AS author, 'changelog/09_language_order_enabled_and_labels.yaml' AS filename FROM dual
    UNION ALL
    SELECT '09_language_order_and_labels' AS id, 'sitmun' AS author, 'changelog/09_language_order_enabled_and_labels.yaml' AS filename FROM dual
    UNION ALL
    SELECT '10_language_enabled_column' AS id, 'sitmun' AS author, 'changelog/09_language_order_enabled_and_labels.yaml' AS filename FROM dual
    UNION ALL
    SELECT '10_language_enabled_backfill' AS id, 'sitmun' AS author, 'changelog/09_language_order_enabled_and_labels.yaml' AS filename FROM dual
    UNION ALL
    SELECT '10_template_task_type' AS id, 'sitmun' AS author, 'changelog/10_add_template_task_type.yaml' AS filename FROM dual
    UNION ALL
    SELECT '11_template_reference_alias' AS id, 'sitmun' AS author, 'changelog/11_add_template_reference_alias.yaml' AS filename FROM dual
    UNION ALL
    SELECT '11b_template_reference_alias_uk' AS id, 'sitmun' AS author, 'changelog/11_add_template_reference_alias.yaml' AS filename FROM dual
    UNION ALL
    SELECT '12_more_info_advanced_ui_control' AS id, 'sitmun' AS author, 'changelog/12_add_more_info_advanced_ui_control.yaml' AS filename FROM dual
    UNION ALL
    SELECT '13_more_info_advanced_task_type' AS id, 'sitmun' AS author, 'changelog/13_add_more_info_advanced_task_type.yaml' AS filename FROM dual
    UNION ALL
    SELECT '14' AS id, 'sitmun' AS author, 'changelog/14_add_literal_translations.sql' AS filename FROM dual
    UNION ALL
    SELECT '15' AS id, 'sitmun' AS author, 'changelog/15_add_literal_translation_source_language.sql' AS filename FROM dual
    UNION ALL
    SELECT '16' AS id, 'sitmun' AS author, 'changelog/16_add_translation_sequences.sql' AS filename FROM dual
    UNION ALL
    SELECT '17-literal-translations-varchar-literal' AS id, 'sitmun' AS author, 'changelog/17_literal_translations_varchar.sql' AS filename FROM dual
    UNION ALL
    SELECT '17-literal-translations-varchar-value' AS id, 'sitmun' AS author, 'changelog/17_literal_translations_varchar.sql' AS filename FROM dual
    UNION ALL
    SELECT '18-seed-mia-chrome-no-data-oracle' AS id, 'sitmun' AS author, 'changelog/18_mia_chrome_literals.sql' AS filename FROM dual
    UNION ALL
    SELECT '18-seed-mia-chrome-error-executing-task-oracle' AS id, 'sitmun' AS author, 'changelog/18_mia_chrome_literals.sql' AS filename FROM dual
    UNION ALL
    SELECT '18-seed-mia-chrome-query-oracle' AS id, 'sitmun' AS author, 'changelog/18_mia_chrome_literals.sql' AS filename FROM dual
    UNION ALL
    SELECT '18-seed-mia-chrome-invalid-child-task-id-oracle' AS id, 'sitmun' AS author, 'changelog/18_mia_chrome_literals.sql' AS filename FROM dual
    UNION ALL
    SELECT '18-seed-mia-chrome-task-not-executed-oracle' AS id, 'sitmun' AS author, 'changelog/18_mia_chrome_literals.sql' AS filename FROM dual
    UNION ALL
    SELECT '18-seed-mia-chrome-binary-access-message-oracle' AS id, 'sitmun' AS author, 'changelog/18_mia_chrome_literals.sql' AS filename FROM dual
    UNION ALL
    SELECT '18-seed-mia-chrome-binary-placeholder-oracle' AS id, 'sitmun' AS author, 'changelog/18_mia_chrome_literals.sql' AS filename FROM dual
    UNION ALL
    SELECT '19-add-tno-default-oracle' AS id, 'sitmun' AS author, 'changelog/19_add_tree_node_default.yaml' AS filename FROM dual
    UNION ALL
    SELECT '20_application_tree_order_oracle' AS id, 'sitmun' AS author, 'changelog/20_application_tree_order.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-bac-name-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-pap-name-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-fgi-valuetype-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-geo-type-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-ggi-type-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-pse-name-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-ser-protocol-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-sgi-lurl-format-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-stm-log-fk-appid-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-stm-log-fk-giid-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-stm-log-fk-taskid-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-stm-log-fk-terid-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-stm-log-fk-userid-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '21-align-pgi-type-oracle' AS id, 'sitmun' AS author, 'changelog/21_align_schema_with_development.yaml' AS filename FROM dual
    UNION ALL
    SELECT '22_document_export_task_type' AS id, 'sitmun' AS author, 'changelog/22_add_map_image_task_type.yaml' AS filename FROM dual
    UNION ALL
    SELECT '22_map_image_task_type' AS id, 'sitmun' AS author, 'changelog/22_add_map_image_task_type.yaml' AS filename FROM dual
    UNION ALL
    SELECT '22b_map_image_task_type_seq' AS id, 'sitmun' AS author, 'changelog/22_add_map_image_task_type.yaml' AS filename FROM dual
    UNION ALL
    SELECT '22c_document_export_codelists' AS id, 'sitmun' AS author, 'changelog/22_add_map_image_task_type.yaml' AS filename FROM dual
    UNION ALL
    SELECT '23_document_export_tasks' AS id, 'sitmun' AS author, 'changelog/23_add_document_export_tasks.yaml' AS filename FROM dual
    UNION ALL
    SELECT '24_default_template_regions' AS id, 'sitmun' AS author, 'changelog/24_add_default_template_regions.yaml' AS filename FROM dual
    UNION ALL
    SELECT '26_document_export_task_type' AS id, 'sitmun' AS author, 'changelog/26_map_image_task_type_pre23.yaml' AS filename FROM dual
    UNION ALL
    SELECT '26_map_image_task_type' AS id, 'sitmun' AS author, 'changelog/26_map_image_task_type_pre23.yaml' AS filename FROM dual
    UNION ALL
    SELECT '26b_map_image_task_type_seq' AS id, 'sitmun' AS author, 'changelog/26_map_image_task_type_pre23.yaml' AS filename FROM dual
    UNION ALL
    SELECT '26c_document_export_codelists' AS id, 'sitmun' AS author, 'changelog/26_map_image_task_type_pre23.yaml' AS filename FROM dual
    ) required
    WHERE required.id = d.id
      AND required.author = d.author
      AND required.filename = d.filename
  );
  IF known = 0 THEN
    SELECT COUNT(*) INTO app_exists FROM user_tables WHERE table_name = 'STM_APP';
    IF app_exists > 0 THEN
      RAISE_APPLICATION_ERROR(-20001, 'upgrade to 1.2.9 first');
    END IF;
    RETURN;
  END IF;
  RAISE_APPLICATION_ERROR(-20001, 'upgrade to 1.2.9 first');
END;
