ALTER TABLE stm_par_gi ADD (pgi_options CLOB);

CREATE TABLE stm_par_gs (
    gs_id NUMBER(10, 0) NOT NULL,
    gs_geoid NUMBER(10, 0) NOT NULL,
    gs_name VARCHAR2(50 CHAR) NOT NULL,
    gs_value VARCHAR2(250 CHAR),
    gs_type VARCHAR2(50 CHAR) NOT NULL
);

ALTER TABLE stm_par_gs
    ADD CONSTRAINT stm_gs_pk PRIMARY KEY (gs_id);

ALTER TABLE stm_par_gs
    ADD CONSTRAINT stm_gs_fk_geo FOREIGN KEY (gs_geoid) REFERENCES stm_geoinfo(geo_id) ON DELETE CASCADE;

CREATE TABLE stm_service_check (
    sec_id NUMBER(10, 0) NOT NULL,
    sec_serid NUMBER(10, 0) NOT NULL,
    sec_observer VARCHAR2(16 CHAR) NOT NULL,
    sec_status VARCHAR2(50 CHAR) NOT NULL,
    sec_rank NUMBER(10, 0) NOT NULL,
    sec_observed TIMESTAMP NOT NULL,
    sec_elapsed NUMBER(19, 0) NOT NULL,
    sec_detail VARCHAR2(4000 CHAR)
);

ALTER TABLE stm_service_check
    ADD CONSTRAINT stm_sec_pk PRIMARY KEY (sec_id);

ALTER TABLE stm_service_check
    ADD CONSTRAINT stm_sec_uk UNIQUE (sec_serid, sec_observer);

ALTER TABLE stm_service_check
    ADD CONSTRAINT stm_sec_fk_ser FOREIGN KEY (sec_serid) REFERENCES stm_service(ser_id) ON DELETE CASCADE;

CREATE TABLE stm_service_check_sample (
    scs_id NUMBER(10, 0) NOT NULL,
    scs_serid NUMBER(10, 0) NOT NULL,
    scs_observer VARCHAR2(16 CHAR) NOT NULL,
    scs_status VARCHAR2(50 CHAR) NOT NULL,
    scs_rank NUMBER(10, 0) NOT NULL,
    scs_elapsed NUMBER(19, 0) NOT NULL,
    scs_observed TIMESTAMP NOT NULL
);

ALTER TABLE stm_service_check_sample
    ADD CONSTRAINT stm_scs_pk PRIMARY KEY (scs_id);

ALTER TABLE stm_service_check_sample
    ADD CONSTRAINT stm_scs_fk_ser FOREIGN KEY (scs_serid) REFERENCES stm_service(ser_id) ON DELETE CASCADE;

CREATE INDEX stm_scs_ix_ser_obs ON stm_service_check_sample (scs_serid, scs_observed);

CREATE TABLE stm_service_usage (
    sus_serid NUMBER(10, 0) NOT NULL,
    sus_appid NUMBER(10, 0) NOT NULL,
    sus_day date NOT NULL,
    sus_operation VARCHAR2(32 CHAR) NOT NULL,
    sus_requests NUMBER(19, 0) NOT NULL,
    sus_failed NUMBER(19, 0) NOT NULL
);

ALTER TABLE stm_service_usage
    ADD CONSTRAINT stm_sus_pk PRIMARY KEY (sus_serid, sus_appid, sus_day, sus_operation);

ALTER TABLE stm_service_usage
    ADD CONSTRAINT stm_sus_fk_app FOREIGN KEY (sus_appid) REFERENCES stm_app(app_id) ON DELETE CASCADE;

ALTER TABLE stm_service_usage
    ADD CONSTRAINT stm_sus_fk_ser FOREIGN KEY (sus_serid) REFERENCES stm_service(ser_id) ON DELETE CASCADE;

UPDATE stm_tree_nod SET tno_active = 1 WHERE tno_active IS NULL;

DELETE FROM stm_literal_translation_value extra
WHERE EXISTS (
    SELECT 1
    FROM stm_literal_translation dup
    WHERE dup.ltr_id = extra.ltv_ltrid
      AND EXISTS (
        SELECT 1
        FROM stm_literal_translation earlier
        WHERE earlier.ltr_literal = dup.ltr_literal
          AND earlier.ltr_id < dup.ltr_id
          AND EXISTS (
            SELECT 1
            FROM stm_literal_translation_value kept
            WHERE kept.ltv_ltrid = earlier.ltr_id
              AND kept.ltv_lanid = extra.ltv_lanid
          )
      )
);

