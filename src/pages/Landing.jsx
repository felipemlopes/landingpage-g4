import { useState } from 'react';
import Hero from '../components/Hero';
import Quiz from '../components/Quiz';
import ResultForm from '../components/ResultForm';
import ThankYou from '../components/ThankYou';
import { leadsApi, reportApi } from '../services/api';

const VIEWS = { HERO: 'hero', QUIZ: 'quiz', FORM: 'form', THANKYOU: 'thankyou' };

export default function Landing() {
  const [view, setView]           = useState(VIEWS.HERO);
  const [answers, setAnswers]     = useState([]);
  const [questions, setQuestions] = useState([]);
  const [score, setScore]         = useState(0);
  const [leadName, setLeadName]   = useState('');

  function handleStart() {
    setView(VIEWS.QUIZ);
    window.scrollTo(0, 0);
  }

  function handleQuizComplete(finalAnswers, qs) {
    const numericAnswers = finalAnswers.map(Number);
    const finalScore = Math.round(numericAnswers.reduce((a, b) => a + b, 0) / numericAnswers.length);
    setAnswers(numericAnswers);
    setScore(finalScore);
    setQuestions(qs);
    setView(VIEWS.FORM);
    window.scrollTo(0, 0);
  }

  async function handleSubmit({ name, phone, email }) {
    const safeScore   = Number.isFinite(score) ? Math.round(Math.min(100, Math.max(0, score))) : 0;
    const safeAnswers = answers.map(Number).filter(Number.isFinite);

    // Salva o lead
    let leadId = null;
    try {
      const lead = await leadsApi.submit({ name, phone, email, score: safeScore, answers: safeAnswers });
      leadId = lead?.id ?? null;
    } catch (err) {
      console.error('Erro ao salvar lead:', err);
    }

    // Gera PDF com IA e envia pelo WhatsApp (em background, não bloqueia o fluxo)
    reportApi.generate({
      lead_id: leadId,
      name,
      phone,
      score: safeScore,
      answers: safeAnswers,
      questions: questions.map((q) => ({
        category: q.category,
        text: q.text,
        options: q.options,
      })),
    }).then((res) => {
      if (res?.pdf) {
        reportApi.download(res.pdf, res.filename || 'diagnostico-g4.pdf');
      }
    }).catch((err) => {
      console.error('Erro ao gerar relatório:', err);
    });

    setLeadName(name.split(' ')[0]);
    setView(VIEWS.THANKYOU);
    window.scrollTo(0, 0);
  }

  if (view === VIEWS.QUIZ) return <Quiz onComplete={handleQuizComplete} />;
  if (view === VIEWS.FORM) return <ResultForm score={score} answers={answers} questions={questions} onSubmit={handleSubmit} />;
  if (view === VIEWS.THANKYOU) return <ThankYou name={leadName} />;
  return <Hero onStart={handleStart} />;
}
