import { useEffect, useState } from 'react';
import { adminQuestionsApi } from '../../services/api';
import QuestionModal from './QuestionModal';
import ConfirmModal from './ConfirmModal';

const TYPE_LABELS = {
  texto_livre: 'Texto livre',
  escolha_unica: 'Escolha única',
  multipla_com_outra: 'Múltipla + Outra',
};

export default function QuestionsPanel() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [editingQ, setEditingQ]   = useState(undefined); // undefined=fechado, null=novo, object=editar
  const [deletingId, setDeletingId] = useState(null); // id da pergunta pendente de confirmação

  useEffect(() => {
    fetchQuestions();
  }, []);

  async function fetchQuestions() {
    setLoading(true);
    setError('');
    try {
      const data = await adminQuestionsApi.getAll();
      setQuestions(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.message === 'UNAUTHORIZED') {
        window.location.reload();
        return;
      }
      setError('Erro ao carregar perguntas. Verifique se a API está rodando.');
    } finally {
      setLoading(false);
    }
  }

  async function moveUp(qi) {
    const next = [...questions];
    [next[qi - 1], next[qi]] = [next[qi], next[qi - 1]];
    await applyReorder(next);
  }

  async function moveDown(qi) {
    const next = [...questions];
    [next[qi], next[qi + 1]] = [next[qi + 1], next[qi]];
    await applyReorder(next);
  }

  async function applyReorder(next) {
    setQuestions(next);
    try {
      await adminQuestionsApi.reorder(next.map((q, i) => ({ id: q.id, order: i })));
    } catch {
      alert('Erro ao reordenar. Recarregue a página.');
    }
  }

  async function deleteQuestion(id) {
    try {
      await adminQuestionsApi.delete(id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch {
      alert('Erro ao excluir pergunta.');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleModalSave(question) {
    try {
      if (editingQ === null) {
        // Nova pergunta
        const created = await adminQuestionsApi.create({
          ...question,
          order: questions.length,
        });
        setQuestions((prev) => [...prev, created]);
      } else {
        // Editar
        const updated = await adminQuestionsApi.update(editingQ.id, question);
        setQuestions((prev) => prev.map((q) => (q.id === editingQ.id ? updated : q)));
      }
      setEditingQ(undefined);
    } catch {
      alert('Erro ao salvar pergunta.');
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid rgba(160,138,78,.2)', borderTopColor: '#A08A4E', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: 'clamp(18px,3.5vw,24px)', fontWeight: 700, letterSpacing: '-.3px' }}>Perguntas do diagnóstico</h1>
          <p style={{ fontSize: '13px', color: 'rgba(13,13,23,.35)', marginTop: '5px' }}>Gerencie as perguntas e respostas do quiz.</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-accent" onClick={() => setEditingQ(null)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nova pergunta
          </button>
        </div>
      </div>

      {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {questions.map((q, qi) => (
          <div key={q.id} className="q-row">
            <div style={{ minWidth: '28px', height: '28px', background: 'rgba(160,138,78,.12)', border: '1px solid rgba(160,138,78,.25)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#A08A4E', flexShrink: 0 }}>
              {qi + 1}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', color: '#A08A4E', marginBottom: '4px' }}>{q.category}</div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#0D0D17', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.text}</div>
              <div style={{ fontSize: '11px', color: 'rgba(13,13,23,.35)', marginTop: '3px' }}>{q.options?.length ?? 0} respostas</div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                <span className="badge" style={{ background: 'rgba(160,138,78,.1)', border: '1px solid rgba(160,138,78,.25)', color: '#A08A4E' }}>
                  {TYPE_LABELS[q.type] || q.type || 'escolha_unica'}
                </span>
                <span className="badge" style={{
                  background: q.scored ? 'rgba(34,197,94,.1)' : 'rgba(107,114,128,.1)',
                  border: `1px solid ${q.scored ? 'rgba(34,197,94,.25)' : 'rgba(107,114,128,.25)'}`,
                  color: q.scored ? '#16a34a' : '#6b7280',
                }}>
                  {q.scored ? 'Pontua' : 'Não pontua'}
                </span>
                {q.category_slug && (
                  <span className="badge" style={{ background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.25)', color: '#3b82f6' }}>
                    {q.category_slug}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              {qi > 0 && (
                <button type="button" className="btn-icon" title="Mover para cima" onClick={() => moveUp(qi)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                </button>
              )}
              {qi < questions.length - 1 && (
                <button type="button" className="btn-icon" title="Mover para baixo" onClick={() => moveDown(qi)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
              )}
              <button type="button" className="btn btn-accent" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => setEditingQ(q)}>Editar</button>
              <button type="button" className="btn btn-danger" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => setDeletingId(q.id)}>Excluir</button>
            </div>
          </div>
        ))}
      </div>

      {questions.length === 0 && !loading && (
        <div style={{ padding: '56px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: 'rgba(13,13,23,.25)' }}>Nenhuma pergunta cadastrada.</p>
        </div>
      )}

      {editingQ !== undefined && (
        <QuestionModal
          question={editingQ}
          onSave={handleModalSave}
          onClose={() => setEditingQ(undefined)}
        />
      )}

      {deletingId !== null && (
        <ConfirmModal
          title="Excluir pergunta?"
          message="Essa ação não pode ser desfeita."
          confirmLabel="Excluir"
          onConfirm={() => deleteQuestion(deletingId)}
          onClose={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}
