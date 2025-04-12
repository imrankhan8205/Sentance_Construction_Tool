import { useState, useEffect } from 'react'
import questionsData from './data/questions.json'
import './App.css'

// Add animation classes at the top
const slideIn = 'animate-[slideIn_0.5s_ease-out]'
const fadeIn = 'animate-[fadeIn_0.3s_ease-out]'
const bounce = 'animate-[bounce_0.5s_ease-out]'
const pulse = 'animate-[pulse_2s_infinite]'
const shake = 'animate-[shake_0.5s_ease-in-out]'

interface Question {
  id: number
  sentence: string
  options: string[]
  correctAnswer: string
}

interface Answer {
  question: Question
  answer: string
  markedForReview: boolean
}

function App() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string>('')
  const [timeLeft, setTimeLeft] = useState(30)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [isGameOver, setIsGameOver] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [randomQuestions, setRandomQuestions] = useState<Question[]>([])
  const [showResponseOverview, setShowResponseOverview] = useState(false)
  const [showingCorrectAnswer, setShowingCorrectAnswer] = useState(false)
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set())
  const [showReviewedOnly, setShowReviewedOnly] = useState(false)
  const [isReviewMode, setIsReviewMode] = useState(false)
  const [reviewMessage, setReviewMessage] = useState<string>('')

  // Function to shuffle array using Fisher-Yates algorithm
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  const currentQuestion = randomQuestions[currentQuestionIndex]

  useEffect(() => {
    if (timeLeft > 0 && !isGameOver && gameStarted && !showingCorrectAnswer) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && !isGameOver && gameStarted && !showingCorrectAnswer) {
      // When time runs out, show correct answer for 2 seconds
      setShowingCorrectAnswer(true)
      setTimeout(() => {
        setShowingCorrectAnswer(false)
        handleNextQuestion()
      }, 2000)
    }
  }, [timeLeft, isGameOver, gameStarted, showingCorrectAnswer])

  const handleAnswerSelect = (answer: string) => {
    if (!showingCorrectAnswer) {
      setSelectedAnswer(answer)
    }
  }

  const toggleMarkForReview = () => {
    setMarkedForReview(prev => {
      const newSet = new Set(prev)
      if (newSet.has(currentQuestionIndex)) {
        newSet.delete(currentQuestionIndex)
      } else {
        newSet.add(currentQuestionIndex)
        // Save current question state and move to next question
        setAnswers([...answers, { 
          question: currentQuestion, 
          answer: 'Marked for later',
          markedForReview: true
        }])
        setSelectedAnswer('')
        setTimeLeft(30)
        
        // Find the next unanswered and unmarked question
        let nextIndex = currentQuestionIndex
        let foundNext = false
        
        // First, try to find the next unmarked question
        for (let i = currentQuestionIndex + 1; i < randomQuestions.length; i++) {
          if (!newSet.has(i) && !answers.some(a => a.question.id === randomQuestions[i].id)) {
            nextIndex = i
            foundNext = true
            break
          }
        }
        
        // If no unmarked questions ahead, check from the beginning
        if (!foundNext) {
          for (let i = 0; i < currentQuestionIndex; i++) {
            if (!newSet.has(i) && !answers.some(a => a.question.id === randomQuestions[i].id)) {
              nextIndex = i
              foundNext = true
              break
            }
          }
        }
        
        // If all questions are either answered or marked, start review mode
        if (!foundNext) {
          const currentAnswers = [...answers, { 
            question: currentQuestion, 
            answer: 'Marked for later',
            markedForReview: true
          }]
          startReviewMode(currentAnswers)
        } else {
          setCurrentQuestionIndex(nextIndex)
        }
      }
      return newSet
    })
  }

  const handleNextQuestion = () => {
    // Save current answer
    const currentAnswer = {
      question: currentQuestion,
      answer: selectedAnswer || 'No answer',
      markedForReview: markedForReview.has(currentQuestionIndex)
    }

    // Add answer to the list
    const updatedAnswers = [...answers, currentAnswer]
    setAnswers(updatedAnswers)

    if (currentQuestionIndex < randomQuestions.length - 1) {
      // Move to next question
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setSelectedAnswer('')
      setTimeLeft(30)
    } else {
      // Check if there are any marked questions that need review
      const markedAnswers = updatedAnswers.filter(a => a.answer === 'Marked for later')
      if (markedAnswers.length > 0) {
        // Start review mode automatically instead of ending the quiz
        startReviewMode(updatedAnswers)
      } else {
        // Only end the quiz if there are no marked questions
        setIsGameOver(true)
      }
    }
  }

  const startGame = () => {
    const shuffled = shuffleArray(questionsData.questions)
    setRandomQuestions(shuffled.slice(0, 10))
    setGameStarted(true)
    setTimeLeft(30)
    setMarkedForReview(new Set())
  }

  const restartGame = () => {
    const shuffled = shuffleArray(questionsData.questions)
    setRandomQuestions(shuffled.slice(0, 10))
    setGameStarted(false)
    setIsGameOver(false)
    setCurrentQuestionIndex(0)
    setSelectedAnswer('')
    setTimeLeft(30)
    setAnswers([])
    setShowResponseOverview(false)
    setShowingCorrectAnswer(false)
    setMarkedForReview(new Set())
    setShowReviewedOnly(false)
  }

  const calculateScore = () => {
    return answers.reduce((score, current) => {
      return current.answer === current.question.correctAnswer ? score + 1 : score
    }, 0)
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 dark:text-green-400'
    if (score >= 6) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreMessage = (score: number) => {
    if (score >= 8) return 'Excellent! You have a strong grasp of sentence construction!'
    if (score >= 6) return 'Good job! Keep practicing to improve further.'
    return 'Keep practicing! You\'ll get better with time.'
  }

  const startReviewMode = (currentAnswers: Answer[] = answers) => {
    // Filter out marked questions and reset game state for them
    const markedAnswers = currentAnswers.filter(a => a.answer === 'Marked for later')
    const remainingAnswers = currentAnswers.filter(a => a.answer !== 'Marked for later')
    
    setAnswers(remainingAnswers)
    setRandomQuestions(markedAnswers.map(a => a.question))
    setCurrentQuestionIndex(0)
    setSelectedAnswer('')
    setTimeLeft(30)
    setIsGameOver(false)
    setShowResponseOverview(false)
    setShowingCorrectAnswer(false)
    setMarkedForReview(new Set())
    setIsReviewMode(true)
    setReviewMessage(`Reviewing marked questions (${markedAnswers.length} remaining)...`)
  }

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4 sm:p-8 morphing-bg">
        <div className="w-full max-w-2xl bg-card/95 backdrop-blur-lg p-4 sm:p-8 rounded-xl shadow-lg border border-primary/10 hover-rotate3D">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 sm:mb-6 gradient-text glitch" data-text="Sentence Construction Tool">
            Sentence Construction Tool
          </h1>
          <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
            <p className="text-base sm:text-lg text-muted-foreground hover-glow">
              Welcome! Test your language skills by completing sentences with the correct words.
            </p>
            <div className="bg-secondary/30 p-4 sm:p-6 rounded-lg backdrop-blur-sm parallax-float">
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">How to Play:</h2>
              <ul className="text-left space-y-2 sm:space-y-3 text-foreground/80 text-sm sm:text-base">
                <li className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm">1</span>
                  Complete 10 random sentences by filling in the blanks
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm">2</span>
                  Choose from 4 options for each blank
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm">3</span>
                  You have 30 seconds per question
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm">4</span>
                  Click on a filled blank to change your answer
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm">5</span>
                  See your final score and review answers at the end
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm">6</span>
                  Mark questions for review to check them later
                </li>
              </ul>
            </div>
          </div>
          <button
            onClick={startGame}
            className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-base sm:text-lg font-semibold transition-all button-3d ripple"
          >
            Start Quiz
          </button>
        </div>
      </div>
    )
  }

  if (isGameOver) {
    const score = calculateScore()
    const scoreColor = getScoreColor(score)
    const scoreMessage = getScoreMessage(score)
    const correctAnswers = answers.filter(a => a.answer === a.question.correctAnswer)
    const incorrectAnswers = answers.filter(a => a.answer !== a.question.correctAnswer && a.answer !== 'Marked for later')
    const reviewedQuestions = answers.filter(a => a.markedForReview)
    const markedQuestions = answers.filter(a => a.answer === 'Marked for later')

    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-4 sm:p-8">
        <div className="max-w-3xl mx-auto bg-card p-4 sm:p-8 rounded-xl shadow-lg border border-primary/10">
          <h1 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            {isReviewMode ? 'Review Complete!' : 'Quiz Complete!'}
          </h1>
          
          <div className="bg-primary/5 p-4 sm:p-8 rounded-lg mb-6 sm:mb-8">
            <div className="text-center mb-4">
              <p className={`text-4xl sm:text-5xl font-bold mb-2 ${scoreColor}`}>
                {score} / {10 - markedQuestions.length}
              </p>
              <p className="text-lg sm:text-xl text-muted-foreground">
                {scoreMessage}
              </p>
              {markedQuestions.length > 0 && !isReviewMode && (
                <p className="mt-2 text-yellow-600 dark:text-yellow-400">
                  You have {markedQuestions.length} question{markedQuestions.length > 1 ? 's' : ''} marked for review
                </p>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-4 sm:mt-6">
              <div className="bg-green-100 dark:bg-green-900/20 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">{correctAnswers.length}</p>
                <p className="text-sm text-green-800 dark:text-green-300">Correct</p>
              </div>
              <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">{incorrectAnswers.length}</p>
                <p className="text-sm text-red-800 dark:text-red-300">Incorrect</p>
              </div>
              <div className="bg-yellow-100 dark:bg-yellow-900/20 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{markedQuestions.length}</p>
                <p className="text-sm text-yellow-800 dark:text-yellow-300">Marked for Review</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
            <button
              onClick={() => setShowResponseOverview(!showResponseOverview)}
              className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground p-3 sm:p-4 rounded-lg font-semibold transition-colors text-sm sm:text-base"
            >
              {showResponseOverview ? 'Hide Responses' : 'Show Responses'}
            </button>
            {!isReviewMode && markedQuestions.length > 0 && (
              <button
                onClick={() => startReviewMode()}
                className="flex-1 bg-yellow-500 text-white hover:bg-yellow-600 p-3 sm:p-4 rounded-lg font-semibold transition-colors text-sm sm:text-base"
              >
                Reattempt Marked Questions
              </button>
            )}
            <button
              onClick={restartGame}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 p-3 sm:p-4 rounded-lg font-semibold transition-colors text-sm sm:text-base"
            >
              {isReviewMode ? 'Start New Quiz' : 'Try New Questions'}
            </button>
          </div>

          {showResponseOverview && (
            <div className="space-y-3 sm:space-y-4">
              {answers
                .filter(answer => !showReviewedOnly || answer.markedForReview)
                .map((answer, index) => (
                <div 
                  key={index}
                  className={`p-6 rounded-lg border-2 transition-all ${
                    answer.answer === answer.question.correctAnswer
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/10'
                      : 'border-red-500 bg-red-50 dark:bg-red-900/10'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        Question {index + 1}
                      </span>
                      {answer.markedForReview && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-200 text-yellow-800">
                          Marked for Review
                        </span>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      answer.answer === answer.question.correctAnswer
                        ? 'bg-green-200 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : answer.answer === 'No answer'
                        ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                        : 'bg-red-200 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      {answer.answer === answer.question.correctAnswer 
                        ? 'Correct' 
                        : answer.answer === 'No answer'
                        ? 'Time Out'
                        : 'Incorrect'}
                    </span>
                  </div>
                  
                  <p className="text-lg font-medium mb-3">
                    {answer.question.sentence.split('___').map((part, idx, arr) => (
                      <span key={idx}>
                        {part}
                        {idx < arr.length - 1 && (
                          <span className={`inline-block px-3 py-1 mx-1 rounded font-bold ${
                            answer.answer === answer.question.correctAnswer
                              ? 'bg-green-200 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : answer.answer === 'No answer'
                              ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                              : 'bg-red-200 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            {answer.answer}
                          </span>
                        )}
                      </span>
                    ))}
                  </p>
                  
                  {answer.answer !== answer.question.correctAnswer && (
                    <div className="mt-2 p-3 bg-background/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Correct answer: {' '}
                        <span className="font-semibold text-primary">
                          {answer.question.correctAnswer}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-4 sm:p-8 relative overflow-hidden morphing-bg">
      {/* Particle effects */}
      <div className="particle-container">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              '--x': `${Math.random() * 200 - 100}px`,
              '--y': `${Math.random() * 200 - 100}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Animated background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-48 sm:w-64 h-48 sm:h-64 bg-primary/5 rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute bottom-0 right-0 w-72 sm:w-96 h-72 sm:h-96 bg-secondary/10 rounded-full blur-3xl animate-float-medium"></div>
        <div className="absolute top-1/2 left-1/4 w-36 sm:w-48 h-36 sm:h-48 bg-primary/5 rounded-full blur-2xl animate-float-fast"></div>
        
        {/* Floating icons with enhanced animations */}
        <div className="hidden sm:block absolute top-20 right-[20%] animate-bounce-slow opacity-20 hover-rotate3D">
          <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17 18h-2v2h2v-2zm0-8h-2v6h2v-6zm4 0h-2v6h2v-6zm0 8h-2v2h2v-2zm-8-4h-2v6h2v-6zm0 8h-2v2h2v-2zm-4-8H7v6h2v-6zm0 8H7v2h2v-2zm-4-8H3v6h2v-6zm0 8H3v2h2v-2z"/>
          </svg>
        </div>
        <div className="hidden sm:block absolute bottom-32 left-[15%] animate-spin-slow opacity-20 parallax-float">
          <svg className="w-12 h-12 text-secondary" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 100-16 8 8 0 000 16z"/>
          </svg>
        </div>
      </div>

      <div className="max-w-2xl mx-auto bg-card/95 backdrop-blur-lg p-4 sm:p-8 rounded-xl shadow-lg border border-primary/10 relative hover-glow">
        <div className={`relative ${fadeIn}`}>
          {reviewMessage && (
            <div className="mb-4 p-3 bg-yellow-100/90 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 rounded-lg text-center text-sm sm:text-base animate-slideDown glitch" data-text={reviewMessage}>
              {reviewMessage}
            </div>
          )}
          
          <div className="mb-4 sm:mb-6 relative">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <span className="text-base sm:text-lg font-medium relative gradient-text">
                  Question {currentQuestionIndex + 1} of 10
                  <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-primary/30 rounded animate-width"></span>
                </span>
                <button
                  onClick={toggleMarkForReview}
                  className={`flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 transform hover:scale-105 button-3d ripple ${
                    markedForReview.has(currentQuestionIndex)
                      ? 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300 animate-pulse'
                      : 'bg-secondary hover:bg-secondary/80'
                  }`}
                >
                  <svg 
                    className={`w-4 h-4 transition-transform duration-300 ${
                      markedForReview.has(currentQuestionIndex) ? 'scale-110' : ''
                    }`}
                    fill={markedForReview.has(currentQuestionIndex) ? "currentColor" : "none"}
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                    />
                  </svg>
                  {markedForReview.has(currentQuestionIndex) ? 'Marked for Review' : 'Mark for Review'}
                </button>
              </div>
              <span className={`text-base sm:text-lg font-medium flex items-center gap-2 transition-colors duration-300 ${
                timeLeft <= 10 ? 'text-red-500 animate-pulse glitch' : 'text-primary'
              }`} data-text={`${timeLeft}s`}>
                <svg 
                  className="w-5 h-5"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {timeLeft}s
              </span>
            </div>
            
            {/* Progress bar with enhanced animation */}
            <div className="w-full bg-secondary rounded-full h-2 sm:h-2.5 overflow-hidden hover-glow">
              <div 
                className={`h-2.5 rounded-full transition-all duration-1000 ${
                  timeLeft <= 10 ? 'bg-red-500 animate-pulse' : 'bg-primary'
                }`}
                style={{ 
                  width: `${(timeLeft / 30) * 100}%`,
                  transition: 'width 1s linear'
                }}
              />
            </div>
          </div>

          <div className="mb-6 sm:mb-8">
            <div className={`bg-secondary/20 p-4 sm:p-6 rounded-lg mb-4 sm:mb-6 transform transition-all duration-300 hover:shadow-lg parallax-float ${fadeIn}`}>
              <h2 className={`text-xl sm:text-2xl font-bold ${currentQuestionIndex > 0 ? slideIn : ''}`}>
                {currentQuestion.sentence.split('___').map((part, index, array) => (
                  <span key={index}>
                    {part}
                    {index < array.length - 1 && (
                      <span 
                        className={`inline-block min-w-20 px-3 py-1 mx-1 rounded transition-all duration-300 ${
                          showingCorrectAnswer
                            ? 'bg-green-200 text-green-800 font-bold animate-[scaleUp_0.3s_ease-out]'
                            : selectedAnswer 
                              ? 'bg-primary/20 text-primary font-bold animate-[bounce_0.5s_ease-out]' 
                              : 'bg-secondary border-2 border-dashed border-primary/30 animate-[pulse_2s_infinite]'
                        }`}
                      >
                        {showingCorrectAnswer 
                          ? currentQuestion.correctAnswer 
                          : selectedAnswer || '___'}
                      </span>
                    )}
                  </span>
                ))}
              </h2>
              {showingCorrectAnswer && (
                <div className={`mt-4 text-center text-sm text-muted-foreground ${fadeIn}`}>
                  Time's up! The correct answer was shown.
                </div>
              )}
            </div>
            
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 ${fadeIn}`}>
              {currentQuestion.options.map((option, index) => (
                <button
                  key={option}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={showingCorrectAnswer}
                  className={`p-3 sm:p-4 text-base sm:text-lg rounded-lg transition-all duration-300 transform hover:scale-105 button-3d ripple ${
                    showingCorrectAnswer && option === currentQuestion.correctAnswer
                      ? 'bg-green-500 text-white scale-105 shadow-lg animate-[scaleUp_0.3s_ease-out]'
                      : selectedAnswer === option
                      ? 'bg-primary text-primary-foreground scale-105 shadow-lg animate-[bounce_0.5s_ease-out]'
                      : 'bg-secondary hover:bg-secondary/80 hover:shadow-md'
                  } ${showingCorrectAnswer && 'cursor-not-allowed opacity-75'}`}
                  style={{
                    animationDelay: `${index * 0.1}s`,
                    transform: `perspective(1000px) rotateX(${Math.sin(Date.now() * 0.001 + index) * 2}deg)`
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleNextQuestion}
            disabled={!selectedAnswer && !showingCorrectAnswer}
            className={`w-full p-3 sm:p-4 text-base sm:text-lg rounded-lg transition-all duration-300 transform relative overflow-hidden button-3d ripple ${
              selectedAnswer || showingCorrectAnswer
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 shadow-lg'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            <span className={`relative z-10 ${selectedAnswer || showingCorrectAnswer ? 'animate-[pulse_2s_infinite]' : ''}`}>
              Next Question
            </span>
            {(selectedAnswer || showingCorrectAnswer) && (
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 animate-shimmer"></div>
            )}
          </button>

          {/* Enhanced decorative corner elements */}
          <div className="absolute -top-1 sm:-top-2 -left-1 sm:-left-2 w-3 sm:w-4 h-3 sm:h-4 border-t-2 border-l-2 border-primary/30 rounded-tl animate-float-slow"></div>
          <div className="absolute -top-1 sm:-top-2 -right-1 sm:-right-2 w-3 sm:w-4 h-3 sm:h-4 border-t-2 border-r-2 border-primary/30 rounded-tr animate-float-medium"></div>
          <div className="absolute -bottom-1 sm:-bottom-2 -left-1 sm:-left-2 w-3 sm:w-4 h-3 sm:h-4 border-b-2 border-l-2 border-primary/30 rounded-bl animate-float-fast"></div>
          <div className="absolute -bottom-1 sm:-bottom-2 -right-1 sm:-right-2 w-3 sm:w-4 h-3 sm:h-4 border-b-2 border-r-2 border-primary/30 rounded-br animate-float-slow"></div>
        </div>
      </div>
    </div>
  )
}

export default App
