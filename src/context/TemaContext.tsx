import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import db from '../services/database';

export type NomeTema = 'claro' | 'escuro';

export type Paleta = {
  fundo: string; cartao: string; texto: string; textoFraco: string;
  borda: string; azul: string; azulFraco: string; campo: string;
};

// Azul e cinza mantidos; no escuro o cinza fica mais profundo.
export const PALETAS: Record<NomeTema, Paleta> = {
  claro: { fundo: '#F8FAFC', cartao: '#FFFFFF', texto: '#0F172A', textoFraco: '#64748B', borda: '#E2E8F0', azul: '#0EA5E9', azulFraco: '#E0F2FE', campo: '#FFFFFF' },
  escuro: { fundo: '#0F172A', cartao: '#1E293B', texto: '#F1F5F9', textoFraco: '#94A3B8', borda: '#334155', azul: '#38BDF8', azulFraco: '#0C4A6E', campo: '#0B1220' },
};

type Ctx = { tema: NomeTema; cores: Paleta; definirTema: (t: NomeTema) => void };
const TemaContext = createContext<Ctx>({ tema: 'claro', cores: PALETAS.claro, definirTema: () => {} });

// A coluna nasce aqui, e nao nas migracoes clinicas, porque o tema e preferencia
// de interface. ALTER repetido falha sem efeito quando a coluna ja existe.
function garantirColuna() {
  try { db.execSync("ALTER TABLE configuracoes_terapeuta ADD COLUMN tema TEXT DEFAULT 'claro'"); } catch {}
}

export function TemaProvider({ children }: { children: React.ReactNode }) {
  const [tema, setTema] = useState<NomeTema>('claro');

  useEffect(() => {
    garantirColuna();
    try {
      const linha = db.getFirstSync('SELECT tema FROM configuracoes_terapeuta WHERE id = 1') as { tema?: string } | null;
      if (linha && linha.tema === 'escuro') setTema('escuro');
    } catch {}
  }, []);

  const definirTema = (novo: NomeTema) => {
    setTema(novo);
    try {
      db.runSync("INSERT OR IGNORE INTO configuracoes_terapeuta (id, nome, registro) VALUES (1, '', '')");
      db.runSync('UPDATE configuracoes_terapeuta SET tema = ? WHERE id = 1', [novo]);
    } catch (e) {
      console.error('Erro ao salvar preferencia de tema:', e);
    }
  };

  const valor = useMemo(() => ({ tema, cores: PALETAS[tema], definirTema }), [tema]);
  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>;
}

export function useTema() {
  return useContext(TemaContext);
}
