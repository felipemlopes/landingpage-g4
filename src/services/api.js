/**
 * Serviço centralizado para chamadas à API Laravel
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getToken() {
  return localStorage.getItem('g4_admin_token');
}

function setToken(token) {
  localStorage.setItem('g4_admin_token', token);
}

function removeToken() {
  localStorage.removeItem('g4_admin_token');
}

async function request(path, options = {}) {
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

    // Token expirado — limpa localStorage
  if (res.status === 401) {
    removeToken();
    throw new Error('UNAUTHORIZED');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Erro ${res.status}`);
  }

  // Sem corpo (ex: 204)
  if (res.status === 204) return null;

  // Arquivo (XLSX)
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('spreadsheetml') || contentType.includes('octet-stream')) {
    return res.blob();
  }

  return res.json();
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export const auth = {
  async login(email, password) {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.access_token);
    return data;
  },

  async logout() {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      removeToken();
    }
  },

  async me() {
    return request('/auth/me');
  },

  isAuthenticated() {
    return !!getToken();
  },
};

// ── Perguntas (público) ───────────────────────────────────────────────────────

export const questionsApi = {
  async getAll() {
    return request('/questions');
  },
};

// ── Leads ─────────────────────────────────────────────────────────────────────

export const leadsApi = {
  /**
   * Submete lead após o quiz (público). Resolve com `{ lead, diagnosis }` —
   * o diagnóstico (nível, gargalo, pontos fortes/atenção, prioridades) é
   * calculado no backend, não aqui.
   */
  async submit(payload) {
    return request('/leads', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** Grava as respostas de qualificação pós-resultado (intenção + fit de investimento), público */
  async qualify(id, payload) {
    return request(`/leads/${id}/qualify`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  /** Lista todos os leads (admin) */
  async getAll() {
    return request('/admin/leads');
  },

  /** Remove um lead (admin) */
  async delete(id) {
    return request(`/admin/leads/${id}`, { method: 'DELETE' });
  },

  /** Remove todos os leads (admin) */
  async deleteAll() {
    return request('/admin/leads/all', { method: 'DELETE' });
  },

  /** Download XLSX (admin) */
  async exportXlsx() {
    const blob = await request('/admin/leads/export/xlsx');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-g4-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },

  /** Reenvia o PDF já gerado pelo WhatsApp, sem chamar a IA de novo (admin) */
  async resendReport(id) {
    return request(`/admin/leads/${id}/resend-report`, { method: 'POST' });
  },
};

// ── Relatório PDF ─────────────────────────────────────────────────────────────

const REPORT_POLL_INTERVAL_MS = 2000;
const REPORT_POLL_MAX_ATTEMPTS = 40; // ~80s

/** Faz polling de GET /report/:id até o status virar "done" ou "failed" */
async function pollReport(reportId) {
  for (let attempt = 0; attempt < REPORT_POLL_MAX_ATTEMPTS; attempt++) {
    const data = await request(`/report/${reportId}`);

    if (data.status === 'done') return data;
    if (data.status === 'failed') throw new Error(data.error || 'Falha ao gerar o diagnóstico.');

    await new Promise((resolve) => setTimeout(resolve, REPORT_POLL_INTERVAL_MS));
  }

  throw new Error('Tempo esgotado aguardando o diagnóstico.');
}

export const reportApi = {
  /**
   * Enfileira a geração do PDF via IA + envio pelo WhatsApp e aguarda a conclusão
   * (polling interno). Resolve com { pdf, filename, whatsapp_sent } — mesmo formato
   * de antes da fila assíncrona, para não exigir mudanças em quem consome esta função.
   */
  async generate(payload) {
    const { report_id } = await request('/report', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return pollReport(report_id);
  },

  /** Faz download do PDF a partir do base64 retornado pela API */
  download(base64, filename) {
    const binary = atob(base64);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};

// ── WhatsApp (admin) ──────────────────────────────────────────────────────────

export const whatsappApi = {
  /** Status de conexão do provider ativo (evolution | official) */
  async status() {
    return request('/admin/whatsapp/status');
  },

  /** Inicia a conexão (QR na Evolution) ou revalida credenciais (API oficial) */
  async connect() {
    return request('/admin/whatsapp/connect', { method: 'POST' });
  },

  /** Configuração atual: provider ativo + credenciais da API oficial (token mascarado) */
  async getSettings() {
    return request('/admin/whatsapp/settings');
  },

  /** Salva o provider ativo e/ou as credenciais da API oficial */
  async saveSettings(payload) {
    return request('/admin/whatsapp/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};

export const adminQuestionsApi = {
  async getAll() {
    return request('/admin/questions');
  },

  async create(question) {
    return request('/admin/questions', {
      method: 'POST',
      body: JSON.stringify(question),
    });
  },

  async update(id, question) {
    return request(`/admin/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(question),
    });
  },

  async delete(id) {
    return request(`/admin/questions/${id}`, { method: 'DELETE' });
  },

  async reorder(items) {
    return request('/admin/questions/reorder', {
      method: 'PUT',
      body: JSON.stringify({ items }),
    });
  },

  async resetDefaults() {
    return request('/admin/questions/reset-defaults', { method: 'POST' });
  },
};
