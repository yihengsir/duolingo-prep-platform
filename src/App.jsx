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

  const currentQuestion = questionsData[currentQuestionIndex];
  const [inputValues, setInputValues] = useState(Array(currentQuestion.answers.length).fill(''));
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isCorrect, setIsCorrect] = useState(null);
  const [allBlanksFilled, setAllBlanksFilled] = useState(false);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);

  const inputRefs = useRef([]);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const timerRef = useRef(null);

  const resetQuestionState = useCallback(() => {
    setInputValues(Array(currentQuestion.answers.length).fill(''));
    setFeedbackMessage('');
    setIsCorrect(null);
    setAllBlanksFilled(false);
    setShowCorrectAnswer(false);
    inputRefs.current = [];
    setTimeLeft(TIMER_DURATION);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
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
  }, [currentQuestion.answers.length, currentQuestionIndex]);

  useEffect(() => {
    if (gameState === 'readAndComplete') {
      resetQuestionState();
      const timeoutId = setTimeout(() => {
        if (inputRefs.current[0]) inputRefs.current[0].focus();
      }, 100);
      return () => {
        clearInterval(timerRef.current);
        clearTimeout(timeoutId);
      };
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [currentQuestionIndex, resetQuestionState, gameState]);

  useEffect(() => {
    const filled = inputValues.every(v => v && v.length === 1);
    setAllBlanksFilled(filled);
  }, [inputValues]);

  const handleInputChange = (e, index) => {
    const val = e.target.value;
    const newValues = [...inputValues];
    newValues[index] = val.slice(0, 1).toLowerCase();
    setInputValues(newValues);
    setFeedbackMessage('');
    setIsCorrect(null);
    setShowCorrectAnswer(false);
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
    if (e.key === 'ArrowRight' && index < inputRefs.current.length - 1) inputRefs.current[index + 1].focus();
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1].focus();
  };

  const checkAnswer = () => {
    clearInterval(timerRef.current);
    const allCorrect = inputValues.every((v, i) => v === currentQuestion.answers[i]);
    setIsCorrect(allCorrect);
    setFeedbackMessage(allCorrect ? '所有填空都正确！' : '部分填空有误，请检查。');
    setShowCorrectAnswer(!allCorrect);
  };

  const redoQuestion = () => resetQuestionState();

  const goToNextQuestion = () => {
    if (currentQuestionIndex < questionsData.length - 1) {
      setCurrentQuestionIndex(i => i + 1);
    } else {
      setFeedbackMessage('恭喜你，所有题目都已完成！');
    }
  };

  const renderQuestionText = () => {
    const parts = currentQuestion.text.split('[BLANK]');
    const elements = [];
    parts.forEach((part, i) => {
      elements.push(<span key={`part-${i}`}>{part}</span>);
      if (i < currentQuestion.answers.length) {
        const correct = inputValues[i] === currentQuestion.answers[i];
        const showResult = isCorrect !== null || timeLeft === 0;
        elements.push(
          <span key={`input-${i}`} className="inline-block underline-container">
            <input
              type="text"
              maxLength={1}
              className={`underline-input ${showResult ? (correct ? 'correct' : 'wrong') : ''}`}
              value={inputValues[i]}
              onChange={e => handleInputChange(e, i)}
              onKeyDown={e => handleKeyDown(e, i)}
              ref={el => inputRefs.current[i] = el}
              disabled={showResult}
            />
          </span>
        );
      }
    });
    return elements;
  };

  const renderCorrectAnswer = () => {
    const parts = currentQuestion.text.split('[BLANK]');
    const el = [];
    parts.forEach((p, i) => {
      el.push(<span key={`p-${i}`}>{p}</span>);
      if (i < currentQuestion.answers.length) {
        el.push(<span key={`a-${i}`} className="text-blue-700 font-extrabold mx-0.5">{currentQuestion.answers[i]}</span>);
      }
    });
    return el;
  };

  const formatTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const handleInvitationCodeSubmit = () => {
    if (invitationCodeInput === INVITATION_CODE) {
      setGameState('questionTypeSelection');
      setInvitationCodeError('');
    } else {
      setInvitationCodeError('邀请码错误，请重试。');
    }
  };

  const renderContent = () => {
    switch (gameState) {
      case 'welcome':
        return (
          <div className="text-center flex flex-col items-center">
            <img src="https://raw.githubusercontent.com/yihengsir/duolingo-prep-platform/main/public/unnamed.png" alt="logo" className="w-36 h-36 mb-6" />
            <h1 className="text-3xl font-bold text-blue-600 mb-4">Duolingo DET Prep with Fengfeng</h1>
            <input
              className="px-4 py-2 border border-gray-300 rounded-md w-60 text-center"
              placeholder="请输入邀请码"
              value={invitationCodeInput}
              onChange={e => setInvitationCodeInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleInvitationCodeSubmit()}
            />
            {invitationCodeError && <p className="text-red-500 text-sm mt-2">{invitationCodeError}</p>}
            <button className="button-base button-blue mt-4" onClick={handleInvitationCodeSubmit}>进入</button>
          </div>
        );
      case 'questionTypeSelection':
        return (
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4 text-blue-600">选择题型</h1>
            <button onClick={() => setGameState('readAndComplete')} className="button-base button-green">阅读</button>
          </div>
        );
      case 'readAndComplete':
        return (
          <>
            <div className="absolute top-4 left-4 text-xl font-bold text-blue-600">{formatTime(timeLeft)}</div>
            <h1 className="text-2xl font-bold mb-2 text-blue-600 text-center">Duolingo DET Prep - 阅读并补全</h1>
            <h2 className="text-lg text-gray-700 text-center mb-6">{currentQuestion.title}</h2>
            <div className="text-lg text-left leading-relaxed whitespace-pre-wrap flex flex-wrap gap-1 px-2 md:px-8">{renderQuestionText()}</div>
            {feedbackMessage && (
              <p className={`mt-6 text-center text-lg font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                {feedbackMessage}
              </p>
            )}
            {showCorrectAnswer && (
              <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-800 rounded-md shadow-sm">
                <p className="font-semibold mb-2">正确答案:</p>
                <p className="whitespace-pre-wrap text-lg">{renderCorrectAnswer()}</p>
              </div>
            )}
            <div className="text-center mt-8 flex flex-wrap justify-center gap-4">
              <button
                onClick={checkAnswer}
                className={`button-base ${allBlanksFilled && isCorrect === null && timeLeft > 0 ? 'button-blue' : 'button-disabled'}`}
                disabled={!allBlanksFilled || isCorrect !== null || timeLeft === 0}
              >
                检查答案
              </button>
              <button onClick={redoQuestion} className="button-base button-yellow">重做</button>
              {isCorrect !== null && (
                <button onClick={goToNextQuestion} className="button-base button-green">
                  {currentQuestionIndex < questionsData.length - 1 ? '下一题' : '完成'}
                </button>
              )}
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-auto border border-gray-200 p-6 md:p-10">
        {renderContent()}
      </div>
    </div>
  );
}

export default App;