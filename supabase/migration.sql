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
