--liquibase formatted sql

--changeset sitmun:upgrade-1.2.8-to-1.2.9-19-postgresql dbms:postgresql splitStatements:true endDelimiter:@sitmun-end stripComments:false
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:1 SELECT COUNT(*) FROM databasechangelog WHERE id = '1' AND filename = 'changelog/01_schema.postgresql.sql'
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM databasechangelog WHERE id = '19-add-tno-default-postgresql' AND author = 'sitmun' AND filename = 'changelog/19_add_tree_node_default.yaml'
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stm_tree_nod' AND column_name = 'tno_default'
ALTER TABLE stm_tree_nod ADD COLUMN tno_default boolean DEFAULT false NOT NULL
@sitmun-end

--changeset sitmun:upgrade-1.2.8-to-1.2.9-20-postgresql dbms:postgresql splitStatements:true endDelimiter:@sitmun-end stripComments:false
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:1 SELECT COUNT(*) FROM databasechangelog WHERE id = '1' AND filename = 'changelog/01_schema.postgresql.sql'
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM databasechangelog WHERE id = '20_application_tree_order_postgresql' AND author = 'sitmun' AND filename = 'changelog/20_application_tree_order.yaml'
DO $$
DECLARE
  pk_name text;
BEGIN
  ALTER TABLE stm_app_tree ADD COLUMN IF NOT EXISTS atr_id integer;
  ALTER TABLE stm_app_tree ADD COLUMN IF NOT EXISTS atr_order integer;
  UPDATE stm_app_tree SET atr_id = (
    SELECT new_id FROM (
      SELECT atr_appid, atr_treeid, ROW_NUMBER() OVER (ORDER BY atr_appid, atr_treeid) AS new_id
      FROM stm_app_tree
    ) numbered
    WHERE numbered.atr_appid = stm_app_tree.atr_appid AND numbered.atr_treeid = stm_app_tree.atr_treeid
  ) WHERE atr_id IS NULL;
  UPDATE stm_app_tree SET atr_order = 0 WHERE atr_order IS NULL;
  SELECT constraint_name INTO pk_name FROM information_schema.table_constraints
  WHERE table_schema = 'public' AND table_name = 'stm_app_tree' AND constraint_type = 'PRIMARY KEY';
  IF pk_name IS DISTINCT FROM 'stm_atr_pk' THEN
    EXECUTE 'ALTER TABLE stm_app_tree DROP CONSTRAINT ' || quote_ident(pk_name);
    ALTER TABLE stm_app_tree ALTER COLUMN atr_id SET NOT NULL;
    ALTER TABLE stm_app_tree ADD CONSTRAINT stm_atr_pk PRIMARY KEY (atr_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND constraint_name = 'stm_atr_uk'
  ) THEN
    ALTER TABLE stm_app_tree ADD CONSTRAINT stm_atr_uk UNIQUE (atr_appid, atr_treeid);
  END IF;
  UPDATE stm_sequence SET seq_count = GREATEST(seq_count, (SELECT COALESCE(MAX(atr_id), 0) + 1 FROM stm_app_tree))
  WHERE seq_name = 'ATR_ID';
  INSERT INTO stm_sequence (seq_name, seq_count)
  SELECT 'ATR_ID', COALESCE((SELECT MAX(atr_id) FROM stm_app_tree), 0) + 1
  WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'ATR_ID');
END $$;
@sitmun-end

--changeset sitmun:upgrade-1.2.8-to-1.2.9-21-postgresql dbms:postgresql splitStatements:true endDelimiter:@sitmun-end stripComments:false
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:1 SELECT COUNT(*) FROM databasechangelog WHERE id = '1' AND filename = 'changelog/01_schema.postgresql.sql'
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM databasechangelog WHERE id = '21-align-tet-name-postgresql' AND author = 'sitmun' AND filename = 'changelog/21_align_schema_with_development.yaml'
DO $$
DECLARE
  width integer;
  orphans integer;
