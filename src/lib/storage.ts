// lib/storage.ts - Updated with link tracking and result storage
export const storage = {
  // Student data
  setStudent: (student: any) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('student', JSON.stringify(student));
    }
  },

  getStudent: () => {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem('student');
      return data ? JSON.parse(data) : null;
    }
    return null;
  },

  clearStudent: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('student');
    }
  },

  // Quiz link tracking
  setQuizLinkData: (quizId: number, linkAttemptId: number) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('quizLinkQuizId', quizId.toString());
      localStorage.setItem('linkAttemptId', linkAttemptId.toString());
    }
  },

  getQuizLinkData: () => {
    if (typeof window !== 'undefined') {
      const quizId = localStorage.getItem('quizLinkQuizId');
      const linkAttemptId = localStorage.getItem('linkAttemptId');
      
      if (quizId && linkAttemptId) {
        return {
          quizId: parseInt(quizId),
          linkAttemptId: parseInt(linkAttemptId),
        };
      }
    }
    return null;
  },

  isLinkBasedAccess: () => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('quizLinkQuizId');
    }
    return false;
  },

  clearQuizLinkData: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('quizLinkQuizId');
      localStorage.removeItem('linkAttemptId');
    }
  },

  // Quiz result storage
  setResult: (result: any) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('quizResult', JSON.stringify(result));
    }
  },

  getResult: () => {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem('quizResult');
      return data ? JSON.parse(data) : null;
    }
    return null;
  },

  clearResult: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('quizResult');
    }
  },

  // Complete cleanup
  clearAll: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('student');
      localStorage.removeItem('quizLinkQuizId');
      localStorage.removeItem('linkAttemptId');
      localStorage.removeItem('quizResult');
    }
  },
};