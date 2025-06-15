// src/App.jsx - 最终修复版（扁平输入逻辑 + 连续跳转 + 正确答案完整回填）
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
  const [inputValues, setInputValues] = useState([]); // flat
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isCorrect, setIsCorrect] = useState(null);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const inputRefs = useRef([]);
  const timerRef = useRef(null);

  const currentQuestion = questionsData[currentQuestionIndex];

  const resetQuestionState = useCallback(() => {
    setInputValues(Array(currentQuestion.answers.length).fill(''));
    setFeedbackMessage('');
    setIsCorrect(null);
    setShowCorrectAnswer(false);
    setTimeLeft(TIMER_DURATION);
    inputRefs.current = Array(currentQuestion.answers.length).fill(null);

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
  }, [currentQuestion]);

  useEffect(() => {
    if (gameState === 'readAndComplete') {
      resetQuestionState();
      setTimeout(() => {
        if (inputRefs.current[0]) inputRefs.current[0].focus();
      }, 0);
    }
    return () => clearInterval(timerRef.current);
  }, [gameState, currentQuestionIndex, resetQuestionState]);

  const handleCharChange = (e, index) => {
    const val = e.target.value.slice(0, 1);
    const updated = [...inputValues];
    updated[index] = val;
    setInputValues(updated);
    if (val && index < currentQuestion.answers.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleCharKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!inputValues[index] && index > 0) {
        const updated = [...inputValues];
        updated[index - 1] = '';
        setInputValues(updated);
        inputRefs.current[index - 1]?.focus();
        e.preventDefault();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < currentQuestion.answers.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const checkAnswer = () => {
    if (!inputValues.every(v => v)) return; // 不全不检查
    clearInterval(timerRef.current);
    const allCorrect = currentQuestion.answers.every((a, i) => a.toLowerCase() === inputValues[i].toLowerCase());
    setIsCorrect(allCorrect);
    setShowCorrectAnswer(true);
    setFeedbackMessage(allCorrect ? '所有填空都正确！' : '部分填空有误，请检查。');
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const goToNext = () => currentQuestionIndex < questionsData.length - 1 && setCurrentQuestionIndex(i => i + 1);
  const goToPrev = () => currentQuestionIndex > 0 && setCurrentQuestionIndex(i => i - 1);

  const handleInvitationCodeSubmit = () => {
    if (invitationCodeInput === INVITATION_CODE) {
      setGameState('questionTypeSelection');
      setInvitationCodeError('');
    } else {
      setInvitationCodeError('邀请码错误，请重试。');
    }
  };

  const renderBlanks = () => {
    const parts = currentQuestion.text.split('[BLANK]');
    let inputIndex = 0;
    const elements = [];
    parts.forEach((part, i) => {
      elements.push(<span key={`text-${i}`}>{part}</span>);
      if (i < currentQuestion.answers.length) {
        const show = isCorrect !== null || timeLeft === 0;
        const correct = currentQuestion.answers[inputIndex].toLowerCase() === (inputValues[inputIndex] || '').toLowerCase();
        const cls = `char-input ${show ? (correct ? 'correct' : 'incorrect') : ''}`;
        elements.push(
          <input
            key={`input-${inputIndex}`}
            type="text"
            maxLength={1}
            className={cls}
            value={inputValues[inputIndex] || ''}
            onChange={e => handleCharChange(e, inputIndex)}
            onKeyDown={e => handleCharKeyDown(e, inputIndex)}
            ref={el => inputRefs.current[inputIndex] = el}
            disabled={show}
          />
        );
        inputIndex++;
      }
    });
    return <div className="flex flex-wrap gap-1 leading-relaxed justify-start items-baseline">{elements}</div>;
  };

  const renderCorrectFullText = () => {
    const parts = currentQuestion.text.split('[BLANK]');
    return parts.map((part, i) => (
      <span key={`r-${i}`}>
        {part}
        {i < currentQuestion.answers.length && (
          <span className="text-blue-600 font-bold underline">{currentQuestion.answers[i]}</span>
        )}
      </span>
    ));
  };

  const renderContent = () => {
    if (gameState === 'welcome') {
      return (
        <div className="text-center flex flex-col items-center">
          <img src="/unnamed.png" alt="logo" className="w-36 h-36 rounded-full mb-8 shadow-lg" />
          <h1 className="text-3xl font-bold text-blue-600 mb-4">Duolingo DET Prep with Fengfeng</h1>
          <input
            className="px-4 py-2 border border-gray-300 rounded-md w-60 text-center text-lg"
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

    if (gameState === 'questionTypeSelection') {
      return (
        <div className="text-center flex flex-col items-center">
          <h2 className="text-2xl font-bold text-blue-600 mb-6">选择题型</h2>
          <button className="px-12 py-4 bg-green-600 text-white font-semibold rounded-full shadow-lg hover:bg-green-700 text-xl" onClick={() => setGameState('readAndComplete')}>阅读并补全</button>
        </div>
      );
    }

    if (gameState === 'readAndComplete') {
      const allFilled = inputValues.every(char => char !== '');
      const canCheck = allFilled || timeLeft === 0;
      return (
        <>
          <div className="absolute top-4 left-4">
            <button onClick={goToPrev} className="button-base text-sm" disabled={currentQuestionIndex === 0}>上一题</button>
          </div>
          <div className="absolute top-4 right-4">
            <button onClick={goToNext} className="button-base text-sm" disabled={currentQuestionIndex === questionsData.length - 1}>下一题</button>
          </div>
          <div className="text-center text-blue-600 text-xl font-bold mb-1">Duolingo DET Prep - 阅读并补全</div>
          <div className="text-center text-gray-500 text-sm mb-2">{currentQuestion.title}</div>
          <div className="text-center text-sm text-gray-500 mb-4">
            剩余时间: <span className="text-blue-600 font-bold">{formatTime(timeLeft)}</span>　 第 {currentQuestionIndex + 1} 题 / 共 {questionsData.length} 题
          </div>
          {renderBlanks()}
          {feedbackMessage && <p className={`mt-6 text-center text-lg font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>{feedbackMessage}</p>}
          {showCorrectAnswer && (
            <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-800 rounded-md shadow-sm">
              <p className="font-semibold mb-2">正确答案:</p>
              <p className="whitespace-pre-wrap text-lg">{renderCorrectFullText()}</p>
            </div>
          )}
          <div className="text-center mt-6 flex justify-center gap-4">
            <button onClick={checkAnswer} disabled={!canCheck} className={`button-base ${canCheck ? 'button-blue' : 'button-disabled opacity-40'}`}>检查答案</button>
            <button onClick={resetQuestionState} className="button-base button-yellow">重做</button>
          </div>
        </>
      );
    }
    return null;
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 font-inter">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-auto border border-gray-200 p-6 md:p-10">
        {renderContent()}
      </div>
    </div>
  );
}

export default App;