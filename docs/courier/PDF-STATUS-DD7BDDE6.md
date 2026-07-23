Label: PDF-STATUS-DD7BDDE6
Dispatch: CHANNEL-FAILOVER-1
Timestamp: 2026-07-23T22:15:00Z
Mode: Read-only report; no product changes.

# PDF Export Status — Batch dd7bdde6

All 10 documents in batch `dd7bdde6-732f-4ac5-8d62-39cbe00117dd` exported successfully to storage bucket `qa_pdf_exports` between 18:35:32Z and 18:36:09Z on 2026-07-23.

Representative filenames observed:
- `biometric-checker-doc1-678d1511.pdf`
- `cppa-admt-doc1-ce670da1.pdf`
- (…10 total, one per generated document across cppa-admt, biometric-checker, cppa-risk)

Failures: none.

Caveat (already logged as Register #17, D-PDF-STATE-NOT-PERSISTED): export status is not yet persisted onto `quality_run_documents` (no `pdf_export_status`/`pdf_export_url`/`pdf_export_error`/`pdf_exported_at` columns). The successful state above was reconstructed from bucket listing, not from row state.
