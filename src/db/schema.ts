// db/schema.ts - Enhanced schema with time-based quiz validity and single attempts

import { InferModel, relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  json,
  unique
} from 'drizzle-orm/pg-core';

// --- STUDENTS (Only name & email) ---
export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export type Student = InferModel<typeof students>;
export type NewStudent = InferModel<typeof students, 'insert'>;

// --- INTERNSHIP OFFERS (Tracks sent offers) ---
export const internshipOffers = pgTable('internship_offers', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').notNull().references(() => students.id),
  email: varchar('email', { length: 100 }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(), // Base64 encoded token
  sentAt: timestamp('sent_at').defaultNow(),
  expiresAt: timestamp('expires_at').notNull(), // 2 days from sent
  status: varchar('status', { length: 50 }).default('sent'), // sent, accepted, expired
  acceptedAt: timestamp('accepted_at'),
});

export type InternshipOffer = InferModel<typeof internshipOffers>;
export type NewInternshipOffer = InferModel<typeof internshipOffers, 'insert'>;

// --- INTERNSHIP ACCEPTANCES (Student acceptance details) ---
export const internshipAcceptances = pgTable('internship_acceptances', {
  id: serial('id').primaryKey(),
  offerId: integer('offer_id').notNull().references(() => internshipOffers.id),
  studentId: integer('student_id').notNull().references(() => students.id),
  phone: varchar('phone', { length: 20 }).notNull(),
  fatherName: varchar('father_name', { length: 100 }).notNull(),
  permanentAddress: text('permanent_address').notNull(),
  resumeUrl: varchar('resume_url', { length: 500 }).notNull(),
  submittedAt: timestamp('submitted_at').defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
});

export type InternshipAcceptance = InferModel<typeof internshipAcceptances>;
export type NewInternshipAcceptance = InferModel<typeof internshipAcceptances, 'insert'>;

// --- QUIZZES (Tests with time validity) ---
export const quizzes = pgTable('quizzes', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 100 }).notNull(),
  description: text('description'),
  
  // Quiz timing
  timeLimit: integer('time_limit').notNull(), // Minutes to complete quiz
  validFrom: timestamp('valid_from'), // When quiz becomes available
  validUntil: timestamp('valid_until'), // When quiz expires (e.g., 2 days)
  
  // Quiz settings
  passingScore: integer('passing_score').default(70), // Percentage (e.g., 70%)
  maxAttempts: integer('max_attempts').default(1), // Usually 1 for single attempt
  isActive: boolean('is_active').default(true), // Admin can disable manually
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: integer('created_by').references(() => admins.id),
});

export type Quiz = InferModel<typeof quizzes>;
export type NewQuiz = InferModel<typeof quizzes, 'insert'>;

