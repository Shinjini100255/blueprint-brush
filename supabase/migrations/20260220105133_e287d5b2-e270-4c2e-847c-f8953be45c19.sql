
-- Create blueprints table
CREATE TABLE public.blueprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_url TEXT NOT NULL,
  colored_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Disable RLS as requested
ALTER TABLE public.blueprints DISABLE ROW LEVEL SECURITY;

-- Create storage bucket for blueprints
INSERT INTO storage.buckets (id, name, public) VALUES ('blueprints', 'blueprints', true);

-- Allow public read access
CREATE POLICY "Public read access" ON storage.objects FOR SELECT USING (bucket_id = 'blueprints');

-- Allow anonymous uploads
CREATE POLICY "Allow anonymous uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'blueprints');
