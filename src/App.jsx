// src/App.jsx

import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css'; // Import custom styles
import questionsData from '../data/read_and_complete.json'; // Import question data

// Set the timer duration for each question (in seconds)
const TIMER_DURATION = 180; // 3 minutes = 180 seconds
const INVITATION_CODE = '130'; // 邀请码

function App() {
  // gameState: welcome, invitationCode, questionTypeSelection, readAndComplete
  const [gameState, setGameState] = useState('welcome');
  const [invitationCodeInput, setInvitationCodeInput] = useState('');
  const [invitationCodeError, setInvitationCodeError] = useState('');

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const currentQuestion = questionsData[currentQuestionIndex];

  const [inputValues, setInputValues] = useState(Array(currentQuestion.answers.length).fill(''));
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isCorrect, setIsCorrect] = useState(null); // null: not checked, true: correct, false: incorrect
  const [allBlanksFilled, setAllBlanksFilled] = useState(false);
  const inputRefs = useRef([]); // Reference to store each input field
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false); // Controls whether to show the correct answer

  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION); // Countdown timer state
  const timerRef = useRef(null); // Reference to store the timer ID

  // Reset all states (including the timer) for question changes or "Redo"
  const resetQuestionState = useCallback(() => {
    setInputValues(Array(currentQuestion.answers.length).fill(''));
    setFeedbackMessage('');
    setIsCorrect(null);
    setAllBlanksFilled(false);
    inputRefs.current = []; // Clear previous references
    setShowCorrectAnswer(false); // Hide correct answer on reset
    setTimeLeft(TIMER_DURATION); // Reset the timer

    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    // Start a new timer
    timerRef.current = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timerRef.current);
          setFeedbackMessage('时间到！请检查答案。'); // Time's up! Please check your answers.
          setIsCorrect(false); // Default to incorrect when time's up
          setShowCorrectAnswer(true); // Show correct answer when time's up
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000); // Update every second
  }, [currentQuestion.answers.length, currentQuestionIndex]); // Dependency on currentQuestionIndex ensures re-execution on question change

  // Initial load and on question change, call reset function
  useEffect(() => {
    // Only manage question logic and timer when in 'readAndComplete' state
    if (gameState === 'readAndComplete') {
      resetQuestionState();
      // Automatically focus on the first input field
      const timeoutId = setTimeout(() => {
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }, 100);
      return () => {
        clearInterval(timerRef.current); // Clear timer when component unmounts
        clearTimeout(timeoutId); // Clear any pending setTimeout
      };
    } else {
      // In non-question-solving state, ensure timer is stopped
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [currentQuestionIndex, resetQuestionState, gameState]);


  // Listen for changes in inputValues to determine if all blanks are filled
  useEffect(() => {
    const filled = inputValues.every(value => value && value.length === 1);
    setAllBlanksFilled(filled);
  }, [inputValues]);

  // Handle individual input field changes
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
    setShowCorrectAnswer(false); // Hide correct answer when user types again

    // Automatically focus on the next input field
    if (newValues[index].length === 1 && index < currentQuestion.answers.length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  // Listen for keyboard events, handle backspace and arrow key navigation
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

  // Function to check the answer
  const checkAnswer = () => {
    clearInterval(timerRef.current); // Stop the timer
    let allCorrect = true;
    inputValues.forEach((inputChar, index) => {
      if (inputChar !== currentQuestion.answers[index]) {
        allCorrect = false;
      }
    });

    if (allCorrect) {
      setFeedbackMessage('所有填空都正确！'); // All blanks are correct!
      setIsCorrect(true);
      setShowCorrectAnswer(false); // No need to show answer if all are correct
    } else {
      setFeedbackMessage('部分填空有误，请检查。'); // Some blanks are incorrect, please check.
      setIsCorrect(false);
      setShowCorrectAnswer(true); // If incorrect, show the correct answer
    }
  };

  // Move to the next question
  const goToNextQuestion = () => {
    if (currentQuestionIndex < questionsData.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
    } else {
      setFeedbackMessage('恭喜你，所有题目都已完成！'); // Congratulations, all questions completed!
      clearInterval(timerRef.current); // Ensure timer stops when all questions are done
      timerRef.current = null;
      // Can redirect to a results page or show a final completion message here
    }
  };

  // Redo the current question
  const redoQuestion = () => {
    resetQuestionState();
  };

  // Reverted renderQuestionText for better stability and basic word breaking
  const renderQuestionText = () => {
    const parts = currentQuestion.text.split('[BLANK]');
    const elements = [];
    parts.forEach((part, index) => {
      elements.push(<span key={`part-${index}`}>{part}</span>);

      if (index < currentQuestion.answers.length) {
        let borderColorClass = 'border-blue-500'; // Default blue

        if (isCorrect !== null || timeLeft === 0) { // Only color based on correctness after checking or time runs out
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
            className={`char-input text-xl font-bold ${borderColorClass}`}
            value={inputValues[index]}
            onChange={(e) => handleInputChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            disabled={timeLeft === 0 || isCorrect !== null}
            aria-label={`填空 ${index + 1}`} // Add accessibility label
          />
        );
      }
    });
    return elements;
  };

  // Render the correct answer (bold and more prominent color)
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

  // Format time to MM:SS
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Invitation code handling
  const handleInvitationCodeSubmit = () => {
    if (invitationCodeInput === INVITATION_CODE) {
      setInvitationCodeError('');
      setGameState('questionTypeSelection');
    } else {
      setInvitationCodeError('邀请码错误，请重试。'); // Incorrect invitation code, please try again.
    }
  };

  // Render different interfaces based on gameState
  const renderContent = () => {
    switch (gameState) {
      case 'welcome':
        return (
          <div className="text-center flex flex-col items-center">
            {/* Duolingo Owl image from GitHub - Using your provided raw link */}
            <img
              src="https://raw.githubusercontent.com/yihengsir/duolingo-prep-platform/main/public/unnamed.png"
              alt="Duolingo Logo"
              className="w-36 h-36 rounded-full mb-8 shadow-lg"
              onError={(e) => { e.target.src = 'https://placehold.co/150x150/ADD8E6/000000?text=Logo+Error'; }} // Fallback image
            />
            <h1 className="text-4xl font-bold mb-6 text-blue-600">Duolingo DET Prep with Fengfeng</h1>
            <div className="mt-8 flex flex-col items-center">
              <label htmlFor="invitationCode" className="text-lg text-gray-700 mb-2">
                请输入邀请码:
              </label>
              <input
                id="invitationCode"
                type="text"
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg w-64 text-center"
                value={invitationCodeInput}
                onChange={(e) => setInvitationCodeInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleInvitationCodeSubmit();
                  }
                }}
                aria-label="邀请码输入框" // Add accessibility label
              />
              {invitationCodeError && (
                <p className="text-red-600 mt-2 text-sm">{invitationCodeError}</p>
              )}
              <button
                onClick={handleInvitationCodeSubmit}
                className="mt-6 bg-blue-600 text-white px-8 py-3 rounded-full text-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors duration-200 ease-in-out"
              >
                进入
              </button>
            </div>
          </div>
        );
      case 'questionTypeSelection':
        return (
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-6 text-blue-600">选择题型</h1> {/* Select Question Type */}
            <div className="flex flex-col items-center space-y-4">
              <button
                onClick={() => setGameState('readAndComplete')}
                className="bg-green-600 text-white px-12 py-4 rounded-full text-xl font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition-colors duration-200 ease-in-out"
              >
                阅读 {/* Reading */}
              </button>
              {/* Other question type buttons can be added here, but currently only Reading is available */}
            </div>
          </div>
        );
      case 'readAndComplete':
        return (
          <>
            {/* Timer in the top-left corner */}
            <div className="absolute top-4 left-4 text-2xl font-bold text-blue-600">
              {formatTime(timeLeft)}
            </div>

            <h1 className="text-4xl font-bold mb-6 text-blue-600 text-center">
              Duolingo DET Prep - 阅读并补全 {/* Duolingo DET Prep - Read and Complete */}
            </h1>
            <h2 className="text-2xl font-semibold mb-6 text-gray-700 text-center">
              {currentQuestion.title}
            </h2>

            {/* Question text area: add horizontal padding, ensure content doesn't stick to edges */}
            {/* Using whitespace-pre-wrap here to preserve internal spacing from the `parts` split */}
            <div className="text-lg mb-4 whitespace-pre-wrap flex flex-wrap items-center justify-center px-4 md:px-8">
              {renderQuestionText()}
            </div>
            {currentQuestion.hint && (
              <p className="text-sm text-gray-500 italic mt-4 text-center">
                提示: {currentQuestion.hint} {/* Hint: */}
              </p>
            )}

            {/* Answer feedback area */}
            {feedbackMessage && (
              <p className={`mt-4 text-center text-lg font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                {feedbackMessage}
              </p>
            )}

            {/* Area to display the correct answer */}
            {showCorrectAnswer && (
              <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-800 rounded-md shadow-sm">
                <p className="font-semibold mb-2">正确答案:</p> {/* Correct Answer: */}
                <p className="whitespace-pre-wrap text-lg">
                  {renderCorrectAnswer()}
                </p>
              </div>
            )}

            {/* Buttons area */}
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
                检查答案 {/* Check Answer */}
              </button>

              <button
                onClick={redoQuestion}
                className="bg-yellow-500 text-white px-8 py-3 rounded-full text-lg font-semibold hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-50 transition-colors duration-200 ease-in-out"
              >
                重做 {/* Redo */}
              </button>

              {isCorrect !== null && (
                <button
                  onClick={goToNextQuestion}
                  className="bg-green-600 text-white px-8 py-3 rounded-full text-lg font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition-colors duration-200 ease-in-out"
                >
                  {currentQuestionIndex < questionsData.length - 1 ? '下一题' : '完成'} {/* Next Question / Complete */}
                </button>
              )}
            </div>
            {/* Bottom hint text */}
            <p className="text-lg text-gray-600 mt-8 mb-4">
              请在每个方框中填入缺失的字母。 {/* Please fill in the missing letters in each box. */}
            </p>
          </>
        );
      default:
        return null;
    }
  };

  return (
    // Outer container: responsible for overall page background and flexbox centering
    // Removed font-inter from here to allow index.css to control font with fallbacks
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      {/* Main content container for the centered card effect */}
      {/* Adjusted max-w-3xl to max-w-4xl for wider card */}
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-auto my-8 border border-gray-200 p-8">
        {renderContent()}
      </div>
    </div>
  );
}

export default App;
