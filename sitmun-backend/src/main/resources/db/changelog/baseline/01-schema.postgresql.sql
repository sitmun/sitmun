CREATE TABLE stm_app (
    app_id integer NOT NULL,
    app_name character varying(80) NOT NULL,
    app_type character varying(250),
    app_title character varying(250),
    app_theme character varying(30),
    app_logo character varying(4000),
    app_description character varying(4000),
    app_scales character varying(250),
    app_project character varying(250),
    app_template character varying(250),
    app_refresh boolean,
    app_entrys boolean,
    app_entrym boolean,
    app_ggiid integer,
    app_created timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    app_maintenance_information character varying(4000),
    app_unavailable boolean DEFAULT false NOT NULL,
    app_last_update timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    app_creatorid integer,
    app_private boolean DEFAULT false NOT NULL,
    app_headerparams text,
    app_responsible_institution character varying(250)
);

CREATE TABLE stm_app_bckg (
    abc_id integer NOT NULL,
    abc_appid integer NOT NULL,
    abc_backid integer NOT NULL,
    abc_order integer
);

CREATE TABLE stm_app_rol (
    aro_roleid integer NOT NULL,
    aro_appid integer NOT NULL
);

CREATE TABLE stm_app_ter (
    ate_id integer NOT NULL,
    ate_appid integer NOT NULL,
    ate_terid integer NOT NULL,
    ate_iniext character varying(250)
);

CREATE TABLE stm_app_tree (
    atr_treeid integer NOT NULL,
    atr_appid integer NOT NULL,
    atr_id integer NOT NULL,
    atr_order integer
);

CREATE TABLE stm_avail_gi (
    agi_id integer NOT NULL,
    agi_created timestamp(6) without time zone,
    agi_owner character varying(50),
    agi_giid integer NOT NULL,
    agi_terid integer NOT NULL
);

CREATE TABLE stm_avail_tsk (
    ats_id integer NOT NULL,
    ats_created timestamp(6) without time zone,
    ats_taskid integer NOT NULL,
    ats_terid integer NOT NULL
);

CREATE TABLE stm_backgrd (
    bac_id integer NOT NULL,
    bac_name character varying(50) NOT NULL,
    bac_image character varying(4000),
    bac_desc character varying(250),
    bac_active boolean,
    bac_ggiid integer,
    bac_created timestamp(6) without time zone
);

CREATE TABLE stm_codelist (
    cod_id integer NOT NULL,
    cod_list character varying(250) NOT NULL,
    cod_value character varying(250) NOT NULL,
    cod_system boolean NOT NULL,
    cod_default boolean NOT NULL,
    cod_description character varying(250) NOT NULL
);

CREATE TABLE stm_comment (
    com_id integer NOT NULL,
    com_coord_x double precision NOT NULL,
    com_coord_y double precision NOT NULL,
    com_name character varying(250),
    com_email character varying(250),
    com_title character varying(500),
    com_desc character varying(1000),
    com_created timestamp(6) without time zone,
    com_appid integer NOT NULL,
    com_userid integer NOT NULL
);

CREATE TABLE stm_conf (
    cnf_id integer NOT NULL,
    cnf_name character varying(50) NOT NULL,
    cnf_value character varying(250)
);

CREATE TABLE stm_connect (
    con_id integer NOT NULL,
    con_name character varying(80) NOT NULL,
    con_driver character varying(50) NOT NULL,
    con_user character varying(50),
    con_pwd character varying(50),
    con_connection character varying(250)
);

CREATE TABLE stm_fil_gi (
    fgi_id integer NOT NULL,
    fgi_column character varying(250),
    fgi_name character varying(80) NOT NULL,
    fgi_required boolean NOT NULL,
    fgi_type character varying(50) NOT NULL,
    fgi_typid integer,
    fgi_value character varying(4000),
    fgi_valuetype character varying(50),
    fgi_giid integer NOT NULL
);

CREATE TABLE stm_geoinfo (
    geo_id integer NOT NULL,
    geo_name character varying(100) NOT NULL,
    geo_abstract character varying(4000),
    geo_layers character varying(800) NOT NULL,
    geo_minscale integer,
    geo_maxscale integer,
    geo_order integer,
    geo_transp integer,
    geo_filter_gm boolean,
    geo_queryabl boolean NOT NULL,
    geo_queryact boolean NOT NULL,
    geo_querylay character varying(500),
    geo_filter_gfi boolean,
    geo_type character varying(50),
    geo_serid integer,
    geo_selectabl boolean,
    geo_selectlay character varying(500),
    geo_filter_ss boolean,
    geo_serselid integer,
    geo_legendtip character varying(50),
    geo_legendurl character varying(4000),
    geo_created timestamp(6) without time zone,
    geo_connid integer,
    geo_metaurl character varying(4000),
    geo_dataurl character varying(4000),
    geo_thematic boolean,
    geo_geomtype character varying(50),
    geo_source character varying(80),
    geo_styid integer,
    geo_styuseall boolean DEFAULT false NOT NULL,
    geo_blocked boolean NOT NULL
);

