-- Add document_url column to invoices
ALTER TABLE invoices ADD COLUMN document_url TEXT;

-- Create the storage bucket for invoices
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload invoices
CREATE POLICY "Authenticated users can upload invoices"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'invoices' 
    AND auth.role() = 'authenticated'
);

-- Allow authenticated users to read invoices
CREATE POLICY "Authenticated users can read invoices"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'invoices' 
    AND auth.role() = 'authenticated'
);
