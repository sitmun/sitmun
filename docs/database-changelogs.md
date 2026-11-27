# Database changelogs

How Liquibase changes are laid out across versions. The same rules apply to every Liquibase tree in the repository:

| Tree | Master | Loaded by |
|---|---|---|
| Shipped | [`sitmun-backend/src/main/resources/db/changelog/db.changelog-master.yaml`](../sitmun-backend/src/main/resources/db/changelog/db.changelog-master.yaml) | every install, through the profiles below |
| Backend tests | [`sitmun-backend/src/test/resources/db/changelog-test/db.changelog-master.yaml`](../sitmun-backend/src/test/resources/db/changelog-test/db.changelog-master.yaml) | Gradle tests on H2, PostgreSQL, and Oracle |
| PostgreSQL profile | [`profiles/postgres/liquibase/master.xml`](../profiles/postgres/liquibase/master.xml) | `profiles/postgres.env` |
| Oracle profile | [`profiles/oracle/liquibase/master.xml`](../profiles/oracle/liquibase/master.xml) | `profiles/oracle.env` |
| Showcase | [`profiles/showcase/liquibase/master.xml`](../profiles/showcase/liquibase/master.xml) | `profiles/showcase.env`, context `showcase` |
| Development | [`profiles/development/backend/liquibase/master.xml`](../profiles/development/backend/liquibase/master.xml) | `profiles/development-*.env`, context `dev` |

Every other master includes the shipped one, so a shipped change reaches every tree. The PostgreSQL and Oracle profiles have no changes of their own.

## Rules

1. **Released files never change.** A file in the latest `v*` tag is never edited, moved, or deleted. A released master keeps every line and only gains `releases/<version>.yaml` includes. Liquibase stores each changeset's checksum, and a changed changeset stops the backend of every database that ran it.
2. **A merged changeset never changes.** Once a changeset is on `dev`, developer and staging databases may have run it. A fix is a new changeset.
3. **One changelog per version.** Each tree keeps the changes of a version in `releases/<version>.yaml`, included at the end of its master, in version order. The changesets are inline. SQL and CSV files they call through `sqlFile` or `loadData` sit in `releases/<version>/`, and hold no changesets themselves.
4. **Identity.** Every changeset in a version file has `logicalFilePath: master.xml`, author `sitmun`, and an id `<version>-<issue>-<topic>[-<dbms>]`, for example `1.3.1-375-legend-type`, unique across the trees. Leave out `<issue>` only when there is none.

Rule 4 follows from how Liquibase tells changesets apart: by id, author, and `FILENAME`. Pinned to `master.xml`, a changeset records the same `FILENAME` whatever master loads it and whatever Liquibase version runs it, and the id alone identifies it. Without the pin, a master's `logicalFilePath` reaches included files only from Liquibase 4.31.0 on, and the same changeset is recorded under another name by another master ([#403](https://github.com/sitmun/sitmun/issues/403), [#404](https://github.com/sitmun/sitmun/issues/404)). Liquibase allows any string here ([logicalFilePath](https://docs.liquibase.com/oss/reference-guide-4-33/changelog-attributes/logicalfilepath)). Keycloak uses the same version-file layout and id form ([jpa-changelog-26.8.0.xml](https://github.com/keycloak/keycloak/blob/main/model/jpa/src/main/resources/META-INF/jpa-changelog-26.8.0.xml)).

## Notes

- **The 1.3.1 exception.** [`releases/1.3.1-upgrade.yaml`](../sitmun-backend/src/main/resources/db/changelog/releases/1.3.1-upgrade.yaml) is included before `upgrade/db.changelog-upgrade.yaml`, not at the end. It renames 1.2.x `DATABASECHANGELOG` rows that the frozen 1.3.0 version check reads ([#403](https://github.com/sitmun/sitmun/issues/403), [1.2.9 to 1.3.0](upgrade/1.2.9-to-1.3.0.md)). It also runs on a fresh install, before the baseline creates any table. Only the shipped tree has an `-upgrade` file.
- **Dialects.** The shipped tree runs on PostgreSQL 12 or later and Oracle 11g Release 2 or later. Split a changeset by `dbms:` when they differ. The backend tests also run the shipped changesets on H2: a change H2 needs and the shipped changeset filters out goes in the test tree's version file with `dbms: h2`.
- **Seed data.** A wrong released row is fixed with an `UPDATE` in the version file. A changeset that inserts rows with explicit ids also advances `STM_SEQUENCE` for those tables.
- **Before this layout.** Files outside `releases/` predate it: the `upgrade/` path, the baseline, the loose 1.3.0 files, the test fixtures, the showcase `changelog/01_`–`04_` files, and the development `changelog/NN_` files. Rule 1 freezes them, and new work does not join them. Their `FILENAME`s vary: the baseline, the 1.2.9 to 1.3.0 upgrade, and `setup-language-configured.*` record their own paths; the 1.2.8 to 1.2.9 upgrade, `service-check-observed-timestamptz.*`, and `literal-translation-value-pkey.postgresql.sql` record `master.xml`; unpinned profile changesets record their master's `logicalFilePath`.

## Adding a change

1. Open `releases/<next-version>.yaml` in the tree, creating it with `databaseChangeLog:` and an include at the end of the master if it does not exist.
2. Append a changeset with `logicalFilePath: master.xml`, author `sitmun`, a `<version>-<issue>-<topic>` id, and the tree's context. Put long or per-dialect SQL in `releases/<next-version>/` and call it with `sqlFile`.
3. Run the gates.

## Gates

```bash
python3 tools/tests/test_changelog_logical_paths.py
python3 tools/bin/check_changelog_immutability.py --base origin/dev
```

| Check | Enforces |
|---|---|
| [`check_changelog_immutability.py`](../tools/bin/check_changelog_immutability.py) | Rule 1 in every tree, including that a released master only gains version includes, after the released entries, in version order, for versions after the tag, naming files that exist |
| [`test_changelog_logical_paths.py`](../tools/tests/test_changelog_logical_paths.py) | Rules 3 and 4: version files hold block-style changesets only and are included by their master, called files sit in their version folder and are all called, and every changeset has the pin, author, and id. It fails on anything it cannot read |

Rule 2 is not checked: a changeset merged to `dev` and edited before the release tag passes the gates, and breaks the databases that ran it. The CI job is [`liquibase-immutability.yml`](../.github/workflows/liquibase-immutability.yml). An upgrade runs end to end in [`liquibase-upgrade.yml`](../.github/workflows/liquibase-upgrade.yml).
