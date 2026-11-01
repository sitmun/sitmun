CREATE TABLE stm_app (
    app_id NUMBER(10, 0) NOT NULL,
    app_name VARCHAR2(80 CHAR) NOT NULL,
    app_type VARCHAR2(250 CHAR),
    app_title VARCHAR2(250 CHAR),
    app_theme VARCHAR2(30 CHAR),
    app_logo VARCHAR2(4000 CHAR),
    app_description VARCHAR2(4000 CHAR),
    app_scales VARCHAR2(250 CHAR),
    app_project VARCHAR2(250 CHAR),
    app_template VARCHAR2(250 CHAR),
    app_refresh NUMBER(1, 0),
    app_entrys NUMBER(1, 0),
    app_entrym NUMBER(1, 0),
    app_ggiid NUMBER(10, 0),
    app_created TIMESTAMP(6) DEFAULT SYSTIMESTAMP NOT NULL,
    app_maintenance_information VARCHAR2(4000 CHAR),
    app_unavailable NUMBER(1, 0) DEFAULT 0 NOT NULL,
    app_last_update TIMESTAMP(6) DEFAULT SYSTIMESTAMP NOT NULL,
    app_creatorid NUMBER(10, 0),
    app_private NUMBER(1, 0) DEFAULT 0 NOT NULL,
    app_headerparams CLOB,
    app_responsible_institution VARCHAR2(250 CHAR)
);

CREATE TABLE stm_app_bckg (
    abc_id NUMBER(10, 0) NOT NULL,
    abc_appid NUMBER(10, 0) NOT NULL,
    abc_backid NUMBER(10, 0) NOT NULL,
    abc_order NUMBER(10, 0)
);

CREATE TABLE stm_app_rol (
    aro_roleid NUMBER(10, 0) NOT NULL,
    aro_appid NUMBER(10, 0) NOT NULL
);

CREATE TABLE stm_app_ter (
    ate_id NUMBER(10, 0) NOT NULL,
    ate_appid NUMBER(10, 0) NOT NULL,
    ate_terid NUMBER(10, 0) NOT NULL,
    ate_iniext VARCHAR2(250 CHAR)
);

CREATE TABLE stm_app_tree (
    atr_treeid NUMBER(10, 0) NOT NULL,
    atr_appid NUMBER(10, 0) NOT NULL,
    atr_id NUMBER(10, 0) NOT NULL,
    atr_order NUMBER(10, 0)
);

CREATE TABLE stm_avail_gi (
    agi_id NUMBER(10, 0) NOT NULL,
    agi_created TIMESTAMP(6),
    agi_owner VARCHAR2(50 CHAR),
    agi_giid NUMBER(10, 0) NOT NULL,
    agi_terid NUMBER(10, 0) NOT NULL
);

CREATE TABLE stm_avail_tsk (
    ats_id NUMBER(10, 0) NOT NULL,
    ats_created TIMESTAMP(6),
    ats_taskid NUMBER(10, 0) NOT NULL,
    ats_terid NUMBER(10, 0) NOT NULL
);

CREATE TABLE stm_backgrd (
    bac_id NUMBER(10, 0) NOT NULL,
    bac_name VARCHAR2(50 CHAR) NOT NULL,
    bac_image VARCHAR2(4000 CHAR),
    bac_desc VARCHAR2(250 CHAR),
    bac_active NUMBER(1, 0),
    bac_ggiid NUMBER(10, 0),
    bac_created TIMESTAMP(6)
);

CREATE TABLE stm_codelist (
    cod_id NUMBER(10, 0) NOT NULL,
    cod_list VARCHAR2(250 CHAR) NOT NULL,
    cod_value VARCHAR2(250 CHAR) NOT NULL,
    cod_system NUMBER(1, 0) NOT NULL,
    cod_default NUMBER(1, 0) NOT NULL,
    cod_description VARCHAR2(250 CHAR) NOT NULL
);

CREATE TABLE stm_comment (
    com_id NUMBER(10, 0) NOT NULL,
    com_coord_x double precision NOT NULL,
    com_coord_y double precision NOT NULL,
    com_name VARCHAR2(250 CHAR),
    com_email VARCHAR2(250 CHAR),
    com_title VARCHAR2(500 CHAR),
    com_desc VARCHAR2(1000 CHAR),
    com_created TIMESTAMP(6),
    com_appid NUMBER(10, 0) NOT NULL,
    com_userid NUMBER(10, 0) NOT NULL
);

CREATE TABLE stm_conf (
    cnf_id NUMBER(10, 0) NOT NULL,
    cnf_name VARCHAR2(50 CHAR) NOT NULL,
    cnf_value VARCHAR2(250 CHAR)
);

CREATE TABLE stm_connect (
    con_id NUMBER(10, 0) NOT NULL,
    con_name VARCHAR2(80 CHAR) NOT NULL,
    con_driver VARCHAR2(50 CHAR) NOT NULL,
    con_user VARCHAR2(50 CHAR),
    con_pwd VARCHAR2(50 CHAR),
    con_connection VARCHAR2(250 CHAR)
);

CREATE TABLE stm_fil_gi (
    fgi_id NUMBER(10, 0) NOT NULL,
    fgi_column VARCHAR2(250 CHAR),
    fgi_name VARCHAR2(80 CHAR) NOT NULL,
    fgi_required NUMBER(1, 0) NOT NULL,
    fgi_type VARCHAR2(50 CHAR) NOT NULL,
    fgi_typid NUMBER(10, 0),
    fgi_value VARCHAR2(4000 CHAR),
    fgi_valuetype VARCHAR2(50 CHAR),
    fgi_giid NUMBER(10, 0) NOT NULL
);

