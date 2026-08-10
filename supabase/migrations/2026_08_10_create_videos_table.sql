CREATE TABLE IF NOT EXISTS public.videos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  youtube_video_id text NOT NULL,
  title text NOT NULL,
  product_name text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT videos_pkey PRIMARY KEY (id)
);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active videos" ON public.videos
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admin can insert videos" ON public.videos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin can update videos" ON public.videos
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can delete videos" ON public.videos
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can view all videos" ON public.videos
  FOR SELECT USING (auth.role() = 'authenticated');
