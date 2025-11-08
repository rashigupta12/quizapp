import { NextRequest, NextResponse } from 'next/server';
import  db  from '@/db';
import { attempts, responses, studentQuizStatus } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { studentId, quizId } = await req.json();

    if (!studentId || !quizId) {
      return NextResponse.json(
        { error: 'Student ID and Quiz ID are required' },
        { status: 400 }
      );
    }

    const existingAttempts = await db
      .select()
      .from(attempts)
      .where(
        and(
          eq(attempts.studentId, studentId),
          eq(attempts.quizId, quizId)
        )
      );

    if (existingAttempts.length === 0) {
      return NextResponse.json(
        { error: 'No attempt found for this student and quiz' },
        { status: 404 }
      );
    }

    const latestAttempt = existingAttempts[existingAttempts.length - 1];

    await db
      .delete(responses)
      .where(eq(responses.attemptId, latestAttempt.id));

    await db
      .delete(attempts)
      .where(eq(attempts.id, latestAttempt.id));

    const statusRecords = await db
      .select()
      .from(studentQuizStatus)
      .where(
        and(
          eq(studentQuizStatus.studentId, studentId),
          eq(studentQuizStatus.quizId, quizId)
        )
      );

    if (statusRecords.length > 0) {
      await db
        .update(studentQuizStatus)
        .set({
          status: 'available',
          attemptsUsed: 0,
          completedAt: null,
          lastAccessedAt: null,
        })
        .where(
          and(
            eq(studentQuizStatus.studentId, studentId),
            eq(studentQuizStatus.quizId, quizId)
          )
        );
    }

    return NextResponse.json({
      success: true,
      message: 'Test has been reset successfully',
    });
  } catch (error) {
    console.error('Error resetting test:', error);
    return NextResponse.json(
      { error: 'Failed to reset test' },
      { status: 500 }
    );
  }
}