CREATE TABLE stm_ggi_gi (
    ggg_ggiid integer NOT NULL,
    ggg_giid integer NOT NULL
);

CREATE TABLE stm_grp_gi (
    ggi_id integer NOT NULL,
    ggi_name character varying(80) NOT NULL,
    ggi_type character varying(50)
);

CREATE TABLE stm_grp_ter (
    gte_terid integer NOT NULL,
    gte_termid integer NOT NULL
);

CREATE TABLE stm_grp_tsk (
    gts_id integer NOT NULL,
    gts_name character varying(80) NOT NULL
);

CREATE TABLE stm_gter_typ (
    gtt_id integer NOT NULL,
    gtt_name character varying(250) NOT NULL
);

CREATE TABLE stm_language (
    lan_id integer NOT NULL,
    lan_name character varying(50) NOT NULL,
    lan_shortname character varying(20) NOT NULL,
    lan_order integer,
    lan_enabled boolean DEFAULT true NOT NULL
);

CREATE TABLE stm_literal_translation (
    ltr_id integer NOT NULL,
    ltr_literal character varying(4000) NOT NULL,
    ltr_lanid integer NOT NULL
);

CREATE TABLE stm_literal_translation_value (
    ltv_id integer NOT NULL,
    ltv_ltrid integer NOT NULL,
    ltv_lanid integer NOT NULL,
    ltv_value character varying(4000) NOT NULL
);

CREATE TABLE stm_log (
    log_id integer NOT NULL,
    log_date timestamp(6) without time zone,
    log_type character varying(50),
    log_userid integer,
    log_appid integer,
    log_terid integer,
    log_taskid integer,
    log_count integer,
    log_ter character varying(250),
    log_terext character varying(250),
    log_data character varying(250),
    log_srs character varying(250),
    log_format character varying(250),
    log_buffer boolean,
    log_email character varying(250),
    log_other character varying(4000),
    log_giid integer
);

CREATE TABLE stm_par_app (
    pap_id integer NOT NULL,
    pap_name character varying(50) NOT NULL,
    pap_value character varying(250) NOT NULL,
    pap_type character varying(250) NOT NULL,
    pap_appid integer
);

CREATE TABLE stm_par_gi (
    pgi_id integer NOT NULL,
    pgi_name character varying(250) NOT NULL,
    pgi_value character varying(250) NOT NULL,
    pgi_format character varying(250),
    pgi_type character varying(250) NOT NULL,
    pgi_giid integer NOT NULL,
    pgi_order integer,
    pgi_options text
);

CREATE TABLE stm_par_gs (
    gs_id integer NOT NULL,
    gs_geoid integer NOT NULL,
    gs_name character varying(50) NOT NULL,
    gs_value character varying(250),
    gs_type character varying(50) NOT NULL
);

CREATE TABLE stm_par_ser (
    pse_id integer NOT NULL,
    pse_serid integer NOT NULL,
    pse_value character varying(250) NOT NULL,
    pse_name character varying(50) NOT NULL,
    pse_type character varying(250)
);

CREATE TABLE stm_par_sgi (
    psg_id integer NOT NULL,
    psg_name character varying(250) NOT NULL,
    psg_value character varying(250) NOT NULL,
    psg_format character varying(250),
    psg_type character varying(250) NOT NULL,
    psg_giid integer NOT NULL,
    psg_order integer
);

CREATE TABLE stm_post (
    pos_id integer NOT NULL,
    pos_created timestamp(6) without time zone,
    pos_updated timestamp(6) without time zone,
    pos_email character varying(250),
    pos_expiration timestamp(6) without time zone,
    pos_post character varying(250),
    pos_org character varying(250),
    pos_type character varying(50),
    pos_terid integer NOT NULL,
    pos_userid integer NOT NULL
);

CREATE TABLE stm_rol_ggi (
    rgg_roleid integer NOT NULL,
    rgg_ggiid integer NOT NULL
);

CREATE TABLE stm_rol_tsk (
    rts_taskid integer NOT NULL,
    rts_roleid integer NOT NULL
);

CREATE TABLE stm_role (
    rol_id integer NOT NULL,
    rol_name character varying(250) NOT NULL,
    rol_note character varying(500)
);

CREATE TABLE stm_sequence (
    seq_name character varying(255) NOT NULL,
    seq_count bigint
);

CREATE TABLE stm_service (
    ser_id integer NOT NULL,
    ser_name character varying(60) NOT NULL,
    ser_abstract character varying(4000),
    ser_url character varying(4000) NOT NULL,
    ser_projects character varying(1000),
    ser_legend character varying(4000),
    ser_infourl character varying(4000),
    ser_created timestamp(6) without time zone,
    ser_protocol character varying(50) NOT NULL,
    ser_nat_prot character varying(50),
    ser_blocked boolean NOT NULL,
    ser_proxied boolean DEFAULT false NOT NULL,
    ser_auth_mod character varying(50),
    ser_user character varying(50),
    ser_pwd character varying(50)
);

