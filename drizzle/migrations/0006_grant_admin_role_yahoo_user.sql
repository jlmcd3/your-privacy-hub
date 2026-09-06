INSERT INTO public.user_roles (user_id, role)
VALUES ('80a28447-24f2-49dc-9786-a2af5f5b7a01', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;