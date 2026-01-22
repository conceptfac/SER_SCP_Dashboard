-- Execute este comando no SQL Editor do Supabase para corrigir o erro de restrição
-- Isso permitirá que a tabela aceite tanto 'PF' quanto 'PJ'

ALTER TABLE public.executives DROP CONSTRAINT IF EXISTS executives_customer_type_check;
ALTER TABLE public.executives ADD CONSTRAINT executives_customer_type_check CHECK (customer_type IN ('PF', 'PJ'));