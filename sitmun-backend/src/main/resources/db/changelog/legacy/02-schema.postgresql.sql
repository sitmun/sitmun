ALTER TABLE stm_par_gi ADD COLUMN pgi_options text;

CREATE TABLE stm_par_gs (
    gs_id integer NOT NULL,
    gs_geoid integer NOT NULL,
    gs_name character varying(50) NOT NULL,
    gs_value character varying(250),
    gs_type character varying(50) NOT NULL
);

ALTER TABLE stm_par_gs
    ADD CONSTRAINT stm_gs_pk PRIMARY KEY (gs_id);

ALTER TABLE stm_par_gs
    ADD CONSTRAINT stm_gs_fk_geo FOREIGN KEY (gs_geoid) REFERENCES stm_geoinfo(geo_id) ON DELETE CASCADE;

CREATE TABLE stm_service_check (
    sec_id integer NOT NULL,
    sec_serid integer NOT NULL,
    sec_observer character varying(16) NOT NULL,
    sec_status character varying(50) NOT NULL,
    sec_rank integer NOT NULL,
    sec_observed timestamp without time zone NOT NULL,
    sec_elapsed bigint NOT NULL,
    sec_detail character varying(4000)
);

ALTER TABLE stm_service_check
    ADD CONSTRAINT stm_sec_pk PRIMARY KEY (sec_id);

ALTER TABLE stm_service_check
    ADD CONSTRAINT stm_sec_uk UNIQUE (sec_serid, sec_observer);

ALTER TABLE stm_service_check
    ADD CONSTRAINT stm_sec_fk_ser FOREIGN KEY (sec_serid) REFERENCES stm_service(ser_id) ON DELETE CASCADE;

CREATE TABLE stm_service_check_sample (
    scs_id integer NOT NULL,
    scs_serid integer NOT NULL,
    scs_observer character varying(16) NOT NULL,
    scs_status character varying(50) NOT NULL,
    scs_rank integer NOT NULL,
    scs_elapsed bigint NOT NULL,
    scs_observed timestamp without time zone NOT NULL
);

ALTER TABLE stm_service_check_sample
    ADD CONSTRAINT stm_scs_pk PRIMARY KEY (scs_id);

ALTER TABLE stm_service_check_sample
    ADD CONSTRAINT stm_scs_fk_ser FOREIGN KEY (scs_serid) REFERENCES stm_service(ser_id) ON DELETE CASCADE;

CREATE INDEX stm_scs_ix_ser_obs ON stm_service_check_sample (scs_serid, scs_observed);

CREATE TABLE stm_service_usage (
    sus_serid integer NOT NULL,
    sus_appid integer NOT NULL,
    sus_day date NOT NULL,
    sus_operation character varying(32) NOT NULL,
    sus_requests bigint NOT NULL,
    sus_failed bigint NOT NULL
);

ALTER TABLE stm_service_usage
    ADD CONSTRAINT stm_sus_pk PRIMARY KEY (sus_serid, sus_appid, sus_day, sus_operation);

ALTER TABLE stm_service_usage
    ADD CONSTRAINT stm_sus_fk_app FOREIGN KEY (sus_appid) REFERENCES stm_app(app_id) ON DELETE CASCADE;

ALTER TABLE stm_service_usage
    ADD CONSTRAINT stm_sus_fk_ser FOREIGN KEY (sus_serid) REFERENCES stm_service(ser_id) ON DELETE CASCADE;

UPDATE stm_tree_nod SET tno_active = true WHERE tno_active IS NULL;

ALTER TABLE stm_tree_nod ALTER COLUMN tno_active SET DEFAULT true;

ALTER TABLE stm_tree_nod ALTER COLUMN tno_active SET NOT NULL;

CREATE UNIQUE INDEX stm_ltr_literal_uk ON stm_literal_translation (md5(ltr_literal));
