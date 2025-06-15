// src/App.jsx (Duolingo Prep - 最终修复：单字符填空与答案显示)
import { useState, useEffect, useRef, useCallback } from 'react';
import questionsData from '../data/read_and_complete.json'; // 导入题目数据，路径保持不变

const TIMER_DURATION = 180;
const INVITATION_CODE = '130';

function App() {
  const [gameState, setGameState] = useState('welcome');
  const [invitationCodeInput, setInvitationCodeInput] = useState('');
  const [invitationCodeError, setInvitationCodeError] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // inputValues 现在是与 currentQuestion.answers 长度匹配的单字符扁平数组
  const [inputValues, setInputValues] = useState([]);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isCorrect, setIsCorrect] = useState(null);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);

  const timerRef = useRef(null);
  // inputRefs 现在是一个扁平的数组，直接对应每个单字符输入框
  const inputRefs = useRef([]);

  // 确保 questionsData 已加载且 currentQuestion 有效
  // 如果 questionsData 在初次渲染时为空，currentQuestion 可能是 undefined
  const currentQuestion = questionsData[currentQuestionIndex];

  const resetQuestionState = useCallback(() => {
    // 确保 currentQuestion 存在且 answers 是数组
    if (!currentQuestion || !Array.isArray(currentQuestion.answers)) return;

    // inputValues 初始化为与 answers 长度相同的空字符串扁平数组
    const initialInputValues = Array(currentQuestion.answers.length).fill('');
    setInputValues(initialInputValues);
    // inputRefs 初始化为与 answers 长度相同的 null 扁平数组
    inputRefs.current = Array(currentQuestion.answers.length).fill(null);

    setFeedbackMessage('');
    setIsCorrect(null);
    setShowCorrectAnswer(false);
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
  }, [currentQuestion]); // 依赖 currentQuestion，确保题目切换时重置

  useEffect(() => {
    // 只有在进入 readAndComplete 状态且当前题目数据加载完毕后才重置状态
    if (gameState === 'readAndComplete' && currentQuestion) {
      resetQuestionState();
      // 延迟聚焦到第一个输入框，确保 DOM 已经渲染完毕
      const timeoutId = setTimeout(() => {
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }, 0);
      return () => {
        clearInterval(timerRef.current);
        clearTimeout(timeoutId); // 清除可能未触发的 setTimeout
      };
    } else {
      if (timerRef.current) { // 非答题状态时停止计时器
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [gameState, currentQuestionIndex, resetQuestionState, currentQuestion]);

  // 处理单个字符输入框的变化
  const handleCharChange = (e, index) => { // index 现在是扁平数组的索引
    const val = e.target.value.slice(0, 1).toLowerCase(); // 只取第一个字符并转小写
    const newValues = [...inputValues];
    newValues[index] = val; // 更新当前索引的字符
    setInputValues(newValues);

    setFeedbackMessage('');
    setIsCorrect(null);
    setShowCorrectAnswer(false);

    // 自动聚焦到下一个输入框
    if (val && index < currentQuestion.answers.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // 处理单个字符输入框的按键
  const handleCharKeyDown = (e, index) => { // index 现在是扁平数组的索引
    if (e.key === 'Backspace') {
      if (inputValues[index].length === 0 && index > 0) {
        // 当前输入框为空，且不是第一个，则回退到前一个并清空其内容
        inputRefs.current[index - 1]?.focus();
        const newValues = [...inputValues];
        newValues[index - 1] = '';
        setInputValues(newValues);
        e.preventDefault(); // 阻止默认的浏览器回退行为
      } else if (inputValues[index].length === 1) {
        // 当前输入框有内容，直接清空当前框
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
    // 直接比较扁平的 inputValues 数组和 answers 数组
    const allCorrect = currentQuestion.answers.every(
      (correctChar, i) => (inputValues[i] || '').toLowerCase() === correctChar.toLowerCase()
    );
    setIsCorrect(allCorrect);
    setShowCorrectAnswer(true); // 无论对错都显示正确答案
    setFeedbackMessage(allCorrect ? '所有填空都正确！' : '部分填空有误，请检查。');
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

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

  // 渲染题目文本和单字符输入框
  const renderBlanks = () => {
    if (!currentQuestion) return null; // 如果题目未加载，不渲染

    const parts = currentQuestion.text.split('[BLANK]');
    const elements = [];
    let charInputIndex = 0; // 用于跟踪 inputValues 和 inputRefs 的索引

    parts.forEach((part, i) => {
      elements.push(<span key={`text-part-${i}`} className="whitespace-pre-wrap">{part}</span>); // 添加文本片段

      // 如果还有对应的答案字符，则添加输入框
      if (i < currentQuestion.answers.length) {
        const showResult = isCorrect !== null || timeLeft === 0; // 是否显示结果反馈
        const filledChar = inputValues[charInputIndex] || ''; // 获取当前字符输入值

        // 根据正确性状态设置 CSS 类
        const isCorrectChar = filledChar.toLowerCase() === currentQuestion.answers[charInputIndex].toLowerCase();
        const inputClass = showResult
          ? (isCorrectChar ? 'char-input correct' : 'char-input incorrect')
          : 'char-input';

        elements.push(
          <input
            key={`char-input-${charInputIndex}`}
            type="text"
            maxLength={1} // 限制输入一个字符
            className={inputClass}
            value={filledChar}
            onChange={(e) => handleCharChange(e, charInputIndex)}
            onKeyDown={(e) => handleCharKeyDown(e, charInputIndex)}
            ref={(el) => { inputRefs.current[charInputIndex] = el; }} // 存储到扁平数组
            disabled={showResult}
          />
        );
        charInputIndex++; // 递增扁平索引
      }
    });
    return <div className="flex flex-wrap gap-1 leading-relaxed justify-start items-baseline">{elements}</div>;
  };

  const renderContent = () => {
    // 数据加载错误时显示提示
    if (dataLoadingError) {
      return (
        <div className="text-center text-red-600 text-lg font-semibold">
          {dataLoadingError}
          <p className="text-sm text-gray-500 mt-2">请确保 'data/read_and_complete.json' 文件存在于项目根目录的 'data' 文件夹中，并且是 UTF-8 编码。</p>
        </div>
      );
    }

    // 数据加载中显示提示
    if (questionsData.length === 0 && !dataLoadingError && gameState !== 'welcome') {
      return (
        <div className="text-center text-blue-600 text-lg font-semibold">
          加载题目中...
        </div>
      );
    }

    if (gameState === 'welcome') {
      return (
        <div className="text-center flex flex-col items-center">
          {/* 图片路径使用 public 目录的相对路径 */}
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
        <div className="text-center flex flex-col items-center">
          <h2 className="text-2xl font-bold text-blue-600 mb-6">选择题型</h2>
          <button
            className="button-base button-green mb-4 text-xl" 
            onClick={() => setGameState('readAndComplete')}
          >
            阅读并补全
          </button>
          <p className="text-gray-500 text-sm mt-4">更多题型即将推出！</p>
        </div>
      );
    }

    if (gameState === 'readAndComplete') {
      // 确保 currentQuestion 有效，否则显示错误
      if (!currentQuestion) {
        return (
          <div className="text-center text-red-600 text-lg font-semibold">
            题目数据错误或未加载。
          </div>
        );
      }
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
                {currentQuestion.answers.join('')} {/* 关键：单字符直接连接，无空格 */}
              </p>
            </div>
          )}

          <div className="text-center mt-6 flex justify-center gap-4">
            <button 
              onClick={checkAnswer} 
              className="button-base button-blue" 
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
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-auto border border-gray-200 p-6 md:p-10">
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
