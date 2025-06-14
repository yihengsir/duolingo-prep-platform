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
  const [inputValues, setInputValues] = useState(
    Array(currentQuestion.answers.length).fill('')
  );
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isCorrect, setIsCorrect] = useState(null);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const timerRef = useRef(null);
  const inputRefs = useRef([]);

  const resetQuestionState = useCallback(() => {
    setInputValues(Array(currentQuestion.answers.length).fill(''));
    setFeedbackMessage('');
    setIsCorrect(null);
    setShowCorrectAnswer(false);
    setTimeLeft(TIMER_DURATION);
    inputRefs.current = [];
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
  }, [currentQuestion.answers.length]);

  useEffect(() => {
    if (gameState === 'readAndComplete') {
      resetQuestionState();
    }
    return () => clearInterval(timerRef.current);
  }, [currentQuestionIndex, gameState, resetQuestionState]);

  const handleWordChange = (e, wordIdx, letterIdx) => {
    const newChar = e.target.value.slice(0, 1).toLowerCase();
    const newValues = [...inputValues];
    const word = newValues[wordIdx] || ''.padEnd(currentQuestion.answers[wordIdx].length, ' ');
    newValues[wordIdx] =
      word.substring(0, letterIdx) + newChar + word.substring(letterIdx + 1);
    setInputValues(newValues);

    // 自动跳转逻辑
    const nextRef = inputRefs.current[wordIdx]?.[letterIdx + 1]
      || inputRefs.current[wordIdx + 1]?.[0];
    if (nextRef) nextRef.focus();
  };

  const handleWordKeyDown = (e, wordIdx, letterIdx) => {
    if (e.key === 'ArrowRight') {
      const next = inputRefs.current[wordIdx]?.[letterIdx + 1];
      if (next) next.focus();
    } else if (e.key === 'ArrowLeft') {
      const prev = inputRefs.current[wordIdx]?.[letterIdx - 1];
      if (prev) prev.focus();
    } else if (e.key === 'Backspace') {
      const currentVal = inputValues[wordIdx]?.[letterIdx];
      if (!currentVal && letterIdx > 0) {
        const prev = inputRefs.current[wordIdx]?.[letterIdx - 1];
        if (prev) prev.focus();
      }
    }
  };

  const checkAnswer = () => {
    clearInterval(timerRef.current);
    const allCorrect = currentQuestion.answers.every(
      (ans, idx) => inputValues[idx] === ans
    );
    setIsCorrect(allCorrect);
    setFeedbackMessage(allCorrect ? '所有填空都正确！' : '部分填空有误，请检查。');
    setShowCorrectAnswer(!allCorrect);
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < questionsData.length - 1) {
      setCurrentQuestionIndex(i => i + 1);
    } else {
      setFeedbackMessage('恭喜你，所有题目都已完成！');
    }
  };

  const goToPrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(i => i - 1);
    }
  };

  const renderQuestionText = () => {
    const parts = currentQuestion.text.split('[BLANK]');
    const elements = [];
    parts.forEach((part, index) => {
      elements.push(<span key={`part-${index}`}>{part}</span>);
      if (index < currentQuestion.answers.length) {
        const answer = currentQuestion.answers[index];
        const showResult = isCorrect !== null || timeLeft === 0;
        elements.push(
          <span key={`group-${index}`} className="inline-flex gap-[2px] whitespace-nowrap">
            {answer.split('').map((_, letterIdx) => {
              const isCharCorrect =
                inputValues[index]?.[letterIdx] === answer[letterIdx];
              const inputClass = showResult
                ? isCharCorrect
                  ? 'char-input correct'
                  : 'char-input incorrect'
                : 'char-input';
              return (
                <input
                  key={`input-${index}-${letterIdx}`}
                  type="text"
                  maxLength={1}
                  className={inputClass}
                  value={inputValues[index]?.[letterIdx] || ''}
                  onChange={(e) => handleWordChange(e, index, letterIdx)}
                  onKeyDown={(e) => handleWordKeyDown(e, index, letterIdx)}
                  ref={(el) => {
                    if (!inputRefs.current[index]) inputRefs.current[index] = [];
                    inputRefs.current[index][letterIdx] = el;
                  }}
                  disabled={showResult}
                />
              );
            })}
          </span>
        );
      }
    });
    return <div className="text-left flex flex-wrap gap-1 leading-relaxed">{elements}</div>;
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const handleInvitationCodeSubmit = () => {
    if (invitationCodeInput === INVITATION_CODE) {
      setGameState('readAndComplete');
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
            <img
              src="/unnamed.png"
              alt="logo"
              className="w-28 h-28 mb-4"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
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

      case 'readAndComplete':
        return (
          <>
            <div className="absolute top-4 left-4">
              <button onClick={goToPrevQuestion} className="button-base text-sm">上一题</button>
            </div>
            <div className="absolute top-4 right-4">
              <button onClick={goToNextQuestion} className="button-base text-sm">下一题</button>
            </div>
            <div className="text-center text-blue-600 text-xl font-bold mb-1">Duolingo DET Prep - 阅读并补全</div>
            <div className="text-center text-gray-500 text-sm mb-2">{currentQuestion.title}</div>
            <div className="text-center text-xs text-gray-500 mb-4">
              剩余时间: <span className="text-blue-600 font-bold">{formatTime(timeLeft)}</span>
              <span className="ml-4">第 {currentQuestionIndex + 1} 题 / 共 {questionsData.length} 题</span>
            </div>
            {renderQuestionText()}
            {feedbackMessage && (
              <p className={`mt-6 text-center text-lg font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>{feedbackMessage}</p>
            )}
            {showCorrectAnswer && (
              <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-800 rounded-md shadow-sm">
                <p className="font-semibold mb-2">正确答案:</p>
                <p className="whitespace-pre-wrap text-lg">
                  {currentQuestion.text.replaceAll('[BLANK]', () => currentQuestion.answers.shift())}
                </p>
              </div>
            )}
            <div className="text-center mt-6 flex justify-center gap-4">
              <button onClick={checkAnswer} className="button-base button-blue">检查答案</button>
              <button onClick={resetQuestionState} className="button-base button-yellow">重做</button>
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