CREATE TABLE stm_service_check (
    sec_id integer NOT NULL,
    sec_serid integer NOT NULL,
    sec_observer character varying(16) NOT NULL,
    sec_status character varying(50) NOT NULL,
    sec_rank integer NOT NULL,
    sec_observed timestamp with time zone NOT NULL,
    sec_elapsed bigint NOT NULL,
    sec_detail character varying(4000)
);

CREATE TABLE stm_service_check_sample (
    scs_id integer NOT NULL,
    scs_serid integer NOT NULL,
    scs_observer character varying(16) NOT NULL,
    scs_status character varying(50) NOT NULL,
    scs_rank integer NOT NULL,
    scs_elapsed bigint NOT NULL,
    scs_observed timestamp with time zone NOT NULL
);

CREATE TABLE stm_service_usage (
    sus_serid integer NOT NULL,
    sus_appid integer NOT NULL,
    sus_day date NOT NULL,
    sus_operation character varying(32) NOT NULL,
    sus_requests bigint NOT NULL,
    sus_failed bigint NOT NULL
);

CREATE TABLE stm_sty_gi (
    sgi_id integer NOT NULL,
    sgi_name character varying(80) NOT NULL,
    sgi_title character varying(250),
    sgi_abstract character varying(250),
    sgi_lurl_width integer,
    sgi_lurl_height integer,
    sgi_lurl_format character varying(255),
    sgi_lurl_url character varying(4000),
    sgi_default boolean DEFAULT false NOT NULL,
    sgi_giid integer
);

CREATE TABLE stm_task (
    tas_id integer NOT NULL,
    tas_name character varying(512) NOT NULL,
    tas_created timestamp(6) without time zone,
    tas_order integer,
    tas_giid integer,
    tas_serid integer,
    tas_gtaskid integer,
    tas_ttaskid integer,
    tas_tuiid integer,
    tas_connid integer,
    tas_params text,
    tas_title character varying(250)
);

CREATE TABLE stm_taskrel (
    tar_id integer NOT NULL,
    tar_type character varying(50) NOT NULL,
    tar_taskid integer NOT NULL,
    tar_taskrelid integer NOT NULL,
    tar_alias character varying(50)
);

CREATE TABLE stm_ter_typ (
    tet_id integer NOT NULL,
    tet_name character varying(250) NOT NULL,
    tet_official boolean NOT NULL,
    tet_top boolean NOT NULL,
    tet_bottom boolean NOT NULL
);

CREATE TABLE stm_territory (
    ter_id integer NOT NULL,
    ter_codter character varying(50) NOT NULL,
    ter_name character varying(250) NOT NULL,
    ter_admname character varying(250),
    ter_address character varying(250),
    ter_email character varying(250),
    ter_scope character varying(250),
    ter_logo character varying(4000),
    ter_extent character varying(250),
    ter_center character varying(250),
    ter_legal character varying(50),
    ter_zoom integer,
    ter_blocked boolean NOT NULL,
    ter_typid integer,
    ter_note character varying(250),
    ter_created timestamp(6) without time zone,
    ter_gtypid integer,
    ter_project character varying(250),
    ter_description character varying(4000)
);

CREATE TABLE stm_token_user (
    user_token_id integer NOT NULL,
    user_id integer NOT NULL,
    code_otp character varying(255) NOT NULL,
    expire_at timestamp(6) without time zone,
    attempt_counter integer NOT NULL,
    active boolean NOT NULL
);

CREATE TABLE stm_translation (
    tra_id integer NOT NULL,
    tra_eleid integer NOT NULL,
    tra_column character varying(100) NOT NULL,
    tra_lanid integer NOT NULL,
    tra_name character varying(4000) NOT NULL
);

CREATE TABLE stm_tree (
    tre_id integer NOT NULL,
    tre_name character varying(100) NOT NULL,
    tre_abstract character varying(250),
    tre_type character varying(50),
    tre_image text,
    tre_image_name character varying(255),
    tre_userid integer
);

CREATE TABLE stm_tree_nod (
    tno_id integer NOT NULL,
    tno_parentid integer,
    tno_name character varying(80) NOT NULL,
    tno_abstract character varying(250),
    tno_tooltip character varying(100),
    tno_active boolean DEFAULT true NOT NULL,
    tno_radio boolean,
    tno_load_data boolean DEFAULT false NOT NULL,
    tno_order integer,
    tno_metaurl character varying(4000),
    tno_dataurl character varying(4000),
    tno_filter_gm boolean,
    tno_filter_gfi boolean,
    tno_queryact boolean,
    tno_filter_se boolean,
    tno_style character varying(255),
    tno_treeid integer NOT NULL,
    tno_giid integer,
    tno_type character varying(50),
    tno_image text,
    tno_image_name character varying(4000),
    tno_view_mode character varying(255),
    tno_taskid integer,
    tno_filterable boolean DEFAULT false,
    tno_mapping text,
    tno_default boolean DEFAULT false NOT NULL
);

