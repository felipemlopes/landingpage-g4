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

export function initials(name) {
  return (name || '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export function getLeads() {
  try {
    return JSON.parse(localStorage.getItem('g4_leads')) || [];
  } catch {
    return [];
  }
}

export function saveLeads(leads) {
  localStorage.setItem('g4_leads', JSON.stringify(leads));
}

export function saveQuestions(questions) {
  localStorage.setItem('g4_questions', JSON.stringify(questions));
}
