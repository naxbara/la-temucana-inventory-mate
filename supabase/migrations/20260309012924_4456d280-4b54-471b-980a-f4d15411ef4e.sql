
CREATE TABLE public.product_name_variations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variation text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, variation)
);

ALTER TABLE public.product_name_variations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to product_name_variations"
ON public.product_name_variations
FOR ALL
USING (true)
WITH CHECK (true);
