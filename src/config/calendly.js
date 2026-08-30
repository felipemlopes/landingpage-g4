/**
 * Monta o link do Calendly pré-preenchido com nome/e-mail do lead, quando
 * disponíveis. A URL base agora vem da API (configurada pelo admin em
 * Integrações), não mais de VITE_CALENDLY_URL — ver services/api.js,
 * calendlySettingsApi.
 */
export function buildCalendlyLink(baseUrl, { name, email } = {}) {
  if (!baseUrl) return null;

  const params = new URLSearchParams();
  if (name)  params.set('name', name);
  if (email) params.set('email', email);

  const query = params.toString();
  return query ? `${baseUrl}?${query}` : baseUrl;
}
