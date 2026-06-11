create policy "public read sample-reports objects"
  on storage.objects for select
  using (bucket_id = 'sample-reports');