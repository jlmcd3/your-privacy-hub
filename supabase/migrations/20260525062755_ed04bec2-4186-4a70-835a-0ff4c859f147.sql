-- Backfill: strip markdown from existing registration documents.
-- Safe to re-run — idempotent.

update registration_documents
set content_text = regexp_replace(
  regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(content_text,
                '^#{1,6}\s+', '', 'gm'),         -- heading hashes
              '\*\*\*([^*]+)\*\*\*', '\1', 'g'), -- bold+italic
            '\*\*([^*]+)\*\*', '\1', 'g'),       -- bold
          '^>\s?', '', 'gm'),                    -- blockquote
        '^\s*\*\s+', '• ', 'gm'),                -- * bullets to •
      '^\s*-\s+', '• ', 'gm'),                   -- - bullets to •
    '`([^`]+)`', '\1', 'g'),                     -- inline code
  '^\s*[-_]{3,}\s*$', '', 'gm')                  -- horizontal rules
where content_text ~ '(#{1,6}\s|\*\*|^\s*\*\s|`[^`]+`)';