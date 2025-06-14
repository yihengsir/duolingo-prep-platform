// App.jsx（基于滚回版本1进行优化）
import { useState, useEffect, useRef } from 'react';
import './App.css';
import questionsData from '../data/read_and_complete.json';

const INVITATION_CODE = '130';
const TIMER_DURATION = 180;

function App() {
  const [gameState, setGameState] = useState('welcome');
  const [invitationCodeInput, setInvitationCodeInput] = useState('');
  const [invitationCodeError, setInvitationCodeError] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [inputValues, setInputValues] = useState([]);
  const [isCorrect, setIsCorrect] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const inputRefs = useRef([]);
  const timerRef = useRef(null);

  const currentQuestion = questionsData[currentQuestionIndex];

  useEffect(() => {
    if (gameState === 'readAndComplete') {
      setInputValues(Array(currentQuestion.answers.length).fill(''));
      setIsCorrect(null);
      setFeedbackMessage('');
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
    }
    return () => clearInterval(timerRef.current);
  }, [gameState, currentQuestionIndex]);

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const handleChange = (e, index) => {
    const val = e.target.value.slice(0, 1).toLowerCase();
    const newValues = [...inputValues];
    newValues[index] = val;
    setInputValues(newValues);
    setIsCorrect(null);
    setShowCorrectAnswer(false);
    setFeedbackMessage('');

    if (val && index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !inputValues[index] && index > 0) {
      const newValues = [...inputValues];
      newValues[index - 1] = '';
      setInputValues(newValues);
      inputRefs.current[index - 1].focus();
      e.preventDefault();
    }
  };

  const checkAnswer = () => {
    clearInterval(timerRef.current);
    const allCorrect = inputValues.every((v, i) => v === currentQuestion.answers[i]);
    setIsCorrect(allCorrect);
    setFeedbackMessage(allCorrect ? '所有填空都正确！' : '部分填空有误，请检查。');
    setShowCorrectAnswer(!allCorrect);
  };

  const redoQuestion = () => {
    setInputValues(Array(currentQuestion.answers.length).fill(''));
    setIsCorrect(null);
    setFeedbackMessage('');
    setShowCorrectAnswer(false);
    setTimeLeft(TIMER_DURATION);
    inputRefs.current = [];
  };

  const renderQuestionText = () => {
    const parts = currentQuestion.text.split('[BLANK]');
    const elements = [];

    parts.forEach((part, index) => {
      elements.push(<span key={`part-${index}`}>{part}</span>);
      if (index < currentQuestion.answers.length) {
        const isCharCorrect = inputValues[index] === currentQuestion.answers[index];
        const showResult = isCorrect !== null || timeLeft === 0;
        const inputClass = showResult
          ? isCharCorrect ? 'char-input correct' : 'char-input incorrect'
          : 'char-input';

        elements.push(
          <input
            key={`input-${index}`}
            type="text"
            maxLength={1}
            value={inputValues[index] || ''}
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            ref={(el) => inputRefs.current[index] = el}
            className={inputClass}
            disabled={showResult}
          />
        );
      }
    });

    return <div className="question-text-wrapper">{elements}</div>;
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
    switch (gameState) {
      case 'welcome':
        return (
          <div className="welcome-screen">
            <img src="/unnamed.png" alt="logo" className="logo" />
            <h1 className="title">Duolingo DET Prep with Fengfeng</h1>
            <input
              className="invitation-input"
              placeholder="请输入邀请码"
              value={invitationCodeInput}
              onChange={(e) => setInvitationCodeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvitationCodeSubmit()}
            />
            {invitationCodeError && <p className="error-text">{invitationCodeError}</p>}
            <button className="button-base button-blue mt-4" onClick={handleInvitationCodeSubmit}>进入</button>
          </div>
        );

      case 'readAndComplete':
        return (
          <>
            <div className="absolute top-4 left-4">
              <button onClick={() => setCurrentQuestionIndex(i => Math.max(0, i - 1))} className="button-base text-sm">上一题</button>
            </div>
            <div className="absolute top-4 right-4">
              <button onClick={() => setCurrentQuestionIndex(i => Math.min(questionsData.length - 1, i + 1))} className="button-base text-sm">下一题</button>
            </div>
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-sm text-gray-600">
              剩余时间: <span className="font-bold text-blue-600">{formatTime(timeLeft)}</span>
            </div>
            <div className="text-center text-blue-600 text-xl font-bold mb-2">Duolingo DET Prep - 阅读并补全</div>
            <div className="text-center text-gray-500 text-sm mb-4">{currentQuestion.title}</div>
            {renderQuestionText()}
            {feedbackMessage && (
              <p className={`mt-6 text-center text-lg font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>{feedbackMessage}</p>
            )}
            {showCorrectAnswer && (
              <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-800 rounded-md shadow-sm">
                <p className="font-semibold mb-2">正确答案:</p>
                <p className="whitespace-pre-wrap text-lg">{currentQuestion.text.replace(/\[BLANK\]/g, (_, i = 0) => currentQuestion.answers[i++] || '')}</p>
              </div>
            )}
            <div className="text-center mt-6 flex justify-center gap-4">
              <button onClick={checkAnswer} className="button-base button-blue">检查答案</button>
              <button onClick={redoQuestion} className="button-base button-yellow">重做</button>
            </div>
          </>
        );
      default:
        return null;
    }
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