CREATE TABLE stm_tree_rol (
    tro_treeid integer NOT NULL,
    tro_roleid integer NOT NULL
);

CREATE TABLE stm_tsk_typ (
    tty_id integer NOT NULL,
    tty_name character varying(50),
    tty_title character varying(50),
    tty_enabled boolean NOT NULL,
    tty_parentid integer,
    tty_order integer,
    tty_spec text
);

CREATE TABLE stm_tsk_ui (
    tui_id integer NOT NULL,
    tui_name character varying(50) NOT NULL,
    tui_tooltip character varying(100),
    tui_order integer,
    tui_type character varying(30)
);

CREATE TABLE stm_user (
    use_id integer NOT NULL,
    use_user character varying(50),
    use_pwd character varying(128),
    use_name character varying(50),
    use_surname character varying(50),
    use_ident character varying(50),
    use_identtype character varying(50),
    use_email character varying(250),
    use_adm boolean NOT NULL,
    use_blocked boolean NOT NULL,
    use_created timestamp(6) without time zone,
    use_updated timestamp(6) without time zone,
    use_last_password_change timestamp(6) without time zone
);

CREATE TABLE stm_usr_conf (
    uco_id integer NOT NULL,
    uco_userid integer NOT NULL,
    uco_terid integer NOT NULL,
    uco_roleid integer NOT NULL,
    uco_rolem boolean NOT NULL,
    uco_created timestamp(6) without time zone
);

ALTER TABLE ONLY stm_avail_gi
    ADD CONSTRAINT stm_agi_uk UNIQUE (agi_terid, agi_giid);

ALTER TABLE ONLY stm_app_bckg
    ADD CONSTRAINT stm_apf_uk UNIQUE (abc_appid, abc_backid);

ALTER TABLE ONLY stm_app_bckg
    ADD CONSTRAINT stm_app_bckg_pkey PRIMARY KEY (abc_id);

ALTER TABLE ONLY stm_app
    ADD CONSTRAINT stm_app_pkey PRIMARY KEY (app_id);

ALTER TABLE ONLY stm_app_rol
    ADD CONSTRAINT stm_app_rol_pkey PRIMARY KEY (aro_appid, aro_roleid);

ALTER TABLE ONLY stm_app_ter
    ADD CONSTRAINT stm_app_ter_pkey PRIMARY KEY (ate_id);

ALTER TABLE ONLY stm_app_ter
    ADD CONSTRAINT stm_apt_uk UNIQUE (ate_appid, ate_terid);

ALTER TABLE ONLY stm_app_tree
    ADD CONSTRAINT stm_atr_pk PRIMARY KEY (atr_id);

ALTER TABLE ONLY stm_app_tree
    ADD CONSTRAINT stm_atr_uk UNIQUE (atr_appid, atr_treeid);

ALTER TABLE ONLY stm_avail_tsk
    ADD CONSTRAINT stm_ats_uk UNIQUE (ats_terid, ats_taskid);

ALTER TABLE ONLY stm_avail_gi
    ADD CONSTRAINT stm_avail_gi_pkey PRIMARY KEY (agi_id);

ALTER TABLE ONLY stm_avail_tsk
    ADD CONSTRAINT stm_avail_tsk_pkey PRIMARY KEY (ats_id);

ALTER TABLE ONLY stm_backgrd
    ADD CONSTRAINT stm_backgrd_pkey PRIMARY KEY (bac_id);

ALTER TABLE ONLY stm_codelist
    ADD CONSTRAINT stm_cod_uk UNIQUE (cod_list, cod_value);

ALTER TABLE ONLY stm_codelist
    ADD CONSTRAINT stm_codelist_pkey PRIMARY KEY (cod_id);

ALTER TABLE ONLY stm_comment
    ADD CONSTRAINT stm_comment_pkey PRIMARY KEY (com_id);

ALTER TABLE ONLY stm_conf
    ADD CONSTRAINT stm_conf_name_uk UNIQUE (cnf_name);

ALTER TABLE ONLY stm_conf
    ADD CONSTRAINT stm_conf_pkey PRIMARY KEY (cnf_id);

ALTER TABLE ONLY stm_connect
    ADD CONSTRAINT stm_connect_pkey PRIMARY KEY (con_id);

ALTER TABLE ONLY stm_fil_gi
    ADD CONSTRAINT stm_fil_gi_pkey PRIMARY KEY (fgi_id);

ALTER TABLE ONLY stm_geoinfo
    ADD CONSTRAINT stm_geoinfo_pkey PRIMARY KEY (geo_id);

ALTER TABLE ONLY stm_ggi_gi
    ADD CONSTRAINT stm_ggi_gi_pkey PRIMARY KEY (ggg_ggiid, ggg_giid);

ALTER TABLE ONLY stm_grp_gi
    ADD CONSTRAINT stm_grp_gi_pkey PRIMARY KEY (ggi_id);

ALTER TABLE ONLY stm_grp_ter
    ADD CONSTRAINT stm_grp_ter_pkey PRIMARY KEY (gte_termid, gte_terid);