UPDATE stm_literal_translation_value extra
SET ltv_ltrid = (
    SELECT MIN(keeper.ltr_id)
    FROM stm_literal_translation keeper
    WHERE keeper.ltr_literal = (
        SELECT dup.ltr_literal
        FROM stm_literal_translation dup
        WHERE dup.ltr_id = extra.ltv_ltrid
    )
)
WHERE EXISTS (
    SELECT 1
    FROM stm_literal_translation dup
    WHERE dup.ltr_id = extra.ltv_ltrid
      AND dup.ltr_id > (
        SELECT MIN(keeper.ltr_id)
        FROM stm_literal_translation keeper
        WHERE keeper.ltr_literal = dup.ltr_literal
      )
);

DELETE FROM stm_literal_translation dup
WHERE dup.ltr_id > (
    SELECT MIN(keeper.ltr_id)
    FROM stm_literal_translation keeper
    WHERE keeper.ltr_literal = dup.ltr_literal
);

CREATE UNIQUE INDEX stm_ltr_literal_uk ON stm_literal_translation (ORA_HASH(ltr_literal), LENGTH(ltr_literal), SUBSTR(ltr_literal, 1, 1000));

UPDATE stm_app SET app_name = TO_CHAR(app_id) WHERE app_name IS NULL;

ALTER TABLE stm_app MODIFY (app_name NOT NULL);

DELETE FROM stm_avail_gi WHERE agi_giid IS NULL OR agi_terid IS NULL;

ALTER TABLE stm_avail_gi MODIFY (agi_giid NOT NULL);

ALTER TABLE stm_avail_gi MODIFY (agi_terid NOT NULL);

UPDATE stm_codelist SET cod_description = cod_value WHERE cod_description IS NULL;

ALTER TABLE stm_codelist MODIFY (cod_description NOT NULL);

ALTER TABLE stm_language MODIFY (lan_order NUMBER(10, 0));

ALTER TABLE stm_par_ser MODIFY (pse_type NULL);

UPDATE stm_par_ser SET pse_value = '-' WHERE pse_value IS NULL;

ALTER TABLE stm_par_ser MODIFY (pse_value NOT NULL);

ALTER TABLE stm_token_user MODIFY (active NUMBER(1, 0));

UPDATE stm_tree_nod SET tno_load_data = 0 WHERE tno_load_data IS NULL;

ALTER TABLE stm_tree_nod MODIFY (tno_load_data DEFAULT 0 NOT NULL);

ALTER TABLE stm_tree_nod MODIFY (tno_taskid NUMBER(10, 0));

ALTER TABLE stm_rol_ggi DROP CONSTRAINT stm_rgg_fk_ggi;

ALTER TABLE stm_rol_ggi ADD CONSTRAINT stm_rgg_fk_ggi FOREIGN KEY (rgg_ggiid) REFERENCES stm_grp_gi (ggi_id) ON DELETE CASCADE;

ALTER TABLE stm_rol_ggi DROP CONSTRAINT stm_rgg_fk_rol;

ALTER TABLE stm_rol_ggi ADD CONSTRAINT stm_rgg_fk_rol FOREIGN KEY (rgg_roleid) REFERENCES stm_role (rol_id) ON DELETE CASCADE;

ALTER TABLE stm_rol_tsk DROP CONSTRAINT stm_rts_fk_rol;

ALTER TABLE stm_rol_tsk ADD CONSTRAINT stm_rts_fk_rol FOREIGN KEY (rts_roleid) REFERENCES stm_role (rol_id) ON DELETE CASCADE;

ALTER TABLE stm_rol_tsk DROP CONSTRAINT stm_rts_fk_tas;

ALTER TABLE stm_rol_tsk ADD CONSTRAINT stm_rts_fk_tas FOREIGN KEY (rts_taskid) REFERENCES stm_task (tas_id) ON DELETE CASCADE;

ALTER TABLE stm_ggi_gi DROP PRIMARY KEY DROP INDEX;

ALTER TABLE stm_ggi_gi ADD CONSTRAINT stm_ggi_gi_pkey PRIMARY KEY (ggg_ggiid, ggg_giid);

ALTER TABLE stm_app_bckg RENAME CONSTRAINT stm_abc_uk TO stm_apf_uk;

ALTER TABLE stm_usr_conf RENAME CONSTRAINT stm_uco_fk_use TO stm_uco_fk_usu;

ALTER TABLE stm_role RENAME CONSTRAINT stm_rol_name_pk TO stm_rol_name_uk;

ALTER TABLE stm_token_user MODIFY (code_otp VARCHAR2(255 CHAR));

ALTER TABLE stm_tree MODIFY (tre_image_name VARCHAR2(255 CHAR));

ALTER TABLE stm_tree_nod MODIFY (tno_style VARCHAR2(255 CHAR));

ALTER TABLE stm_tree_nod MODIFY (tno_view_mode VARCHAR2(255 CHAR));

ALTER TABLE stm_user MODIFY (use_email VARCHAR2(250 CHAR));

ALTER TABLE stm_geoinfo ADD CONSTRAINT stm_geo_uk_styid UNIQUE (geo_styid);
