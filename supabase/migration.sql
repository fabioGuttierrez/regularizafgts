-- ======================================================
-- RegularizaFGTS — Migration: Criar tabelas de leads e simulador
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- ======================================================

-- Tabela de leads (formulário de diagnóstico + simulador)
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text NOT NULL,
  telefone text,
  cnpj text,
  mensagem text,
  origem text NOT NULL DEFAULT 'formulario' CHECK (origem IN ('formulario', 'simulador')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de resultados do simulador
CREATE TABLE public.simulator_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  respostas jsonb NOT NULL,
  score text NOT NULL CHECK (score IN ('baixo', 'medio', 'alto', 'critico')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulator_results ENABLE ROW LEVEL SECURITY;

-- Permitir INSERT para usuários anônimos (site público precisa inserir)
CREATE POLICY "Allow anonymous insert on leads"
  ON public.leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous insert on simulator_results"
  ON public.simulator_results
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Permitir SELECT apenas para usuários autenticados (painel admin)
CREATE POLICY "Allow authenticated select on leads"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated select on simulator_results"
  ON public.simulator_results
  FOR SELECT
  TO authenticated
  USING (true);

-- Grants necessários
GRANT USAGE ON SCHEMA public TO anon;
GRANT INSERT ON public.leads TO anon;
GRANT INSERT ON public.simulator_results TO anon;

-- ======================================================
-- RPCs para inserção segura (SECURITY DEFINER bypassa RLS)
-- O frontend chama estas funções via /rest/v1/rpc/
-- ======================================================

CREATE OR REPLACE FUNCTION public.insert_lead(
  p_nome text,
  p_email text,
  p_telefone text DEFAULT NULL,
  p_cnpj text DEFAULT NULL,
  p_mensagem text DEFAULT NULL,
  p_origem text DEFAULT 'formulario'
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO public.leads (nome, email, telefone, cnpj, mensagem, origem)
  VALUES (p_nome, p_email, p_telefone, p_cnpj, p_mensagem, p_origem)
  RETURNING id INTO new_id;
  RETURN json_build_object(
    'id', new_id,
    'nome', p_nome,
    'email', p_email,
    'telefone', p_telefone,
    'cnpj', p_cnpj,
    'mensagem', p_mensagem,
    'origem', p_origem
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_simulator_result(
  p_lead_id uuid,
  p_respostas jsonb,
  p_score text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.simulator_results (lead_id, respostas, score)
  VALUES (p_lead_id, p_respostas, p_score);
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_lead TO anon;
GRANT EXECUTE ON FUNCTION public.insert_simulator_result TO anon;
