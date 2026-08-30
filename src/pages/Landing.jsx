import { useState } from 'react';
import Hero from '../components/Hero';
import Quiz from '../components/Quiz';
import LeadForm from '../components/LeadForm';
import DiagnosisResult from '../components/DiagnosisResult';
import Qualify from '../components/Qualify';
import ThankYou from '../components/ThankYou';
import { leadsApi, reportApi } from '../services/api';

const VIEWS = { HERO: 'hero', QUIZ: 'quiz', LEAD_FORM: 'lead_form', RESULT: 'result', QUALIFY: 'qualify', THANKYOU: 'thankyou' };

// Espelha App\Services\DiagnosisEngine::AXIS_LABELS (backend) — usado só para
// reconstruir, no formato legado (categoria + pontos por índice), o resumo que
// alimenta o prompt da IA do relatório em PDF/WhatsApp (pipeline existente,
// mantido — ver requirements.md, Requisito 3.5). Enriquecer o prompt com o
// objeto `diagnosis` completo fica fora do escopo desta spec.
const AXIS_LABELS = {
  geracao_demanda: 'Geração de Demanda',
  estrutura_comercial: 'Estrutura Comercial',
  controle_custo: 'Controle de Custo (CAC)',
  atendimento_conversao: 'Atendimento e Conversão',
  previsibilidade: 'Previsibilidade e Gestão',
};

export default function Landing() {
  const [view, setView]           = useState(VIEWS.HERO);
  const [answers, setAnswers]     = useState([]);
  const [leadId, setLeadId]       = useState(null);
  const [leadName, setLeadName]   = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [diagnosis, setDiagnosis] = useState(null);
  const [reportResult, setReportResult] = useState(null);

  function handleStart() {
    setView(VIEWS.QUIZ);
    window.scrollTo(0, 0);
  }

  function handleQuizComplete(finalAnswers) {
    setAnswers(finalAnswers);
    setView(VIEWS.LEAD_FORM);
    window.scrollTo(0, 0);
  }

  async function handleLeadSubmit({ name, phone, email }) {
    // O Quiz acumula as respostas em camelCase (convenção JS); a API espera
    // snake_case (convenção Laravel) — ver DiagnosisEngine no backend.
    const apiAnswers = answers.map((a) => ({
      category_slug: a.categorySlug,
      type:          a.type,
      scored:        a.scored,
      points:        a.points,
      value:         a.value,
      other_text:    a.otherText,
    }));

    const { lead, diagnosis: computed } = await leadsApi.submit({ name, phone, email, answers: apiAnswers });

    setLeadId(lead.id);
    setLeadName(name);
    setLeadEmail(email);
    setDiagnosis(computed);

    // Dispara em background o diagnóstico por IA + PDF + envio por WhatsApp já
    // existente (fire-and-forget, não bloqueia a navegação para o resultado).
    const scoredAnswers = answers.filter((a) => a.points !== null && a.points !== undefined);
    reportApi.generate({
      lead_id: lead.id,
      name,
      phone,
      score: computed.score,
      answers: scoredAnswers.map((a) => a.points),
      questions: scoredAnswers.map((a) => ({
        category: AXIS_LABELS[a.categorySlug] || a.categorySlug,
        text: '',
        options: [{ label: a.value, points: a.points }],
      })),
    }).then((res) => {
      setReportResult(res);
    }).catch((err) => {
      console.error('Erro ao gerar relatório:', err);
      setReportResult({ failed: true });
    });

    setView(VIEWS.RESULT);
    window.scrollTo(0, 0);
  }

  function handleResultContinue() {
    setView(VIEWS.QUALIFY);
    window.scrollTo(0, 0);
  }

  async function handleQualifyComplete(payload) {
    if (leadId && Object.keys(payload).length > 0) {
      try {
        await leadsApi.qualify(leadId, payload);
      } catch (err) {
        console.error('Erro ao salvar qualificação:', err);
      }
    }
    setView(VIEWS.THANKYOU);
    window.scrollTo(0, 0);
  }

  if (view === VIEWS.QUIZ)      return <Quiz onComplete={handleQuizComplete} />;
  if (view === VIEWS.LEAD_FORM) return <LeadForm onSubmit={handleLeadSubmit} />;
  if (view === VIEWS.RESULT)    return <DiagnosisResult name={leadName} diagnosis={diagnosis} onContinue={handleResultContinue} />;
  if (view === VIEWS.QUALIFY)   return <Qualify onComplete={handleQualifyComplete} />;
  if (view === VIEWS.THANKYOU)  return <ThankYou name={leadName} email={leadEmail} reportResult={reportResult} />;
  return <Hero onStart={handleStart} />;
}
