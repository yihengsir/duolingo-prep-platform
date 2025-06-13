// src/App.jsx

import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css'; // 导入自定义样式
import questionsData from '../data/read_and_complete.json'; // 导入题目数据

// 设置题目计时器时长 (秒)
const TIMER_DURATION = 180; // 3分钟 = 180秒

function App() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const currentQuestion = questionsData[currentQuestionIndex];

  const [inputValues, setInputValues] = useState(Array(currentQuestion.answers.length).fill(''));
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isCorrect, setIsCorrect] = useState(null); // null: 未检查, true: 正确, false: 错误
  const [allBlanksFilled, setAllBlanksFilled] = useState(false);
  const inputRefs = useRef([]); // 用于存储每个输入框的引用
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false); // 控制是否显示正确答案

  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION); // 倒计时状态
  const timerRef = useRef(null); // 用于存储 timer 的引用

  // 重置所有状态（包括计时器），用于题目切换或“重做”
  const resetQuestionState = useCallback(() => {
    setInputValues(Array(currentQuestion.answers.length).fill(''));
    setFeedbackMessage('');
    setIsCorrect(null);
    setAllBlanksFilled(false);
    inputRefs.current = []; // 清空之前的引用
    setShowCorrectAnswer(false); // 重置时不显示正确答案
    setTimeLeft(TIMER_DURATION); // 重置计时器

    // 清除任何可能存在的旧计时器
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    // 启动新计时器
    timerRef.current = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timerRef.current);
          setFeedbackMessage('时间到！请检查答案。');
          setIsCorrect(false); // 时间到默认为错误
          setShowCorrectAnswer(true); // 时间到显示正确答案
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000); // 每秒更新
  }, [currentQuestion.answers.length, currentQuestionIndex]); // 依赖 currentQuestionIndex 确保在题目切换时重新执行

  // 初始加载和题目切换时调用重置函数
  useEffect(() => {
    resetQuestionState();
    // 自动聚焦到第一个输入框
    const timeoutId = setTimeout(() => {
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    }, 100);
    return () => {
      clearInterval(timerRef.current); // 组件卸载时清除计时器
      clearTimeout(timeoutId); // 清除可能未触发的 setTimeout
    };
  }, [currentQuestionIndex, resetQuestionState]);


  // 监听 inputValues 变化，判断是否所有空都已填入
  useEffect(() => {
    const filled = inputValues.every(value => value && value.length === 1);
    setAllBlanksFilled(filled);
  }, [inputValues]);

  // 处理单个输入框内容变化
  const handleInputChange = (e, index) => {
    const value = e.target.value;
    const newValues = [...inputValues];

    if (value.length > 1) {
      newValues[index] = value.charAt(0).toLowerCase();
    } else {
      newValues[index] = value.toLowerCase();
    }
    setInputValues(newValues);

    setFeedbackMessage('');
    setIsCorrect(null);
    setShowCorrectAnswer(false); // 用户再次输入时隐藏正确答案

    // 自动聚焦到下一个输入框
    if (newValues[index].length === 1 && index < currentQuestion.answers.length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  // 监听键盘事件，处理删除和左右移动
  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && inputValues[index].length === 0 && index > 0) {
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

  // 检查答案的函数
  const checkAnswer = () => {
    clearInterval(timerRef.current); // 停止计时器
    let allCorrect = true;
    inputValues.forEach((inputChar, index) => {
      if (inputChar !== currentQuestion.answers[index]) {
        allCorrect = false;
      }
    });

    if (allCorrect) {
      setFeedbackMessage('所有填空都正确！');
      setIsCorrect(true);
      setShowCorrectAnswer(false); // 如果全对，则不需要单独显示答案
    } else {
      setFeedbackMessage('部分填空有误，请检查。');
      setIsCorrect(false);
      setShowCorrectAnswer(true); // 如果有错，则显示正确答案
    }
  };

  // 切换到下一题
  const goToNextQuestion = () => {
    if (currentQuestionIndex < questionsData.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
    } else {
      setFeedbackMessage('恭喜你，所有题目都已完成！');
      clearInterval(timerRef.current); // 确保所有题目完成后计时器停止
      setIsCorrect(null); // 清除正确/错误状态，以便完成信息清晰显示
      // 可以在这里跳转到结果页或显示完成信息
    }
  };

  // 重做当前题目
  const redoQuestion = () => {
    resetQuestionState();
  };

  // 渲染题目文本和多个输入框
  const renderQuestionText = () => {
    const parts = currentQuestion.text.split('[BLANK]');
    const elements = [];
    parts.forEach((part, index) => {
      elements.push(<span key={`part-${index}`}>{part}</span>);

      if (index < currentQuestion.answers.length) {
        let borderColorClass = 'border-blue-500'; // 默认蓝色

        if (isCorrect !== null || timeLeft === 0) { // 只有在检查过答案或时间到后才根据对错着色
          if (inputValues[index] === currentQuestion.answers[index]) {
            borderColorClass = 'border-green-500';
          } else {
            borderColorClass = 'border-red-500';
          }
        }

        elements.push(
          <input
            key={`input-${currentQuestionIndex}-${index}`}
            ref={el => inputRefs.current[index] = el}
            type="text"
            maxLength="1"
            className={`char-input text-xl font-bold ${borderColorClass}`} // 移除 w-8，让 char-input 控制宽度
            value={inputValues[index]}
            onChange={(e) => handleInputChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            disabled={timeLeft === 0 || isCorrect !== null} // 输入框在时间到或已检查答案后禁用
          />
        );
      }
    });
    return elements;
  };

  // 渲染正确答案（加粗且颜色更突出）
  const renderCorrectAnswer = () => {
    const parts = currentQuestion.text.split('[BLANK]');
    const elements = [];
    parts.forEach((part, index) => {
      elements.push(<span key={`correct-part-${index}`}>{part}</span>);
      if (index < currentQuestion.answers.length) {
        elements.push(
          <span key={`correct-answer-${index}`} className="text-blue-700 font-extrabold mx-0.5">
            {currentQuestion.answers[index]}
          </span>
        );
      }
    });
    return elements;
  };

  // 格式化时间为 MM:SS
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    // 最外层容器：负责页面整体的背景和 flexbox 居中
    // 确保 min-h-screen 和 bg-gray-100 在这里
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 font-inter"> {/* 添加 font-inter */}
      {/* 左上角的倒计时 */}
      <div className="absolute top-4 left-4 text-2xl font-bold text-blue-600">
        {formatTime(timeLeft)}
      </div>

      {/* 居中卡片效果的主要内容容器 */}
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-auto my-8 border border-gray-200">
        <div className="p-8"> {/* 增加内边距到卡片内部 */}
          <h1 className="text-4xl font-bold mb-6 text-blue-600 text-center">
            Duolingo DET Prep - 阅读并补全
          </h1>
          <h2 className="text-2xl font-semibold mb-6 text-gray-700 text-center">
            {currentQuestion.title}
          </h2>

          {/* 题目文本区域：增加左右内边距，确保内容不贴边 */}
          {/* 确保这里有 justify-center 来居中内容 */}
          <div className="text-lg mb-4 whitespace-pre-wrap flex flex-wrap items-center justify-center px-4 md:px-8">
            {renderQuestionText()}
          </div>
          {currentQuestion.hint && (
            <p className="text-sm text-gray-500 italic mt-4 text-center">
              提示: {currentQuestion.hint}
            </p>
          )}

          {/* 答案反馈区域 */}
          {feedbackMessage && (
            <p className={`mt-4 text-center text-lg font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
              {feedbackMessage}
            </p>
          )}

          {/* 显示正确答案的区域 */}
          {showCorrectAnswer && (
            <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-800 rounded-md shadow-sm">
              <p className="font-semibold mb-2">正确答案:</p>
              <p className="whitespace-pre-wrap text-lg">
                {renderCorrectAnswer()}
              </p>
            </div>
          )}

          {/* 按钮区域 */}
          <div className="text-center mt-8 space-x-4">
            <button
              onClick={checkAnswer}
              className={`px-8 py-3 rounded-full text-lg font-semibold transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
                allBlanksFilled && isCorrect === null && timeLeft > 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                  : 'bg-gray-400 text-gray-700 cursor-not-allowed'
              }`}
              disabled={!allBlanksFilled || isCorrect !== null || timeLeft === 0}
            >
              检查答案
            </button>

            <button
              onClick={redoQuestion}
              className="bg-yellow-500 text-white px-8 py-3 rounded-full text-lg font-semibold hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-50 transition-colors duration-200 ease-in-out"
            >
              重做
            </button>

            {isCorrect !== null && (
              <button
                onClick={goToNextQuestion}
                className="bg-green-600 text-white px-8 py-3 rounded-full text-lg font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition-colors duration-200 ease-in-out"
              >
                {currentQuestionIndex < questionsData.length - 1 ? '下一题' : '完成'}
              </button>
            )}
          </div>
        </div> {/* End of p-8 div */}
      </div> {/* End of card div */}

      {/* 底部提示文本 */}
      <p className="text-lg text-gray-600 mt-8 mb-4">
        请在每个方框中填入缺失的字母。
      </p>
    </div>
  );
}

export default App;