CREATE TABLE stm_geoinfo (
    geo_id NUMBER(10, 0) NOT NULL,
    geo_name VARCHAR2(100 CHAR) NOT NULL,
    geo_abstract VARCHAR2(4000 CHAR),
    geo_layers VARCHAR2(800 CHAR) NOT NULL,
    geo_minscale NUMBER(10, 0),
    geo_maxscale NUMBER(10, 0),
    geo_order NUMBER(10, 0),
    geo_transp NUMBER(10, 0),
    geo_filter_gm NUMBER(1, 0),
    geo_queryabl NUMBER(1, 0) NOT NULL,
    geo_queryact NUMBER(1, 0) NOT NULL,
    geo_querylay VARCHAR2(500 CHAR),
    geo_filter_gfi NUMBER(1, 0),
    geo_type VARCHAR2(50 CHAR),
    geo_serid NUMBER(10, 0),
    geo_selectabl NUMBER(1, 0),
    geo_selectlay VARCHAR2(500 CHAR),
    geo_filter_ss NUMBER(1, 0),
    geo_serselid NUMBER(10, 0),
    geo_legendtip VARCHAR2(50 CHAR),
    geo_legendurl VARCHAR2(4000 CHAR),
    geo_created TIMESTAMP(6),
    geo_connid NUMBER(10, 0),
    geo_metaurl VARCHAR2(4000 CHAR),
    geo_dataurl VARCHAR2(4000 CHAR),
    geo_thematic NUMBER(1, 0),
    geo_geomtype VARCHAR2(50 CHAR),
    geo_source VARCHAR2(80 CHAR),
    geo_styid NUMBER(10, 0),
    geo_styuseall NUMBER(1, 0) DEFAULT 0 NOT NULL,
    geo_blocked NUMBER(1, 0) NOT NULL
);

CREATE TABLE stm_ggi_gi (
    ggg_ggiid NUMBER(10, 0) NOT NULL,
    ggg_giid NUMBER(10, 0) NOT NULL
);

CREATE TABLE stm_grp_gi (
    ggi_id NUMBER(10, 0) NOT NULL,
    ggi_name VARCHAR2(80 CHAR) NOT NULL,
    ggi_type VARCHAR2(50 CHAR)
);

CREATE TABLE stm_grp_ter (
    gte_terid NUMBER(10, 0) NOT NULL,
    gte_termid NUMBER(10, 0) NOT NULL
);

CREATE TABLE stm_grp_tsk (
    gts_id NUMBER(10, 0) NOT NULL,
    gts_name VARCHAR2(80 CHAR) NOT NULL
);

CREATE TABLE stm_gter_typ (
    gtt_id NUMBER(10, 0) NOT NULL,
    gtt_name VARCHAR2(250 CHAR) NOT NULL
);

CREATE TABLE stm_language (
    lan_id NUMBER(10, 0) NOT NULL,
    lan_name VARCHAR2(50 CHAR) NOT NULL,
    lan_shortname VARCHAR2(20 CHAR) NOT NULL,
    lan_order NUMBER(10, 0),
    lan_enabled NUMBER(1, 0) DEFAULT 1 NOT NULL
);

CREATE TABLE stm_literal_translation (
    ltr_id NUMBER(10, 0) NOT NULL,
    ltr_literal VARCHAR2(4000 CHAR) NOT NULL,
    ltr_lanid NUMBER(10, 0) NOT NULL
);

CREATE TABLE stm_literal_translation_value (
    ltv_id NUMBER(10, 0) NOT NULL,
    ltv_ltrid NUMBER(10, 0) NOT NULL,
    ltv_lanid NUMBER(10, 0) NOT NULL,
    ltv_value VARCHAR2(4000 CHAR) NOT NULL
);

CREATE TABLE stm_log (
    log_id NUMBER(10, 0) NOT NULL,
    log_date TIMESTAMP(6),
    log_type VARCHAR2(50 CHAR),
    log_userid NUMBER(10, 0),
    log_appid NUMBER(10, 0),
    log_terid NUMBER(10, 0),
    log_taskid NUMBER(10, 0),
    log_count NUMBER(10, 0),
    log_ter VARCHAR2(250 CHAR),
    log_terext VARCHAR2(250 CHAR),
    log_data VARCHAR2(250 CHAR),
    log_srs VARCHAR2(250 CHAR),
    log_format VARCHAR2(250 CHAR),
    log_buffer NUMBER(1, 0),
    log_email VARCHAR2(250 CHAR),
    log_other VARCHAR2(4000 CHAR),
    log_giid NUMBER(10, 0)
);

CREATE TABLE stm_par_app (
    pap_id NUMBER(10, 0) NOT NULL,
    pap_name VARCHAR2(50 CHAR) NOT NULL,
    pap_value VARCHAR2(250 CHAR) NOT NULL,
    pap_type VARCHAR2(250 CHAR) NOT NULL,
    pap_appid NUMBER(10, 0)
);

CREATE TABLE stm_par_gi (
    pgi_id NUMBER(10, 0) NOT NULL,
    pgi_name VARCHAR2(250 CHAR) NOT NULL,
    pgi_value VARCHAR2(250 CHAR) NOT NULL,
    pgi_format VARCHAR2(250 CHAR),
    pgi_type VARCHAR2(250 CHAR) NOT NULL,
    pgi_giid NUMBER(10, 0) NOT NULL,
    pgi_order NUMBER(10, 0),
    pgi_options CLOB
);

CREATE TABLE stm_par_gs (
    gs_id NUMBER(10, 0) NOT NULL,
    gs_geoid NUMBER(10, 0) NOT NULL,
    gs_name VARCHAR2(50 CHAR) NOT NULL,
    gs_value VARCHAR2(250 CHAR),
    gs_type VARCHAR2(50 CHAR) NOT NULL
);

CREATE TABLE stm_par_ser (
    pse_id NUMBER(10, 0) NOT NULL,
    pse_serid NUMBER(10, 0) NOT NULL,
    pse_value VARCHAR2(250 CHAR) NOT NULL,
    pse_name VARCHAR2(50 CHAR) NOT NULL,
    pse_type VARCHAR2(250 CHAR)
);

CREATE TABLE stm_par_sgi (
    psg_id NUMBER(10, 0) NOT NULL,
    psg_name VARCHAR2(250 CHAR) NOT NULL,
    psg_value VARCHAR2(250 CHAR) NOT NULL,
    psg_format VARCHAR2(250 CHAR),
    psg_type VARCHAR2(250 CHAR) NOT NULL,
    psg_giid NUMBER(10, 0) NOT NULL,
    psg_order NUMBER(10, 0)
);

