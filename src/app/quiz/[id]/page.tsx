"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { InferSelectModel } from "drizzle-orm";
import { quizzes, questions, attempts } from "@/db/schema";
import { storage } from "@/lib/storage";

type Quiz = InferSelectModel<typeof quizzes>;
type Question = InferSelectModel<typeof questions> & { options: string[] };
type Attempt = InferSelectModel<typeof attempts>;

export default function QuizPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params.id as string;

  const [timeLeft, setTimeLeft] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [answerChoices, setAnswerChoices] = useState<Record<number, string>>({});
  const [quizData, setQuizData] = useState<{quiz: Quiz; questions: Question[]} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [student, setStudent] = useState<{id: number; name: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [isSavingAnswer, setIsSavingAnswer] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showQuestionNav, setShowQuestionNav] = useState(false);
  
  // Reload protection state
  const [showReloadModal, setShowReloadModal] = useState(false);
  const [reloadAttempts, setReloadAttempts] = useState(0);
  const isSubmittingRef = useRef(false);
  const hasShownModalRef = useRef(false);

  // Initialize reload attempts from localStorage
  useEffect(() => {
    const savedAttempts = localStorage.getItem(`quiz-reload-attempts-${quizId}`);
    if (savedAttempts) {
      const attempts = parseInt(savedAttempts);
      setReloadAttempts(attempts);
      
      // If user has already hit 3+ attempts and reloaded, auto-submit
      if (attempts >= 3) {
        const shouldAutoSubmit = localStorage.getItem(`quiz-auto-submit-${quizId}`);
        if (shouldAutoSubmit === 'true') {
          // Wait a bit for component to initialize
          setTimeout(() => {
            handleAutoSubmitAfterReload();
          }, 500);
        }
      }
    }
  }, [quizId]);

  // Update ref when isSubmitting changes
  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  // Handle auto-submit after page has reloaded
  const handleAutoSubmitAfterReload = async () => {
    // Wait for quiz data to load
    const checkInterval = setInterval(() => {
      if (quizData && student && attemptId && !isSubmittingRef.current) {
        clearInterval(checkInterval);
        performAutoSubmit();
      }
    }, 100);

    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 10000);
  };

  const performAutoSubmit = async () => {
    if (!quizData || !student || !attemptId || isSubmittingRef.current) return;
    
    setIsSubmitting(true);
    isSubmittingRef.current = true;

    try {
      const score = calculateScore();
      const correctAnswers = quizData.questions.filter((q) => {
        const selectedChoiceLetter = answerChoices[q.id];
        return selectedChoiceLetter === q.correctAnswer;
      }).length;

      const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

      const response = await fetch("/api/attempts/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          score,
          totalQuestions: quizData.questions.length,
          correctAnswers,
          passed: score >= (quizData.quiz.passingScore || 70),
          timeSpent,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        const quizResult = {
          score,
          totalQuestions: quizData.questions.length,
          correctAnswers,
          passed: score >= (quizData.quiz.passingScore || 70),
          quizTitle: quizData.quiz.title,
          attemptId: result.attemptId || attemptId,
        };

        storage.setResult(quizResult);
        
        // Clear reload tracking
        localStorage.removeItem(`quiz-reload-attempts-${quizId}`);
        localStorage.removeItem(`quiz-auto-submit-${quizId}`);
        
        // Navigate to completion page
        router.push("/completion");
      } else {
        throw new Error(result.error || "Auto-submission failed");
      }
    } catch (error) {
      console.error("Auto-submission error:", error);
      // Clear flags on error
      localStorage.removeItem(`quiz-reload-attempts-${quizId}`);
      localStorage.removeItem(`quiz-auto-submit-${quizId}`);
      setError("Failed to submit quiz. Please try again.");
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  // Enhanced navigation prevention
  useEffect(() => {
    if (!attemptId) return;

    // Handle beforeunload (reload, close tab, navigate away)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isSubmittingRef.current) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    // Handle visibility change (tab switching, minimizing)
    const handleVisibilityChange = () => {
      if (document.hidden && !isSubmittingRef.current && !hasShownModalRef.current) {
        incrementReloadAttempts();
      }
    };

    // Intercept keyboard shortcuts for reload
    const handleKeyDown = (e: KeyboardEvent) => {
      const isReloadShortcut = 
        (e.key === 'r' && (e.ctrlKey || e.metaKey)) || 
        e.key === 'F5';
      
      if (isReloadShortcut && !isSubmittingRef.current && !hasShownModalRef.current) {
        e.preventDefault();
        incrementReloadAttempts();
        return false;
      }
    };

    // Handle popstate (browser back/forward buttons)
    const handlePopState = (e: PopStateEvent) => {
      if (!isSubmittingRef.current && !hasShownModalRef.current) {
        e.preventDefault();
        window.history.pushState(null, "", window.location.href);
        incrementReloadAttempts();
      }
    };

    const incrementReloadAttempts = () => {
      hasShownModalRef.current = true;
      const newAttempts = reloadAttempts + 1;
      setReloadAttempts(newAttempts);
      localStorage.setItem(`quiz-reload-attempts-${quizId}`, newAttempts.toString());
      
      if (newAttempts >= 3) {
        localStorage.setItem(`quiz-auto-submit-${quizId}`, 'true');
      }
      
      setShowReloadModal(true);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("popstate", handlePopState);
    window.history.pushState(null, "", window.location.href);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [attemptId, quizId, reloadAttempts]);

  const handleCancelReload = () => {
    setShowReloadModal(false);
    hasShownModalRef.current = false;
  };

  const handleConfirmReload = async () => {
    setShowReloadModal(false);
    hasShownModalRef.current = false;
    await handleQuizCompletion();
  };

  // Load quiz data and create/resume attempt
  useEffect(() => {
    const studentData = storage.getStudent();
    console.log("Student data from storage in quiz:", studentData);

    if (!studentData) {
      console.log("No student data found, redirecting to register");
      router.push("/register");
      return;
    }

    setStudent(studentData);

    const fetchQuiz = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/quiz/${quizId}?studentId=${studentData.id}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Quiz not available");
        }

        const data = await response.json();
        console.log("Quiz data received:", data);

        if (!data.quiz) {
          throw new Error("No quiz found");
        }
        if (data.quiz.timeLimit <= 0) {
          throw new Error("Invalid time limit");
        }

        const validatedQuestions = data.questions.map((question: any) => {
          if (!Array.isArray(question.options) || question.options.length !== 4) {
            return {
              ...question,
              options: ["Option A", "Option B", "Option C", "Option D"],
            };
          }
          return {
            ...question,
            options: question.options.map((opt: string) => String(opt).trim()),
          };
        });

        setQuizData({
          quiz: data.quiz,
          questions: validatedQuestions,
        });

        const attemptResponse = await fetch("/api/attempts/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quizId: data.quiz.id,
            studentId: studentData.id,
          }),
        });

        if (!attemptResponse.ok) {
          const attemptError = await attemptResponse.json();
          throw new Error(attemptError.error || "Failed to start quiz");
        }

        const attemptData = await attemptResponse.json();
        console.log("Attempt data:", attemptData);
        setAttemptId(attemptData.attemptId);

        if (attemptData.existingAnswers) {
          setAnswers(attemptData.existingAnswers);
          setAnswerChoices(attemptData.existingChoices);
        }

        const quizDuration = data.quiz.timeLimit * 60;
        setTimeLeft(attemptData.timeRemaining || quizDuration);
        setStartTime(Date.now());
        setIsLoading(false);
      } catch (error) {
        console.error("Quiz load error:", error);
        setError(error instanceof Error ? error.message : "Failed to load quiz");
        setIsLoading(false);
        setTimeout(() => router.push("/"), 3000);
      }
    };

    if (quizId) fetchQuiz();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [router, quizId]);

  // Timer countdown with server sync
  useEffect(() => {
    if (!quizData || !attemptId || timeLeft <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;

        if (newTime % 30 === 0) {
          fetch("/api/attempts/sync-time", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ attemptId, timeRemaining: newTime }),
          }).catch(console.error);
        }

        if (newTime <= 0) {
          handleQuizCompletion();
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quizData, attemptId, timeLeft]);

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getChoiceLetter = (index: number): string => {
    return String.fromCharCode(65 + index);
  };

  const handleAnswerSelect = async (questionId: number, option: string, optionIndex: number) => {
    if (!attemptId || isSavingAnswer) return;

    const choiceLetter = getChoiceLetter(optionIndex);
    const isNewAnswer = !answers[questionId];

    const newAnswers = { ...answers, [questionId]: option };
    const newChoices = { ...answerChoices, [questionId]: choiceLetter };
    setAnswers(newAnswers);
    setAnswerChoices(newChoices);

    setIsSavingAnswer(true);

    try {
      const response = await fetch("/api/attempts/save-answer", {
        method: isNewAnswer ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          questionId,
          selectedAnswer: choiceLetter,
          isCorrect: choiceLetter === quizData?.questions.find((q) => q.id === questionId)?.correctAnswer,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save answer");
      }
    } catch (error) {
      console.error("Answer save error:", error);
      const revertAnswers = { ...answers };
      const revertChoices = { ...answerChoices };
      delete revertAnswers[questionId];
      delete revertChoices[questionId];
      setAnswers(revertAnswers);
      setAnswerChoices(revertChoices);
      alert("Failed to save answer. Please try again.");
    } finally {
      setIsSavingAnswer(false);
    }
  };

  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
    setShowQuestionNav(false);
  };

  const goToNextQuestion = () => {
    if (quizData && currentQuestionIndex < quizData.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const calculateScore = () => {
    if (!quizData) return 0;
    const correct = quizData.questions.filter((q) => {
      const selectedChoiceLetter = answerChoices[q.id];
      return selectedChoiceLetter === q.correctAnswer;
    }).length;
    return Math.round((correct / quizData.questions.length) * 100);
  };

  const handleQuizCompletion = async () => {
    if (!quizData || !student || !attemptId || isSubmitting) return;

    setIsSubmitting(true);
    isSubmittingRef.current = true;
    console.log("Starting quiz completion...");

    try {
      const score = calculateScore();
      const correctAnswers = quizData.questions.filter((q) => {
        const selectedChoiceLetter = answerChoices[q.id];
        return selectedChoiceLetter === q.correctAnswer;
      }).length;

      const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

      console.log("Submitting quiz with data:", {
        attemptId,
        score,
        totalQuestions: quizData.questions.length,
        correctAnswers,
        passed: score >= (quizData.quiz.passingScore || 70),
        timeSpent,
      });

      const response = await fetch("/api/attempts/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          score,
          totalQuestions: quizData.questions.length,
          correctAnswers,
          passed: score >= (quizData.quiz.passingScore || 70),
          timeSpent,
        }),
      });

      const result = await response.json();
      console.log("Completion API response:", result);

      if (!response.ok) {
        throw new Error(result.error || "Submission failed");
      }

      const quizResult = {
        score,
        totalQuestions: quizData.questions.length,
        correctAnswers,
        passed: score >= (quizData.quiz.passingScore || 70),
        quizTitle: quizData.quiz.title,
        attemptId: result.attemptId || attemptId,
      };

      console.log("Saving quiz result to storage:", quizResult);
      storage.setResult(quizResult);

      const savedResult = storage.getResult();
      console.log("Verified saved result:", savedResult);

      // Clear reload attempts on normal completion
      localStorage.removeItem(`quiz-reload-attempts-${quizId}`);
      localStorage.removeItem(`quiz-auto-submit-${quizId}`);
      
      router.push("/completion");
    } catch (error) {
      console.error("Submission error:", error);
      alert(error instanceof Error ? error.message : "Failed to submit quiz");
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  const openSubmitModal = () => {
    setShowSubmitModal(true);
  };

  const closeSubmitModal = () => {
    setShowSubmitModal(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 bg-blue-600 rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="text-gray-600 font-medium">Loading your quiz...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-red-100">
          <div className="bg-red-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-3">Quiz Unavailable</h3>
          <p className="text-gray-600 mb-6 leading-relaxed">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!quizData) return null;

  const currentQuestion = quizData.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quizData.questions.length) * 100;
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = quizData.questions.length - answeredCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-10">
      {/* Modern Sticky Header */}
      <div className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Quiz Title & Progress */}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-800 capitalize mb-1">
                {quizData.quiz.title}
              </h1>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="font-medium">
                    {answeredCount}/{quizData.questions.length}
                  </span>
                </span>
              </div>
            </div>

            {/* Timer */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-lg sm:text-xl font-bold shadow-lg ${
              timeLeft <= 300
                ? "bg-gradient-to-r from-red-500 to-red-600 text-white animate-pulse"
                : timeLeft <= 600
                ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white"
                : "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
            }`}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-2 py-3">
        {/* Question Card */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-8 mb-3">
            {/* Question Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 leading-relaxed">
                  {currentQuestion.text}
                </h2>
              </div>
            </div>

            {/* Answer Options */}
            <div className="space-y-2 mb-4">
              {currentQuestion.options.map((option, index) => {
                const choiceLetter = getChoiceLetter(index);
                const isSelected = answers[currentQuestion.id] === option;

                return (
                  <label
                    key={index}
                    className={`flex items-start p-2 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? "border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50 shadow-md scale-[1.02]"
                        : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={option}
                      checked={isSelected}
                      onChange={() => handleAnswerSelect(currentQuestion.id, option, index)}
                      className="sr-only"
                      disabled={isSavingAnswer}
                    />
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                        isSelected
                          ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {choiceLetter}
                      </div>
                      <span className="text-base sm:text-lg text-gray-700 pt-1.5 leading-relaxed">
                        {option}
                      </span>
                    </div>
                    {isSelected && (
                      <svg className="flex-shrink-0 h-6 w-6 text-blue-600 ml-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </label>
                );
              })}
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-4 pt-2 border-t-2 border-gray-100">
              <button
                onClick={goToPreviousQuestion}
                disabled={currentQuestionIndex === 0}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>

              <button
                onClick={goToNextQuestion}
                disabled={currentQuestionIndex === quizData.questions.length - 1}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-lg"
              >
                Next
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Submit Section */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl shadow-lg p-6 border-2 border-green-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <h3 className="text-lg font-bold text-gray-800 mb-1">Ready to Submit?</h3>
                <p className="text-sm text-gray-600">
                  {unansweredCount > 0 ? (
                    <span className="text-orange-600 font-semibold">
                      ⚠️ {unansweredCount} question{unansweredCount !== 1 ? "s" : ""} unanswered
                    </span>
                  ) : (
                    <span className="text-green-600 font-semibold">✓ All questions answered</span>
                  )}
                </p>
              </div>
              <button
                onClick={openSubmitModal}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105"
              >
                Submit Quiz
              </button>
            </div>
          </div>

          {/* Mobile Question Navigator */}
          <button
            onClick={() => setShowQuestionNav(!showQuestionNav)}
            className="lg:hidden fixed bottom-4 right-4 w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-full shadow-2xl flex items-center justify-center z-30 hover:scale-110 transition-transform"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Question Navigator Modal */}
      {showQuestionNav && (
        <div className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-gray-800">All Questions</h3>
                <button
                  onClick={() => setShowQuestionNav(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600">
                {answeredCount} of {quizData.questions.length} answered
              </p>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-5 gap-3">
                {quizData.questions.map((q, index) => (
                  <button
                    key={q.id}
                    onClick={() => goToQuestion(index)}
                    className={`aspect-square rounded-xl font-bold text-lg transition-all ${
                      index === currentQuestionIndex
                        ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg scale-110"
                        : answers[q.id]
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-slideUp">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Submit Quiz?</h3>
                  <p className="text-white/90 text-sm">Please review before submitting</p>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Warning Message */}
              {unansweredCount > 0 && (
                <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 mb-6">
                  <div className="flex gap-3">
                    <svg className="h-6 w-6 text-orange-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-orange-800 mb-1">Incomplete Quiz</p>
                      <p className="text-sm text-orange-700">
                        You have {unansweredCount} unanswered question{unansweredCount !== 1 ? "s" : ""}. 
                        Unanswered questions will be marked as incorrect.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Critical Warning */}
              <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 mb-6">
                <div className="flex gap-3">
                  <svg className="h-6 w-6 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <div>
                    <p className="font-bold text-red-800 mb-1">⚠️ Final Submission</p>
                    <p className="text-sm text-red-700 leading-relaxed">
                      Once you submit your quiz, <span className="font-bold">you will NOT be able to change your answers or retake this attempt</span>. 
                      Your results will be final.
                    </p>
                  </div>
                </div>
              </div>

              {/* Time Remaining Info */}
              {timeLeft > 60 && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-3">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm text-blue-800">
                        <span className="font-semibold">Time Remaining:</span> {formatTime(timeLeft)}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">You still have time to review your answers</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleQuizCompletion}
                  disabled={isSubmitting}
                  className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting Quiz...
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Yes, Submit Now
                    </>
                  )}
                </button>

                <button
                  onClick={closeSubmitModal}
                  disabled={isSubmitting}
                  className="w-full px-6 py-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Go Back & Review
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reload Protection Modal */}
      {showReloadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-slideUp">
            {/* Modal Header */}
            <div className={`p-6 text-white ${
              reloadAttempts >= 3 
                ? "bg-gradient-to-r from-red-500 to-orange-500" 
                : "bg-gradient-to-r from-orange-500 to-amber-500"
            }`}>
              <div className="flex items-center gap-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold">
                    {reloadAttempts >= 3 ? "Auto-Submit Required" : "Leave Page?"}
                  </h3>
                  <p className="text-white/90 text-sm">
                    {reloadAttempts >= 3 ? "Multiple attempts detected" : "Please confirm"}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {reloadAttempts >= 3 ? (
                <div className="space-y-4">
                  <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                    <div className="flex gap-3">
                      <svg className="h-6 w-6 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                      </svg>
                      <div>
                        <p className="font-bold text-red-800 mb-2">You have tried to reload multiple times</p>
                        <p className="text-sm text-red-700 leading-relaxed">
                          Your test will now be submitted automatically and you'll be redirected to the completion page.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleConfirmReload}
                    disabled={isSubmitting}
                    className="w-full px-6 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl hover:from-red-700 hover:to-orange-700 transition-all font-bold text-lg shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Submit & Continue
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                    <div className="flex gap-3">
                      <svg className="h-6 w-6 text-orange-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                      </svg>
                      <div>
                        <p className="font-bold text-orange-800 mb-2">
                          If you reload or leave this page, your test will be automatically submitted
                        </p>
                        <p className="text-sm text-orange-700 leading-relaxed">Do you want to continue?</p>
                        <p className="text-xs text-orange-600 mt-2">Reload attempts: {reloadAttempts}/3</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleCancelReload}
                      disabled={isSubmitting}
                      className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    
                    <button
                      onClick={handleConfirmReload}
                      disabled={isSubmitting}
                      className="flex-1 px-6 py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl hover:from-orange-700 hover:to-amber-700 transition-all font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Submitting...
                        </>
                      ) : (
                        "OK"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}