BEGIN
  SELECT character_maximum_length INTO width FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stm_fil_gi' AND column_name = 'fgi_valuetype';
  IF width IS NOT NULL AND width < 50 THEN
    ALTER TABLE stm_fil_gi ALTER COLUMN fgi_valuetype TYPE varchar(50);
  END IF;
  SELECT character_maximum_length INTO width FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stm_geoinfo' AND column_name = 'geo_type';
  IF width IS NOT NULL AND width < 50 THEN
    ALTER TABLE stm_geoinfo ALTER COLUMN geo_type TYPE varchar(50);
  END IF;
  SELECT character_maximum_length INTO width FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stm_grp_gi' AND column_name = 'ggi_type';
  IF width IS NOT NULL AND width < 50 THEN
    ALTER TABLE stm_grp_gi ALTER COLUMN ggi_type TYPE varchar(50);
  END IF;
  SELECT character_maximum_length INTO width FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stm_par_ser' AND column_name = 'pse_name';
  IF width IS NOT NULL AND width < 50 THEN
    ALTER TABLE stm_par_ser ALTER COLUMN pse_name TYPE varchar(50);
  END IF;
  SELECT character_maximum_length INTO width FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stm_service' AND column_name = 'ser_protocol';
  IF width IS NOT NULL AND width < 50 THEN
    ALTER TABLE stm_service ALTER COLUMN ser_protocol TYPE varchar(50);
  END IF;
  SELECT character_maximum_length INTO width FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stm_sty_gi' AND column_name = 'sgi_lurl_format';
  IF width IS NOT NULL AND width < 255 THEN
    ALTER TABLE stm_sty_gi ALTER COLUMN sgi_lurl_format TYPE varchar(255);
  END IF;
  SELECT character_maximum_length INTO width FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stm_app' AND column_name = 'app_name';
  IF width IS NOT NULL AND width < 80 THEN
    ALTER TABLE stm_app ALTER COLUMN app_name TYPE varchar(80);
  END IF;
  SELECT character_maximum_length INTO width FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stm_app' AND column_name = 'app_project';
  IF width IS NOT NULL AND width < 250 THEN
    ALTER TABLE stm_app ALTER COLUMN app_project TYPE varchar(250);
  END IF;
  SELECT character_maximum_length INTO width FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stm_app' AND column_name = 'app_type';
  IF width IS NOT NULL AND width < 250 THEN
    ALTER TABLE stm_app ALTER COLUMN app_type TYPE varchar(250);
  END IF;
  SELECT character_maximum_length INTO width FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stm_geoinfo' AND column_name = 'geo_source';
  IF width IS NOT NULL AND width < 80 THEN
    ALTER TABLE stm_geoinfo ALTER COLUMN geo_source TYPE varchar(80);
  END IF;
  SELECT character_maximum_length INTO width FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stm_ter_typ' AND column_name = 'tet_name';
  IF width IS NOT NULL AND width < 250 THEN
    ALTER TABLE stm_ter_typ ALTER COLUMN tet_name TYPE varchar(250);
  END IF;
  SELECT COUNT(*) INTO orphans FROM stm_log child WHERE child.log_appid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM stm_app parent WHERE parent.app_id = child.log_appid);
  IF orphans > 0 THEN
    RAISE EXCEPTION 'STM_LOG orphan count %', orphans;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND constraint_name = 'stm_log_fk_appid') THEN
    ALTER TABLE stm_log ADD CONSTRAINT stm_log_fk_appid FOREIGN KEY (log_appid) REFERENCES stm_app (app_id);
  END IF;
  SELECT COUNT(*) INTO orphans FROM stm_log child WHERE child.log_giid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM stm_geoinfo parent WHERE parent.geo_id = child.log_giid);
  IF orphans > 0 THEN
    RAISE EXCEPTION 'STM_LOG orphan count %', orphans;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND constraint_name = 'stm_log_fk_giid') THEN
    ALTER TABLE stm_log ADD CONSTRAINT stm_log_fk_giid FOREIGN KEY (log_giid) REFERENCES stm_geoinfo (geo_id);
  END IF;
  SELECT COUNT(*) INTO orphans FROM stm_log child WHERE child.log_taskid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM stm_task parent WHERE parent.tas_id = child.log_taskid);
  IF orphans > 0 THEN
    RAISE EXCEPTION 'STM_LOG orphan count %', orphans;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND constraint_name = 'stm_log_fk_taskid') THEN
    ALTER TABLE stm_log ADD CONSTRAINT stm_log_fk_taskid FOREIGN KEY (log_taskid) REFERENCES stm_task (tas_id);
  END IF;
  SELECT COUNT(*) INTO orphans FROM stm_log child WHERE child.log_terid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM stm_territory parent WHERE parent.ter_id = child.log_terid);
  IF orphans > 0 THEN
    RAISE EXCEPTION 'STM_LOG orphan count %', orphans;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND constraint_name = 'stm_log_fk_terid') THEN
    ALTER TABLE stm_log ADD CONSTRAINT stm_log_fk_terid FOREIGN KEY (log_terid) REFERENCES stm_territory (ter_id);
  END IF;
  SELECT COUNT(*) INTO orphans FROM stm_log child WHERE child.log_userid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM stm_user parent WHERE parent.use_id = child.log_userid);
  IF orphans > 0 THEN
    RAISE EXCEPTION 'STM_LOG orphan count %', orphans;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND constraint_name = 'stm_log_fk_userid') THEN
    ALTER TABLE stm_log ADD CONSTRAINT stm_log_fk_userid FOREIGN KEY (log_userid) REFERENCES stm_user (use_id);
  END IF;