CREATE TABLE stm_post (
    pos_id NUMBER(10, 0) NOT NULL,
    pos_created TIMESTAMP(6),
    pos_updated TIMESTAMP(6),
    pos_email VARCHAR2(250 CHAR),
    pos_expiration TIMESTAMP(6),
    pos_post VARCHAR2(250 CHAR),
    pos_org VARCHAR2(250 CHAR),
    pos_type VARCHAR2(50 CHAR),
    pos_terid NUMBER(10, 0) NOT NULL,
    pos_userid NUMBER(10, 0) NOT NULL
);

CREATE TABLE stm_rol_ggi (
    rgg_roleid NUMBER(10, 0) NOT NULL,
    rgg_ggiid NUMBER(10, 0) NOT NULL
);

CREATE TABLE stm_rol_tsk (
    rts_taskid NUMBER(10, 0) NOT NULL,
    rts_roleid NUMBER(10, 0) NOT NULL
);

CREATE TABLE stm_role (
    rol_id NUMBER(10, 0) NOT NULL,
    rol_name VARCHAR2(250 CHAR) NOT NULL,
    rol_note VARCHAR2(500 CHAR)
);

CREATE TABLE stm_sequence (
    seq_name VARCHAR2(255 CHAR) NOT NULL,
    seq_count NUMBER(19, 0)
);

CREATE TABLE stm_service (
    ser_id NUMBER(10, 0) NOT NULL,
    ser_name VARCHAR2(60 CHAR) NOT NULL,
    ser_abstract VARCHAR2(4000 CHAR),
    ser_url VARCHAR2(4000 CHAR) NOT NULL,
    ser_projects VARCHAR2(1000 CHAR),
    ser_legend VARCHAR2(4000 CHAR),
    ser_infourl VARCHAR2(4000 CHAR),
    ser_created TIMESTAMP(6),
    ser_protocol VARCHAR2(50 CHAR) NOT NULL,
    ser_nat_prot VARCHAR2(50 CHAR),
    ser_blocked NUMBER(1, 0) NOT NULL,
    ser_proxied NUMBER(1, 0) DEFAULT 0 NOT NULL,
    ser_auth_mod VARCHAR2(50 CHAR),
    ser_user VARCHAR2(50 CHAR),
    ser_pwd VARCHAR2(50 CHAR)
);

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

CREATE TABLE stm_service_check_sample (
    scs_id NUMBER(10, 0) NOT NULL,
    scs_serid NUMBER(10, 0) NOT NULL,
    scs_observer VARCHAR2(16 CHAR) NOT NULL,
    scs_status VARCHAR2(50 CHAR) NOT NULL,
    scs_rank NUMBER(10, 0) NOT NULL,
    scs_elapsed NUMBER(19, 0) NOT NULL,
    scs_observed TIMESTAMP NOT NULL
);

CREATE TABLE stm_service_usage (
    sus_serid NUMBER(10, 0) NOT NULL,
    sus_appid NUMBER(10, 0) NOT NULL,
    sus_day date NOT NULL,
    sus_operation VARCHAR2(32 CHAR) NOT NULL,
    sus_requests NUMBER(19, 0) NOT NULL,
    sus_failed NUMBER(19, 0) NOT NULL
);

CREATE TABLE stm_sty_gi (
    sgi_id NUMBER(10, 0) NOT NULL,
    sgi_name VARCHAR2(80 CHAR) NOT NULL,
    sgi_title VARCHAR2(250 CHAR),
    sgi_abstract VARCHAR2(250 CHAR),
    sgi_lurl_width NUMBER(10, 0),
    sgi_lurl_height NUMBER(10, 0),
    sgi_lurl_format VARCHAR2(255 CHAR),
    sgi_lurl_url VARCHAR2(4000 CHAR),
    sgi_default NUMBER(1, 0) DEFAULT 0 NOT NULL,
    sgi_giid NUMBER(10, 0)
);

CREATE TABLE stm_task (
    tas_id NUMBER(10, 0) NOT NULL,
    tas_name VARCHAR2(512 CHAR) NOT NULL,
    tas_created TIMESTAMP(6),
    tas_order NUMBER(10, 0),
    tas_giid NUMBER(10, 0),
    tas_serid NUMBER(10, 0),
    tas_gtaskid NUMBER(10, 0),
    tas_ttaskid NUMBER(10, 0),
    tas_tuiid NUMBER(10, 0),
    tas_connid NUMBER(10, 0),
    tas_params CLOB
);

CREATE TABLE stm_taskrel (
    tar_id NUMBER(10, 0) NOT NULL,
    tar_type VARCHAR2(50 CHAR) NOT NULL,
    tar_taskid NUMBER(10, 0) NOT NULL,
    tar_taskrelid NUMBER(10, 0) NOT NULL,
    tar_alias VARCHAR2(50 CHAR)
);

CREATE TABLE stm_ter_typ (
    tet_id NUMBER(10, 0) NOT NULL,
    tet_name VARCHAR2(250 CHAR) NOT NULL,
    tet_official NUMBER(1, 0) NOT NULL,
    tet_top NUMBER(1, 0) NOT NULL,
    tet_bottom NUMBER(1, 0) NOT NULL
);

CREATE TABLE stm_territory (
    ter_id NUMBER(10, 0) NOT NULL,
    ter_codter VARCHAR2(50 CHAR) NOT NULL,
    ter_name VARCHAR2(250 CHAR) NOT NULL,
    ter_admname VARCHAR2(250 CHAR),
    ter_address VARCHAR2(250 CHAR),
    ter_email VARCHAR2(250 CHAR),
    ter_scope VARCHAR2(250 CHAR),
    ter_logo VARCHAR2(4000 CHAR),
    ter_extent VARCHAR2(250 CHAR),
    ter_center VARCHAR2(250 CHAR),
    ter_legal VARCHAR2(50 CHAR),
    ter_zoom NUMBER(10, 0),
    ter_blocked NUMBER(1, 0) NOT NULL,
    ter_typid NUMBER(10, 0),
    ter_note VARCHAR2(250 CHAR),
    ter_created TIMESTAMP(6),
    ter_gtypid NUMBER(10, 0),
    ter_project VARCHAR2(250 CHAR),
    ter_description VARCHAR2(4000 CHAR)
);

