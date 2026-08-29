/**
 * URL de agendamento do Calendly, configurável via .env (VITE_CALENDLY_URL),
 * sem precisar editar código. Ver requirements.md — Requisito 3.6/3.7.
 */
const CALENDLY_URL = import.meta.env.VITE_CALENDLY_URL || '';

export function isCalendlyConfigured() {
  return Boolean(CALENDLY_URL);
}

/** Monta o link do Calendly pré-preenchido com nome/e-mail do lead, quando disponíveis. */
export function buildCalendlyLink({ name, email } = {}) {
  if (!CALENDLY_URL) return null;

  const params = new URLSearchParams();
  if (name)  params.set('name', name);
  if (email) params.set('email', email);

  const query = params.toString();
  return query ? `${CALENDLY_URL}?${query}` : CALENDLY_URL;
}
