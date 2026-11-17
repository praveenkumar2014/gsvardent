# Backup and Recovery Plan

Document database backup frequency, retention, encryption, access controls, artifact backup, key recovery, restoration owner and recovery objectives.

## Minimum procedure
1. Verify backup success and integrity.
2. Restrict restore access to authorized operators.
3. Restore to an isolated environment first.
4. Validate schema, RLS, audit history and application compatibility.
5. Record recovery point and recovery duration.
6. Obtain approval before replacing production data.
7. Run post-restore smoke tests and document gaps.

Perform periodic restore drills. Backups are not proven until restoration has been successfully tested. Define RPO/RTO only after operational validation.