CREATE TABLE stm_token_user (
    user_token_id NUMBER(10, 0) NOT NULL,
    user_id NUMBER(10, 0) NOT NULL,
    code_otp VARCHAR2(255 CHAR) NOT NULL,
    expire_at TIMESTAMP(6),
    attempt_counter NUMBER(10, 0) NOT NULL,
    active NUMBER(1, 0) NOT NULL
);

CREATE TABLE stm_translation (
    tra_id NUMBER(10, 0) NOT NULL,
    tra_eleid NUMBER(10, 0) NOT NULL,
    tra_column VARCHAR2(100 CHAR) NOT NULL,
    tra_lanid NUMBER(10, 0) NOT NULL,
    tra_name VARCHAR2(4000 CHAR) NOT NULL
);

CREATE TABLE stm_tree (
    tre_id NUMBER(10, 0) NOT NULL,
    tre_name VARCHAR2(100 CHAR) NOT NULL,
    tre_abstract VARCHAR2(250 CHAR),
    tre_type VARCHAR2(50 CHAR),
    tre_image CLOB,
    tre_image_name VARCHAR2(255 CHAR),
    tre_userid NUMBER(10, 0)
);

CREATE TABLE stm_tree_nod (
    tno_id NUMBER(10, 0) NOT NULL,
    tno_parentid NUMBER(10, 0),
    tno_name VARCHAR2(80 CHAR) NOT NULL,
    tno_abstract VARCHAR2(250 CHAR),
    tno_tooltip VARCHAR2(100 CHAR),
    tno_active NUMBER(1, 0) DEFAULT 1 NOT NULL,
    tno_radio NUMBER(1, 0),
    tno_load_data NUMBER(1, 0) DEFAULT 0 NOT NULL,
    tno_order NUMBER(10, 0),
    tno_metaurl VARCHAR2(4000 CHAR),
    tno_dataurl VARCHAR2(4000 CHAR),
    tno_filter_gm NUMBER(1, 0),
    tno_filter_gfi NUMBER(1, 0),
    tno_queryact NUMBER(1, 0),
    tno_filter_se NUMBER(1, 0),
    tno_style VARCHAR2(255 CHAR),
    tno_treeid NUMBER(10, 0) NOT NULL,
    tno_giid NUMBER(10, 0),
    tno_type VARCHAR2(50 CHAR),
    tno_image CLOB,
    tno_image_name VARCHAR2(4000 CHAR),
    tno_view_mode VARCHAR2(255 CHAR),
    tno_taskid NUMBER(10, 0),
    tno_filterable NUMBER(1, 0) DEFAULT 0,
    tno_mapping CLOB,
    tno_default NUMBER(1, 0) DEFAULT 0 NOT NULL
);

CREATE TABLE stm_tree_rol (
    tro_treeid NUMBER(10, 0) NOT NULL,
    tro_roleid NUMBER(10, 0) NOT NULL
);

CREATE TABLE stm_tsk_typ (
    tty_id NUMBER(10, 0) NOT NULL,
    tty_name VARCHAR2(50 CHAR),
    tty_title VARCHAR2(50 CHAR),
    tty_enabled NUMBER(1, 0) NOT NULL,
    tty_parentid NUMBER(10, 0),
    tty_order NUMBER(10, 0),
    tty_spec CLOB
);

CREATE TABLE stm_tsk_ui (
    tui_id NUMBER(10, 0) NOT NULL,
    tui_name VARCHAR2(50 CHAR) NOT NULL,
    tui_tooltip VARCHAR2(100 CHAR),
    tui_order NUMBER(10, 0),
    tui_type VARCHAR2(30 CHAR)
);

CREATE TABLE stm_user (
    use_id NUMBER(10, 0) NOT NULL,
    use_user VARCHAR2(50 CHAR),
    use_pwd VARCHAR2(128 CHAR),
    use_name VARCHAR2(50 CHAR),
    use_surname VARCHAR2(50 CHAR),
    use_ident VARCHAR2(50 CHAR),
    use_identtype VARCHAR2(50 CHAR),
    use_email VARCHAR2(50 CHAR),
    use_adm NUMBER(1, 0) NOT NULL,
    use_blocked NUMBER(1, 0) NOT NULL,
    use_created TIMESTAMP(6),
    use_updated TIMESTAMP(6),
    use_last_password_change TIMESTAMP(6)
);

CREATE TABLE stm_usr_conf (
    uco_id NUMBER(10, 0) NOT NULL,
    uco_userid NUMBER(10, 0) NOT NULL,
    uco_terid NUMBER(10, 0) NOT NULL,
    uco_roleid NUMBER(10, 0) NOT NULL,
    uco_rolem NUMBER(1, 0) NOT NULL,
    uco_created TIMESTAMP(6)
);

ALTER TABLE stm_avail_gi
    ADD CONSTRAINT stm_agi_uk UNIQUE (agi_terid, agi_giid);

ALTER TABLE stm_app_bckg
    ADD CONSTRAINT stm_apf_uk UNIQUE (abc_appid, abc_backid);

ALTER TABLE stm_app_bckg
    ADD CONSTRAINT stm_app_bckg_pkey PRIMARY KEY (abc_id);

ALTER TABLE stm_app
    ADD CONSTRAINT stm_app_pkey PRIMARY KEY (app_id);

ALTER TABLE stm_app_rol
    ADD CONSTRAINT stm_app_rol_pkey PRIMARY KEY (aro_appid, aro_roleid);

ALTER TABLE stm_app_ter
    ADD CONSTRAINT stm_app_ter_pkey PRIMARY KEY (ate_id);

