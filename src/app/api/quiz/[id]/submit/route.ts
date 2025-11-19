// app/api/quiz/[id]/submit/route.ts - Modified to update link attempt
import { NextRequest, NextResponse } from 'next/server';
import db from '@/db';
import { attempts, responses, quizLinkAttempts } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quizId = parseInt(params.id);
    const body = await request.json();
    const { studentId, answers, timeSpent } = body;

    // Create attempt record
    const [attempt] = await db
      .insert(attempts)
      .values({
        quizId,
        studentId,
        status: 'completed',
        completedAt: new Date(),
        timeSpent,
        // ... other attempt fields
      })
      .returning();

    // Save responses
    for (const answer of answers) {
      await db.insert(responses).values({
        attemptId: attempt.id,
        questionId: answer.questionId,
        selectedAnswer: answer.selectedAnswer,
        isCorrect: answer.isCorrect,
        timeSpent: answer.timeSpent,
      });
    }

    // Check if this was a link-based attempt
    const linkAttemptId = localStorage.getItem('linkAttemptId');
    if (linkAttemptId) {
      // Update the quiz link attempt with the actual attempt ID
      await db
        .update(quizLinkAttempts)
        .set({ attemptId: attempt.id })
        .where(eq(quizLinkAttempts.id, parseInt(linkAttemptId)));

      // Clear link-based data
      localStorage.removeItem('quizLinkQuizId');
      localStorage.removeItem('linkAttemptId');
    }

    return NextResponse.json({
      success: true,
      attempt,
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    return NextResponse.json(
      { error: 'Failed to submit quiz' },
      { status: 500 }
    );
  }
}