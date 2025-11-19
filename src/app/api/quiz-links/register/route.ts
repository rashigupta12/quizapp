// app/api/quiz-links/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db from '@/db';
import { students, quizLinks, quizLinkAttempts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, token } = await request.json();

    // Validate input
    if (!name || !email || !phone || !token) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate phone (10 digits)
    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
      return NextResponse.json(
        { error: 'Phone number must be exactly 10 digits' },
        { status: 400 }
      );
    }

    // Find quiz link
    const [quizLink] = await db
      .select()
      .from(quizLinks)
      .where(eq(quizLinks.token, token))
      .limit(1);

    if (!quizLink) {
      return NextResponse.json(
        { error: 'Invalid quiz link' },
        { status: 404 }
      );
    }

    // Check if student exists, if not create
    let student;
    const [existingStudent] = await db
      .select()
      .from(students)
      .where(eq(students.email, email))
      .limit(1);

    if (existingStudent) {
      student = existingStudent;
      
      // Update phone if different
      if (existingStudent.phone !== phone) {
        const [updatedStudent] = await db
          .update(students)
          .set({ phone, name })
          .where(eq(students.id, existingStudent.id))
          .returning();
        student = updatedStudent;
      }
    } else {
      // Create new student
      const [newStudent] = await db
        .insert(students)
        .values({ name, email, phone })
        .returning();
      student = newStudent;
    }

    // Check if student has already accessed this quiz link
    const [existingLinkAttempt] = await db
      .select()
      .from(quizLinkAttempts)
      .where(
        and(
          eq(quizLinkAttempts.quizLinkId, quizLink.id),
          eq(quizLinkAttempts.studentId, student.id)
        )
      )
      .limit(1);

    if (existingLinkAttempt) {
      return NextResponse.json(
        { 
          error: 'You have already attempted this quiz',
          hasAttempted: true,
          student 
        },
        { status: 403 }
      );
    }

    // Get IP and user agent for tracking
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create quiz link attempt record (without attemptId yet)
    const [linkAttempt] = await db
      .insert(quizLinkAttempts)
      .values({
        quizLinkId: quizLink.id,
        studentId: student.id,
        quizId: quizLink.quizId,
        ipAddress,
        userAgent,
      })
      .returning();

    // Increment used count
await db
  .update(quizLinks)
  .set({ 
    usedCount: (quizLink.usedCount ?? 0) + 1,
    lastAccessedAt: new Date()
  })
  .where(eq(quizLinks.id, quizLink.id));


    return NextResponse.json({
      success: true,
      student,
      quizId: quizLink.quizId,
      linkAttemptId: linkAttempt.id,
    });
  } catch (error) {
    console.error('Register via link error:', error);
    return NextResponse.json(
      { error: 'Failed to register. Please try again.' },
      { status: 500 }
    );
  }
}