END $$;
@sitmun-end

--changeset sitmun:upgrade-1.2.8-to-1.2.9-22-postgresql dbms:postgresql splitStatements:true endDelimiter:@sitmun-end stripComments:false
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:1 SELECT COUNT(*) FROM databasechangelog WHERE id = '1' AND filename = 'changelog/01_schema.postgresql.sql'
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM databasechangelog WHERE id = '22_document_export_task_type' AND author = 'sitmun' AND filename = 'changelog/22_add_map_image_task_type.yaml'
INSERT INTO stm_tsk_typ (tty_id, tty_name, tty_title, tty_enabled, tty_parentid, tty_order, tty_spec) SELECT 17, 'documentExport', 'Document Export', true, NULL, 18, '{  "form": {    "label": "tasksEntity.generalData",    "elements": {      "type": {        "hidden": true,        "value": 17,        "required": true      },      "name": {        "label": "tasksEntity.name",        "control": "input",        "required": true      },      "group": {        "label": "tasksEntity.group",        "control": "selector",        "selector": {          "data": "taskGroup",          "name": "name",          "value": "id"        },        "required": true      },      "exportEngine": {        "label": "tasksDocumentExportEntity.engine",        "control": "selector",        "selector": {          "data": "codelist-values",          "queryParams": {            "codeListName": "documentExport.engine",            "projection": "view"          },          "name": "description",          "value": "value"        },        "required": true,        "jsonParams": true      },      "downloadFormat": {        "label": "tasksDocumentExportEntity.output",        "control": "selector",        "selector": {          "data": "codelist-values",          "queryParams": {            "codeListName": "documentExport.output",            "projection": "view"          },          "name": "description",          "value": "value"        },        "required": true,        "jsonParams": true      },      "downloadSource": {        "label": "tasksDocumentExportEntity.sourcePath",        "control": "input",        "required": false,        "jsonParams": true      }    }  }}' WHERE NOT EXISTS (SELECT 1 FROM stm_tsk_typ WHERE tty_id = 17)
@sitmun-end
INSERT INTO stm_tsk_typ (tty_id, tty_name, tty_title, tty_enabled, tty_parentid, tty_order, tty_spec) SELECT 18, 'mapImage', 'Map Image', true, NULL, 19, '{  "form": {    "label": "entity.task.mapImage.label",    "elements": {      "type": {        "hidden": true,        "value": 18,        "required": true      },      "name": {        "label": "tasksEntity.name",        "control": "input",        "required": true      },      "group": {        "label": "tasksEntity.group",        "control": "selector",        "selector": {          "data": "taskGroup",          "name": "name",          "value": "id"        },        "required": true      }    }  }}' WHERE NOT EXISTS (SELECT 1 FROM stm_tsk_typ WHERE tty_id = 18)
@sitmun-end

