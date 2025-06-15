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

  // 关键修正：inputRefs 每次渲染时都会被清空和重新填充
  // 使用 Map 或 Object 而非数组来存储，确保引用的稳定性，避免 null 填充问题
  const inputRefs = useRef(new Map()); // 使用 Map 来存储引用

  const timerRef = useRef(null);

  const currentQuestion = questionsData[currentQuestionIndex];

  // ==================== 数据加载 Effect ====================
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const response = await fetch('/data/read_and_complete.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        const data = JSON.parse(text);
        setQuestionsData(data);
        setDataLoadingError('');
      } catch (error) {
        console.error("Failed to load questions data:", error);
        setDataLoadingError("加载题目数据失败，请检查文件或网络连接。可能 'data/read_and_complete.json' 不存在或编码不正确。");
      }
    };

    if (questionsData.length === 0 && !dataLoadingError) {
      loadQuestions();
    }
  }, [questionsData.length, dataLoadingError]);

  // ==================== 状态重置与计时器 ====================
  const resetQuestionState = useCallback(() => {
    if (!currentQuestion || !Array.isArray(currentQuestion.answers)) {
      console.error("currentQuestion or answers is not ready for reset. Skipping reset.");
      return; 
    }

    setInputValues(Array(currentQuestion.answers.length).fill(''));
    setFeedbackMessage('');
    setIsCorrect(null);
    setShowCorrectAnswer(false);
    setTimeLeft(TIMER_DURATION);
    
    // 关键修正：重置 Map，而不是数组
    inputRefs.current.clear(); // 清空 Map 中的所有引用

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setTimeLeft(0);
          if (isCorrect === null) {
              checkAnswer();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [currentQuestion, isCorrect]);

  // ==================== 游戏状态切换与聚焦 Effect ====================
  // 关键修正：只有在 inputRefs 中的所有引用都准备好之后才尝试聚焦
  useEffect(() => {
    if (gameState === 'readAndComplete' && currentQuestion) {
      resetQuestionState(); // 重置状态
      
      // 使用一个辅助函数来检查所有 refs 是否都已填充
      const checkAndFocus = () => {
        if (inputRefs.current.size === currentQuestion.answers.length) {
            // 确保所有输入框都已渲染并赋值了引用
            const firstInput = inputRefs.current.get(0); // 从 Map 中获取第一个引用
            if (firstInput) {
                firstInput.focus();
                return true; // 聚焦成功，停止检查
            }
        }
        return false; // 尚未完全就绪
      };

      // 持续检查直到所有 refs 都被赋值或者达到超时
      let attempts = 0;
      const maxAttempts = 20; // 尝试 20 次，每次 50ms = 1秒
      const intervalId = setInterval(() => {
        if (checkAndFocus() || attempts >= maxAttempts) {
          clearInterval(intervalId);
        }
        attempts++;
      }, 50); // 每 50ms 检查一次

      return () => {
        clearInterval(timerRef.current);
        clearInterval(intervalId); // 清除聚焦检查的 interval
      };
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [gameState, currentQuestionIndex, resetQuestionState, currentQuestion]);

  // ==================== 输入处理逻辑 ====================
  const handleCharChange = (e, index) => {
    const val = e.target.value.slice(0, 1).toLowerCase();
    const updated = [...inputValues];
    updated[index] = val;
    setInputValues(updated);

    setFeedbackMessage('');
    setIsCorrect(null);
    setShowCorrectAnswer(false);

    if (val && index < currentQuestion.answers.length - 1) {
      inputRefs.current.get(index + 1)?.focus(); // 从 Map 中获取下一个引用
    }
  };

  const handleCharKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (inputValues[index] === '' && index > 0) {
        const updated = [...inputValues];
        updated[index - 1] = '';
        setInputValues(updated);
        inputRefs.current.get(index - 1)?.focus(); // 从 Map 中获取前一个引用
        e.preventDefault();
      } else if (inputValues[index] !== '') {
        const updated = [...inputValues];
        updated[index] = '';
        setInputValues(updated);
        e.preventDefault();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current.get(index - 1)?.focus(); // 从 Map 中获取前一个引用
    } else if (e.key === 'ArrowRight' && index < currentQuestion.answers.length - 1) {
      inputRefs.current.get(index + 1)?.focus(); // 从 Map 中获取下一个引用
    }
  };

  // ==================== 检查答案 ====================
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
    const allCorrect = currentQuestion.answers.every((correctChar, i) =>
      (inputValues[i] || '').toLowerCase() === correctChar.toLowerCase()
    );
    setIsCorrect(allCorrect);
    setShowCorrectAnswer(true);
    setFeedbackMessage(allCorrect ? '所有填空都正确！' : '部分填空有误，请检查。');
  };

  // ==================== 导航与邀请码 ====================
  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const goToNext = () => {
    if (currentQuestionIndex < questionsData.length - 1 && questionsData.length > 0) {
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

  // ==================== 渲染函数 ====================
  const renderBlanks = () => {
    if (!currentQuestion) return null;

    const parts = currentQuestion.text.split('[BLANK]');
    const elements = [];
    let charInputIndex = 0;

    // 关键修正：每次渲染时，确保 Map 被清空或正确管理，以避免旧引用干扰
    // inputRefs.current = new Map(); // 不在这里清空，在 resetQuestionState 清空

    parts.forEach((part, i) => {
      elements.push(<span key={`text-part-${i}`} className="whitespace-pre-wrap">{part}</span>);

      if (charInputIndex < currentQuestion.answers.length) {
        const showResult = isCorrect !== null || timeLeft === 0;
        const filledChar = inputValues[charInputIndex] || '';

        const isCorrectChar = filledChar.toLowerCase() === currentQuestion.answers[charInputIndex].toLowerCase();
        const inputClass = showResult
          ? (isCorrectChar ? 'char-input correct' : 'char-input incorrect')
          : 'char-input';

        elements.push(
          <input
            key={`char-input-${charInputIndex}`}
            type="text"
            maxLength={1}
            className={inputClass}
            value={filledChar}
            onChange={(e) => handleCharChange(e, charInputIndex)}
            onKeyDown={(e) => handleCharKeyDown(e, charInputIndex)}
            // 关键修正：使用 Map.set() 来保存引用
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
        correctTextElements.push(
          <span key={`correct-answer-${answerIndex}`} className="text-blue-600 font-bold underline">
            {currentQuestion.answers[answerIndex]}
          </span>
        );
        answerIndex++;
      }
    });
    return correctTextElements;
  };

  const renderContent = () => {
    if (questionsData.length === 0 && dataLoadingError) {
      return (
        <div className="text-center text-red-600 text-lg font-semibold py-20 min-h-[300px] flex items-center justify-center">
          {dataLoadingError}
          <p className="text-sm text-gray-500 mt-2">请确保 'data/read_and_complete.json' 文件存在于项目根目录的 'data' 文件夹中，并且是 UTF-8 编码。</p>
        </div>
      );
    }
    if (questionsData.length === 0 && !dataLoadingError && gameState !== 'welcome') {
        return (
            <div className="text-center text-blue-600 text-lg font-semibold py-20 min-h-[300px] flex items-center justify-center">
                加载题目中...
            </div>
        );
    }
    if (gameState === 'readAndComplete' && !currentQuestion && questionsData.length > 0) {
      return (
        <div className="text-center text-red-600 text-lg font-semibold py-20 min-h-[300px] flex items-center justify-center">
          题目数据错误或未加载。请检查 'data/read_and_complete.json' 的内容格式。
        </div>
      );
    }

    if (gameState === 'welcome') {
      return (
        <div className="text-center flex flex-col items-center py-20 min-h-[300px] justify-center">
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
            className="button-base button-blue mt-4" 
            onClick={handleInvitationCodeSubmit}
          >
            进入
          </button>
        </div>
      );
    }

    if (gameState === 'questionTypeSelection') {
      return (
        <div className="text-center flex flex-col items-center py-20 min-h-[300px] justify-center">
          <h2 className="text-2xl font-bold text-blue-600 mb-6">选择题型</h2>
          <button
            className="button-base button-green mb-4 px-12 py-4 text-xl" 
            onClick={() => setGameState('readAndComplete')}
          >
            阅读并补全
          </button>
          <p className="text-gray-500 text-sm mt-4">更多题型即将推出！</p>
        </div>
      );
    }

    if (gameState === 'readAndComplete') {
      if (!currentQuestion) {
        return (
          <div className="text-center text-red-600 text-lg font-semibold py-20 min-h-[300px] flex items-center justify-center">
            题目数据错误或未加载。请检查 'data/read_and_complete.json'。
          </div>
        );
      }
      
      const allFilled = inputValues.every(char => char.trim() !== '');
      const canCheck = allFilled && isCorrect === null && timeLeft > 0; 

      return (
        <>
          <div className="absolute top-4 left-4">
            <button 
              onClick={goToPrev} 
              className="button-base bg-gray-200 text-gray-700 hover:bg-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentQuestionIndex === 0} 
            >
              上一题
            </button>
          </div>
          <div className="absolute top-4 right-4">
            <button 
              onClick={goToNext} 
              className="button-base bg-gray-200 text-gray-700 hover:bg-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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

          {renderBlanks()} 

          {feedbackMessage && ( 
            <p className={`mt-6 text-center text-lg font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>{feedbackMessage}</p>
          )}

          {showCorrectAnswer && ( 
            <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-800 rounded-md shadow-sm">
              <p className="font-semibold mb-2">正确答案:</p>
              <p className="whitespace-pre-wrap text-lg">
                {renderCorrectFullText()} 
              </p>
            </div>
          )}

          <div className="text-center mt-6 flex justify-center gap-4">
            <button 
              onClick={checkAnswer} 
              disabled={!canCheck} 
              className={`button-base ${canCheck ? 'button-blue' : 'button-disabled opacity-40'}`} 
            >
              检查答案
            </button>
            <button 
              onClick={resetQuestionState} 
              className="button-base button-yellow" 
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
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-auto border border-gray-200 p-6 md:p-10 min-h-[400px] flex flex-col justify-center"> {/* 增加 min-h 和 flex 布局，确保卡片有最小高度并内容居中 */}
        {renderContent()}
      </div>
      {/* 全局字体样式，确保 Inter 字体被应用，并包含中文字体回退 */}
      <style>{`
        body {
          font-family: 'Inter', system-ui, Avenir, Helvetica, Arial, sans-serif,
                       "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", "STHeiti";
        }
      `}</style>
    </div>
  );
}

export default App;
