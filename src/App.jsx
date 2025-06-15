// src/App.jsx (Duolingo Prep - 最终修复字符输入和答案显示问题，已再次确认)
import { useState, useEffect, useRef, useCallback } from 'react';
// 关键修复：导入原始的 questionsData 文件
import questionsData from '../data/read_and_complete.json'; 

const TIMER_DURATION = 180; // 计时器时长 (秒)
const INVITATION_CODE = '130'; // 邀请码

function App() {
  // 游戏状态：'welcome'（欢迎页），'questionTypeSelection'（题型选择），'readAndComplete'（阅读并补全）
  const [gameState, setGameState] = useState('welcome');
  const [invitationCodeInput, setInvitationCodeInput] = useState('');
  const [invitationCodeError, setInvitationCodeError] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // inputValues 存储用户在填空处输入的字符，是一个扁平数组，每个元素对应一个空白处
  const [inputValues, setInputValues] = useState([]);
  const [feedbackMessage, setFeedbackMessage] = useState(''); // 检查答案后的反馈信息
  const [isCorrect, setIsCorrect] = useState(null); // null: 未检查, true: 正确, false: 不正确
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false); // 是否显示正确答案

  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION); // 计时器剩余时间
  const timerRef = useRef(null); // 计时器 ID 的引用

  // inputRefs 存储每个输入框的 DOM 引用，是一个扁平数组
  const inputRefs = useRef([]);

  const currentQuestion = questionsData[currentQuestionIndex]; // 当前题目数据

  // 重置题目状态：清空输入、重置反馈、重置计时器
  const resetQuestionState = useCallback(() => {
    setInputValues(Array(currentQuestion.answers.length).fill('')); // 根据当前题目的答案数量初始化 inputValues
    setFeedbackMessage('');
    setIsCorrect(null);
    setShowCorrectAnswer(false);
    inputRefs.current = Array(currentQuestion.answers.length).fill(null); // 清空并重新初始化引用数组
    setTimeLeft(TIMER_DURATION);

    if (timerRef.current) clearInterval(timerRef.current); // 清除旧计时器
    timerRef.current = setInterval(() => { // 启动新计时器
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current); // 计时结束
          setFeedbackMessage('时间到！请检查答案。');
          setIsCorrect(false);
          setShowCorrectAnswer(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000); // 每秒更新
  }, [currentQuestion.answers.length, currentQuestionIndex]); // 依赖答案长度和题目索引，确保题目切换时重置

  // 游戏状态或题目索引变化时的副作用（初始化和清理）
  useEffect(() => {
    if (gameState === 'readAndComplete') {
      resetQuestionState(); // 进入答题状态时重置
      const timeoutId = setTimeout(() => { // 延迟聚焦到第一个输入框
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }, 0); 
      return () => {
        clearInterval(timerRef.current); // 组件卸载或依赖变化时清除计时器
        clearTimeout(timeoutId); 
      };
    } else {
      if (timerRef.current) { // 非答题状态时停止计时器
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [currentQuestionIndex, gameState, resetQuestionState]);

  // 处理单个输入框内容变化 (单字符填空)
  const handleChange = (e, index) => {
    const val = e.target.value.slice(0, 1).toLowerCase(); // 只取第一个字符并转为小写
    const newValues = [...inputValues];
    newValues[index] = val; // 更新当前输入框的值
    setInputValues(newValues);

    setFeedbackMessage(''); // 清除反馈
    setIsCorrect(null); // 重置状态
    setShowCorrectAnswer(false); // 隐藏答案

    // 自动聚焦到下一个输入框：当前有值且不是最后一个
    if (val && index < currentQuestion.answers.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // 处理键盘事件 (单字符填空)
  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (inputValues[index].length === 0 && index > 0) {
        // 当前输入框为空且不是第一个：回退到前一个并清空其内容
        inputRefs.current[index - 1]?.focus();
        const newValues = [...inputValues];
        newValues[index - 1] = ''; 
        setInputValues(newValues);
        e.preventDefault(); 
      } else if (inputValues[index].length === 1) {
        // 当前输入框有内容：只清空当前输入框
        const newValues = [...inputValues];
        newValues[index] = '';
        setInputValues(newValues);
        e.preventDefault(); 
      }
    } else if (e.key === 'ArrowLeft' && index > 0) { // 左箭头
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < currentQuestion.answers.length - 1) { // 右箭头
      inputRefs.current[index + 1]?.focus();
    }
  };

  // 检查答案逻辑
  const checkAnswer = () => {
    clearInterval(timerRef.current); // 停止计时器
    const isAllCorrect = currentQuestion.answers.every((ansChar, i) =>
      ansChar.toLowerCase() === (inputValues[i] || '').toLowerCase() 
    );
    setIsCorrect(isAllCorrect);
    setShowCorrectAnswer(!isAllCorrect); // 不正确时显示答案
    setFeedbackMessage(
      isAllCorrect ? '所有填空都正确！' : '部分填空有误，请检查。'
    );
  };

  // 格式化时间显示为 MM:SS
  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // 导航到下一题
  const goToNext = () => {
    if (currentQuestionIndex < questionsData.length - 1) {
      setCurrentQuestionIndex(i => i + 1);
    }
  };

  // 导航到上一题
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

  // 渲染题目文本和单字符输入框
  const renderInputs = () => {
    const parts = currentQuestion.text.split('[BLANK]'); 
    const elements = [];
    let blankIndex = 0; 

    parts.forEach((part, index) => {
      elements.push(<span key={`text-${index}`} className="whitespace-pre-wrap">{part}</span>); 

      if (index < currentQuestion.answers.length) { 
        const showResult = isCorrect !== null || timeLeft === 0; 
        const inputChar = inputValues[blankIndex] || ''; 

        const isCorrectChar = currentQuestion.answers[blankIndex].toLowerCase() === inputChar.toLowerCase();
        
        // 应用 `char-input` 类，它应该在 `App.css` 中定义
        const inputClass = showResult
          ? isCorrectChar ? 'char-input correct' : 'char-input incorrect'
          : 'char-input'; 

        elements.push(
          <input
            key={`input-${blankIndex}`}
            type="text"
            maxLength={1} // 限制为单个字符输入
            className={inputClass} // 应用自定义 CSS 类
            value={inputChar}
            onChange={(e) => handleChange(e, blankIndex)}
            onKeyDown={(e) => handleKeyDown(e, blankIndex)}
            ref={(el) => { inputRefs.current[blankIndex] = el; }} // 存储 DOM 引用
            disabled={showResult} // 检查或时间到期后禁用输入
          />
        );
        blankIndex++;
      }
    });
    // 使用 flexbox 布局，允许内容换行，并设置行高和间距
    return <div className="text-left flex flex-wrap gap-1 leading-relaxed justify-start">{elements}</div>;
  };

  // 根据游戏状态渲染不同的界面内容
  const renderContent = () => {
    if (gameState === 'welcome') {
      return (
        <div className="text-center flex flex-col items-center">
          {/* 欢迎页图片：使用 GitHub 原始链接 */}
          <img 
            src="https://raw.githubusercontent.com/yihengsir/duolingo-prep-platform/main/public/unnamed.png" 
            alt="logo" 
            className="w-36 h-36 mb-4" 
            loading="lazy" 
            onError={(e) => { e.target.src = "https://placehold.co/144x144/E0E0E0/333333?text=Logo+Missing"; }}
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
            className="button-base button-green mb-4 text-xl" // 使用现有按钮类
            onClick={() => setGameState('readAndComplete')}
          >
            阅读并补全
          </button>
          <p className="text-gray-500 text-sm">更多题型即将推出！</p>
        </div>
      );
    }

    if (gameState === 'readAndComplete') {
      return (
        <>
          {/* 导航按钮（上一题/下一题） */}
          <div className="absolute top-4 left-4">
            <button 
              onClick={goToPrev} 
              className="button-base text-sm" // 使用现有按钮类
              disabled={currentQuestionIndex === 0} 
            >
              上一题
            </button>
          </div>
          <div className="absolute top-4 right-4">
            <button 
              onClick={goToNext} 
              className="button-base text-sm" // 使用现有按钮类
              disabled={currentQuestionIndex === questionsData.length - 1} 
            >
              下一题
            </button>
          </div>

          {/* 题目信息和计时器 */}
          <div className="text-center text-blue-600 text-xl font-bold mb-1">Duolingo DET Prep - 阅读并补全</div>
          <div className="text-center text-gray-500 text-sm mb-2">{currentQuestion.title}</div>
          <div className="text-center text-sm text-gray-500 mb-4">
            剩余时间: <span className="text-blue-600 font-bold">{formatTime(timeLeft)}</span>　 第 {currentQuestionIndex + 1} 题 / 共 {questionsData.length} 题
          </div>

          {renderInputs()} 

          {feedbackMessage && ( // 反馈信息
            <p className={`mt-6 text-center text-lg font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>{feedbackMessage}</p>
          )}

          {showCorrectAnswer && ( // 显示正确答案
            <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-800 rounded-md shadow-sm">
              <p className="font-semibold mb-2">正确答案:</p>
              <p className="whitespace-pre-wrap text-lg">
                {currentQuestion.answers.join('')} {/* 关键：单字符直接连接 */}
              </p>
            </div>
          )}

          {/* 操作按钮（检查答案/重做） */}
          <div className="text-center mt-6 flex justify-center gap-4">
            <button 
              onClick={checkAnswer} 
              className="button-base button-blue" // 使用现有按钮类
            >
              检查答案
            </button>
            <button 
              onClick={resetQuestionState} 
              className="button-base button-yellow" // 使用现有按钮类
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
    // 根容器，保持原有 Tailwind 类
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 font-inter">
      {/* 核心卡片容器 */}
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-auto border border-gray-200 p-6 md:p-10">
        {renderContent()}
      </div>
      {/* 全局字体样式，确保 Inter 字体被应用 */}
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
