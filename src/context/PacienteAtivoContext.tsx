import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PacienteAtivo {
  id: number;
  nome: string;
}

interface PacienteAtivoContextType {
  pacienteAtivo: PacienteAtivo | null;
  definirPacienteAtivo: (paciente: PacienteAtivo | null) => void;
}

const PacienteAtivoContext = createContext<PacienteAtivoContextType | undefined>(undefined);

export function PacienteAtivoProvider({ children }: { children: ReactNode }) {
  const [pacienteAtivo, setPacienteAtivo] = useState<PacienteAtivo | null>(null);

  return (
    <PacienteAtivoContext.Provider value={{ pacienteAtivo, definirPacienteAtivo: setPacienteAtivo }}>
      {children}
    </PacienteAtivoContext.Provider>
  );
}

export function usePacienteAtivo() {
  const contexto = useContext(PacienteAtivoContext);
  if (!contexto) {
    throw new Error('usePacienteAtivo deve ser usado dentro de um PacienteAtivoProvider');
  }
  return contexto;
}
