export const GLOSSARY = {
  PSOS: 'Probabilidade de Presença em Outputs de IA — percentual de respostas de IA que citam o seu site.',
  'IC 95%':
    'Intervalo de Confiança de 95% — faixa estatística em que o PSOS real provavelmente se encontra.',
  'Amostras detectadas': 'Número de respostas de IA analisadas que mencionaram o seu domínio.',
} as const;

export type GlossaryTerm = keyof typeof GLOSSARY;
