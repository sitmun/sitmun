# Liquibase changelogs

How database changes are laid out across versions. This file is outside the changelog trees on purpose: the immutability gate freezes every file in them once it is tagged. It applies to three trees:

| Tree | Master | Context |
|---|---|---|
| Shipped (every install) | [`db.changelog-master.yaml`](../sitmun-backend/src/main/resources/db/changelog/db.changelog-master.yaml) | none |
| Showcase profile | [`profiles/showcase/liquibase/master.xml`](../profiles/showcase/liquibase/master.xml) | `showcase` |
| Development profile | [`profiles/development/backend/liquibase/master.xml`](../profiles/development/backend/liquibase/master.xml) | `dev` |

Both profile masters include the shipped master first. `profiles/postgres` and `profiles/oracle` only include it.

## Rules

1. **A released file is frozen.** A file that is in the latest `v*` tag is never edited, moved, or deleted. Liquibase stores each changeset's checksum, and a changed file stops the backend of every database that applied it. Fix it with a new changeset in the next version.
2. **One folder per version.** A new changeset goes in `releases/<version>/` of its tree (the shipped tree is `sitmun-backend/src/main/resources/db/changelog`), where `<version>` is the next release. The folder's entry file is `db.changelog-<version>.yaml`. The master includes it after every earlier entry, in version order.
3. **Pre-upgrade slot.** In the shipped tree only, a change that the upgrade's version check depends on goes in `db.changelog-<version>-pre-upgrade.yaml`. The master includes it before `upgrade/db.changelog-upgrade.yaml`, in version order. It also runs on a fresh install, before the baseline creates any table, so it has to work on an empty database. [`releases/1.3.1/db.changelog-1.3.1-pre-upgrade.yaml`](../sitmun-backend/src/main/resources/db/changelog/releases/1.3.1/db.changelog-1.3.1-pre-upgrade.yaml) is the first.
4. **File names.** Inside a folder, files are `NN-topic[.dbms].sql|yaml|csv`. `NN` starts at `01` in each version. The entry file lists them in order.
5. **Identity.** Each changeset has author `sitmun`, an id unique in its tree (`topic[-dbms]`), and a `logicalFilePath` that names its own file in its folder: `db/changelog/releases/<version>/<file>` in the shipped tree, `releases/<version>/<file>` in a profile. Without it, Liquibase 4.31.0 and later record the logical path of whichever master loaded the changeset, and the same changeset runs again under the other master ([#403](https://github.com/sitmun/sitmun/issues/403), [#404](https://github.com/sitmun/sitmun/issues/404)).
6. **Open until the tag.** Files in the folder of the version under development may change. A database that already applied the old content fails its checksum and has to be recreated. Once the version is tagged, the folder is frozen and takes no new file.
7. **Seed data moves forward.** A released CSV is never edited. A wrong row is fixed with an `UPDATE` in the version folder. New rows may come from a CSV in that folder. A changeset that inserts rows with explicit ids also advances `STM_SEQUENCE` for those tables: in the development profile, `14_update_sequences.sql` runs before the version folders.
8. **Dialects.** The shipped tree runs on PostgreSQL 12 or later and Oracle 11g Release 2 or later. Split a statement by `dbms:` when the dialects differ, and check both. The showcase runs on PostgreSQL only.

## Before this layout

These entries predate the policy and stay where they are, frozen by rule 1. New work does not join them.

- Shipped tree: `upgrade/`, the `baseline-*` changesets, and the 1.3.0 files at the top of `db/changelog` (`service-check-observed-timestamptz.*`, `setup-language-configured.*`, `literal-translation-value-pkey.postgresql.sql`).
- Showcase: `changelog/01_showcase_data.yaml` to `changelog/04_showcase_cami_extent.yaml`.
- Development: `changelog/04_initial_data_dev.yaml` to `changelog/86_dev_setup_language_configured.sql`, and `changelog/14_update_sequences.sql`.

## Adding a change

1. Create `releases/<next-version>/` in the tree if it does not exist, with its entry file, and include the entry file in the master.
2. Add `NN-topic.sql` (or `.yaml`/`.csv`) and a changeset for it in the entry file, with its `logicalFilePath` and the tree's context.
3. Run the gates.

## Gates

```bash
python3 tools/tests/test_changelog_layout.py
python3 tools/tests/test_changelog_logical_paths.py
python3 tools/bin/check_changelog_immutability.py --base origin/dev
```

| Check | Enforces |
|---|---|
| [`test_changelog_layout.py`](../tools/tests/test_changelog_layout.py) | Rules 2, 3, 4, and the frozen folder of rule 6 |
| [`test_changelog_logical_paths.py`](../tools/tests/test_changelog_logical_paths.py) | Rule 5 |
| [`check_changelog_immutability.py`](../tools/bin/check_changelog_immutability.py) | Rule 1 |

The CI job is [`liquibase-immutability.yml`](../.github/workflows/liquibase-immutability.yml). An upgrade is checked end to end by [`liquibase-upgrade.yml`](../.github/workflows/liquibase-upgrade.yml).
