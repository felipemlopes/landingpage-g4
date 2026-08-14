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

  // Arquivo (CSV)
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/csv')) {
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
  /** Submete lead após o quiz (público) */
  async submit(payload) {
    return request('/leads', {
      method: 'POST',
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

  /** Download CSV (admin) */
  async exportCsv() {
    const blob = await request('/admin/leads/export/csv');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-g4-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

// ── Relatório PDF ─────────────────────────────────────────────────────────────

export const reportApi = {
  /**
   * Gera o PDF via IA e envia pelo WhatsApp.
   * Retorna base64 do PDF para download no browser.
   */
  async generate(payload) {
    return request('/report', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
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
