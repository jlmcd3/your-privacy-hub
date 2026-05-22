UPDATE public.updates
SET title = 'Colorado ' || lower(substring(title from 1 for 1)) || substring(title from 2)
WHERE id = 'bc55877b-bdcb-44d9-bdc9-169b3598fe97'
  AND title = 'Revises Its AI Act: What Changed and Why';