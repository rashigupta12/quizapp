// app/api/attempts/complete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db from '@/db';
import { attempts, quizLinkAttempts } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { 
      attemptId, 
      score, 
      totalQuestions, 
      correctAnswers, 
      passed, 
      timeSpent,
      linkAttemptId // Optional: only present for link-based attempts
    } = await request.json();

    if (!attemptId) {
      return NextResponse.json(
        { error: 'Attempt ID is required' },
        { status: 400 }
      );
    }

    // Update the attempt record
    const [updatedAttempt] = await db
      .update(attempts)
      .set({
        status: 'completed',
        score,
        totalQuestions,
        correctAnswers,
        passed,
        timeSpent,
        completedAt: new Date(),
      })
      .where(eq(attempts.id, attemptId))
      .returning();

    if (!updatedAttempt) {
      return NextResponse.json(
        { error: 'Attempt not found' },
        { status: 404 }
      );
    }

    // If this was a link-based attempt, update the quiz_link_attempts table
    if (linkAttemptId) {
      await db
        .update(quizLinkAttempts)
        .set({ attemptId: attemptId })
        .where(eq(quizLinkAttempts.id, linkAttemptId));
    }

    return NextResponse.json({
      success: true,
      attemptId: updatedAttempt.id,
      score: updatedAttempt.score,
      passed: updatedAttempt.passed,
    });
  } catch (error) {
    console.error('Complete attempt error:', error);
    return NextResponse.json(
      { error: 'Failed to complete quiz attempt' },
      { status: 500 }
    );
  }
}