// --- QUESTIONS (For quizzes) ---
export const questions = pgTable('questions', {
  id: serial('id').primaryKey(),
  quizId: integer('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  options: text('options').notNull(), // JSON or comma-separated (e.g., "A,B,C,D")
  correctAnswer: varchar('correct_answer').notNull(), // Index: 0, 1, 2, 3
  order: integer('order').default(0),
});

export type Question = InferModel<typeof questions>;
export type NewQuestion = InferModel<typeof questions, 'insert'>;

// --- ATTEMPTS (Student test attempts) ---
export const attempts = pgTable('attempts', {
  id: serial('id').primaryKey(),
  quizId: integer('quiz_id').notNull().references(() => quizzes.id),
  studentId: integer('student_id').notNull().references(() => students.id),
  
  // Attempt tracking
  attemptNumber: integer('attempt_number').default(1), // Usually 1 since max_attempts is 1
  status: varchar('status', { length: 20 }).default('in_progress'), // in_progress, completed, abandoned
  
  // Scoring
  score: integer('score'), // Percentage (e.g., 85%)
  totalQuestions: integer('total_questions'),
  correctAnswers: integer('correct_answers'),
  passed: boolean('passed'), // True if score >= passingScore
  
  // Timing
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  timeSpent: integer('time_spent'), // Time spent in seconds
  
  // Security
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
});

export type Attempt = InferModel<typeof attempts>;
export type NewAttempt = InferModel<typeof attempts, 'insert'>;

// --- RESPONSES (Individual question responses) ---
export const responses = pgTable('responses', {
  id: serial('id').primaryKey(),
  attemptId: integer('attempt_id').notNull().references(() => attempts.id, { onDelete: 'cascade' }),
  questionId: integer('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
 selectedAnswer: varchar('selected_answer', { length: 1 }), // e.g., "A", "B", "C", "D"
  isCorrect: boolean('is_correct').notNull(),
  timeSpent: integer('time_spent'), // Time spent on this question in seconds
  answeredAt: timestamp('answered_at').defaultNow(),
});

export type Response = InferModel<typeof responses>;
export type NewResponse = InferModel<typeof responses, 'insert'>;

// --- STUDENT QUIZ STATUS (Track which quizzes student has taken/can take) ---
export const studentQuizStatus = pgTable('student_quiz_status', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').notNull().references(() => students.id),
  quizId: integer('quiz_id').notNull().references(() => quizzes.id),
  
  // Status tracking
  status: varchar('status', { length: 20 }).default('available'), // available, in_progress, completed, disabled
  attemptsUsed: integer('attempts_used').default(0),
  
  // Timestamps
  firstAccessedAt: timestamp('first_accessed_at'),
  lastAccessedAt: timestamp('last_accessed_at'),
  completedAt: timestamp('completed_at'),
  
  // Make sure one record per student-quiz combination
}, (table) => ({
  // Unique constraint to ensure one record per student-quiz
  unique: {
    studentQuiz: [table.studentId, table.quizId]
  }
}));

export type StudentQuizStatus = InferModel<typeof studentQuizStatus>;
export type NewStudentQuizStatus = InferModel<typeof studentQuizStatus, 'insert'>;

// --- ADMIN (For managing quizzes) ---
export const admins = pgTable('admin_users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(), // hashed password
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  role: varchar('role', { length: 50 }).default('admin'), // admin, super_admin, moderator
  isActive: boolean('is_active').default(true),
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type Admin = InferModel<typeof admins>;
export type NewAdmin = InferModel<typeof admins, 'insert'>;

// --- EMAIL CAMPAIGNS (For tracking internship offers) ---
export const emailCampaigns = pgTable('email_campaigns', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  content: text('content').notNull(),
  recipientEmails: json('recipient_emails').notNull(), // Array of email addresses
  sentAt: timestamp('sent_at').defaultNow(),
  sentBy: integer('sent_by').references(() => admins.id),
  status: varchar('status', { length: 50 }).default('sent'), // sent, failed, pending
});

export type EmailCampaign = InferModel<typeof emailCampaigns>;
export type NewEmailCampaign = InferModel<typeof emailCampaigns, 'insert'>;

export const quizLinks = pgTable('quiz_links', {
  id: serial('id').primaryKey(),
  quizId: integer('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 64 }).notNull().unique(), // Unique URL token
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: integer('created_by').references(() => admins.id),
  expiresAt: timestamp('expires_at'), // Optional expiration
  
  // Status tracking
  isActive: boolean('is_active').default(true),
  maxUses: integer('max_uses'), // Optional: limit number of students who can use this link
  usedCount: integer('used_count').default(0), // Track how many times link was used
  
  // Analytics
  lastAccessedAt: timestamp('last_accessed_at'),
});

export type QuizLink = InferModel<typeof quizLinks>;
export type NewQuizLink = InferModel<typeof quizLinks, 'insert'>;

export const quizLinkAttempts = pgTable('quiz_link_attempts', {
  id: serial('id').primaryKey(),
  quizLinkId: integer('quiz_link_id').notNull().references(() => quizLinks.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull().references(() => students.id),
  quizId: integer('quiz_id').notNull().references(() => quizzes.id),
  
  // Tracking
  accessedAt: timestamp('accessed_at').defaultNow(),
  attemptId: integer('attempt_id').references(() => attempts.id), // Link to actual quiz attempt
  
  // Security
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
}, (table) => ({
  // Ensure one student can only use a specific quiz link once
  uniqueStudentLink: unique().on(table.quizLinkId, table.studentId)
}));

export type QuizLinkAttempt = InferModel<typeof quizLinkAttempts>;
export type NewQuizLinkAttempt = InferModel<typeof quizLinkAttempts, 'insert'>;

// ===== RELATIONS ===== //

export const quizLinksRelations = relations(quizLinks, ({ one, many }) => ({
  quiz: one(quizzes, {
    fields: [quizLinks.quizId],
    references: [quizzes.id],
  }),
  createdByAdmin: one(admins, {
    fields: [quizLinks.createdBy],
    references: [admins.id],
  }),
  linkAttempts: many(quizLinkAttempts),
}));

export const quizLinkAttemptsRelations = relations(quizLinkAttempts, ({ one }) => ({
  quizLink: one(quizLinks, {
    fields: [quizLinkAttempts.quizLinkId],
    references: [quizLinks.id],
  }),
  student: one(students, {
    fields: [quizLinkAttempts.studentId],
    references: [students.id],
  }),
  quiz: one(quizzes, {
    fields: [quizLinkAttempts.quizId],
    references: [quizzes.id],
  }),
  attempt: one(attempts, {
    fields: [quizLinkAttempts.attemptId],
    references: [attempts.id],
  }),
}));

export const studentsRelations = relations(students, ({ many }) => ({
  attempts: many(attempts),
  internshipOffers: many(internshipOffers),
  internshipAcceptances: many(internshipAcceptances),
  quizStatuses: many(studentQuizStatus),
}));

export const internshipOffersRelations = relations(internshipOffers, ({ one }) => ({
  student: one(students, {
    fields: [internshipOffers.studentId],
    references: [students.id],
  }),
  acceptance: one(internshipAcceptances, {
    fields: [internshipOffers.id],
    references: [internshipAcceptances.offerId],
  }),
}));

export const internshipAcceptancesRelations = relations(internshipAcceptances, ({ one }) => ({
  offer: one(internshipOffers, {
    fields: [internshipAcceptances.offerId],
    references: [internshipOffers.id],
  }),
  student: one(students, {
    fields: [internshipAcceptances.studentId],
    references: [students.id],
  }),
}));

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  questions: many(questions),
  attempts: many(attempts),
  studentStatuses: many(studentQuizStatus),
  quizLinks: many(quizLinks), // Add this line
  createdByAdmin: one(admins, {
    fields: [quizzes.createdBy],
    references: [admins.id],
  }),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  quiz: one(quizzes, {
    fields: [questions.quizId],
    references: [quizzes.id],
  }),
  responses: many(responses),
}));

export const attemptsRelations = relations(attempts, ({ one, many }) => ({
  quiz: one(quizzes, {
    fields: [attempts.quizId],
    references: [quizzes.id],
  }),
  student: one(students, {
    fields: [attempts.studentId],
    references: [students.id],
  }),
  responses: many(responses),
}));

export const responsesRelations = relations(responses, ({ one }) => ({
  attempt: one(attempts, {
    fields: [responses.attemptId],
    references: [attempts.id],
  }),
  question: one(questions, {
    fields: [responses.questionId],
    references: [questions.id],
  }),
}));

export const studentQuizStatusRelations = relations(studentQuizStatus, ({ one }) => ({
  student: one(students, {
    fields: [studentQuizStatus.studentId],
    references: [students.id],
  }),
  quiz: one(quizzes, {
    fields: [studentQuizStatus.quizId],
    references: [quizzes.id],
  }),
}));

export const adminsRelations = relations(admins, ({ many }) => ({
  emailCampaigns: many(emailCampaigns),
  createdQuizzes: many(quizzes),
}));

export const emailCampaignsRelations = relations(emailCampaigns, ({ one }) => ({
  sentByAdmin: one(admins, {
    fields: [emailCampaigns.sentBy],
    references: [admins.id],
  }),
}));