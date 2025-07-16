// App.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import logo from './assets/logo.png'; // ✅ Place src/assets/logo.png

function App() {
  // ============================
  // ✅ State & Ref Section
  // ============================
  const [page, setPage] = useState('welcome'); // welcome | menu | reading-menu | question
  const [codeInput, setCodeInput] = useState('');
  const [questionsData, setQuestionsData] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // For readAndComplete/fillingTheBlank
  const [inputValues, setInputValues] = useState([]); // For readAndComplete/fillingTheBlank
  const [inputStatus, setInputStatus] = useState([]); // null | 'correct' | 'wrong' (for char by char)
  const [timeLeft, setTimeLeft] = useState(180); // Default for Read and Complete
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isFrozen, setIsFrozen] = useState(false); // Indicates if inputs are frozen after check
  const [questionMode, setQuestionMode] = useState(''); // 'readAndComplete' | 'fillingTheBlank'
  
  const inputRefs = useRef([]);
  const timerRef = useRef(null);
  const dingSound = useRef(null);
  const clickSound = useRef(null);
  const buttonSound = useRef(null);

  const currentQuestion = questionsData[currentQuestionIndex];

  // ============================
  // ✅ Load Data & Setup Sound
  // ============================
  useEffect(() => {
    // Initialize all audio objects
    dingSound.current = new Audio('/sounds/ding.mp3');
    clickSound.current = new Audio('/sounds/click.mp3');
    buttonSound.current = new Audio('/sounds/button.mp3');
  }, []);

  // ✅ Load questions data based on selected mode
  useEffect(() => {
    const loadQuestionsByMode = async () => {
      if (!questionMode) return;

      let dataPath = '';
      let initialTime = 180; // Default time

      if (questionMode === 'readAndComplete') {
        dataPath = '/data/read_and_complete.json';
        initialTime = 180;
      } else if (questionMode === 'fillingTheBlank') {
        dataPath = '/data/filling_the_blank.json';
        initialTime = 20; // Fill in the Blanks has 20 seconds
      } else {
        // If mode is not recognized, clear data and return
        setQuestionsData([]);
        return;
      }

      try {
        const res = await fetch(dataPath);
        const data = await res.json();
        setQuestionsData(data);
        setCurrentQuestionIndex(0); // Reset to first question for new mode
        setTimeLeft(initialTime); // Set time for the selected mode
      } catch (err) {
        console.error(`Failed to load data for ${questionMode}:`, err);
        setQuestionsData([]);
      }
    };

    loadQuestionsByMode();
  }, [questionMode, setTimeLeft]); // Added setTimeLeft to dependencies to fix the ReferenceError

  // Timer logic
  useEffect(() => {
    if (page === 'question') {
      // Clear any existing timer first
      if (timerRef.current) clearInterval(timerRef.current);
      
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            // Handle timer end (e.g., show results, move to next question)
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // Clear timer if not on question page
      clearInterval(timerRef.current); 
    }
    // Cleanup on component unmount or page change
    return () => clearInterval(timerRef.current); 
  }, [page, setTimeLeft]); // Added setTimeLeft to dependencies for timer stability

  // Reset input and feedback when currentQuestion changes (for Fill in the Blanks / Read and Complete)
  useEffect(() => {
    if (currentQuestion && (questionMode === 'readAndComplete' || questionMode === 'fillingTheBlank')) {
      setInputValues(Array(currentQuestion.answers.length).fill(''));
      setInputStatus(Array(currentQuestion.answers.length).fill(null));
      setFeedbackMessage('');
      setIsFrozen(false);
      inputRefs.current = []; // Clear refs for old inputs
      // Focus on the first input after state update
      Promise.resolve().then(() => {
        inputRefs.current[0]?.focus();
      });
    }
  }, [currentQuestion, questionMode]);

  // ============================
  // ✅ Input Logic for Read and Complete / Fill in the Blanks
  // ============================
  const handleInputChange = (e, index) => {
    if (isFrozen) return;
    playClickSound(); 
    const value = e.target.value.slice(0, 1);
    const updated = [...inputValues];
    updated[index] = value;
    setInputValues(updated);
    setInputStatus(Array(currentQuestion.answers.length).fill(null)); // Clear status on input change
    setFeedbackMessage(''); // Clear feedback on input change
    // Move focus to the next input field
    if (value && index < updated.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (isFrozen) return;
    if (e.key === 'Backspace' && inputValues[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // ============================
  // ✅ Sound Helper for Buttons
  // ============================
  const playButtonSound = useCallback(() => {
    if (buttonSound.current) {
      buttonSound.current.currentTime = 0;
      buttonSound.current.play().catch(error => {
        if (error.name === "NotAllowedError") {
          console.warn("Autoplay was prevented for button sound. User interaction might be needed.");
        } else {
          console.error("Error playing button sound:", error);
        }
      });
    }
  }, []);

  const playClickSound = useCallback(() => { 
    if (clickSound.current) {
      clickSound.current.currentTime = 0;
      clickSound.current.play().catch(error => {
        if (error.name === "NotAllowedError") {
          console.warn("Autoplay was prevented. User interaction might be needed to enable audio.");
        } else {
          console.error("Error playing click sound:", error);
        }
      });
    }
  }, []);

  // ============================
  // ✅ Check Answer & Navigation
  // ============================
  const handleCheckAnswer = () => {
    playButtonSound();
    if (!currentQuestion) return;

    const status = currentQuestion.answers.map((correct, i) => {
      return inputValues[i]?.toLowerCase() === correct.toLowerCase() ? 'correct' : 'wrong';
    });
    setInputStatus(status);
    const correctCount = status.filter(s => s === 'correct').length;
    const totalBlanks = currentQuestion.answers.length;
    const isCorrect = status.every((s) => s === 'correct');
    const accuracy = (correctCount / totalBlanks) * 100;
    const formattedAccuracy = accuracy.toFixed(0);

    setFeedbackMessage(
      isCorrect
        ? `✅ 全部正确！`
        : `❌ 请查看您的答案。正确率: ${formattedAccuracy}%`
    );
    
    setIsFrozen(true); // Freeze inputs after checking
    dingSound.current?.play();
  };

  const handleNext = () => {
    playButtonSound();
    if (currentQuestionIndex < questionsData.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    playButtonSound();
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleRedo = () => {
    playButtonSound();
    if (currentQuestion) {
      setInputValues(Array(currentQuestion.answers.length).fill(''));
      setInputStatus(Array(currentQuestion.answers.length).fill(null));
      setFeedbackMessage('');
      setIsFrozen(false);
      // Re-focus on the first input after redo
      Promise.resolve().then(() => {
        inputRefs.current[0]?.focus();
      });
    }
  };

  // ============================
  // ✅ Render Functions for Read and Complete / Fill in the Blanks
  // ============================
  const renderBlanks = () => {
    if (!currentQuestion) return null;
    const parts = currentQuestion.text.split('[BLANK]');
    const elements = [];
    for (let i = 0; i < parts.length; i++) {
      elements.push(<span key={`text-${i}`}>{parts[i]}</span>);
      if (i < currentQuestion.answers.length) {
        const status = inputStatus[i];
        let className = 'char-input';

        if (isFrozen) {
            if (status === 'correct') className += ' correct';
            else if (status === 'wrong') className += ' wrong';
        }
        
        elements.push(
          <input
            key={`input-${i}`}
            type="text"
            maxLength={1}
            className={className}
            value={inputValues[i] || ''}
            onChange={(e) => handleInputChange(e, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            disabled={isFrozen}
            ref={(el) => (inputRefs.current[i] = el)}
          />
        );
      }
    }
    return elements;
  };

  const renderFullCorrectedArticle = () => {
    if (!currentQuestion || !isFrozen) return null;

    const fullTextParts = [];
    let blankIndex = 0;
    const hasWrongAnswerOverall = inputStatus.some(s => s === 'wrong');
    const textSegments = currentQuestion.text.split('[BLANK]');

    textSegments.forEach((segment, index) => {
      if (segment) {
        fullTextParts.push(<span key={`article-text-${index}`}>{segment}</span>);
      }
      if (index < textSegments.length - 1) {
        const fullWordAnswer = currentQuestion.answers[blankIndex];
        const isCorrectForThisBlank = inputStatus[blankIndex] === 'correct';
        let highlightClassName = 'highlighted-answer-word';

        if (hasWrongAnswerOverall) {
          highlightClassName += isCorrectForThisBlank ? ' answer-highlight-correct-after-wrong' : ' answer-highlight-wrong';
        } else {
          highlightClassName += ' answer-highlight-all-correct';
        }

        fullTextParts.push(
          <strong key={`full-answer-${blankIndex}`} className={highlightClassName}>
            {fullWordAnswer}
          </strong>
        );
        blankIndex++;
      }
    });

    return (
      <div className="corrected-article-display">
        <h3 className="corrected-article-title">完整答案：</h3>
        <p className="corrected-article-text">{fullTextParts}</p>
      </div>
    );
  };

  // ============================
  // ✅ Render Main App Structure
  // ============================
  return (
    <div className="app-wrapper">
      {page === 'welcome' && (
        <div className="card welcome-card">
          <div className="welcome-content">
            <img src={logo} alt="logo" className="welcome-logo" />
            <h1 className="welcome-title">Duolingo Prep with Fengfeng</h1>
            <div className="code-input-group">
              <input
                type="text"
                className="welcome-code-input"
                placeholder="请输入邀请码"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && codeInput.trim() === '1314') {
                    playButtonSound();
                    setPage('menu');
                  }
                }}
              />
              <button
                className="enter-btn"
                onClick={() => {
                  playButtonSound();
                  codeInput.trim() === '1314' && setPage('menu');
                }}
              >
                进入
              </button>
            </div>
          </div>
        </div>
      )}

      {page === 'menu' && (
        <div className="card">
          <h2 className="title">请选择题型</h2>
          <div className="subject-grid">
            <button
              className="subject-btn"
              onClick={() => {
                playButtonSound();
                setPage('reading-menu'); // 点击“阅读”进入阅读子菜单
              }}
            >
              阅读
            </button>
            <button
              className="subject-btn"
              onClick={() => {
                playButtonSound();
                alert('资源更新中，敬请期待');
              }}
            >
              听力
            </button>
            <button
              className="subject-btn"
              onClick={() => {
                playButtonSound();
                alert('资源更新中，敬请期待');
              }}
            >
              口语
            </button>
            <button
              className="subject-btn"
              onClick={() => {
                playButtonSound();
                alert('资源更新中，敬请期待');
              }}
            >
              写作
            </button>
          </div>
          <p className="tip">资源更新中，敬请期待</p>
        </div>
      )}

      {page === 'reading-menu' && (
        <div className="app-wrapper">
          <div className="card">
            <h2 className="title">请选择阅读题型</h2>
            <div className="subject-grid">
              <button
                className="subject-btn"
                onClick={() => {
                  playButtonSound();
                  alert('Read and Select 资源更新中，敬请期待');
                }}
              >
                Read and Select
              </button>
              <button
                className="subject-btn"
                onClick={() => {
                  playButtonSound();
                  setQuestionMode('fillingTheBlank');
                  setPage('question');
                }}
              >
                Fill in the Blanks
              </button>
              <button
                className="subject-btn"
                onClick={() => {
                  playButtonSound();
                  setQuestionMode('readAndComplete');
                  setPage('question');
                }}
              >
                Read and Complete
              </button>
              <button
                className="subject-btn"
                onClick={() => {
                  playButtonSound();
                  alert('Interactive Reading 资源更新中，敬请期待'); // Revert to old message
                }}
              >
                Interactive Reading
              </button>
            </div>
            <div className="button-row" style={{ marginTop: '2rem' }}>
              <button
                className="nav-btn"
                onClick={() => {
                  playButtonSound();
                  setPage('menu');
                }}
              >
                ← 返回主菜单
              </button>
            </div>
          </div>
        </div>
      )}

      {page === 'question' && currentQuestion && (
        <div className="card">
          {/* Progress bar showing time left ratio */}
          <div className="progress-bar" style={{ width: `${(timeLeft / (questionMode === 'fillingTheBlank' ? 20 : 180)) * 100}%` }}></div>

          <div className="card-top-buttons">
            <button
              className="nav-btn"
              onClick={() => {
                playButtonSound();
                setPage('menu'); // Always return to main menu from these modes
                setQuestionMode(''); // Clear question mode
                setQuestionsData([]); // Clear questions data
                setCurrentQuestionIndex(0); // Reset index
              }}
            >
              ← 返回菜单
            </button>
            <div>
              <button className="nav-btn" onClick={handlePrevious}>← 上一题</button>
              <button className="nav-btn" onClick={handleNext}>下一题 →</button>
            </div>
          </div>

          <div className="top-bar">
            <div className="time-left">
              ⏱️ Time Left: <span className="highlight-time">{String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}</span>
            </div>
            <div className="question-progress">第 {currentQuestionIndex + 1} 题 / 共 {questionsData.length} 题</div>
          </div>

          <>
            {currentQuestion.title && <h2 className="title">{currentQuestion.title}</h2>}
            <p className="text-area">{renderBlanks()}</p>
          </>

          {feedbackMessage && (
            <div className={`feedback ${feedbackMessage.startsWith('✅') ? 'success' : 'error'}`}>
              {feedbackMessage}
            </div>
          )}

          {renderFullCorrectedArticle()}

          <div className="button-row">
            <button
              className="check-btn"
              onClick={handleCheckAnswer}
            >
              检查
            </button>
            <button className="check-btn redo" onClick={handleRedo}>重做</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