ALTER TABLE stm_app_ter
    ADD CONSTRAINT stm_apt_uk UNIQUE (ate_appid, ate_terid);

ALTER TABLE stm_app_tree
    ADD CONSTRAINT stm_atr_pk PRIMARY KEY (atr_id);

ALTER TABLE stm_app_tree
    ADD CONSTRAINT stm_atr_uk UNIQUE (atr_appid, atr_treeid);

ALTER TABLE stm_avail_tsk
    ADD CONSTRAINT stm_ats_uk UNIQUE (ats_terid, ats_taskid);

ALTER TABLE stm_avail_gi
    ADD CONSTRAINT stm_avail_gi_pkey PRIMARY KEY (agi_id);

ALTER TABLE stm_avail_tsk
    ADD CONSTRAINT stm_avail_tsk_pkey PRIMARY KEY (ats_id);

ALTER TABLE stm_backgrd
    ADD CONSTRAINT stm_backgrd_pkey PRIMARY KEY (bac_id);

ALTER TABLE stm_codelist
    ADD CONSTRAINT stm_cod_uk UNIQUE (cod_list, cod_value);

ALTER TABLE stm_codelist
    ADD CONSTRAINT stm_codelist_pkey PRIMARY KEY (cod_id);

ALTER TABLE stm_comment
    ADD CONSTRAINT stm_comment_pkey PRIMARY KEY (com_id);

ALTER TABLE stm_conf
    ADD CONSTRAINT stm_conf_name_uk UNIQUE (cnf_name);

ALTER TABLE stm_conf
    ADD CONSTRAINT stm_conf_pkey PRIMARY KEY (cnf_id);

ALTER TABLE stm_connect
    ADD CONSTRAINT stm_connect_pkey PRIMARY KEY (con_id);

ALTER TABLE stm_fil_gi
    ADD CONSTRAINT stm_fil_gi_pkey PRIMARY KEY (fgi_id);

ALTER TABLE stm_geoinfo
    ADD CONSTRAINT stm_geoinfo_pkey PRIMARY KEY (geo_id);

ALTER TABLE stm_ggi_gi
    ADD CONSTRAINT stm_ggi_gi_pkey PRIMARY KEY (ggg_ggiid, ggg_giid);

ALTER TABLE stm_grp_gi
    ADD CONSTRAINT stm_grp_gi_pkey PRIMARY KEY (ggi_id);

ALTER TABLE stm_grp_ter
    ADD CONSTRAINT stm_grp_ter_pkey PRIMARY KEY (gte_termid, gte_terid);

ALTER TABLE stm_grp_tsk
    ADD CONSTRAINT stm_grp_tsk_pkey PRIMARY KEY (gts_id);

ALTER TABLE stm_par_gs
    ADD CONSTRAINT stm_gs_pk PRIMARY KEY (gs_id);

ALTER TABLE stm_gter_typ
    ADD CONSTRAINT stm_gter_typ_pkey PRIMARY KEY (gtt_id);

ALTER TABLE stm_gter_typ
    ADD CONSTRAINT stm_gtt_name_uk UNIQUE (gtt_name);

ALTER TABLE stm_language
    ADD CONSTRAINT stm_lan_uk UNIQUE (lan_shortname);

ALTER TABLE stm_language
    ADD CONSTRAINT stm_language_pkey PRIMARY KEY (lan_id);

ALTER TABLE stm_literal_translation
    ADD CONSTRAINT stm_literal_translation_pkey PRIMARY KEY (ltr_id);

ALTER TABLE stm_literal_translation_value
    ADD CONSTRAINT stm_ltv_pkey PRIMARY KEY (ltv_id);

ALTER TABLE stm_log
    ADD CONSTRAINT stm_log_pkey PRIMARY KEY (log_id);

ALTER TABLE stm_literal_translation_value
    ADD CONSTRAINT stm_ltv_uk UNIQUE (ltv_ltrid, ltv_lanid);

ALTER TABLE stm_par_app
    ADD CONSTRAINT stm_par_app_pkey PRIMARY KEY (pap_id);

ALTER TABLE stm_par_gi
    ADD CONSTRAINT stm_par_gi_pkey PRIMARY KEY (pgi_id);

ALTER TABLE stm_par_ser
    ADD CONSTRAINT stm_par_ser_pkey PRIMARY KEY (pse_id);

ALTER TABLE stm_par_sgi
    ADD CONSTRAINT stm_par_sgi_pkey PRIMARY KEY (psg_id);

ALTER TABLE stm_post
    ADD CONSTRAINT stm_post_pkey PRIMARY KEY (pos_id);

ALTER TABLE stm_rol_ggi
    ADD CONSTRAINT stm_rol_ggi_pkey PRIMARY KEY (rgg_ggiid, rgg_roleid);

ALTER TABLE stm_role
    ADD CONSTRAINT stm_rol_name_uk UNIQUE (rol_name);

ALTER TABLE stm_rol_tsk
    ADD CONSTRAINT stm_rol_tsk_pkey PRIMARY KEY (rts_roleid, rts_taskid);

ALTER TABLE stm_role
    ADD CONSTRAINT stm_role_pkey PRIMARY KEY (rol_id);

ALTER TABLE stm_service_check_sample
    ADD CONSTRAINT stm_scs_pk PRIMARY KEY (scs_id);

ALTER TABLE stm_service_check
    ADD CONSTRAINT stm_sec_pk PRIMARY KEY (sec_id);

ALTER TABLE stm_service_check
    ADD CONSTRAINT stm_sec_uk UNIQUE (sec_serid, sec_observer);

ALTER TABLE stm_sequence
    ADD CONSTRAINT stm_sequence_pkey PRIMARY KEY (seq_name);

ALTER TABLE stm_service
    ADD CONSTRAINT stm_service_pkey PRIMARY KEY (ser_id);

ALTER TABLE stm_sty_gi
    ADD CONSTRAINT stm_sty_gi_pkey PRIMARY KEY (sgi_id);

