import { useState } from 'react';
import { questions as DEFAULT_QUESTIONS } from '../../data/quizData';
import QuestionModal from './QuestionModal';
import { saveQuestions } from './adminUtils';

function loadQuestions() {
  try {
    return JSON.parse(localStorage.getItem('g4_questions')) || DEFAULT_QUESTIONS;
  } catch {
    return DEFAULT_QUESTIONS;
  }
}

export default function QuestionsPanel() {
  const [questions, setQuestions] = useState(() => loadQuestions());
  const [editingQi, setEditingQi] = useState(undefined);

  function persist(next) {
    setQuestions(next);
    saveQuestions(next);
  }

  function moveUp(qi) {
    const next = [...questions];
    [next[qi - 1], next[qi]] = [next[qi], next[qi - 1]];
    persist(next);
  }

  function moveDown(qi) {
    const next = [...questions];
    [next[qi], next[qi + 1]] = [next[qi + 1], next[qi]];
    persist(next);
  }

  function deleteQuestion(qi) {
    if (!confirm('Excluir esta pergunta?')) return;
    const next = [...questions];
    next.splice(qi, 1);
    persist(next);
  }

  function resetDefaults() {
    if (!confirm('Restaurar todas as perguntas para o padrão?')) return;
    localStorage.removeItem('g4_questions');
    setQuestions(DEFAULT_QUESTIONS);
  }

  function handleModalSave(question) {
    const next = [...questions];
    if (editingQi === null) next.push(question);
    else next[editingQi] = question;
    persist(next);
    setEditingQi(undefined);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: 'clamp(18px,3.5vw,24px)', fontWeight: 700, letterSpacing: '-.3px' }}>Perguntas do diagnóstico</h1>
          <p style={{ fontSize: '13px', color: 'rgba(13,13,23,.35)', marginTop: '5px' }}>Gerencie as perguntas e respostas do quiz.</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-accent" onClick={() => setEditingQi(null)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nova pergunta
          </button>
          <button type="button" className="btn btn-danger" onClick={resetDefaults}>
            Restaurar padrão
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {questions.map((q, qi) => (
          <div key={qi} className="q-row">
            <div
              style={{
                minWidth: '28px',
                height: '28px',
                background: 'rgba(160,138,78,.12)',
                border: '1px solid rgba(160,138,78,.25)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 700,
                color: '#A08A4E',
                flexShrink: 0,
              }}
            >
              {qi + 1}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', color: '#A08A4E', marginBottom: '4px' }}>
                {q.category}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#0D0D17', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {q.text}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(13,13,23,.35)', marginTop: '3px' }}>{q.options.length} respostas</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              {qi > 0 && (
                <button type="button" className="btn-icon" title="Mover para cima" onClick={() => moveUp(qi)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                </button>
              )}
              {qi < questions.length - 1 && (
                <button type="button" className="btn-icon" title="Mover para baixo" onClick={() => moveDown(qi)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              )}
              <button type="button" className="btn btn-accent" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => setEditingQi(qi)}>
                Editar
              </button>
              <button type="button" className="btn btn-danger" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => deleteQuestion(qi)}>
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingQi !== undefined && (
        <QuestionModal
          question={editingQi === null ? null : questions[editingQi]}
          onSave={handleModalSave}
          onClose={() => setEditingQi(undefined)}
        />
      )}
    </div>
  );
}
