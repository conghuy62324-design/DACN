#!/usr/bin/env bash
# Protected source/restore connections are selected explicitly through separate libpq service files.
set -euo pipefail
umask 077
test $# -ge 1
mode=$1; shift
for cmd in age tar sha256sum mktemp; do command -v "$cmd" >/dev/null; done
stage=$(mktemp -d "${TMPDIR:-/tmp}/hugo-backup.XXXXXXXX")
trap 'rm -rf -- "$stage"' EXIT
missing() { printf '%s\n' "$1" >&2; exit 2; }

if [[ $mode == dump ]]; then
  test $# -eq 4 || missing 'dump requires the staging service, exported media dir, release metadata and output.age'
  source_service=$1; shift
  [[ $source_service == hugo_2141c_stage ]] || missing 'Invalid backup source service'
  source_id=$(psql -X -w -At -d "service=$source_service" -v ON_ERROR_STOP=1 -c \
    "select current_database()||':'||coalesce(shobj_description(oid,'pg_database'),'') from pg_database where datname=current_database()")
  [[ $source_id == hugo_2141c_stage_test:hugotravel-production-v1 ]] || missing 'Backup source differs from the staging manifest'
  pg_dump --no-password --format=custom --no-owner --no-privileges --dbname="service=$source_service" --file="$stage/source.dump"
  bash "$0" pack "$stage/source.dump" "$@"
  exit
fi

if [[ $mode == pack ]]; then
  test $# -eq 4 || missing 'pack requires dump, exported media dir, release metadata and output.age'
  dump=$1; media=$2; release=$3; output=$4
  [[ -f $dump && -d $media && -f $release && $output == *.age && ! -e $output ]] || missing 'Invalid pack inputs'
  : "${AGE_RECIPIENT:?Set recipient from the authorized backup policy}"
  [[ -z $(find "$media" \( -type l -o ! -type f -a ! -type d \) -print -quit) ]] || missing 'Media must be regular files/directories'
  pg_restore --list "$dump" >/dev/null
  cp -- "$dump" "$stage/database.dump"
  cp -- "$release" "$stage/release.json"
  tar -C "$media" --format=posix --no-acls --no-xattrs -cf "$stage/media.tar" .
  (cd "$media" && find . -type f -print0 | LC_ALL=C sort -z | xargs -0 -r sha256sum) > "$stage/media.sha256"
  (cd "$stage" && sha256sum database.dump release.json media.tar media.sha256 > manifest.sha256)
  tar -C "$stage" -cf - database.dump release.json media.tar media.sha256 manifest.sha256 |
    age -r "$AGE_RECIPIENT" -o "$stage/release.age"
  # Atomic and refuses overwrite. Copy only ciphertext into the output directory.
  partial=$(mktemp "$(dirname "$output")/.hugo-archive.XXXXXXXX")
  trap 'rm -f -- "$partial"; rm -rf -- "$stage"' EXIT
  cat "$stage/release.age" > "$partial"
  ln -- "$partial" "$output"
  sha256sum "$output"
  exit
fi

[[ $mode == verify || $mode == restore ]] || missing 'Use dump, pack, verify, or restore'
test $# -ge 1 || missing 'Archive argument required'
archive=$1; shift
: "${AGE_IDENTITY_FILE:?Set a protected offline identity path}"
: "${HUGO_ARCHIVE_SHA256:?Set the archive SHA-256 from the independent backup receipt}"
archive_checksum=$(sha256sum < "$archive")
[[ ${archive_checksum%% *} == "$HUGO_ARCHIVE_SHA256" ]] || missing 'Archive checksum differs from the protected receipt'
age -d -i "$AGE_IDENTITY_FILE" -o "$stage/payload.tar" "$archive"
for file in database.dump release.json media.tar media.sha256 manifest.sha256; do
  tar -xOf "$stage/payload.tar" "$file" > "$stage/$file"
done
(cd "$stage" && sha256sum --strict --check manifest.sha256 >&2)
pg_restore --list "$stage/database.dump" >/dev/null
if [[ $mode == verify ]]; then
  test $# -eq 0
  printf '%s\n' 'ARCHIVE_READABLE'
  exit
fi

# Only an explicitly named rehearsal database is accepted by this restore path.
test $# -eq 2 || missing 'restore requires a new database service and empty media directory'
service=$1; media=$2
: "${HUGO_RESTORE_EXPECTED_DB:?Exact database name from the approved restore manifest}"
[[ $HUGO_RESTORE_EXPECTED_DB == hugo_2141c_restore_test && $service == hugo_2141c_restore ]] ||
  missing 'Restore target differs from rehearsal manifest'
[[ -d $media && ! -L $media && -z $(find "$media" -mindepth 1 -print -quit) ]] || missing 'Media directory must be new and empty'
identity_sql="select current_database()||':'||coalesce(shobj_description(oid,'pg_database'),'')||':'||(select count(*) from pg_tables where schemaname in ('public','agent_reliability') and tablename<>'spatial_ref_sys') from pg_database where datname=current_database()"
restore_container=
if [[ ${HUGO_RESTORE_LOCAL_COMPOSE:-false} == true ]]; then
  container_name=hugotravel-2141c-restore-postgres-1
  label=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}:{{index .Config.Labels "com.docker.compose.service"}}:{{.State.Running}}' "$container_name")
  volume=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}' "$container_name")
  [[ $label == hugotravel-2141c-restore:postgres:true && $volume == hugotravel-2141c-restore_postgres_data ]] || missing 'Restore container differs from the rehearsal manifest'
  restore_container=$(docker inspect --format '{{.Id}}' "$container_name")
  target=$(docker exec -u postgres "$restore_container" sh -ec \
    'exec psql -X -w -At -U "$POSTGRES_USER" -d "$1" -v ON_ERROR_STOP=1 -c "$2"' -- "$HUGO_RESTORE_EXPECTED_DB" "$identity_sql")
else
  target=$(psql -X -w -At -d "service=$service" -v ON_ERROR_STOP=1 -c "$identity_sql")
fi
[[ $target == "$HUGO_RESTORE_EXPECTED_DB:hugotravel-2141c-restore-v1:0" ]] || missing 'Unapproved or non-empty restore target'
mkdir "$stage/restored-media"
# The protected receipt pins the ciphertext. Reject link and special-file entries before extraction.
tar -tvf "$stage/media.tar" | awk 'substr($0,1,1)!="-" && substr($0,1,1)!="d" { bad=1 } END { exit bad }'
tar --no-same-owner --no-same-permissions -xf "$stage/media.tar" -C "$stage/restored-media"
[[ -z $(find "$stage/restored-media" \( -type l -o ! -type f -a ! -type d \) -print -quit) ]] || missing 'Unexpected media entry type'
if [[ -s $stage/media.sha256 ]]; then
  (cd "$stage/restored-media" && sha256sum --strict --check "$stage/media.sha256" >&2)
fi
if [[ -n $restore_container ]]; then
  docker exec -i -u postgres "$restore_container" sh -ec \
    'exec pg_restore -w --exit-on-error --single-transaction --no-owner --no-privileges -U "$POSTGRES_USER" -d "$1"' \
    -- "$HUGO_RESTORE_EXPECTED_DB" < "$stage/database.dump"
else
  pg_restore -w --exit-on-error --single-transaction --no-owner --no-privileges -d "service=$service" "$stage/database.dump"
fi
cp -a -- "$stage/restored-media/." "$media/"
printf '%s\n' 'RESTORE_DB_AND_MEDIA_COMPLETE_PENDING_READBACK'