ALTER TABLE stm_service_usage
    ADD CONSTRAINT stm_sus_pk PRIMARY KEY (sus_serid, sus_appid, sus_day, sus_operation);

ALTER TABLE stm_taskrel
    ADD CONSTRAINT stm_tar_uk_task_alias UNIQUE (tar_taskid, tar_alias);

ALTER TABLE stm_task
    ADD CONSTRAINT stm_task_pkey PRIMARY KEY (tas_id);

ALTER TABLE stm_taskrel
    ADD CONSTRAINT stm_taskrel_pkey PRIMARY KEY (tar_id);

ALTER TABLE stm_territory
    ADD CONSTRAINT stm_ter_name_uk UNIQUE (ter_name);

ALTER TABLE stm_ter_typ
    ADD CONSTRAINT stm_ter_typ_pkey PRIMARY KEY (tet_id);

ALTER TABLE stm_territory
    ADD CONSTRAINT stm_territory_pkey PRIMARY KEY (ter_id);

ALTER TABLE stm_ter_typ
    ADD CONSTRAINT stm_tet_name_uk UNIQUE (tet_name);

ALTER TABLE stm_token_user
    ADD CONSTRAINT stm_token_user_pkey PRIMARY KEY (user_token_id);

ALTER TABLE stm_translation
    ADD CONSTRAINT stm_tra_uk UNIQUE (tra_eleid, tra_column, tra_lanid);

ALTER TABLE stm_translation
    ADD CONSTRAINT stm_translation_pkey PRIMARY KEY (tra_id);

ALTER TABLE stm_tree_nod
    ADD CONSTRAINT stm_tree_nod_pkey PRIMARY KEY (tno_id);

ALTER TABLE stm_tree
    ADD CONSTRAINT stm_tree_pkey PRIMARY KEY (tre_id);

ALTER TABLE stm_tree_rol
    ADD CONSTRAINT stm_tree_rol_pkey PRIMARY KEY (tro_roleid, tro_treeid);

ALTER TABLE stm_tsk_typ
    ADD CONSTRAINT stm_tsk_typ_pkey PRIMARY KEY (tty_id);

ALTER TABLE stm_tsk_ui
    ADD CONSTRAINT stm_tsk_ui_pkey PRIMARY KEY (tui_id);

ALTER TABLE stm_token_user
    ADD CONSTRAINT stm_tus_uk UNIQUE (user_id);

ALTER TABLE stm_usr_conf
    ADD CONSTRAINT stm_uco_uk UNIQUE (uco_userid, uco_terid, uco_roleid, uco_rolem);

ALTER TABLE stm_user
    ADD CONSTRAINT stm_use_name_uk UNIQUE (use_user);

ALTER TABLE stm_user
    ADD CONSTRAINT stm_user_pkey PRIMARY KEY (use_id);

ALTER TABLE stm_usr_conf
    ADD CONSTRAINT stm_usr_conf_pkey PRIMARY KEY (uco_id);

CREATE INDEX stm_scs_ix_ser_obs ON stm_service_check_sample (scs_serid, scs_observed);

CREATE UNIQUE INDEX stm_ltr_literal_uk ON stm_literal_translation (ORA_HASH(ltr_literal), LENGTH(ltr_literal), SUBSTR(ltr_literal, 1, 1000));

ALTER TABLE stm_app_bckg
    ADD CONSTRAINT stm_abc_fk_app FOREIGN KEY (abc_appid) REFERENCES stm_app(app_id) ON DELETE CASCADE;

ALTER TABLE stm_app_bckg
    ADD CONSTRAINT stm_abc_fk_fon FOREIGN KEY (abc_backid) REFERENCES stm_backgrd(bac_id) ON DELETE CASCADE;

ALTER TABLE stm_avail_gi
    ADD CONSTRAINT stm_agi_fk_geo FOREIGN KEY (agi_giid) REFERENCES stm_geoinfo(geo_id) ON DELETE CASCADE;

ALTER TABLE stm_avail_gi
    ADD CONSTRAINT stm_agi_fk_ter FOREIGN KEY (agi_terid) REFERENCES stm_territory(ter_id) ON DELETE CASCADE;

ALTER TABLE stm_app
    ADD CONSTRAINT stm_app_fk_ggi FOREIGN KEY (app_ggiid) REFERENCES stm_grp_gi(ggi_id);

ALTER TABLE stm_app
    ADD CONSTRAINT stm_app_fk_use FOREIGN KEY (app_creatorid) REFERENCES stm_user(use_id);

ALTER TABLE stm_app_rol
    ADD CONSTRAINT stm_aro_fk_app FOREIGN KEY (aro_appid) REFERENCES stm_app(app_id) ON DELETE CASCADE;

ALTER TABLE stm_app_rol
    ADD CONSTRAINT stm_aro_fk_rol FOREIGN KEY (aro_roleid) REFERENCES stm_role(rol_id) ON DELETE CASCADE;

ALTER TABLE stm_app_ter
    ADD CONSTRAINT stm_ate_fk_app FOREIGN KEY (ate_appid) REFERENCES stm_app(app_id) ON DELETE CASCADE;

ALTER TABLE stm_app_ter
    ADD CONSTRAINT stm_ate_fk_ter FOREIGN KEY (ate_terid) REFERENCES stm_territory(ter_id) ON DELETE CASCADE;

ALTER TABLE stm_app_tree
    ADD CONSTRAINT stm_atr_fk_app FOREIGN KEY (atr_appid) REFERENCES stm_app(app_id) ON DELETE CASCADE;

ALTER TABLE stm_app_tree
    ADD CONSTRAINT stm_atr_fk_tre FOREIGN KEY (atr_treeid) REFERENCES stm_tree(tre_id) ON DELETE CASCADE;

ALTER TABLE stm_avail_tsk
    ADD CONSTRAINT stm_ats_fk_tas FOREIGN KEY (ats_taskid) REFERENCES stm_task(tas_id) ON DELETE CASCADE;

ALTER TABLE stm_avail_tsk
    ADD CONSTRAINT stm_ats_fk_ter FOREIGN KEY (ats_terid) REFERENCES stm_territory(ter_id) ON DELETE CASCADE;

