--liquibase formatted sql

-- A timestamp without time zone has no zone of its own. These columns
-- were written with hibernate.jdbc.time_zone set to UTC, so the copy
-- treats each stored value as UTC before the column gains a time zone.

--changeset sitmun:service-check-sec-observed-timestamptz-postgresql dbms:postgresql splitStatements:false
DO $$
DECLARE
  l_type text;
  l_tz integer;
BEGIN
  SELECT c.data_type INTO l_type
  FROM information_schema.columns c
  WHERE c.table_schema = current_schema()
    AND c.table_name = 'stm_service_check'
    AND c.column_name = 'sec_observed';

  SELECT COUNT(*) INTO l_tz
  FROM information_schema.columns c
  WHERE c.table_schema = current_schema()
    AND c.table_name = 'stm_service_check'
    AND c.column_name = 'sec_observed_tz';

  IF l_type = 'timestamp with time zone' THEN
    IF l_tz = 1 THEN
      EXECUTE 'ALTER TABLE stm_service_check DROP COLUMN sec_observed_tz';
    END IF;
  ELSIF l_type = 'timestamp without time zone' THEN
    IF l_tz = 0 THEN
      EXECUTE 'ALTER TABLE stm_service_check ADD COLUMN sec_observed_tz timestamp with time zone';
    END IF;
    EXECUTE 'UPDATE stm_service_check SET sec_observed_tz = sec_observed AT TIME ZONE ''UTC'' WHERE sec_observed_tz IS NULL';
    EXECUTE 'ALTER TABLE stm_service_check ALTER COLUMN sec_observed_tz SET NOT NULL';
    EXECUTE 'ALTER TABLE stm_service_check DROP COLUMN sec_observed';
    EXECUTE 'ALTER TABLE stm_service_check RENAME COLUMN sec_observed_tz TO sec_observed';
  ELSIF l_type IS NULL AND l_tz = 1 THEN
    EXECUTE 'ALTER TABLE stm_service_check ALTER COLUMN sec_observed_tz SET NOT NULL';
    EXECUTE 'ALTER TABLE stm_service_check RENAME COLUMN sec_observed_tz TO sec_observed';
  END IF;
END $$;

--changeset sitmun:service-check-scs-observed-timestamptz-postgresql dbms:postgresql splitStatements:false
DO $$
DECLARE
  l_type text;
  l_tz integer;
BEGIN
  SELECT c.data_type INTO l_type
  FROM information_schema.columns c
  WHERE c.table_schema = current_schema()
    AND c.table_name = 'stm_service_check_sample'
    AND c.column_name = 'scs_observed';

  SELECT COUNT(*) INTO l_tz
  FROM information_schema.columns c
  WHERE c.table_schema = current_schema()
    AND c.table_name = 'stm_service_check_sample'
    AND c.column_name = 'scs_observed_tz';

  IF l_type = 'timestamp with time zone' THEN
    IF l_tz = 1 THEN
      EXECUTE 'ALTER TABLE stm_service_check_sample DROP COLUMN scs_observed_tz';
    END IF;
  ELSIF l_type = 'timestamp without time zone' THEN
    IF l_tz = 0 THEN
      EXECUTE 'ALTER TABLE stm_service_check_sample ADD COLUMN scs_observed_tz timestamp with time zone';
    END IF;
    EXECUTE 'UPDATE stm_service_check_sample SET scs_observed_tz = scs_observed AT TIME ZONE ''UTC'' WHERE scs_observed_tz IS NULL';
    EXECUTE 'ALTER TABLE stm_service_check_sample ALTER COLUMN scs_observed_tz SET NOT NULL';
    EXECUTE 'ALTER TABLE stm_service_check_sample DROP COLUMN scs_observed';
    EXECUTE 'ALTER TABLE stm_service_check_sample RENAME COLUMN scs_observed_tz TO scs_observed';
  ELSIF l_type IS NULL AND l_tz = 1 THEN
    EXECUTE 'ALTER TABLE stm_service_check_sample ALTER COLUMN scs_observed_tz SET NOT NULL';
    EXECUTE 'ALTER TABLE stm_service_check_sample RENAME COLUMN scs_observed_tz TO scs_observed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = current_schema() AND indexname = 'stm_scs_ix_ser_obs'
  ) THEN
    EXECUTE 'CREATE INDEX stm_scs_ix_ser_obs ON stm_service_check_sample (scs_serid, scs_observed)';
  END IF;
END $$;
