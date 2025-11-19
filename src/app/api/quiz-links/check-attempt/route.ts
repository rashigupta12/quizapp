// app/api/quiz-links/check-attempt/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db from '@/db';
import { quizLinkAttempts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { studentId, quizId } = await request.json();

    if (!studentId || !quizId) {
      return NextResponse.json(
        { error: 'Student ID and Quiz ID are required' },
        { status: 400 }
      );
    }

    // Check if student has attempted this quiz via any link
    const attempts = await db
      .select()
      .from(quizLinkAttempts)
      .where(
        and(
          eq(quizLinkAttempts.studentId, studentId),
          eq(quizLinkAttempts.quizId, quizId)
        )
      );

    return NextResponse.json({
      hasAttempted: attempts.length > 0,
      attemptCount: attempts.length,
    });
  } catch (error) {
    console.error('Check attempt error:', error);
    return NextResponse.json(
      { error: 'Failed to check attempt status' },
      { status: 500 }
    );
  }
}