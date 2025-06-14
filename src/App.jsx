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
  const inputRefs = useRef([]);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);

  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const timerRef = useRef(null);

  const resetQuestionState = useCallback(() => {
    setInputValues(Array(currentQuestion.answers.length).fill(''));
    setFeedbackMessage('');
    setIsCorrect(null);
    setAllBlanksFilled(false);
    inputRefs.current = [];
    setShowCorrectAnswer(false);
    setTimeLeft(TIMER_DURATION);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timerRef.current);
          setFeedbackMessage('时间到！请检查答案。');
          setIsCorrect(false);
          setShowCorrectAnswer(true);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  }, [currentQuestion.answers.length]);

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
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [currentQuestionIndex, resetQuestionState, gameState]);

  useEffect(() => {
    const filled = inputValues.every(value => value && value.length === 1);
    setAllBlanksFilled(filled);
  }, [inputValues]);

  const handleInputChange = (e, index) => {
    const value = e.target.value;
    const newValues = [...inputValues];

    newValues[index] = value.slice(0, 1).toLowerCase();
    setInputValues(newValues);
    setFeedbackMessage('');
    setIsCorrect(null);
    setShowCorrectAnswer(false);

    if (newValues[index].length === 1 && index < currentQuestion.answers.length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && inputValues[index] === '' && index > 0) {
      inputRefs.current[index - 1].focus();
      const newValues = [...inputValues];
      newValues[index - 1] = '';
      setInputValues(newValues);
      e.preventDefault();
    } else if (e.key === 'ArrowRight' && index < currentQuestion.answers.length - 1) {
      inputRefs.current[index + 1].focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const checkAnswer = () => {
    clearInterval(timerRef.current);
    let allCorrect = true;
    inputValues.forEach((inputChar, index) => {
      if (inputChar !== currentQuestion.answers[index]) allCorrect = false;
    });

    setIsCorrect(allCorrect);
    setFeedbackMessage(allCorrect ? '所有填空都正确！' : '部分填空有误，请检查。');
    setShowCorrectAnswer(!allCorrect);
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < questionsData.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setFeedbackMessage('恭喜你，所有题目都已完成！');
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const redoQuestion = () => {
    resetQuestionState();
  };

  const renderQuestionText = () => {
    const parts = currentQuestion.text.split('[BLANK]');
    const elements = [];
    parts.forEach((part, index) => {
      elements.push(<span key={`part-${index}`}>{part}</span>);
      if (index < currentQuestion.answers.length) {
        let borderColorClass = 'border-blue-500';
        if (isCorrect !== null || timeLeft === 0) {
          borderColorClass = inputValues[index] === currentQuestion.answers[index] ? 'border-green-500' : 'border-red-500';
        }
        elements.push(
          <input
            key={`input-${currentQuestionIndex}-${index}`}
            ref={el => inputRefs.current[index] = el}
            type="text"
            maxLength="1"
            className={`char-input ${borderColorClass}`}
            value={inputValues[index]}
            onChange={(e) => handleInputChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            disabled={timeLeft === 0 || isCorrect !== null}
          />
        );
      }
    });
    return elements;
  };

  const renderCorrectAnswer = () => {
    const parts = currentQuestion.text.split('[BLANK]');
    const elements = [];
    parts.forEach((part, index) => {
      elements.push(<span key={`correct-part-${index}`}>{part}</span>);
      if (index < currentQuestion.answers.length) {
        elements.push(<span key={`correct-answer-${index}`} className="text-blue-700 font-extrabold mx-0.5">{currentQuestion.answers[index]}</span>);
      }
    });
    return elements;
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleInvitationCodeSubmit = () => {
    if (invitationCodeInput === INVITATION_CODE) {
      setInvitationCodeError('');
      setGameState('questionTypeSelection');
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
              src="https://raw.githubusercontent.com/yihengsir/duolingo-prep-platform/main/public/unnamed.png"
              alt="Duolingo Logo"
              className="w-36 h-36 rounded-full mb-8 shadow-lg"
              onError={(e) => { e.target.src = 'https://placehold.co/150x150/ADD8E6/000000?text=Logo+Error'; }}
            />
            <h1 className="text-4xl font-bold mb-6 text-blue-600">Duolingo DET Prep with Fengfeng</h1>
            <div className="mt-8 flex flex-col items-center">
              <label htmlFor="invitationCode" className="text-lg text-gray-700 mb-2">请输入邀请码:</label>
              <input
                id="invitationCode"
                type="text"
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg w-64 text-center"
                value={invitationCodeInput}
                onChange={(e) => setInvitationCodeInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleInvitationCodeSubmit()}
              />
              {invitationCodeError && <p className="text-red-600 mt-2 text-sm">{invitationCodeError}</p>}
              <button
                onClick={handleInvitationCodeSubmit}
                className="mt-6 bg-white text-blue-600 border border-blue-600 px-8 py-3 rounded-full text-lg font-semibold hover:bg-blue-50 focus:outline-none"
              >进入</button>
            </div>
          </div>
        );

      case 'questionTypeSelection':
        return (
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-6 text-blue-600">选择题型</h1>
            <div className="flex flex-col items-center space-y-4">
              <button
                onClick={() => setGameState('readAndComplete')}
                className="bg-white text-green-600 border border-green-600 px-12 py-4 rounded-full text-xl font-semibold hover:bg-green-50"
              >阅读</button>
            </div>
          </div>
        );

      case 'readAndComplete':
        return (
          <>
            <div className="absolute top-4 left-4 text-2xl font-bold text-blue-600">{formatTime(timeLeft)}</div>
            <h1 className="text-3xl font-bold mb-4 text-blue-600 text-center">Duolingo DET Prep - 阅读并补全</h1>
            <h2 className="text-xl font-medium mb-6 text-gray-700 text-center">{currentQuestion.title}</h2>
            <div className="text-lg mb-4 whitespace-pre-wrap flex flex-wrap items-center justify-center px-4 md:px-8">
              {renderQuestionText()}
            </div>
            {feedbackMessage && <p className={`mt-4 text-center text-lg font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>{feedbackMessage}</p>}
            {showCorrectAnswer && (
              <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-800 rounded-md shadow-sm">
                <p className="font-semibold mb-2">正确答案:</p>
                <p className="whitespace-pre-wrap text-lg">{renderCorrectAnswer()}</p>
              </div>
            )}
            <div className="text-center mt-8 space-x-4">
              <button
                onClick={checkAnswer}
                className={`px-8 py-3 rounded-full text-lg font-semibold border transition-all ${allBlanksFilled && isCorrect === null && timeLeft > 0 ? 'text-gray-800 border-gray-500 bg-white hover:bg-gray-100' : 'text-gray-400 bg-gray-100 border-gray-300 cursor-not-allowed'}`}
                disabled={!allBlanksFilled || isCorrect !== null || timeLeft === 0}
              >检查答案</button>
              <button
                onClick={redoQuestion}
                className="text-yellow-600 border border-yellow-500 bg-white px-8 py-3 rounded-full text-lg font-semibold hover:bg-yellow-50"
              >重做</button>
              {isCorrect !== null && (
                <button
                  onClick={goToNextQuestion}
                  className="text-green-600 border border-green-600 bg-white px-8 py-3 rounded-full text-lg font-semibold hover:bg-green-50"
                >{currentQuestionIndex < questionsData.length - 1 ? '下一题' : '完成'}</button>
              )}
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-2">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-auto my-6 border border-gray-200 p-6">
        {renderContent()}
      </div>
    </div>
  );
}

export default App;