ALTER TABLE stm_backgrd
    ADD CONSTRAINT stm_bac_fk_ggi FOREIGN KEY (bac_ggiid) REFERENCES stm_grp_gi(ggi_id);

ALTER TABLE stm_comment
    ADD CONSTRAINT stm_com_fk_app FOREIGN KEY (com_appid) REFERENCES stm_app(app_id) ON DELETE CASCADE;

ALTER TABLE stm_comment
    ADD CONSTRAINT stm_com_fk_use FOREIGN KEY (com_userid) REFERENCES stm_user(use_id) ON DELETE CASCADE;

ALTER TABLE stm_fil_gi
    ADD CONSTRAINT stm_fgi_fk_geo FOREIGN KEY (fgi_giid) REFERENCES stm_geoinfo(geo_id) ON DELETE CASCADE;

ALTER TABLE stm_fil_gi
    ADD CONSTRAINT stm_fgi_fk_tet FOREIGN KEY (fgi_typid) REFERENCES stm_ter_typ(tet_id);

ALTER TABLE stm_geoinfo
    ADD CONSTRAINT stm_geo_fk_con FOREIGN KEY (geo_connid) REFERENCES stm_connect(con_id);

ALTER TABLE stm_geoinfo
    ADD CONSTRAINT stm_geo_fk_ser FOREIGN KEY (geo_serid) REFERENCES stm_service(ser_id);

ALTER TABLE stm_geoinfo
    ADD CONSTRAINT stm_geo_fk_sersel FOREIGN KEY (geo_serselid) REFERENCES stm_service(ser_id);

ALTER TABLE stm_geoinfo
    ADD CONSTRAINT stm_geo_fk_sgi FOREIGN KEY (geo_styid) REFERENCES stm_sty_gi(sgi_id);

ALTER TABLE stm_geoinfo
    ADD CONSTRAINT stm_geo_uk_styid UNIQUE (geo_styid);

ALTER TABLE stm_ggi_gi
    ADD CONSTRAINT stm_ggg_fk_geo FOREIGN KEY (ggg_giid) REFERENCES stm_geoinfo(geo_id) ON DELETE CASCADE;

ALTER TABLE stm_ggi_gi
    ADD CONSTRAINT stm_ggg_fk_ggi FOREIGN KEY (ggg_ggiid) REFERENCES stm_grp_gi(ggi_id) ON DELETE CASCADE;

ALTER TABLE stm_par_gs
    ADD CONSTRAINT stm_gs_fk_geo FOREIGN KEY (gs_geoid) REFERENCES stm_geoinfo(geo_id) ON DELETE CASCADE;

ALTER TABLE stm_grp_ter
    ADD CONSTRAINT stm_gte_fk_ter FOREIGN KEY (gte_terid) REFERENCES stm_territory(ter_id) ON DELETE CASCADE;

ALTER TABLE stm_grp_ter
    ADD CONSTRAINT stm_gte_fk_term FOREIGN KEY (gte_termid) REFERENCES stm_territory(ter_id) ON DELETE CASCADE;

ALTER TABLE stm_log
    ADD CONSTRAINT stm_log_fk_appid FOREIGN KEY (log_appid) REFERENCES stm_app(app_id);

ALTER TABLE stm_log
    ADD CONSTRAINT stm_log_fk_giid FOREIGN KEY (log_giid) REFERENCES stm_geoinfo(geo_id);

ALTER TABLE stm_log
    ADD CONSTRAINT stm_log_fk_taskid FOREIGN KEY (log_taskid) REFERENCES stm_task(tas_id);

ALTER TABLE stm_log
    ADD CONSTRAINT stm_log_fk_terid FOREIGN KEY (log_terid) REFERENCES stm_territory(ter_id);

ALTER TABLE stm_log
    ADD CONSTRAINT stm_log_fk_userid FOREIGN KEY (log_userid) REFERENCES stm_user(use_id);

ALTER TABLE stm_literal_translation
    ADD CONSTRAINT stm_ltr_fk_lan FOREIGN KEY (ltr_lanid) REFERENCES stm_language(lan_id);

ALTER TABLE stm_literal_translation_value
    ADD CONSTRAINT stm_ltv_fk_lan FOREIGN KEY (ltv_lanid) REFERENCES stm_language(lan_id);

ALTER TABLE stm_literal_translation_value
    ADD CONSTRAINT stm_ltv_fk_ltr FOREIGN KEY (ltv_ltrid) REFERENCES stm_literal_translation(ltr_id) ON DELETE CASCADE;

ALTER TABLE stm_par_app
    ADD CONSTRAINT stm_pap_fk_app FOREIGN KEY (pap_appid) REFERENCES stm_app(app_id) ON DELETE CASCADE;

ALTER TABLE stm_par_gi
    ADD CONSTRAINT stm_pgi_fk_geo FOREIGN KEY (pgi_giid) REFERENCES stm_geoinfo(geo_id) ON DELETE CASCADE;

ALTER TABLE stm_post
    ADD CONSTRAINT stm_pos_fk_ter FOREIGN KEY (pos_terid) REFERENCES stm_territory(ter_id) ON DELETE CASCADE;

ALTER TABLE stm_post
    ADD CONSTRAINT stm_pos_fk_use FOREIGN KEY (pos_userid) REFERENCES stm_user(use_id) ON DELETE CASCADE;

ALTER TABLE stm_par_ser
    ADD CONSTRAINT stm_pse_fk_ser FOREIGN KEY (pse_serid) REFERENCES stm_service(ser_id) ON DELETE CASCADE;

ALTER TABLE stm_par_sgi
    ADD CONSTRAINT stm_psg_fk_geo FOREIGN KEY (psg_giid) REFERENCES stm_geoinfo(geo_id) ON DELETE CASCADE;

ALTER TABLE stm_rol_ggi
    ADD CONSTRAINT stm_rgg_fk_ggi FOREIGN KEY (rgg_ggiid) REFERENCES stm_grp_gi(ggi_id) ON DELETE CASCADE;