ALTER TABLE ONLY stm_grp_tsk
    ADD CONSTRAINT stm_grp_tsk_pkey PRIMARY KEY (gts_id);

ALTER TABLE ONLY stm_par_gs
    ADD CONSTRAINT stm_gs_pk PRIMARY KEY (gs_id);

ALTER TABLE ONLY stm_gter_typ
    ADD CONSTRAINT stm_gter_typ_pkey PRIMARY KEY (gtt_id);

ALTER TABLE ONLY stm_gter_typ
    ADD CONSTRAINT stm_gtt_name_uk UNIQUE (gtt_name);

ALTER TABLE ONLY stm_language
    ADD CONSTRAINT stm_lan_uk UNIQUE (lan_shortname);

ALTER TABLE ONLY stm_language
    ADD CONSTRAINT stm_language_pkey PRIMARY KEY (lan_id);

ALTER TABLE ONLY stm_literal_translation
    ADD CONSTRAINT stm_literal_translation_pkey PRIMARY KEY (ltr_id);

ALTER TABLE ONLY stm_literal_translation_value
    ADD CONSTRAINT stm_ltv_pkey PRIMARY KEY (ltv_id);

ALTER TABLE ONLY stm_log
    ADD CONSTRAINT stm_log_pkey PRIMARY KEY (log_id);

ALTER TABLE ONLY stm_literal_translation_value
    ADD CONSTRAINT stm_ltv_uk UNIQUE (ltv_ltrid, ltv_lanid);

ALTER TABLE ONLY stm_par_app
    ADD CONSTRAINT stm_par_app_pkey PRIMARY KEY (pap_id);

ALTER TABLE ONLY stm_par_gi
    ADD CONSTRAINT stm_par_gi_pkey PRIMARY KEY (pgi_id);

ALTER TABLE ONLY stm_par_ser
    ADD CONSTRAINT stm_par_ser_pkey PRIMARY KEY (pse_id);

ALTER TABLE ONLY stm_par_sgi
    ADD CONSTRAINT stm_par_sgi_pkey PRIMARY KEY (psg_id);

ALTER TABLE ONLY stm_post
    ADD CONSTRAINT stm_post_pkey PRIMARY KEY (pos_id);

ALTER TABLE ONLY stm_rol_ggi
    ADD CONSTRAINT stm_rol_ggi_pkey PRIMARY KEY (rgg_ggiid, rgg_roleid);

ALTER TABLE ONLY stm_role
    ADD CONSTRAINT stm_rol_name_uk UNIQUE (rol_name);

ALTER TABLE ONLY stm_rol_tsk
    ADD CONSTRAINT stm_rol_tsk_pkey PRIMARY KEY (rts_roleid, rts_taskid);

ALTER TABLE ONLY stm_role
    ADD CONSTRAINT stm_role_pkey PRIMARY KEY (rol_id);

ALTER TABLE ONLY stm_service_check_sample
    ADD CONSTRAINT stm_scs_pk PRIMARY KEY (scs_id);

ALTER TABLE ONLY stm_service_check
    ADD CONSTRAINT stm_sec_pk PRIMARY KEY (sec_id);

ALTER TABLE ONLY stm_service_check
    ADD CONSTRAINT stm_sec_uk UNIQUE (sec_serid, sec_observer);

ALTER TABLE ONLY stm_sequence
    ADD CONSTRAINT stm_sequence_pkey PRIMARY KEY (seq_name);

ALTER TABLE ONLY stm_service
    ADD CONSTRAINT stm_service_pkey PRIMARY KEY (ser_id);

ALTER TABLE ONLY stm_sty_gi
    ADD CONSTRAINT stm_sty_gi_pkey PRIMARY KEY (sgi_id);

ALTER TABLE ONLY stm_service_usage
    ADD CONSTRAINT stm_sus_pk PRIMARY KEY (sus_serid, sus_appid, sus_day, sus_operation);

ALTER TABLE ONLY stm_taskrel
    ADD CONSTRAINT stm_tar_uk_task_alias UNIQUE (tar_taskid, tar_alias);

ALTER TABLE ONLY stm_task
    ADD CONSTRAINT stm_task_pkey PRIMARY KEY (tas_id);

ALTER TABLE ONLY stm_taskrel
    ADD CONSTRAINT stm_taskrel_pkey PRIMARY KEY (tar_id);

ALTER TABLE ONLY stm_territory
    ADD CONSTRAINT stm_ter_name_uk UNIQUE (ter_name);

ALTER TABLE ONLY stm_ter_typ
    ADD CONSTRAINT stm_ter_typ_pkey PRIMARY KEY (tet_id);

ALTER TABLE ONLY stm_territory
    ADD CONSTRAINT stm_territory_pkey PRIMARY KEY (ter_id);

ALTER TABLE ONLY stm_ter_typ
    ADD CONSTRAINT stm_tet_name_uk UNIQUE (tet_name);

