ALTER TABLE public.updates ADD COLUMN IF NOT EXISTS topic_tags TEXT[] DEFAULT '{}';
CREATE INDEX IF NOT EXISTS updates_topic_tags_idx ON public.updates USING GIN (topic_tags);