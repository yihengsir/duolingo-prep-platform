// src/App.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import questionsData from '../data/read_and_complete.json';

const TIMER_DURATION = 180;
const INVITATION_CODE = '130';

function App() {
  const [gameState, setGameState] = useState('welcome');
  const [invitationCodeInput, setInvitationCodeInput] = useState('');
  const [invitationCodeError, setInvitationCodeError] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [inputValues, setInputValues] = useState([]);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isCorrect, setIsCorrect] = useState(null);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const timerRef = useRef(null);
  const inputRefs = useRef([]);

  const currentQuestion = questionsData[currentQuestionIndex];

  const resetQuestionState = useCallback(() => {
    const totalBlanks = currentQuestion.answers.length;
    setInputValues(Array(totalBlanks).fill(''));
    setFeedbackMessage('');
    setIsCorrect(null);
    setShowCorrectAnswer(false);
    setTimeLeft(TIMER_DURATION);
    inputRefs.current = [];
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setFeedbackMessage('时间到！请检查答案。');
          setIsCorrect(false);
          setShowCorrectAnswer(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [currentQuestion]);

  useEffect(() => {
    if (gameState === 'readAndComplete') {
      resetQuestionState();
    }
    return () => clearInterval(timerRef.current);
  }, [currentQuestionIndex, gameState, resetQuestionState]);

  const handleInputChange = (e, index) => {
    const val = e.target.value.slice(0, 1).toLowerCase();
    const newValues = [...inputValues];
    newValues[index] = val;
    setInputValues(newValues);
    if (val && index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && inputValues[index] === '' && index > 0) {
      const newValues = [...inputValues];
      newValues[index - 1] = '';
      setInputValues(newValues);
      inputRefs.current[index - 1].focus();
      e.preventDefault();
    }
    if (e.key === 'ArrowRight' && index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1].focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const checkAnswer = () => {
    clearInterval(timerRef.current);
    const allCorrect = inputValues.every((v, i) => v === currentQuestion.answers[i]);
    setIsCorrect(allCorrect);
    setFeedbackMessage(allCorrect ? '所有填空都正确！' : '部分填空有误，请检查。');
    setShowCorrectAnswer(!allCorrect);
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < questionsData.length - 1) {
      setCurrentQuestionIndex((i) => i + 1);
    }
  };

  const goToPrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((i) => i - 1);
    }
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const renderQuestionText = () => {
    const parts = currentQuestion.text.split('[BLANK]');
    const elements = [];
    parts.forEach((part, index) => {
      elements.push(<span key={`part-${index}`}>{part}</span>);
      if (index < currentQuestion.answers.length) {
        const isCorrectChar = inputValues[index] === currentQuestion.answers[index];
        const showResult = isCorrect !== null || timeLeft === 0;
        const inputClass = showResult ? (isCorrectChar ? 'char-input correct' : 'char-input incorrect') : 'char-input';
        elements.push(
          <input
            key={`input-${index}`}
            type="text"
            maxLength={1}
            value={inputValues[index] || ''}
            onChange={(e) => handleInputChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            ref={(el) => (inputRefs.current[index] = el)}
            className={inputClass}
            disabled={showResult}
          />
        );
      }
    });
    return <div className="text-left flex flex-wrap gap-1 leading-relaxed">{elements}</div>;
  };

  const handleInvitationCodeSubmit = () => {
    if (invitationCodeInput === INVITATION_CODE) {
      setGameState('readAndComplete');
      setInvitationCodeError('');
    } else {
      setInvitationCodeError('邀请码错误，请重试。');
    }
  };

  const renderContent = () => {
    if (gameState === 'welcome') {
      return (
        <div className="text-center flex flex-col items-center">
          <img src="/unnamed.png" alt="logo" className="w-36 h-36 mb-6" />
          <h1 className="text-3xl font-bold text-blue-600 mb-4">Duolingo DET Prep with Fengfeng</h1>
          <input
            className="px-4 py-2 border border-gray-300 rounded-md w-60 text-center"
            placeholder="请输入邀请码"
            value={invitationCodeInput}
            onChange={(e) => setInvitationCodeInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleInvitationCodeSubmit()}
          />
          {invitationCodeError && <p className="text-red-500 text-sm mt-2">{invitationCodeError}</p>}
          <button className="button-base button-blue mt-4" onClick={handleInvitationCodeSubmit}>进入</button>
        </div>
      );
    }

    return (
      <>
        <div className="absolute top-4 left-4">
          <button onClick={goToPrevQuestion} className="button-base text-sm">上一题</button>
        </div>
        <div className="absolute top-4 right-4">
          <button onClick={goToNextQuestion} className="button-base text-sm">下一题</button>
        </div>
        <div className="text-sm text-gray-500 mb-2">剩余时间: <span className="text-blue-600 font-bold">{formatTime(timeLeft)}</span></div>
        <h1 className="text-xl font-bold text-center text-blue-600">Duolingo DET Prep - 阅读并补全</h1>
        <h2 className="text-center text-gray-500 text-sm mb-4">{currentQuestion.title}</h2>
        {renderQuestionText()}
        {feedbackMessage && (
          <p className={`mt-6 text-center text-lg font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>{feedbackMessage}</p>
        )}
        {showCorrectAnswer && (
          <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-800 rounded-md shadow-sm">
            <p className="font-semibold mb-2">正确答案:</p>
            <p className="whitespace-pre-wrap text-lg">{currentQuestion.text.replaceAll('[BLANK]', () => currentQuestion.answers.shift())}</p>
          </div>
        )}
        <div className="text-center mt-6 flex justify-center gap-4">
          <button
            onClick={checkAnswer}
            className="button-base button-blue"
            disabled={inputValues.some(v => !v) || isCorrect !== null || timeLeft === 0}
          >
            检查答案
          </button>
          <button onClick={resetQuestionState} className="button-base button-yellow">重做</button>
          {isCorrect !== null && (
            <button onClick={goToNextQuestion} className="button-base button-green">
              {currentQuestionIndex < questionsData.length - 1 ? '下一题' : '完成'}
            </button>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-auto border border-gray-200 p-6 md:p-10 relative">
        {renderContent()}
      </div>
    </div>
  );
}

export default App;