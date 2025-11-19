// app/api/quiz-links/validate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db from '@/db';
import { quizLinks, quizzes, quizLinkAttempts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { token, studentId } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required', valid: false },
        { status: 400 }
      );
    }

    // Find quiz link by token
    const [quizLink] = await db
      .select()
      .from(quizLinks)
      .where(eq(quizLinks.token, token))
      .limit(1);

    if (!quizLink) {
      return NextResponse.json(
        { error: 'Invalid quiz link', valid: false },
        { status: 404 }
      );
    }

    // Check if link is active
    if (!quizLink.isActive) {
      return NextResponse.json(
        { error: 'This quiz link has been deactivated', valid: false },
        { status: 403 }
      );
    }

    // Check if link has expired
    if (quizLink.expiresAt && new Date(quizLink.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'This quiz link has expired', valid: false },
        { status: 403 }
      );
    }

    // Check if max uses reached (handle null values)
    const currentUsedCount = quizLink.usedCount ?? 0;
    if (quizLink.maxUses && currentUsedCount >= quizLink.maxUses) {
      return NextResponse.json(
        { error: 'This quiz link has reached its maximum usage limit', valid: false },
        { status: 403 }
      );
    }

    // Get quiz details
    const [quiz] = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, quizLink.quizId))
      .limit(1);

    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found', valid: false },
        { status: 404 }
      );
    }

    // Check if quiz is active
    if (!quiz.isActive) {
      return NextResponse.json(
        { error: 'This quiz is currently inactive', valid: false },
        { status: 403 }
      );
    }

    // Check quiz validity dates
    const now = new Date();
    if (quiz.validFrom && new Date(quiz.validFrom) > now) {
      return NextResponse.json(
        { error: 'This quiz is not yet available', valid: false },
        { status: 403 }
      );
    }

    if (quiz.validUntil && new Date(quiz.validUntil) < now) {
      return NextResponse.json(
        { error: 'This quiz has expired', valid: false },
        { status: 403 }
      );
    }

    // If student ID is provided, check if they've already attempted this quiz via this link
    let hasAttempted = false;
    if (studentId) {
      const [existingAttempt] = await db
        .select()
        .from(quizLinkAttempts)
        .where(
          and(
            eq(quizLinkAttempts.quizLinkId, quizLink.id),
            eq(quizLinkAttempts.studentId, studentId)
          )
        )
        .limit(1);

      hasAttempted = !!existingAttempt;
    }

    // Update last accessed timestamp
    await db
      .update(quizLinks)
      .set({ lastAccessedAt: new Date() })
      .where(eq(quizLinks.id, quizLink.id));

    return NextResponse.json({
      valid: true,
      hasAttempted,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        timeLimit: quiz.timeLimit,
        passingScore: quiz.passingScore,
      },
      quizLink: {
        id: quizLink.id,
        maxUses: quizLink.maxUses,
        usedCount: currentUsedCount,
        expiresAt: quizLink.expiresAt,
      },
    });
  } catch (error) {
    console.error('Validate token error:', error);
    return NextResponse.json(
      { error: 'Failed to validate quiz link', valid: false },
      { status: 500 }
    );
  }
}