--changeset sitmun:upgrade-1.2.8-to-1.2.9-22b-postgresql dbms:postgresql splitStatements:true endDelimiter:@sitmun-end stripComments:false
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:1 SELECT COUNT(*) FROM databasechangelog WHERE id = '1' AND filename = 'changelog/01_schema.postgresql.sql'
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM databasechangelog WHERE id = '22b_map_image_task_type_seq' AND author = 'sitmun' AND filename = 'changelog/22_add_map_image_task_type.yaml'
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, (SELECT COALESCE(MAX(tty_id), 0) + 1 FROM stm_tsk_typ)) WHERE seq_name = 'TTY_ID'
@sitmun-end

--changeset sitmun:upgrade-1.2.8-to-1.2.9-23-postgresql dbms:postgresql splitStatements:true endDelimiter:@sitmun-end stripComments:false
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:1 SELECT COUNT(*) FROM databasechangelog WHERE id = '1' AND filename = 'changelog/01_schema.postgresql.sql'
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM databasechangelog WHERE id = '23_document_export_tasks' AND author = 'sitmun' AND filename = 'changelog/23_add_document_export_tasks.yaml'
INSERT INTO stm_task (tas_id, tas_name, tas_ttaskid, tas_tuiid, tas_params) SELECT next_id, 'Exportar PDF A4 Vertical', 17, 1, '{"exportEngine":"openhtmltopdf","downloadFormat":"pdf","pageSize":"A4","pageOrientation":"portrait"}' FROM (SELECT COALESCE(MAX(tas_id), 0) + 1 AS next_id FROM stm_task) ids WHERE NOT EXISTS (SELECT 1 FROM stm_task WHERE tas_name = 'Exportar PDF A4 Vertical' AND tas_ttaskid = 17)
@sitmun-end
INSERT INTO stm_task (tas_id, tas_name, tas_ttaskid, tas_tuiid, tas_params) SELECT next_id, 'Exportar PDF A3 Vertical', 17, 1, '{"exportEngine":"openhtmltopdf","downloadFormat":"pdf","pageSize":"A3","pageOrientation":"portrait"}' FROM (SELECT COALESCE(MAX(tas_id), 0) + 1 AS next_id FROM stm_task) ids WHERE NOT EXISTS (SELECT 1 FROM stm_task WHERE tas_name = 'Exportar PDF A3 Vertical' AND tas_ttaskid = 17)
@sitmun-end
INSERT INTO stm_task (tas_id, tas_name, tas_ttaskid, tas_tuiid, tas_params) SELECT next_id, 'Exportar PDF A4 Horitzontal', 17, 1, '{"exportEngine":"openhtmltopdf","downloadFormat":"pdf","pageSize":"A4","pageOrientation":"landscape"}' FROM (SELECT COALESCE(MAX(tas_id), 0) + 1 AS next_id FROM stm_task) ids WHERE NOT EXISTS (SELECT 1 FROM stm_task WHERE tas_name = 'Exportar PDF A4 Horitzontal' AND tas_ttaskid = 17)
@sitmun-end
INSERT INTO stm_task (tas_id, tas_name, tas_ttaskid, tas_tuiid, tas_params) SELECT next_id, 'Exportar PDF A3 Horitzontal', 17, 1, '{"exportEngine":"openhtmltopdf","downloadFormat":"pdf","pageSize":"A3","pageOrientation":"landscape"}' FROM (SELECT COALESCE(MAX(tas_id), 0) + 1 AS next_id FROM stm_task) ids WHERE NOT EXISTS (SELECT 1 FROM stm_task WHERE tas_name = 'Exportar PDF A3 Horitzontal' AND tas_ttaskid = 17)
@sitmun-end
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, (SELECT COALESCE(MAX(tas_id), 0) + 1 FROM stm_task)) WHERE seq_name = 'TAS_ID'
@sitmun-end