ALTER TABLE ONLY stm_token_user
    ADD CONSTRAINT stm_token_user_pkey PRIMARY KEY (user_token_id);

ALTER TABLE ONLY stm_translation
    ADD CONSTRAINT stm_tra_uk UNIQUE (tra_eleid, tra_column, tra_lanid);

ALTER TABLE ONLY stm_translation
    ADD CONSTRAINT stm_translation_pkey PRIMARY KEY (tra_id);

ALTER TABLE ONLY stm_tree_nod
    ADD CONSTRAINT stm_tree_nod_pkey PRIMARY KEY (tno_id);

ALTER TABLE ONLY stm_tree
    ADD CONSTRAINT stm_tree_pkey PRIMARY KEY (tre_id);

ALTER TABLE ONLY stm_tree_rol
    ADD CONSTRAINT stm_tree_rol_pkey PRIMARY KEY (tro_roleid, tro_treeid);

ALTER TABLE ONLY stm_tsk_typ
    ADD CONSTRAINT stm_tsk_typ_pkey PRIMARY KEY (tty_id);

ALTER TABLE ONLY stm_tsk_ui
    ADD CONSTRAINT stm_tsk_ui_pkey PRIMARY KEY (tui_id);

ALTER TABLE ONLY stm_token_user
    ADD CONSTRAINT stm_tus_uk UNIQUE (user_id);

ALTER TABLE ONLY stm_usr_conf
    ADD CONSTRAINT stm_uco_uk UNIQUE (uco_userid, uco_terid, uco_roleid, uco_rolem);

ALTER TABLE ONLY stm_user
    ADD CONSTRAINT stm_use_name_uk UNIQUE (use_user);

ALTER TABLE ONLY stm_user
    ADD CONSTRAINT stm_user_pkey PRIMARY KEY (use_id);

ALTER TABLE ONLY stm_usr_conf
    ADD CONSTRAINT stm_usr_conf_pkey PRIMARY KEY (uco_id);

CREATE INDEX stm_scs_ix_ser_obs ON stm_service_check_sample USING btree (scs_serid, scs_observed);

CREATE UNIQUE INDEX stm_ltr_literal_uk ON stm_literal_translation (md5(ltr_literal));

