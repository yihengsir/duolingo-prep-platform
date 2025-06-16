import { useState, useEffect, useRef, useCallback } from 'react';

const TIMER_DURATION = 180;
const INVITATION_CODE = '130';

function App() {
  const [gameState, setGameState] = useState('welcome');
  const [invitationCodeInput, setInvitationCodeInput] = useState('');
  const [invitationCodeError, setInvitationCodeError] = useState('');
  const [questionsData, setQuestionsData] = useState([]);
  const [dataLoadingError, setDataLoadingError] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [inputValues, setInputValues] = useState([]);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isCorrect, setIsCorrect] = useState(null);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  
  // 使用数组存储 ref
  const inputRefs = useRef([]);
  const timerRef = useRef(null);
  
  const currentQuestion = questionsData[currentQuestionIndex];

  // 数据加载
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
        setDataLoadingError("加载题目数据失败，请检查文件或网络连接。");
      }
    };

    if (questionsData.length === 0 && !dataLoadingError) {
      loadQuestions();
    }
  }, [questionsData.length, dataLoadingError]);

  // 重置题目状态
  const resetQuestionState = useCallback(() => {
    if (!currentQuestion || !Array.isArray(currentQuestion.answers)) {
      console.error("currentQuestion or answers is not ready for reset.");
      return;
    }
    
    setInputValues(Array(currentQuestion.answers.length).fill(''));
    setFeedbackMessage('');
    setIsCorrect(null);
    setShowCorrectAnswer(false);
    setTimeLeft(TIMER_DURATION);
    
    // 重置 ref 数组
    inputRefs.current = [];
    
    // 清除之前的定时器
    if (timerRef.current) clearInterval(timerRef.current);
    
    // 设置新的定时器
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

  // 游戏状态切换与聚焦
  useEffect(() => {
    if (gameState === 'readAndComplete' && currentQuestion) {
      resetQuestionState();
      
      // 使用微任务确保DOM更新后执行聚焦
      Promise.resolve().then(() => {
        if (inputRefs.current.length > 0 && inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      });
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    
    // 清理函数
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, currentQuestionIndex, resetQuestionState, currentQuestion]);

  // 处理字符输入
  const handleCharChange = (e, index) => {
    const val = e.target.value.slice(0, 1).toLowerCase();
    const updated = [...inputValues];
    updated[index] = val;
    setInputValues(updated);
    setFeedbackMessage('');
    setIsCorrect(null);
    setShowCorrectAnswer(false);
    
    // 自动聚焦到下一个输入框
    if (val && index < currentQuestion.answers.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // 处理键盘事件
  const handleCharKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (inputValues[index] === '' && index > 0) {
        inputRefs.current[index - 1]?.focus();
        e.preventDefault();
      } else if (inputValues[index] !== '') {
        const updated = [...inputValues];
        updated[index] = '';
        setInputValues(updated);
        e.preventDefault();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < currentQuestion.answers.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // 检查答案
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
    setFeedbackMessage(allCorrect ? '所有填空都正确！🎉' : '部分填空有误，请检查。');
  };

  // 格式化时间
  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // 导航函数
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

  // 处理邀请码提交
  const handleInvitationCodeSubmit = () => {
    if (invitationCodeInput === INVITATION_CODE) {
      setGameState('questionTypeSelection');
      setInvitationCodeError('');
    } else {
      setInvitationCodeError('邀请码错误，请重试。');
    }
  };

  // 渲染填空输入框
  const renderBlanks = () => {
    if (!currentQuestion) return null;
    
    const parts = currentQuestion.text.split('[BLANK]');
    const elements = [];
    
    parts.forEach((part, i) => {
      elements.push(<span key={`text-part-${i}`} className="whitespace-pre-wrap">{part}</span>);
      
      const charInputIndex = i;
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
            ref={(el) => {
              if (el) inputRefs.current[charInputIndex] = el;
            }}
            disabled={showResult}
          />
        );
      }
    });
    
    return <div className="reading-text">{elements}</div>;
  };

  // 渲染正确答案
  const renderCorrectFullText = () => {
    if (!currentQuestion) return null;
    
    const parts = currentQuestion.text.split('[BLANK]');
    let correctTextElements = [];
    let answerIndex = 0;
    
    parts.forEach((part, i) => {
      correctTextElements.push(<span key={`correct-part-${i}`}>{part}</span>);
      
      if (answerIndex < currentQuestion.answers.length) {
        correctTextElements.push(
          <span key={`correct-answer-${answerIndex}`} className="text-primary font-bold">
            {currentQuestion.answers[answerIndex]}
          </span>
        );
        answerIndex++;
      }
    });
    
    return correctTextElements;
  };

  // 渲染内容
  const renderContent = () => {
    // 数据加载状态
    if (questionsData.length === 0 && dataLoadingError) {
      return (
        <div className="text-center text-red-500 text-lg font-semibold py-12 min-h-[300px] flex items-center justify-center">
          {dataLoadingError}
          <p className="text-sm text-gray-500 mt-2">请确保 'data/read_and_complete.json' 文件存在。</p>
        </div>
      );
    }
    
    if (questionsData.length === 0 && !dataLoadingError && gameState !== 'welcome') {
      return (
        <div className="text-center text-blue-500 text-lg font-semibold py-12 min-h-[300px] flex items-center justify-center">
          <div className="animate-bounce-subtle">
            <i className="fa fa-circle-o-notch fa-spin mr-2"></i>加载题目中...
          </div>
        </div>
      );
    }
    
    // 游戏状态渲染
    switch (gameState) {
      case 'welcome':
        return (
          <div className="text-center flex flex-col items-center py-12 min-h-[300px] justify-center fade-in">
            <div className="w-36 h-36 rounded-full mb-8 shadow-lg bg-primary/10 flex items-center justify-center">
              <span className="text-4xl font-bold text-primary">Logo</span>
            </div>
            <h1 className="text-3xl font-bold text-primary mb-4">Duolingo DET 备考助手</h1>
            <p className="text-gray-600 mb-6 max-w-md">提升你的 Duolingo 英语测试成绩，轻松应对考试</p>
            <div className="w-full max-w-xs">
              <input
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-lg focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
                placeholder="请输入邀请码"
                value={invitationCodeInput}
                onChange={(e) => setInvitationCodeInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvitationCodeSubmit()}
              />
              {invitationCodeError && <p className="text-red-500 text-sm mt-2">{invitationCodeError}</p>}
              <button
                className="w-full mt-4 button-blue"
                onClick={handleInvitationCodeSubmit}
              >
                进入学习 <i className="fa fa-arrow-right ml-2"></i>
              </button>
            </div>
          </div>
        );
      
      case 'questionTypeSelection':
        return (
          <div className="text-center flex flex-col items-center py-12 min-h-[300px] justify-center fade-in">
            <h2 className="text-2xl font-bold text-primary mb-6">选择题型</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg">
              <button
                className="button-green"
                onClick={() => setGameState('readAndComplete')}
              >
                <i className="fa fa-book mr-2"></i> 阅读并补全
              </button>
              <button
                className="button-gray"
                disabled
              >
                <i className="fa fa-comment mr-2"></i> 听力与口语
              </button>
              <button
                className="button-gray"
                disabled
              >
                <i className="fa fa-pencil mr-2"></i> 写作练习
              </button>
              <button
                className="button-gray"
                disabled
              >
                <i className="fa fa-headphones mr-2"></i> 听力理解
              </button>
            </div>
            <p className="text-gray-500 text-sm mt-4">更多题型即将推出！</p>
          </div>
        );
      
      case 'readAndComplete':
        if (!currentQuestion) {
          return (
            <div className="text-center text-red-500 text-lg font-semibold py-12 min-h-[300px] flex items-center justify-center">
              题目数据错误或未加载。
            </div>
          );
        }
        
        const allFilled = inputValues.every(char => char.trim() !== '');
        const canCheck = allFilled && isCorrect === null && timeLeft > 0;
        
        return (
          <div className="relative fade-in">
            <div className="absolute top-0 left-0">
              <button
                onClick={goToPrev}
                className="button-gray"
                disabled={currentQuestionIndex === 0}
              >
                <i className="fa fa-arrow-left mr-1"></i> 上一题
              </button>
            </div>
            
            <div className="absolute top-0 right-0">
              <button
                onClick={goToNext}
                className="button-gray"
                disabled={currentQuestionIndex === questionsData.length - 1}
              >
                下一题 <i className="fa fa-arrow-right ml-1"></i>
              </button>
            </div>
            
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-primary mb-2">阅读并补全</h2>
              <h3 className="text-gray-600 text-lg mb-3">{currentQuestion.title}</h3>
              <div className="flex justify-center items-center text-sm text-gray-500">
                <span className="flex items-center mr-4">
                  <i className="fa fa-clock-o mr-1"></i> 剩余时间: 
                  <span className={`ml-1 font-semibold ${timeLeft <= 30 ? 'text-danger' : 'text-primary'}`}>
                    {formatTime(timeLeft)}
                  </span>
                </span>
                <span className="flex items-center">
                  <i className="fa fa-list-ol mr-1"></i> 第 {currentQuestionIndex + 1} 题 / 共 {questionsData.length} 题
                </span>
              </div>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200">
              {renderBlanks()}
            </div>
            
            {feedbackMessage && (
              <div className={`mt-6 p-4 rounded-lg font-semibold ${isCorrect ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                {feedbackMessage}
              </div>
            )}
            
            {showCorrectAnswer && (
              <div className="mt-6 p-4 bg-blue-50 border-l-4 border-primary text-blue-800 rounded-md shadow-sm">
                <p className="font-semibold mb-2">正确答案:</p>
                <p className="whitespace-pre-wrap reading-text">
                  {renderCorrectFullText()}
                </p>
              </div>
            )}
            
            <div className="text-center mt-8 flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={checkAnswer}
                disabled={!canCheck}
                className={`button-blue ${!canCheck ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <i className="fa fa-check-circle mr-2"></i> 检查答案
              </button>
              <button
                onClick={resetQuestionState}
                className="button-yellow"
              >
                <i className="fa fa-refresh mr-2"></i> 重做
              </button>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-4">
      <div className="card w-full max-w-4xl mx-auto">
        {renderContent()}
      </div>
      <footer className="mt-6 text-center text-gray-500 text-sm">
        <p>© 2025 Duolingo DET 备考助手 | 与 Fengfeng 一起准备考试</p>
      </footer>
    </div>
  );
}

export default App;