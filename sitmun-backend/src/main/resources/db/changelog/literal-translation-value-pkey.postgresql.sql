--liquibase formatted sql

-- The fresh baseline names this key stm_ltv_pkey, the same name Oracle uses.
-- A database that already applied the longer name keeps that name until this
-- statement renames it. Oracle 11 allows 30 characters in an identifier.

--changeset sitmun:rename-ltv-pkey-postgresql dbms:postgresql
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:1 SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema = current_schema() AND table_name = 'stm_literal_translation_value' AND constraint_name = 'stm_literal_translation_value_pkey'
ALTER TABLE stm_literal_translation_value RENAME CONSTRAINT stm_literal_translation_value_pkey TO stm_ltv_pkey;