ALTER TABLE ONLY stm_app_bckg
    ADD CONSTRAINT stm_abc_fk_app FOREIGN KEY (abc_appid) REFERENCES stm_app(app_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_app_bckg
    ADD CONSTRAINT stm_abc_fk_fon FOREIGN KEY (abc_backid) REFERENCES stm_backgrd(bac_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_avail_gi
    ADD CONSTRAINT stm_agi_fk_geo FOREIGN KEY (agi_giid) REFERENCES stm_geoinfo(geo_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_avail_gi
    ADD CONSTRAINT stm_agi_fk_ter FOREIGN KEY (agi_terid) REFERENCES stm_territory(ter_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_app
    ADD CONSTRAINT stm_app_fk_ggi FOREIGN KEY (app_ggiid) REFERENCES stm_grp_gi(ggi_id);

ALTER TABLE ONLY stm_app
    ADD CONSTRAINT stm_app_fk_use FOREIGN KEY (app_creatorid) REFERENCES stm_user(use_id);

ALTER TABLE ONLY stm_app_rol
    ADD CONSTRAINT stm_aro_fk_app FOREIGN KEY (aro_appid) REFERENCES stm_app(app_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_app_rol
    ADD CONSTRAINT stm_aro_fk_rol FOREIGN KEY (aro_roleid) REFERENCES stm_role(rol_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_app_ter
    ADD CONSTRAINT stm_ate_fk_app FOREIGN KEY (ate_appid) REFERENCES stm_app(app_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_app_ter
    ADD CONSTRAINT stm_ate_fk_ter FOREIGN KEY (ate_terid) REFERENCES stm_territory(ter_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_app_tree
    ADD CONSTRAINT stm_atr_fk_app FOREIGN KEY (atr_appid) REFERENCES stm_app(app_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_app_tree
    ADD CONSTRAINT stm_atr_fk_tre FOREIGN KEY (atr_treeid) REFERENCES stm_tree(tre_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_avail_tsk
    ADD CONSTRAINT stm_ats_fk_tas FOREIGN KEY (ats_taskid) REFERENCES stm_task(tas_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_avail_tsk
    ADD CONSTRAINT stm_ats_fk_ter FOREIGN KEY (ats_terid) REFERENCES stm_territory(ter_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_backgrd
    ADD CONSTRAINT stm_bac_fk_ggi FOREIGN KEY (bac_ggiid) REFERENCES stm_grp_gi(ggi_id);

ALTER TABLE ONLY stm_comment
    ADD CONSTRAINT stm_com_fk_app FOREIGN KEY (com_appid) REFERENCES stm_app(app_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_comment
    ADD CONSTRAINT stm_com_fk_use FOREIGN KEY (com_userid) REFERENCES stm_user(use_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_fil_gi
    ADD CONSTRAINT stm_fgi_fk_geo FOREIGN KEY (fgi_giid) REFERENCES stm_geoinfo(geo_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_fil_gi
    ADD CONSTRAINT stm_fgi_fk_tet FOREIGN KEY (fgi_typid) REFERENCES stm_ter_typ(tet_id);

ALTER TABLE ONLY stm_geoinfo
    ADD CONSTRAINT stm_geo_fk_con FOREIGN KEY (geo_connid) REFERENCES stm_connect(con_id);

ALTER TABLE ONLY stm_geoinfo
    ADD CONSTRAINT stm_geo_fk_ser FOREIGN KEY (geo_serid) REFERENCES stm_service(ser_id);

ALTER TABLE ONLY stm_geoinfo
    ADD CONSTRAINT stm_geo_fk_sersel FOREIGN KEY (geo_serselid) REFERENCES stm_service(ser_id);

ALTER TABLE ONLY stm_geoinfo
    ADD CONSTRAINT stm_geo_fk_sgi FOREIGN KEY (geo_styid) REFERENCES stm_sty_gi(sgi_id);

ALTER TABLE ONLY stm_geoinfo
    ADD CONSTRAINT stm_geo_uk_styid UNIQUE (geo_styid);

ALTER TABLE ONLY stm_ggi_gi
    ADD CONSTRAINT stm_ggg_fk_geo FOREIGN KEY (ggg_giid) REFERENCES stm_geoinfo(geo_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_ggi_gi
    ADD CONSTRAINT stm_ggg_fk_ggi FOREIGN KEY (ggg_ggiid) REFERENCES stm_grp_gi(ggi_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_par_gs
    ADD CONSTRAINT stm_gs_fk_geo FOREIGN KEY (gs_geoid) REFERENCES stm_geoinfo(geo_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_grp_ter
    ADD CONSTRAINT stm_gte_fk_ter FOREIGN KEY (gte_terid) REFERENCES stm_territory(ter_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_grp_ter
    ADD CONSTRAINT stm_gte_fk_term FOREIGN KEY (gte_termid) REFERENCES stm_territory(ter_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_log
    ADD CONSTRAINT stm_log_fk_appid FOREIGN KEY (log_appid) REFERENCES stm_app(app_id);

ALTER TABLE ONLY stm_log
    ADD CONSTRAINT stm_log_fk_giid FOREIGN KEY (log_giid) REFERENCES stm_geoinfo(geo_id);

ALTER TABLE ONLY stm_log
    ADD CONSTRAINT stm_log_fk_taskid FOREIGN KEY (log_taskid) REFERENCES stm_task(tas_id);

ALTER TABLE ONLY stm_log
    ADD CONSTRAINT stm_log_fk_terid FOREIGN KEY (log_terid) REFERENCES stm_territory(ter_id);

ALTER TABLE ONLY stm_log
    ADD CONSTRAINT stm_log_fk_userid FOREIGN KEY (log_userid) REFERENCES stm_user(use_id);

ALTER TABLE ONLY stm_literal_translation
    ADD CONSTRAINT stm_ltr_fk_lan FOREIGN KEY (ltr_lanid) REFERENCES stm_language(lan_id);

ALTER TABLE ONLY stm_literal_translation_value
    ADD CONSTRAINT stm_ltv_fk_lan FOREIGN KEY (ltv_lanid) REFERENCES stm_language(lan_id);

ALTER TABLE ONLY stm_literal_translation_value
    ADD CONSTRAINT stm_ltv_fk_ltr FOREIGN KEY (ltv_ltrid) REFERENCES stm_literal_translation(ltr_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_par_app
    ADD CONSTRAINT stm_pap_fk_app FOREIGN KEY (pap_appid) REFERENCES stm_app(app_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_par_gi
    ADD CONSTRAINT stm_pgi_fk_geo FOREIGN KEY (pgi_giid) REFERENCES stm_geoinfo(geo_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_post
    ADD CONSTRAINT stm_pos_fk_ter FOREIGN KEY (pos_terid) REFERENCES stm_territory(ter_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_post
    ADD CONSTRAINT stm_pos_fk_use FOREIGN KEY (pos_userid) REFERENCES stm_user(use_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_par_ser
    ADD CONSTRAINT stm_pse_fk_ser FOREIGN KEY (pse_serid) REFERENCES stm_service(ser_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_par_sgi
    ADD CONSTRAINT stm_psg_fk_geo FOREIGN KEY (psg_giid) REFERENCES stm_geoinfo(geo_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_rol_ggi
    ADD CONSTRAINT stm_rgg_fk_ggi FOREIGN KEY (rgg_ggiid) REFERENCES stm_grp_gi(ggi_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_rol_ggi
    ADD CONSTRAINT stm_rgg_fk_rol FOREIGN KEY (rgg_roleid) REFERENCES stm_role(rol_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_rol_tsk
    ADD CONSTRAINT stm_rts_fk_rol FOREIGN KEY (rts_roleid) REFERENCES stm_role(rol_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_rol_tsk
    ADD CONSTRAINT stm_rts_fk_tas FOREIGN KEY (rts_taskid) REFERENCES stm_task(tas_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_service_check_sample
    ADD CONSTRAINT stm_scs_fk_ser FOREIGN KEY (scs_serid) REFERENCES stm_service(ser_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_service_check
    ADD CONSTRAINT stm_sec_fk_ser FOREIGN KEY (sec_serid) REFERENCES stm_service(ser_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_sty_gi
    ADD CONSTRAINT stm_sgi_fk_geo FOREIGN KEY (sgi_giid) REFERENCES stm_geoinfo(geo_id);

ALTER TABLE ONLY stm_service_usage
    ADD CONSTRAINT stm_sus_fk_app FOREIGN KEY (sus_appid) REFERENCES stm_app(app_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_service_usage
    ADD CONSTRAINT stm_sus_fk_ser FOREIGN KEY (sus_serid) REFERENCES stm_service(ser_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_taskrel
    ADD CONSTRAINT stm_tar_fk_tas FOREIGN KEY (tar_taskid) REFERENCES stm_task(tas_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_taskrel
    ADD CONSTRAINT stm_tar_fk_tas_rel FOREIGN KEY (tar_taskrelid) REFERENCES stm_task(tas_id);

ALTER TABLE ONLY stm_task
    ADD CONSTRAINT stm_tas_fk_con FOREIGN KEY (tas_connid) REFERENCES stm_connect(con_id);

ALTER TABLE ONLY stm_task
    ADD CONSTRAINT stm_tas_fk_geo FOREIGN KEY (tas_giid) REFERENCES stm_geoinfo(geo_id);

ALTER TABLE ONLY stm_task
    ADD CONSTRAINT stm_tas_fk_gts FOREIGN KEY (tas_gtaskid) REFERENCES stm_grp_tsk(gts_id);

ALTER TABLE ONLY stm_task
    ADD CONSTRAINT stm_tas_fk_ser FOREIGN KEY (tas_serid) REFERENCES stm_service(ser_id);

ALTER TABLE ONLY stm_task
    ADD CONSTRAINT stm_tas_fk_tty FOREIGN KEY (tas_ttaskid) REFERENCES stm_tsk_typ(tty_id);

ALTER TABLE ONLY stm_task
    ADD CONSTRAINT stm_tas_fk_tui FOREIGN KEY (tas_tuiid) REFERENCES stm_tsk_ui(tui_id);

ALTER TABLE ONLY stm_territory
    ADD CONSTRAINT stm_ter_fk_gtt FOREIGN KEY (ter_gtypid) REFERENCES stm_gter_typ(gtt_id);

ALTER TABLE ONLY stm_territory
    ADD CONSTRAINT stm_ter_fk_tet FOREIGN KEY (ter_typid) REFERENCES stm_ter_typ(tet_id);

ALTER TABLE ONLY stm_tree_nod
    ADD CONSTRAINT stm_tno_fk_geo FOREIGN KEY (tno_giid) REFERENCES stm_geoinfo(geo_id);

ALTER TABLE ONLY stm_tree_nod
    ADD CONSTRAINT stm_tno_fk_tas FOREIGN KEY (tno_taskid) REFERENCES stm_task(tas_id);

ALTER TABLE ONLY stm_tree_nod
    ADD CONSTRAINT stm_tno_fk_tno FOREIGN KEY (tno_parentid) REFERENCES stm_tree_nod(tno_id);

ALTER TABLE ONLY stm_tree_nod
    ADD CONSTRAINT stm_tno_fk_tre FOREIGN KEY (tno_treeid) REFERENCES stm_tree(tre_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_translation
    ADD CONSTRAINT stm_tra_fk_lan FOREIGN KEY (tra_lanid) REFERENCES stm_language(lan_id);

ALTER TABLE ONLY stm_tree
    ADD CONSTRAINT stm_tre_fk_use FOREIGN KEY (tre_userid) REFERENCES stm_user(use_id);

ALTER TABLE ONLY stm_tree_rol
    ADD CONSTRAINT stm_tro_fk_rol FOREIGN KEY (tro_roleid) REFERENCES stm_role(rol_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_tree_rol
    ADD CONSTRAINT stm_tro_fk_tre FOREIGN KEY (tro_treeid) REFERENCES stm_tree(tre_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_tsk_typ
    ADD CONSTRAINT stm_tty_fk_tty FOREIGN KEY (tty_parentid) REFERENCES stm_tsk_typ(tty_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_usr_conf
    ADD CONSTRAINT stm_uco_fk_rol FOREIGN KEY (uco_roleid) REFERENCES stm_role(rol_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_usr_conf
    ADD CONSTRAINT stm_uco_fk_ter FOREIGN KEY (uco_terid) REFERENCES stm_territory(ter_id) ON DELETE CASCADE;

ALTER TABLE ONLY stm_usr_conf
    ADD CONSTRAINT stm_uco_fk_usu FOREIGN KEY (uco_userid) REFERENCES stm_user(use_id) ON DELETE CASCADE;
