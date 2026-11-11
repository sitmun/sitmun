-- Renumber sample task 32306 (More Info Advanced) to 37 before the sequence counters read MAX(tas_id). Skip when 37 is already a different task.
INSERT INTO stm_task (tas_id, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params)
SELECT 37, tas_name, tas_created, tas_order, tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params
FROM stm_task
WHERE tas_id = 32306
  AND NOT EXISTS (SELECT 1 FROM stm_task WHERE tas_id = 37);
UPDATE stm_avail_tsk SET ats_taskid = 37 WHERE ats_taskid = 32306 AND EXISTS (SELECT 1 FROM stm_task WHERE tas_id = 37 AND tas_name = 'More Info Advanced');
UPDATE stm_log SET log_taskid = 37 WHERE log_taskid = 32306 AND EXISTS (SELECT 1 FROM stm_task WHERE tas_id = 37 AND tas_name = 'More Info Advanced');
UPDATE stm_rol_tsk SET rts_taskid = 37 WHERE rts_taskid = 32306 AND EXISTS (SELECT 1 FROM stm_task WHERE tas_id = 37 AND tas_name = 'More Info Advanced');
UPDATE stm_taskrel SET tar_taskid = 37 WHERE tar_taskid = 32306 AND EXISTS (SELECT 1 FROM stm_task WHERE tas_id = 37 AND tas_name = 'More Info Advanced');
UPDATE stm_taskrel SET tar_taskrelid = 37 WHERE tar_taskrelid = 32306 AND EXISTS (SELECT 1 FROM stm_task WHERE tas_id = 37 AND tas_name = 'More Info Advanced');
UPDATE stm_tree_nod SET tno_taskid = 37 WHERE tno_taskid = 32306 AND EXISTS (SELECT 1 FROM stm_task WHERE tas_id = 37 AND tas_name = 'More Info Advanced');
DELETE FROM stm_translation
WHERE tra_eleid = 32306
  AND tra_column LIKE 'Task.%'
  AND EXISTS (SELECT 1 FROM stm_task WHERE tas_id = 37 AND tas_name = 'More Info Advanced')
  AND EXISTS (
    SELECT 1 FROM stm_translation kept
    WHERE kept.tra_eleid = 37
      AND kept.tra_column = stm_translation.tra_column
      AND kept.tra_lanid = stm_translation.tra_lanid
  );
UPDATE stm_translation SET tra_eleid = 37
WHERE tra_eleid = 32306
  AND tra_column LIKE 'Task.%'
  AND EXISTS (SELECT 1 FROM stm_task WHERE tas_id = 37 AND tas_name = 'More Info Advanced');