ALTER TABLE stm_rol_ggi
    ADD CONSTRAINT stm_rgg_fk_rol FOREIGN KEY (rgg_roleid) REFERENCES stm_role(rol_id) ON DELETE CASCADE;

ALTER TABLE stm_rol_tsk
    ADD CONSTRAINT stm_rts_fk_rol FOREIGN KEY (rts_roleid) REFERENCES stm_role(rol_id) ON DELETE CASCADE;

ALTER TABLE stm_rol_tsk
    ADD CONSTRAINT stm_rts_fk_tas FOREIGN KEY (rts_taskid) REFERENCES stm_task(tas_id) ON DELETE CASCADE;

ALTER TABLE stm_service_check_sample
    ADD CONSTRAINT stm_scs_fk_ser FOREIGN KEY (scs_serid) REFERENCES stm_service(ser_id) ON DELETE CASCADE;

ALTER TABLE stm_service_check
    ADD CONSTRAINT stm_sec_fk_ser FOREIGN KEY (sec_serid) REFERENCES stm_service(ser_id) ON DELETE CASCADE;

ALTER TABLE stm_sty_gi
    ADD CONSTRAINT stm_sgi_fk_geo FOREIGN KEY (sgi_giid) REFERENCES stm_geoinfo(geo_id);

ALTER TABLE stm_service_usage
    ADD CONSTRAINT stm_sus_fk_app FOREIGN KEY (sus_appid) REFERENCES stm_app(app_id) ON DELETE CASCADE;

ALTER TABLE stm_service_usage
    ADD CONSTRAINT stm_sus_fk_ser FOREIGN KEY (sus_serid) REFERENCES stm_service(ser_id) ON DELETE CASCADE;

ALTER TABLE stm_taskrel
    ADD CONSTRAINT stm_tar_fk_tas FOREIGN KEY (tar_taskid) REFERENCES stm_task(tas_id) ON DELETE CASCADE;

ALTER TABLE stm_taskrel
    ADD CONSTRAINT stm_tar_fk_tas_rel FOREIGN KEY (tar_taskrelid) REFERENCES stm_task(tas_id);

ALTER TABLE stm_task
    ADD CONSTRAINT stm_tas_fk_con FOREIGN KEY (tas_connid) REFERENCES stm_connect(con_id);

ALTER TABLE stm_task
    ADD CONSTRAINT stm_tas_fk_geo FOREIGN KEY (tas_giid) REFERENCES stm_geoinfo(geo_id);

ALTER TABLE stm_task
    ADD CONSTRAINT stm_tas_fk_gts FOREIGN KEY (tas_gtaskid) REFERENCES stm_grp_tsk(gts_id);

ALTER TABLE stm_task
    ADD CONSTRAINT stm_tas_fk_ser FOREIGN KEY (tas_serid) REFERENCES stm_service(ser_id);

ALTER TABLE stm_task
    ADD CONSTRAINT stm_tas_fk_tty FOREIGN KEY (tas_ttaskid) REFERENCES stm_tsk_typ(tty_id);

ALTER TABLE stm_task
    ADD CONSTRAINT stm_tas_fk_tui FOREIGN KEY (tas_tuiid) REFERENCES stm_tsk_ui(tui_id);

ALTER TABLE stm_territory
    ADD CONSTRAINT stm_ter_fk_gtt FOREIGN KEY (ter_gtypid) REFERENCES stm_gter_typ(gtt_id);

ALTER TABLE stm_territory
    ADD CONSTRAINT stm_ter_fk_tet FOREIGN KEY (ter_typid) REFERENCES stm_ter_typ(tet_id);

ALTER TABLE stm_tree_nod
    ADD CONSTRAINT stm_tno_fk_geo FOREIGN KEY (tno_giid) REFERENCES stm_geoinfo(geo_id);

ALTER TABLE stm_tree_nod
    ADD CONSTRAINT stm_tno_fk_tas FOREIGN KEY (tno_taskid) REFERENCES stm_task(tas_id);

ALTER TABLE stm_tree_nod
    ADD CONSTRAINT stm_tno_fk_tno FOREIGN KEY (tno_parentid) REFERENCES stm_tree_nod(tno_id);

ALTER TABLE stm_tree_nod
    ADD CONSTRAINT stm_tno_fk_tre FOREIGN KEY (tno_treeid) REFERENCES stm_tree(tre_id) ON DELETE CASCADE;

ALTER TABLE stm_translation
    ADD CONSTRAINT stm_tra_fk_lan FOREIGN KEY (tra_lanid) REFERENCES stm_language(lan_id);

ALTER TABLE stm_tree
    ADD CONSTRAINT stm_tre_fk_use FOREIGN KEY (tre_userid) REFERENCES stm_user(use_id);

ALTER TABLE stm_tree_rol
    ADD CONSTRAINT stm_tro_fk_rol FOREIGN KEY (tro_roleid) REFERENCES stm_role(rol_id) ON DELETE CASCADE;

ALTER TABLE stm_tree_rol
    ADD CONSTRAINT stm_tro_fk_tre FOREIGN KEY (tro_treeid) REFERENCES stm_tree(tre_id) ON DELETE CASCADE;

ALTER TABLE stm_tsk_typ
    ADD CONSTRAINT stm_tty_fk_tty FOREIGN KEY (tty_parentid) REFERENCES stm_tsk_typ(tty_id) ON DELETE CASCADE;

ALTER TABLE stm_usr_conf
    ADD CONSTRAINT stm_uco_fk_rol FOREIGN KEY (uco_roleid) REFERENCES stm_role(rol_id) ON DELETE CASCADE;

ALTER TABLE stm_usr_conf
    ADD CONSTRAINT stm_uco_fk_ter FOREIGN KEY (uco_terid) REFERENCES stm_territory(ter_id) ON DELETE CASCADE;

ALTER TABLE stm_usr_conf
    ADD CONSTRAINT stm_uco_fk_usu FOREIGN KEY (uco_userid) REFERENCES stm_user(use_id) ON DELETE CASCADE;
