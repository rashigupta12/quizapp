// app/api/admin/quizzes/[id]/generate-link/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import crypto from 'crypto';
import db from '@/db';
import { quizLinks, quizzes } from '@/db/schema';
import { eq } from 'drizzle-orm';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

async function verifyAuth(request: NextRequest) {
  try {
    const token = request.cookies.get('admin-token')?.value;
    if (!token) return null;
    
    const verified = await jwtVerify(token, secret);
    return verified.payload;
  } catch {
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const adminPayload = await verifyAuth(request);
    if (!adminPayload) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const quizId = parseInt(params.id);
    
    // Verify quiz exists
    const [quiz] = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, quizId))
      .limit(1);

    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }

    // Parse optional parameters from request body
    const body = await request.json().catch(() => ({}));
    const { expiresAt, maxUses } = body;

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Create quiz link
    const [quizLink] = await db
      .insert(quizLinks)
      .values({
        quizId,
        token,
        createdBy: adminPayload.userId as number,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxUses: maxUses || null,
        isActive: true,
        usedCount: 0,
      })
      .returning();

    // Generate full URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const fullUrl = `${baseUrl}/q/${token}`;

    return NextResponse.json({
      success: true,
      link: {
        id: quizLink.id,
        token: quizLink.token,
        url: fullUrl,
        quizId: quizLink.quizId,
        createdAt: quizLink.createdAt,
        expiresAt: quizLink.expiresAt,
        maxUses: quizLink.maxUses,
        isActive: quizLink.isActive,
      },
    });
  } catch (error) {
    console.error('Generate link error:', error);
    return NextResponse.json(
      { error: 'Failed to generate quiz link' },
      { status: 500 }
    );
  }
}

// GET - Fetch all links for a quiz
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminPayload = await verifyAuth(request);
    if (!adminPayload) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const quizId = parseInt(params.id);

    const links = await db
      .select()
      .from(quizLinks)
      .where(eq(quizLinks.quizId, quizId))
      .orderBy(quizLinks.createdAt);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    const linksWithUrls = links.map(link => ({
      ...link,
      url: `${baseUrl}/q/${link.token}`,
    }));

    return NextResponse.json({
      success: true,
      links: linksWithUrls,
    });
  } catch (error) {
    console.error('Fetch links error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quiz links' },
      { status: 500 }
    );
  }
}