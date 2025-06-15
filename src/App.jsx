import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import questionsData from '../data/read_and_complete.json'; // 👈 静态导入 JSON

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
    setInputValues(Array(currentQuestion.answers.length).fill(''));
    setFeedbackMessage('');
    setIsCorrect(null);
    setShowCorrectAnswer(false);
    inputRefs.current = Array(currentQuestion.answers.length).fill(null);
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
  }, [currentQuestion]);

  useEffect(() => {
    if (gameState === 'readAndComplete') {
      resetQuestionState();
      const timeoutId = setTimeout(() => {
        if (inputRefs.current[0]) inputRefs.current[0].focus();
      }, 0);
      return () => {
        clearInterval(timerRef.current);
        clearTimeout(timeoutId);
      };
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [currentQuestionIndex, gameState, resetQuestionState]);

  const handleChange = (e, index) => {
    const val = e.target.value.slice(0, 1);
    const newValues = [...inputValues];
    newValues[index] = val;
    setInputValues(newValues);
    setFeedbackMessage('');
    setIsCorrect(null);
    setShowCorrectAnswer(false);

    if (val && index < currentQuestion.answers.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (inputValues[index].length === 0 && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newValues = [...inputValues];
        newValues[index - 1] = '';
        setInputValues(newValues);
        e.preventDefault();
      } else if (inputValues[index].length === 1) {
        const newValues = [...inputValues];
        newValues[index] = '';
        setInputValues(newValues);
        e.preventDefault();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < currentQuestion.answers.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const checkAnswer = () => {
    clearInterval(timerRef.current);
    const allCorrect = currentQuestion.answers.every(
      (ans, i) => ans.toLowerCase() === (inputValues[i] || '').toLowerCase()
    );
    setIsCorrect(allCorrect);
    setShowCorrectAnswer(!allCorrect);
    setFeedbackMessage(allCorrect ? '所有填空都正确！' : '部分填空有误，请检查。');
  };

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const goToNext = () => {
    if (currentQuestionIndex < questionsData.length - 1) {
      setCurrentQuestionIndex(i => i + 1);
    }
  };

  const goToPrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(i => i - 1);
    }
  };

  const handleInvitationCodeSubmit = () => {
    if (invitationCodeInput === INVITATION_CODE) {
      setGameState('questionTypeSelection');
      setInvitationCodeError('');
    } else {
      setInvitationCodeError('邀请码错误，请重试。');
    }
  };

  const renderInputs = () => {
    const parts = currentQuestion.text.split('[BLANK]');
    const elements = [];
    let blankIndex = 0;

    parts.forEach((part, index) => {
      elements.push(
        <span key={`text-${index}`} className="whitespace-pre-wrap">{part}</span>
      );

      if (index < currentQuestion.answers.length) {
        const showResult = isCorrect === true || timeLeft === 0;
        const inputChar = inputValues[blankIndex] || '';
        const isCorrectChar = currentQuestion.answers[blankIndex].toLowerCase() === inputChar.toLowerCase();

        const inputClass = `
          w-[24px] h-[32px] text-center border rounded-md mx-[2px] p-[2px] font-semibold text-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200
          ${showResult && isCorrectChar ? 'border-green-500 bg-green-100 text-green-700' : ''}
          ${showResult && !isCorrectChar ? 'border-red-500 bg-red-100 text-red-700' : ''}
          ${!showResult ? 'border-gray-300 bg-white text-gray-800' : ''}
        `;

        elements.push(
          <input
            key={`input-${blankIndex}`}
            type="text"
            maxLength={1}
            className={inputClass}
            value={inputChar}
            onChange={(e) => handleChange(e, blankIndex)}
            onKeyDown={(e) => handleKeyDown(e, blankIndex)}
            ref={(el) => { inputRefs.current[blankIndex] = el; }}
            disabled={showResult}
          />
        );
        blankIndex++;
      }
    });

    return <div className="flex flex-wrap gap-1 leading-relaxed justify-start items-baseline">{elements}</div>;
  };

  const renderContent = () => {
    if (gameState === 'welcome') {
      return (
        <div className="text-center flex flex-col items-center">
          <img
            src="/unnamed.png"
            alt="logo"
            className="w-36 h-36 rounded-full mb-8 shadow-lg"
            loading="lazy"
            onError={(e) => { e.target.src = "https://placehold.co/144x144/E0E0E0/333333?text=Logo+Missing"; }}
          />
          <h1 className="text-3xl font-bold text-blue-600 mb-4">Duolingo DET Prep with Fengfeng</h1>
          <input
            className="px-4 py-2 border border-gray-300 rounded-md w-60 text-center text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            placeholder="请输入邀请码"
            value={invitationCodeInput}
            onChange={(e) => setInvitationCodeInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleInvitationCodeSubmit()}
          />
          {invitationCodeError && <p className="text-red-500 text-sm mt-2">{invitationCodeError}</p>}
          <button
            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-md hover:bg-blue-700 transition duration-200 ease-in-out mt-6"
            onClick={handleInvitationCodeSubmit}
          >
            进入
          </button>
        </div>
      );
    }

    if (gameState === 'questionTypeSelection') {
      return (
        <div className="text-center flex flex-col items-center">
          <h2 className="text-2xl font-bold text-blue-600 mb-6">选择题型</h2>
          <button
            className="px-12 py-4 bg-green-600 text-white font-semibold rounded-full shadow-lg hover:bg-green-700 transition duration-200 ease-in-out text-xl"
            onClick={() => setGameState('readAndComplete')}
          >
            阅读并补全
          </button>
          <p className="text-gray-500 text-sm mt-4">更多题型即将推出！</p>
        </div>
      );
    }

    if (gameState === 'readAndComplete') {
      return (
        <>
          <div className="absolute top-4 left-4">
            <button
              onClick={goToPrev}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full shadow-sm hover:bg-gray-300 transition duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentQuestionIndex === 0}
            >
              上一题
            </button>
          </div>
          <div className="absolute top-4 right-4">
            <button
              onClick={goToNext}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full shadow-sm hover:bg-gray-300 transition duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentQuestionIndex === questionsData.length - 1}
            >
              下一题
            </button>
          </div>

          <div className="text-center text-blue-600 text-xl font-bold mb-1">Duolingo DET Prep - 阅读并补全</div>
          <div className="text-center text-gray-500 text-sm mb-2">{currentQuestion.title}</div>
          <div className="text-center text-sm text-gray-500 mb-4">
            剩余时间: <span className="text-blue-600 font-bold">{formatTime(timeLeft)}</span>　 第 {currentQuestionIndex + 1} 题 / 共 {questionsData.length} 题
          </div>

          {renderInputs()}

          {feedbackMessage && (
            <p className={`mt-6 text-center text-lg font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>{feedbackMessage}</p>
          )}

          {showCorrectAnswer && (
            <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-800 rounded-md shadow-sm">
              <p className="font-semibold mb-2">正确答案:</p>
              <p className="whitespace-pre-wrap text-lg">{currentQuestion.answers.join('')}</p>
            </div>
          )}

          <div className="text-center mt-6 flex justify-center gap-4">
            <button
              onClick={checkAnswer}
              className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-md hover:bg-blue-700 transition duration-200 ease-in-out"
            >
              检查答案
            </button>
            <button
              onClick={resetQuestionState}
              className="px-8 py-3 bg-yellow-500 text-white font-semibold rounded-full shadow-md hover:bg-yellow-600 transition duration-200 ease-in-out"
            >
              重做
            </button>
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