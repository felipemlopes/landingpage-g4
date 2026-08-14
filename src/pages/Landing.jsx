import { useState } from 'react';
import Hero from '../components/Hero';
import Quiz from '../components/Quiz';
import ResultForm from '../components/ResultForm';
import ThankYou from '../components/ThankYou';

const VIEWS = { HERO: 'hero', QUIZ: 'quiz', FORM: 'form', THANKYOU: 'thankyou' };

export default function Landing() {
  const [view, setView] = useState(VIEWS.HERO);
  const [answers, setAnswers] = useState([]);
  const [score, setScore] = useState(0);
  const [leadName, setLeadName] = useState('');

  function handleStart() {
    setView(VIEWS.QUIZ);
    window.scrollTo(0, 0);
  }

  function handleQuizComplete(finalAnswers) {
    const finalScore = Math.round(finalAnswers.reduce((a, b) => a + b, 0) / finalAnswers.length);
    setAnswers(finalAnswers);
    setScore(finalScore);
    setView(VIEWS.FORM);
    window.scrollTo(0, 0);
  }

  function handleSubmit({ name, phone, email }) {
    const leads = JSON.parse(localStorage.getItem('g4_leads') || '[]');
    leads.unshift({ id: Date.now(), name, phone, email, score, answers, date: new Date().toISOString() });
    localStorage.setItem('g4_leads', JSON.stringify(leads));

    setLeadName(name.split(' ')[0]);
    setView(VIEWS.THANKYOU);
    window.scrollTo(0, 0);
  }

  if (view === VIEWS.QUIZ) return <Quiz onComplete={handleQuizComplete} />;
  if (view === VIEWS.FORM) return <ResultForm score={score} answers={answers} onSubmit={handleSubmit} />;
  if (view === VIEWS.THANKYOU) return <ThankYou name={leadName} />;
  return <Hero onStart={handleStart} />;
}
