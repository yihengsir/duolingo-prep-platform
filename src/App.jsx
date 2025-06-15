// src/App.jsx - 最终、全面修复版（Fetch数据 + 聚焦 + 样式 V16）
import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css'; // 确保导入 App.css

const TIMER_DURATION = 180;
const INVITATION_CODE = '130';

function App() {
  const [gameState, setGameState] = useState('welcome');
  const [invitationCodeInput, setInvitationCodeInput] = useState('');
  const [invitationCodeError, setInvitationCodeError] = useState('');
  const [questionsData, setQuestionsData] = useState([]); // 异步加载的数据
  const [dataLoadingError, setDataLoadingError] = useState(''); // 数据加载错误信息

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [inputValues, setInputValues] = useState([]); // 扁平数组
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isCorrect, setIsCorrect] = useState(null);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);

  const inputRefs = useRef(new Map()); // 使用 Map 来存储引用
  const timerRef = useRef(null);
  const currentQuestion = questionsData[currentQuestionIndex];

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const response = await fetch('/data/read_and_complete.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const text = await response.text();
        const data = JSON.parse(text);
        setQuestionsData(data);
        setDataLoadingError('');
      } catch (error) {
        console.error("Failed to load questions data:", error);
        setDataLoadingError("加载题目数据失败，请检查文件或网络连接。可能 'data/read_and_complete.json' 不存在或编码不正确。");
      }
    };
    if (questionsData.length === 0 && !dataLoadingError) loadQuestions();
  }, [questionsData.length, dataLoadingError]);

  const resetQuestionState = useCallback(() => {
    if (!currentQuestion || !Array.isArray(currentQuestion.answers)) return;
    setInputValues(Array(currentQuestion.answers.length).fill(''));
    setFeedbackMessage('');
    setIsCorrect(null);
    setShowCorrectAnswer(false);
    setTimeLeft(TIMER_DURATION);
    inputRefs.current.clear();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setTimeLeft(0);
          if (isCorrect === null) checkAnswer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [currentQuestion, isCorrect]);

  useEffect(() => {
    if (gameState === 'readAndComplete' && currentQuestion) {
      resetQuestionState();
      const checkAndFocus = () => {
        if (inputRefs.current.size === currentQuestion.answers.length) {
          const firstInput = inputRefs.current.get(0);
          if (firstInput) {
            firstInput.focus();
            return true;
          }
        }
        return false;
      };
      let attempts = 0;
      const maxAttempts = 20;
      const intervalId = setInterval(() => {
        if (checkAndFocus() || attempts >= maxAttempts) clearInterval(intervalId);
        attempts++;
      }, 50);
      return () => {
        clearInterval(timerRef.current);
        clearInterval(intervalId);
      };
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [gameState, currentQuestionIndex, resetQuestionState, currentQuestion]);

  const handleCharChange = (e, index) => {
    const val = e.target.value.slice(0, 1).toLowerCase();
    const updated = [...inputValues];
    updated[index] = val;
    setInputValues(updated);
    setFeedbackMessage('');
    setIsCorrect(null);
    setShowCorrectAnswer(false);
    if (val && index < currentQuestion.answers.length - 1) inputRefs.current.get(index + 1)?.focus();
  };

  const handleCharKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (inputValues[index] === '' && index > 0) {
        const updated = [...inputValues];
        updated[index - 1] = '';
        setInputValues(updated);
        inputRefs.current.get(index - 1)?.focus();
        e.preventDefault();
      } else if (inputValues[index] !== '') {
        const updated = [...inputValues];
        updated[index] = '';
        setInputValues(updated);
        e.preventDefault();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) inputRefs.current.get(index - 1)?.focus();
    else if (e.key === 'ArrowRight' && index < currentQuestion.answers.length - 1) inputRefs.current.get(index + 1)?.focus();
  };

  const checkAnswer = () => {
    if (!currentQuestion || !Array.isArray(currentQuestion.answers) || inputValues.length !== currentQuestion.answers.length) {
      setFeedbackMessage('题目数据未加载或输入框数量不匹配，无法检查。');
      setIsCorrect(false);
      return;
    }
    const allFilled = inputValues.every(char => char.trim() !== '');
    if (!allFilled && timeLeft > 0) {
      setFeedbackMessage('请填写所有空白处才能检查。');
      setIsCorrect(false);
      return;
    }
    clearInterval(timerRef.current);
    const allCorrect = currentQuestion.answers.every((correctChar, i) => (inputValues[i] || '').toLowerCase() === correctChar.toLowerCase());
    setIsCorrect(allCorrect);
    setShowCorrectAnswer(true);
    setFeedbackMessage(allCorrect ? '所有填空都正确！' : '部分填空有误，请检查。');
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const goToNext = () => { if (currentQuestionIndex < questionsData.length - 1 && questionsData.length > 0) setCurrentQuestionIndex(i => i + 1); };
  const goToPrev = () => { if (currentQuestionIndex > 0) setCurrentQuestionIndex(i => i - 1); };
  const handleInvitationCodeSubmit = () => {
    if (invitationCodeInput === INVITATION_CODE) {
      setGameState('questionTypeSelection');
      setInvitationCodeError('');
    } else setInvitationCodeError('邀请码错误，请重试。');
  };

  const renderBlanks = () => {
    if (!currentQuestion) return null;
    const parts = currentQuestion.text.split('[BLANK]');
    const elements = [];
    let charInputIndex = 0;
    parts.forEach((part, i) => {
      elements.push(<span key={`text-part-${i}`} className="whitespace-pre-wrap">{part}</span>);
      if (charInputIndex < currentQuestion.answers.length) {
        const showResult = isCorrect !== null || timeLeft === 0;
        const filledChar = inputValues[charInputIndex] || '';
        const isCorrectChar = filledChar.toLowerCase() === currentQuestion.answers[charInputIndex].toLowerCase();
        const inputClass = showResult ? (isCorrectChar ? 'char-input correct' : 'char-input incorrect') : 'char-input';
        elements.push(
          <input
            key={`char-input-${charInputIndex}`}
            type="text"
            maxLength={1}
            className={inputClass}
            value={filledChar}
            onChange={(e) => handleCharChange(e, charInputIndex)}
            onKeyDown={(e) => handleCharKeyDown(e, charInputIndex)}
            ref={(el) => { if (el) inputRefs.current.set(charInputIndex, el); else inputRefs.current.delete(charInputIndex); }}
            disabled={showResult}
          />
        );
        charInputIndex++;
      }
    });
    return <div className="flex flex-wrap gap-1 leading-relaxed justify-start items-baseline text-lg">{elements}</div>;
  };

  const renderCorrectFullText = () => {
    if (!currentQuestion) return null;
    const parts = currentQuestion.text.split('[BLANK]');
    let correctTextElements = [];
    let answerIndex = 0;
    parts.forEach((part, i) => {
      correctTextElements.push(<span key={`correct-part-${i}`}>{part}</span>);
      if (answerIndex < currentQuestion.answers.length) {
        correctTextElements.push(<span key={`correct-answer-${answerIndex}`} className="text-blue-600 font-bold underline">{currentQuestion.answers[answerIndex]}</span>);
        answerIndex++;
      }
    });
    return correctTextElements;
  };

  const renderContent = () => { /* 已省略，见右侧完整文档 */ };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-auto border border-gray-200 p-6 md:p-10 min-h-[400px] flex flex-col justify-center">
        {renderContent()}
      </div>
      <style>{`body { font-family: 'Inter', system-ui, Avenir, Helvetica, Arial, sans-serif, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'WenQuanYi Micro Hei', 'STHeiti'; }`}</style>
    </div>
  );
}

export default App;