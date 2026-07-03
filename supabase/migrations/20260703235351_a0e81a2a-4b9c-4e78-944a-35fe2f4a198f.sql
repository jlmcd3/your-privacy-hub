update public.sample_reports
   set status = 'published',
       published_at = now()
 where status = 'draft';