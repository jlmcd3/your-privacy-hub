
DELETE FROM public.quality_loop2_baselines;
INSERT INTO public.quality_loop2_baselines (product, avg_score, captured_at) VALUES
('biometric', 92.75, now()),
('cppa-admt', 92.0833333333333, now()),
('cppa-cyber', 92.3333333333333, now()),
('cppa-risk', 93.3333333333333, now()),
('dpa', 92.75, now()),
('dpia', 92.5, now()),
('governance', 94.5833333333333, now()),
('ir-playbook', 91.9166666666667, now()),
('lia', 92.8333333333333, now()),
('registration', 96.5, now());
