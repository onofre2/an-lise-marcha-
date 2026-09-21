// Pontos anatomicos da avaliacao de joelhos.
//
// Vista anterior: pontos bilaterais em tres niveis, usados para o alinhamento
// frontal de cada joelho (valgo e varo), com vertice na patela.
//
// Vistas laterais: tres pontos por lado, para o alinhamento sagital
// (flexo e recurvato), com vertice no epicondilo lateral.
//
// Vista posterior do retrope: quatro marcadores do protocolo do angulo do
// retrope, marcados em cada pe.

export type VistaJoelho = 'anterior' | 'lateral_direita' | 'lateral_esquerda';

export interface PontoJoelho { id: string; nome: string; }

export const PONTOS_JOELHO: Record<VistaJoelho, PontoJoelho[]> = {
  anterior: [
    { id: 'eias_d', nome: 'Espinha Iliaca Antero-Superior Direita' },
    { id: 'eias_e', nome: 'Espinha Iliaca Antero-Superior Esquerda' },
    { id: 'patela_d', nome: 'Centro da Patela Direita' },
    { id: 'patela_e', nome: 'Centro da Patela Esquerda' },
    { id: 'maleolo_d', nome: 'Maleolo Direito' },
    { id: 'maleolo_e', nome: 'Maleolo Esquerdo' },
  ],
  lateral_direita: [
    { id: 'trocanter', nome: 'Trocanter Maior' },
    { id: 'epicondilo', nome: 'Epicondilo Lateral' },
    { id: 'maleolo', nome: 'Maleolo Lateral' },
  ],
  lateral_esquerda: [
    { id: 'trocanter', nome: 'Trocanter Maior' },
    { id: 'epicondilo', nome: 'Epicondilo Lateral' },
    { id: 'maleolo', nome: 'Maleolo Lateral' },
  ],
};

/** Protocolo do angulo do retrope, marcado em cada pe na vista posterior. */
export const PONTOS_RETROPE: PontoJoelho[] = [
  { id: 'base_d', nome: 'Base do Calcaneo Direito, logo acima do solo' },
  { id: 'insercao_d', nome: 'Centro do Calcanhar Direito, insercao do tendao de Aquiles' },
  { id: 'tendao_d', nome: 'Tendao de Aquiles Direito, na altura do maleolo' },
  { id: 'perna_d', nome: 'Centro da Perna Direita, 15 cm acima do ponto anterior' },
  { id: 'base_e', nome: 'Base do Calcaneo Esquerdo, logo acima do solo' },
  { id: 'insercao_e', nome: 'Centro do Calcanhar Esquerdo, insercao do tendao de Aquiles' },
  { id: 'tendao_e', nome: 'Tendao de Aquiles Esquerdo, na altura do maleolo' },
  { id: 'perna_e', nome: 'Centro da Perna Esquerda, 15 cm acima do ponto anterior' },
];

export const LABEL_VISTA: Record<string, string> = {
  anterior: 'Vista Anterior',
  lateral_direita: 'Lateral Direita',
  lateral_esquerda: 'Lateral Esquerda',
  retrope: 'Analise da Pisada',
};
