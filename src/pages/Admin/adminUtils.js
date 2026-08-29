export function scoreColor(s) {
  if (s >= 65) return '#34d399';
  if (s >= 35) return '#fbbf24';
  return '#f87171';
}

export function scoreLabel(s) {
  if (s >= 75) return 'Avançado';
  if (s >= 50) return 'Em Transição';
  if (s >= 25) return 'Inicial';
  return 'Crítico';
}

// Espelha App\Services\DiagnosisEngine::AXIS_LABELS (backend).
const AXIS_LABELS = {
  geracao_demanda: 'Geração de Demanda',
  estrutura_comercial: 'Estrutura Comercial',
  controle_custo: 'Controle de Custo (CAC)',
  atendimento_conversao: 'Atendimento e Conversão',
  previsibilidade: 'Previsibilidade e Gestão',
};

export function axisLabel(slug) {
  return AXIS_LABELS[slug] || slug || '—';
}

const LEVEL_LABELS = {
  1: 'Nível 1 — Dependente de Indicação',
  2: 'Nível 2 — Em Estruturação',
  3: 'Nível 3 — Em Crescimento',
  4: 'Nível 4 — Previsível',
};

/** Rótulo do nível do diagnóstico; cai no legado (scoreLabel) para leads antigos sem `level`. */
export function levelLabel(level, score) {
  return LEVEL_LABELS[level] || scoreLabel(score);
}

export function initials(name) {
  return (name || '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}
