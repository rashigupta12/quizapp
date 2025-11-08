//src/app/page.tsx
"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { storage } from '@/lib/storage';

type Quiz = {
  id: number;
  title: string;
  description: string;
  timeLimit: number;
  passingScore: number;
  validFrom: string | null;
  validUntil: string | null;
  maxAttempts: number;
  hasAttempted: boolean;
  attemptCount: number;
  canTakeQuiz: boolean;
  status: 'available' | 'completed' | 'exhausted';
  lastScore?: number;
  lastPassed?: boolean;
};

type Student = {
  id: number;
  name: string;
  email: string;
};

export default function EnhancedQuizDashboard() {
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if student is registered using storage utility
    const studentData = storage.getStudent();
    console.log('Student data from storage:', studentData);
    
    if (!studentData) {
      console.log('No student found, redirecting to register');
      router.push("/register");
      return;
    }

    setStudent(studentData);
    fetchAvailableQuizzes(studentData.id);
  }, [router]);

  const fetchAvailableQuizzes = async (studentId: number) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/quizzes/available?studentId=${studentId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch quizzes');
      }

      const data = await response.json();
      setQuizzes(data.quizzes);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      setError('Failed to load available quizzes');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getQuizStatusBadge = (quiz: Quiz) => {
    let bgColor = 'bg-gray-100';
    let textColor = 'text-gray-800';

    if (quiz.status === 'completed') {
      bgColor = quiz.lastPassed ? 'bg-green-100' : 'bg-blue-100';
      textColor = quiz.lastPassed ? 'text-green-800' : 'text-blue-800';
    } else if (quiz.status === 'exhausted') {
      bgColor = 'bg-yellow-100';
      textColor = 'text-yellow-800';
    }
    else if (quiz.status === 'available') {
      bgColor = 'bg-yellow-100';
      textColor = 'text-yellow-800';
    }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
        {quiz.status === 'completed' ? (quiz.lastPassed ? 'completed' : 'completed') : 
         quiz.status === 'exhausted' ? 'Attempted' : 'Available'}
      </span>
    );
  };

  const getActionButton = (quiz: Quiz) => {
    if (quiz.status === 'completed') {
      return (
        <button
          className="px-4 py-2 bg-gray-500 text-white rounded-md text-sm font-medium transition-colors"
        >
          Attempted
        </button>
      );
    }

    if (quiz.status === 'exhausted') {
      return (
        <button 
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium cursor-not-allowed"
          disabled
        >
          No Attempts Left
        </button>
      );
    }

    return (
      <button
        onClick={() => router.push(`/quiz/${quiz.id}`)}
        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        {quiz.attemptCount > 0 ? 'Retake Quiz' : 'Start Quiz'}
      </button>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading available quizzes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
          <div className="text-red-500 mb-4">
            <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M6.938 4h10.124c1.54 0 2.502 1.667 1.732 2.5L13.732 20c-.77.833-1.732.833-2.5 0L4.268 6.5C3.498 5.667 4.46 4 6.938 4z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Error Loading Quizzes</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => fetchAvailableQuizzes(student?.id || 0)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50  md:p-20 py-14 ">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-3 mb-4 ">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">Quiz Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome, {student?.name}</p>
            </div>
            
          </div>
        </div>

        {/* Quiz List */}
        {quizzes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 md:p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Quizzes Available</h3>
            <p className="text-gray-600 max-w-md mx-auto">There are currently no active quizzes available for you to take.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:gap-6">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-lg md:text-xl font-semibold text-gray-800">{quiz.title}</h3>
                        <div className="md:ml-4">
                          {getQuizStatusBadge(quiz)}
                        </div>
                      </div>
                      {quiz.description && (
                        <p className="text-gray-600 mt-2 text-sm md:text-base">{quiz.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Quiz Metrics - Responsive Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-gray-50 p-2 md:p-3 rounded-md">
                      <p className="text-xs md:text-sm font-medium text-gray-500">Duration</p>
                      <p className="text-base md:text-lg font-semibold text-gray-800">{formatDuration(quiz.timeLimit)}</p>
                    </div>
                    
                    <div className="bg-gray-50 p-2 md:p-3 rounded-md">
                      <p className="text-xs md:text-sm font-medium text-gray-500">Max Attempts</p>
                      <p className="text-base md:text-lg font-semibold text-gray-800">{quiz.maxAttempts}</p>
                    </div>
                   
                  </div>

                  {/* Availability Dates */}
                  {(quiz.validFrom || quiz.validUntil) && (
                    <div className="mb-4 text-xs md:text-sm text-gray-600 space-y-1">
                      {quiz.validFrom && <p>Available from: {formatDate(quiz.validFrom)}</p>}
                      {quiz.validUntil && <p>Available until: {formatDate(quiz.validUntil)}</p>}
                    </div>
                  )}

                  {/* Status and Action Button */}
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mt-4">
                    <div className="text-xs md:text-sm text-gray-500">
                      {quiz.status === 'completed' ? (
                        <span>Attempted: {quiz.attemptCount} time(s)</span>
                      ) : quiz.status === 'exhausted' ? (
                        <span className="text-red-500">No more attempts available</span>
                      ) : quiz.attemptCount > 0 ? (
                        <span>{quiz.attemptCount} attempt(s) used</span>
                      ) : (
                        <span className="text-green-600">Ready to take</span>
                      )}
                    </div>
                    
                    {getActionButton(quiz)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}