DELETE FROM stm_task
WHERE tas_id = 32306
  AND EXISTS (SELECT 1 FROM stm_task kept WHERE kept.tas_id = 37 AND kept.tas_name = 'More Info Advanced');
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'ABC_ID', COALESCE((SELECT MAX(abc_id) FROM stm_app_bckg), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'ABC_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(abc_id) FROM stm_app_bckg), 0) + 1) WHERE seq_name = 'ABC_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'AGI_ID', COALESCE((SELECT MAX(agi_id) FROM stm_avail_gi), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'AGI_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(agi_id) FROM stm_avail_gi), 0) + 1) WHERE seq_name = 'AGI_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'APP_ID', COALESCE((SELECT MAX(app_id) FROM stm_app), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'APP_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(app_id) FROM stm_app), 0) + 1) WHERE seq_name = 'APP_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'ATE_ID', COALESCE((SELECT MAX(ate_id) FROM stm_app_ter), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'ATE_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(ate_id) FROM stm_app_ter), 0) + 1) WHERE seq_name = 'ATE_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'ATR_ID', COALESCE((SELECT MAX(atr_id) FROM stm_app_tree), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'ATR_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(atr_id) FROM stm_app_tree), 0) + 1) WHERE seq_name = 'ATR_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'ATS_ID', COALESCE((SELECT MAX(ats_id) FROM stm_avail_tsk), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'ATS_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(ats_id) FROM stm_avail_tsk), 0) + 1) WHERE seq_name = 'ATS_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'BAC_ID', COALESCE((SELECT MAX(bac_id) FROM stm_backgrd), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'BAC_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(bac_id) FROM stm_backgrd), 0) + 1) WHERE seq_name = 'BAC_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'CNF_ID', COALESCE((SELECT MAX(cnf_id) FROM stm_conf), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'CNF_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(cnf_id) FROM stm_conf), 0) + 1) WHERE seq_name = 'CNF_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'COD_ID', COALESCE((SELECT MAX(cod_id) FROM stm_codelist), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'COD_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(cod_id) FROM stm_codelist), 0) + 1) WHERE seq_name = 'COD_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'COM_ID', COALESCE((SELECT MAX(com_id) FROM stm_comment), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'COM_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(com_id) FROM stm_comment), 0) + 1) WHERE seq_name = 'COM_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'CON_ID', COALESCE((SELECT MAX(con_id) FROM stm_connect), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'CON_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(con_id) FROM stm_connect), 0) + 1) WHERE seq_name = 'CON_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'FGI_ID', COALESCE((SELECT MAX(fgi_id) FROM stm_fil_gi), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'FGI_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(fgi_id) FROM stm_fil_gi), 0) + 1) WHERE seq_name = 'FGI_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'GEO_ID', COALESCE((SELECT MAX(geo_id) FROM stm_geoinfo), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'GEO_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(geo_id) FROM stm_geoinfo), 0) + 1) WHERE seq_name = 'GEO_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'GGI_ID', COALESCE((SELECT MAX(ggi_id) FROM stm_grp_gi), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'GGI_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(ggi_id) FROM stm_grp_gi), 0) + 1) WHERE seq_name = 'GGI_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'GS_ID', COALESCE((SELECT MAX(gs_id) FROM stm_par_gs), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'GS_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(gs_id) FROM stm_par_gs), 0) + 1) WHERE seq_name = 'GS_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'GTS_ID', COALESCE((SELECT MAX(gts_id) FROM stm_grp_tsk), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'GTS_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(gts_id) FROM stm_grp_tsk), 0) + 1) WHERE seq_name = 'GTS_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'GTT_ID', COALESCE((SELECT MAX(gtt_id) FROM stm_gter_typ), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'GTT_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(gtt_id) FROM stm_gter_typ), 0) + 1) WHERE seq_name = 'GTT_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'LAN_ID', COALESCE((SELECT MAX(lan_id) FROM stm_language), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'LAN_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(lan_id) FROM stm_language), 0) + 1) WHERE seq_name = 'LAN_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'LOG_ID', COALESCE((SELECT MAX(log_id) FROM stm_log), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'LOG_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(log_id) FROM stm_log), 0) + 1) WHERE seq_name = 'LOG_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'LTR_ID', COALESCE((SELECT MAX(ltr_id) FROM stm_literal_translation), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'LTR_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(ltr_id) FROM stm_literal_translation), 0) + 1) WHERE seq_name = 'LTR_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'LTV_ID', COALESCE((SELECT MAX(ltv_id) FROM stm_literal_translation_value), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'LTV_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(ltv_id) FROM stm_literal_translation_value), 0) + 1) WHERE seq_name = 'LTV_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'PAP_ID', COALESCE((SELECT MAX(pap_id) FROM stm_par_app), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'PAP_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(pap_id) FROM stm_par_app), 0) + 1) WHERE seq_name = 'PAP_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'PGI_ID', COALESCE((SELECT MAX(pgi_id) FROM stm_par_gi), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'PGI_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(pgi_id) FROM stm_par_gi), 0) + 1) WHERE seq_name = 'PGI_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'POS_ID', COALESCE((SELECT MAX(pos_id) FROM stm_post), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'POS_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(pos_id) FROM stm_post), 0) + 1) WHERE seq_name = 'POS_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'PSE_ID', COALESCE((SELECT MAX(pse_id) FROM stm_par_ser), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'PSE_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(pse_id) FROM stm_par_ser), 0) + 1) WHERE seq_name = 'PSE_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'PSG_ID', COALESCE((SELECT MAX(psg_id) FROM stm_par_sgi), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'PSG_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(psg_id) FROM stm_par_sgi), 0) + 1) WHERE seq_name = 'PSG_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'ROL_ID', COALESCE((SELECT MAX(rol_id) FROM stm_role), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'ROL_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(rol_id) FROM stm_role), 0) + 1) WHERE seq_name = 'ROL_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'SCS_ID', COALESCE((SELECT MAX(scs_id) FROM stm_service_check_sample), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'SCS_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(scs_id) FROM stm_service_check_sample), 0) + 1) WHERE seq_name = 'SCS_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'SEC_ID', COALESCE((SELECT MAX(sec_id) FROM stm_service_check), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'SEC_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(sec_id) FROM stm_service_check), 0) + 1) WHERE seq_name = 'SEC_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'SER_ID', COALESCE((SELECT MAX(ser_id) FROM stm_service), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'SER_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(ser_id) FROM stm_service), 0) + 1) WHERE seq_name = 'SER_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'SGI_ID', COALESCE((SELECT MAX(sgi_id) FROM stm_sty_gi), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'SGI_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(sgi_id) FROM stm_sty_gi), 0) + 1) WHERE seq_name = 'SGI_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'TAR_ID', COALESCE((SELECT MAX(tar_id) FROM stm_taskrel), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'TAR_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(tar_id) FROM stm_taskrel), 0) + 1) WHERE seq_name = 'TAR_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'TAS_ID', COALESCE((SELECT MAX(tas_id) FROM stm_task), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'TAS_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(tas_id) FROM stm_task), 0) + 1) WHERE seq_name = 'TAS_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'TER_ID', COALESCE((SELECT MAX(ter_id) FROM stm_territory), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'TER_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(ter_id) FROM stm_territory), 0) + 1) WHERE seq_name = 'TER_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'TET_ID', COALESCE((SELECT MAX(tet_id) FROM stm_ter_typ), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'TET_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(tet_id) FROM stm_ter_typ), 0) + 1) WHERE seq_name = 'TET_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'TNO_ID', COALESCE((SELECT MAX(tno_id) FROM stm_tree_nod), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'TNO_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(tno_id) FROM stm_tree_nod), 0) + 1) WHERE seq_name = 'TNO_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'TRA_ID', COALESCE((SELECT MAX(tra_id) FROM stm_translation), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'TRA_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(tra_id) FROM stm_translation), 0) + 1) WHERE seq_name = 'TRA_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'TRE_ID', COALESCE((SELECT MAX(tre_id) FROM stm_tree), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'TRE_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(tre_id) FROM stm_tree), 0) + 1) WHERE seq_name = 'TRE_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'TUI_ID', COALESCE((SELECT MAX(tui_id) FROM stm_tsk_ui), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'TUI_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(tui_id) FROM stm_tsk_ui), 0) + 1) WHERE seq_name = 'TUI_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'TTY_ID', COALESCE((SELECT MAX(tty_id) FROM stm_tsk_typ), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'TTY_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(tty_id) FROM stm_tsk_typ), 0) + 1) WHERE seq_name = 'TTY_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'UCO_ID', COALESCE((SELECT MAX(uco_id) FROM stm_usr_conf), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'UCO_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(uco_id) FROM stm_usr_conf), 0) + 1) WHERE seq_name = 'UCO_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'USE_ID', COALESCE((SELECT MAX(use_id) FROM stm_user), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'USE_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(use_id) FROM stm_user), 0) + 1) WHERE seq_name = 'USE_ID';
INSERT INTO stm_sequence (seq_name, seq_count) SELECT 'USER_TOKEN_ID', COALESCE((SELECT MAX(user_token_id) FROM stm_token_user), 0) + 1 WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'USER_TOKEN_ID');
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, COALESCE((SELECT MAX(user_token_id) FROM stm_token_user), 0) + 1) WHERE seq_name = 'USER_TOKEN_ID';