--changeset sitmun:upgrade-1.2.8-to-1.2.9-24-postgresql dbms:postgresql splitStatements:true endDelimiter:@sitmun-end stripComments:false
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:1 SELECT COUNT(*) FROM databasechangelog WHERE id = '1' AND filename = 'changelog/01_schema.postgresql.sql'
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM databasechangelog WHERE id = '24_default_template_regions' AND author = 'sitmun' AND filename = 'changelog/24_add_default_template_regions.yaml'
INSERT INTO stm_task (tas_id, tas_name, tas_gtaskid, tas_ttaskid, tas_params) SELECT next_id, 'Capçalera per defecte', 1, 15, '{"parameters":[],"templateHtml":"<table class=\"sitmun-pdf-header-full-bleed\" style=\"width:100%;background-color:#FF9300;border-collapse:collapse\"><tbody><tr><td style=\"width:33%;text-align:left\"><img src=\"data:image/png;base64,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\" alt=\"SITMUN\" style=\"max-width:180px\"></td><td style=\"width:34%;text-align:center\">Capçalera per defecte</td><td style=\"width:33%;text-align:right\">{{currentDate}}</td></tr></tbody></table>"}' FROM (SELECT COALESCE(MAX(tas_id), 0) + 1 AS next_id FROM stm_task) ids WHERE NOT EXISTS (SELECT 1 FROM stm_task WHERE tas_name = 'Capçalera per defecte' AND tas_ttaskid = 15)
@sitmun-end
INSERT INTO stm_task (tas_id, tas_name, tas_gtaskid, tas_ttaskid, tas_params) SELECT next_id, 'Peu de pàgina per defecte', 1, 15, '{"parameters":[],"templateHtml":"<table class=\"sitmun-pdf-footer-full-bleed\" style=\"width:100%;border-collapse:collapse\"><tbody><tr><td style=\"width:25%;text-align:left\">&nbsp;</td><td style=\"width:50%;text-align:center\">Peu de pàgina per defecte</td><td style=\"width:25%;text-align:right;padding-right:8mm\"><p class=\"sitmun-pdf-page-number\">&nbsp;</p></td></tr></tbody></table>"}' FROM (SELECT COALESCE(MAX(tas_id), 0) + 1 AS next_id FROM stm_task) ids WHERE NOT EXISTS (SELECT 1 FROM stm_task WHERE tas_name = 'Peu de pàgina per defecte' AND tas_ttaskid = 15)
@sitmun-end
UPDATE stm_sequence SET seq_count = GREATEST(seq_count, (SELECT COALESCE(MAX(tas_id), 0) + 1 FROM stm_task)) WHERE seq_name = 'TAS_ID'
@sitmun-end

--changeset sitmun:upgrade-1.2.8-to-1.2.9-25-postgresql dbms:postgresql splitStatements:true endDelimiter:@sitmun-end stripComments:false
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:1 SELECT COUNT(*) FROM databasechangelog WHERE id = '1' AND filename = 'changelog/01_schema.postgresql.sql'
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM databasechangelog WHERE id = '25-fix-auth-mode-swap' AND author = 'sitmun' AND filename = 'changelog/25_fix_auth_mode_swap.yaml'
UPDATE stm_codelist SET cod_value = '__sitmun_tmp_auth_mode__', cod_description = '__sitmun_tmp_auth_mode__' WHERE cod_id = 53 AND cod_list = 'service.authenticationMode' AND cod_value = 'None'
@sitmun-end
UPDATE stm_codelist SET cod_value = 'None', cod_description = 'None' WHERE cod_id = 54 AND cod_list = 'service.authenticationMode' AND cod_value = 'HTTP Basic authentication' AND EXISTS (SELECT 1 FROM stm_codelist t WHERE t.cod_id = 53 AND t.cod_list = 'service.authenticationMode' AND t.cod_value = '__sitmun_tmp_auth_mode__')
@sitmun-end
UPDATE stm_codelist SET cod_value = 'HTTP Basic authentication', cod_description = 'HTTP Basic authentication' WHERE cod_id = 53 AND cod_list = 'service.authenticationMode' AND cod_value = '__sitmun_tmp_auth_mode__'
@sitmun-end

--changeset sitmun:upgrade-1.2.8-to-1.2.9-admin-postgresql dbms:postgresql splitStatements:true endDelimiter:@sitmun-end stripComments:false
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:1 SELECT COUNT(*) FROM databasechangelog WHERE id = '1' AND filename = 'changelog/01_schema.postgresql.sql'
UPDATE stm_user SET use_user = 'admin' WHERE use_id = 1 AND use_user IS NULL
@sitmun-end
