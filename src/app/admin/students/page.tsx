"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Briefcase,
  Calendar,
  CheckCircle,
  DollarSign,
  Download,
  FileText,
  Filter,
  GraduationCap,
  Percent,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  formatDate,
  formatSubmissionTime,
  generatePDFBlob,
  generateWordBlob,
  loadLibraries,
} from "./helper";

interface Attempt {
  id: number;
  quizId: number;
  quizTitle: string;
  score: number;
  passed: boolean;
  completedAt: string; // This already exists - it's the submission timestamp
  startedAt?: string; // Add this if you want to show start time too
  timeSpent?: number; // Add this if you want to show duration
}

interface Student {
  id: number;
  name: string;
  email: string;
  phone: string;
  attempts: Attempt[];
}

interface Quiz {
  id: number;
  title: string;
  description: string;
  isActive: boolean;
}

interface DocumentConfig {
  joiningDate: string;
  timePeriod: string;
  issueDate: string;
  endDate: string;
  stipend: string;
  designation: string;
}

type FilterType = "all" | "passed" | "failed" | "no-attempts";
type ScoreFilterType = "all" | "50" | "75" | "90";
type DocType = "pdf" | "word";

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [scoreFilter, setScoreFilter] = useState<ScoreFilterType>("all");
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [showDocPanel, setShowDocPanel] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [generatingDocs, setGeneratingDocs] = useState(false);
  const [docType, setDocType] = useState<DocType>("pdf");
  const [documentConfig, setDocumentConfig] = useState<DocumentConfig>({
    joiningDate: "2025-07-22",
    timePeriod: "2 months",
    issueDate: new Date().toISOString().split("T")[0],
    endDate: "2025-09-21",
    stipend: "2000",
    designation: "FullStack Intern",
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedQuizId === null) {
      setStudents(allStudents);
    } else {
      const filteredByQuiz = allStudents.filter((student) =>
        student.attempts.some((attempt) => attempt.quizId === selectedQuizId)
      );
      setStudents(filteredByQuiz);
    }
    setSelectedEmails([]);
  }, [selectedQuizId, allStudents]);

  const fetchInitialData = async () => {
    try {
      const [studentsResponse, quizzesResponse] = await Promise.all([
        fetch("/api/admin/students"),
        fetch("/api/admin/quizzes"),
      ]);

      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json();
        setAllStudents(studentsData.students);
        setStudents(studentsData.students);
      }

      if (quizzesResponse.ok) {
        const quizzesData = await quizzesResponse.json();
        setQuizzes(quizzesData.quizzes || []);
      }
    } catch (error) {
      console.error("Failed to fetch initial data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStudentBestScore = (student: Student) => {
    if (student.attempts.length === 0) return null;
    const relevantAttempts = selectedQuizId
      ? student.attempts.filter((attempt) => attempt.quizId === selectedQuizId)
      : student.attempts;

    if (relevantAttempts.length === 0) return null;
    return Math.max(...relevantAttempts.map((attempt) => attempt.score));
  };

  // Get the most recent submission timestamp for a student
  const getLastSubmissionTime = (student: Student): string | null => {
    const relevantAttempts = selectedQuizId
      ? student.attempts.filter((attempt) => attempt.quizId === selectedQuizId)
      : student.attempts;

    if (relevantAttempts.length === 0) return null;

    // Sort by completedAt descending and get the most recent
    const sortedAttempts = [...relevantAttempts].sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );

    return sortedAttempts[0].completedAt;
  };

  // Get time spent on the test
  const getTimeSpent = (student: Student): string | null => {
    const relevantAttempts = selectedQuizId
      ? student.attempts.filter((attempt) => attempt.quizId === selectedQuizId)
      : student.attempts;

    if (relevantAttempts.length === 0) return null;

    const bestAttempt = relevantAttempts.reduce((best, current) =>
      current.score > (best?.score || -1) ? current : best
    );

    return bestAttempt.timeSpent
      ? `${Math.ceil(bestAttempt.timeSpent / 60)}m`
      : "N/A";
  };

  const getStudentStatus = (student: Student) => {
    const relevantAttempts = selectedQuizId
      ? student.attempts.filter((attempt) => attempt.quizId === selectedQuizId)
      : student.attempts;

    if (relevantAttempts.length === 0) return "No Attempts";
    return relevantAttempts.some((attempt) => attempt.passed) ? "Pass" : "Fail";
  };

  const filteredStudents = useMemo(() => {
    let filtered = students;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (student) =>
          student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (filterType !== "all") {
      filtered = filtered.filter((student) => {
        const relevantAttempts = selectedQuizId
          ? student.attempts.filter(
              (attempt) => attempt.quizId === selectedQuizId
            )
          : student.attempts;

        switch (filterType) {
          case "passed":
            return relevantAttempts.some((attempt) => attempt.passed);
          case "failed":
            return (
              relevantAttempts.length > 0 &&
              !relevantAttempts.some((attempt) => attempt.passed)
            );
          case "no-attempts":
            return relevantAttempts.length === 0;
          default:
            return true;
        }
      });
    }

    // Apply score filter
    if (scoreFilter !== "all") {
      filtered = filtered.filter((student) => {
        const bestScore = getStudentBestScore(student);
        if (bestScore === null) return false;

        const threshold = parseInt(scoreFilter);
        return bestScore >= threshold;
      });
    }

    return filtered;
  }, [students, searchTerm, filterType, scoreFilter, selectedQuizId]);

  const exportToCSV = () => {
    const selectedQuizTitle = selectedQuizId
      ? quizzes.find((q) => q.id === selectedQuizId)?.title || "Unknown Quiz"
      : "All Quizzes";

    // Helper function to get all attempts information
    const getAttemptsInfo = (student: Student) => {
      const relevantAttempts = selectedQuizId
        ? student.attempts.filter(
            (attempt) => attempt.quizId === selectedQuizId
          )
        : student.attempts;

      if (relevantAttempts.length === 0) {
        return {
          lastSubmissionDate: "N/A",
          lastSubmissionTime: "N/A",
          timeSpent: "N/A",
          totalAttempts: "0",
          bestScore: "N/A",
        };
      }

      // Sort by completion date to get the most recent
      const sortedAttempts = [...relevantAttempts].sort(
        (a, b) =>
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );

      const lastAttempt = sortedAttempts[0];
      const date = new Date(lastAttempt.completedAt);

      return {
        lastSubmissionDate: date.toLocaleDateString("en-GB"),
        lastSubmissionTime: date.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
        timeSpent: lastAttempt.timeSpent
          ? `${Math.ceil(lastAttempt.timeSpent / 60)}m`
          : "N/A",
        totalAttempts: relevantAttempts.length.toString(),
        bestScore: getStudentBestScore(student) + "%",
      };
    };

    const headers = [
      "S.No",
      "Name",
      "Email",
      "Phone",
      "Best Score",
      "Status",
      "Total Attempts",
      "Submission Date",
      "Submission Time",
      "Quiz",
    ];

    const csvContent = [
      headers.join(","),
      ...filteredStudents.map((student, index) => {
        const status = getStudentStatus(student);
        const attemptsInfo = getAttemptsInfo(student);

        return [
          index + 1,
          `"${student.name}"`,
          `"${student.email}"`,
          `"${student.phone || "N/A"}"`,
          attemptsInfo.bestScore,
          status,
          attemptsInfo.totalAttempts,
          `"${attemptsInfo.lastSubmissionDate}"`,
          `"${attemptsInfo.lastSubmissionTime}"`,
          `"${selectedQuizTitle}"`,
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `students_${selectedQuizTitle.replace(/[^a-zA-Z0-9]/g, "_")}_${
        new Date().toISOString().split("T")[0]
      }.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleEmailSelection = (email: string) => {
    setSelectedEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const selectAllEmails = () => {
    const allEmails = filteredStudents.map((student) => student.email);
    setSelectedEmails(allEmails);
  };

  const clearEmailSelection = () => {
    setSelectedEmails([]);
  };
  const createZipWithDocuments = async (
    students: Student[],
    config: DocumentConfig
  ) => {
    try {
      const { JSZip } = await loadLibraries();
      if (!JSZip) throw new Error("JSZip library not loaded");

      const zip = new JSZip();

      for (const student of students) {
        try {
          let fileBlob: Blob;
          let fileName: string;

          if (docType === "pdf") {
            fileBlob = await generatePDFBlob(student, config);
            fileName = `Internship_Offer_Letter_${student.name.replace(
              /[^a-zA-Z0-9]/g,
              "_"
            )}.pdf`;
          } else {
            fileBlob = generateWordBlob(student, config);
            fileName = `Internship_Offer_Letter_${student.name.replace(
              /[^a-zA-Z0-9]/g,
              "_"
            )}.docx`; // Changed to .docx for compatibility
          }

          zip.file(fileName, fileBlob);
        } catch (error) {
          console.error(
            `Failed to generate document for ${student.name}:`,
            error
          );
          throw error;
        }
      }

      const readmeContent = `
    INTERNSHIP OFFER LETTERS - ${config.issueDate}
    
    Generated for ${students.length} student(s)
    
    Configuration:
    - Issue Date: ${formatDate(config.issueDate)}
    - Joining Date: ${formatDate(config.joiningDate)}
    - End Date: ${formatDate(config.endDate)}
    - Duration: ${config.timePeriod}
    - Stipend: Rs. ${config.stipend}
    - Position: ${config.designation}
    
    Generated on: ${new Date().toLocaleString()}
          `.trim();

      zip.file("README.txt", readmeContent);

      return await zip.generateAsync({ type: "blob" });
    } catch (error) {
      console.error("Failed to create ZIP file:", error);
      throw new Error("Failed to create ZIP file. Please try again.");
    }
  };

  const generateOfferLetterDocs = async () => {
    setGeneratingDocs(true);

    try {
      const selectedStudents = students.filter((student) =>
        selectedEmails.includes(student.email)
      );

      if (selectedStudents.length === 0) {
        alert("No students selected!");
        return;
      }

      if (selectedStudents.length === 1) {
        const student = selectedStudents[0];
        let fileBlob: Blob;
        let fileName: string;

        if (docType === "pdf") {
          fileBlob = await generatePDFBlob(student, documentConfig);
          fileName = `Internship_Offer_Letter_${student.name.replace(
            /[^a-zA-Z0-9]/g,
            "_"
          )}.pdf`;
        } else {
          fileBlob = generateWordBlob(student, documentConfig);
          fileName = `Internship_Offer_Letter_${student.name.replace(
            /[^a-zA-Z0-9]/g,
            "_"
          )}.docx`; // Changed to .docx
        }

        const url = URL.createObjectURL(fileBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const zipBlob = await createZipWithDocuments(
          selectedStudents,
          documentConfig
        );

        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Internship_Offer_Letters_${documentConfig.issueDate}.zip`;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      alert(
        `Offer letter documents generated successfully for ${selectedStudents.length} student(s)!`
      );
      setSelectedEmails([]);
      setShowDocPanel(false);
      setShowConfigPanel(false);
    } catch (error) {
      console.error("Failed to generate documents:", error);
      alert("Failed to generate documents. Please try again.");
    } finally {
      setGeneratingDocs(false);
    }
  };

  const handleConfigSubmit = () => {
    setShowConfigPanel(false);
    setShowDocPanel(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 px-4 sm:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
        <h1 className="text-xl sm:text-2xl font-bold">Student Management</h1>
        <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
          <Button
            onClick={() => setShowConfigPanel(true)}
            variant="outline"
            disabled={selectedEmails.length === 0}
            className="flex-1 sm:flex-none text-xs sm:text-sm"
          >
            <FileText className="w-4 h-4 mr-1 sm:mr-2" />
            Generate Docs ({selectedEmails.length})
          </Button>
          <Button
            onClick={exportToCSV}
            variant="outline"
            className="flex-1 sm:flex-none text-xs sm:text-sm"
          >
            <Download className="w-4 h-4 mr-1 sm:mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Quiz Filter */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex items-center space-x-2">
            <GraduationCap className="w-4 h-4 text-gray-400" />
            <label className="text-sm font-medium text-gray-700">
              Filter by Quiz:
            </label>
          </div>
          <select
            value={selectedQuizId || ""}
            onChange={(e) =>
              setSelectedQuizId(
                e.target.value ? parseInt(e.target.value) : null
              )
            }
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm flex-1 sm:flex-none min-w-[200px]"
          >
            <option value="">All Students (All Quizzes)</option>
            {quizzes.map((quiz) => (
              <option key={quiz.id} value={quiz.id}>
                {quiz.title}
              </option>
            ))}
          </select>
          {selectedQuizId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedQuizId(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
              Clear Filter
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm sm:text-base"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Students</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="no-attempts">No Attempts</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <Percent className="w-4 h-4 text-gray-400" />
            <select
              value={scoreFilter}
              onChange={(e) =>
                setScoreFilter(e.target.value as ScoreFilterType)
              }
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Scores</option>
              <option value="50">50% or above</option>
              <option value="75">75% or above</option>
              <option value="90">90% or above</option>
            </select>
          </div>
        </div>
      </div>

      {/* Display current filter info */}
      {selectedQuizId && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-800">
            <strong>Showing students for quiz:</strong>{" "}
            {quizzes.find((q) => q.id === selectedQuizId)?.title}
            <span className="ml-2 text-blue-600">
              ({filteredStudents.length} students)
            </span>
          </p>
        </div>
      )}

      {/* Students Table - Desktop */}
      <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
        {/* ===== HEADER ===== */}
        <div className="grid grid-cols-12 bg-gray-100 p-4 font-medium text-sm">
          <div className="col-span-1">
            <input
              type="checkbox"
              checked={
                selectedEmails.length === filteredStudents.length &&
                filteredStudents.length > 0
              }
              onChange={
                selectedEmails.length === filteredStudents.length
                  ? clearEmailSelection
                  : selectAllEmails
              }
              className="w-4 h-4"
            />
          </div>
          <div className="col-span-1">S.No</div>
          <div className="col-span-2">Name</div>
          <div className="col-span-3">Email</div> {/* Increased space */}
          <div className="col-span-2">Phone</div>
          <div className="col-span-1 text-center">Score</div>
          <div className="col-span-1 text-center">Status</div>
          <div className="col-span-1 text-center">Submitted</div>
        </div>

        {/* ===== NO STUDENT FOUND ===== */}
        {filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {selectedQuizId
              ? `No students found for the selected quiz ${
                  searchTerm || filterType !== "all" || scoreFilter !== "all"
                    ? "matching your criteria"
                    : ""
                }.`
              : searchTerm || filterType !== "all" || scoreFilter !== "all"
              ? "No students match your search criteria."
              : "No students found."}
          </div>
        ) : (
          /* ===== STUDENT ROWS ===== */
          filteredStudents.map((student, index) => {
            const bestScore = getStudentBestScore(student);
            const status = getStudentStatus(student);
            const isSelected = selectedEmails.includes(student.email);
            const lastSubmission = getLastSubmissionTime(student);

            return (
              <div
                key={student.id}
                className="grid grid-cols-12 p-4 items-center hover:bg-gray-50 border-b border-gray-200 text-sm"
              >
                {/* Checkbox */}
                <div className="col-span-1">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleEmailSelection(student.email)}
                    className="w-4 h-4"
                  />
                </div>

                {/* S.No */}
                <div className="col-span-1">{index + 1}</div>

                {/* Name */}
                <div className="col-span-2 font-medium truncate">
                  {student.name}
                </div>

                {/* Email */}
                <div className="col-span-3 text-gray-600 truncate">
                  {student.email}
                </div>

                {/* Phone */}
                <div className="col-span-2 text-gray-600 truncate">
                  {student.phone || "N/A"}
                </div>

                {/* Score */}
                <div className="col-span-1 text-center">
                  {bestScore !== null ? (
                    <span
                      className={`font-medium ${
                        bestScore >= 70 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {bestScore}%
                    </span>
                  ) : (
                    <span className="text-gray-400">N/A</span>
                  )}
                </div>

                {/* Status */}
                <div className="col-span-1 text-center">
                  {status === "Pass" ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                  ) : status === "Fail" ? (
                    <XCircle className="w-5 h-5 text-red-600 mx-auto" />
                  ) : (
                    <span className="text-gray-400 text-xs">No Attempts</span>
                  )}
                </div>

                {/* Submitted */}
                <div className="col-span-1 text-center text-xs text-gray-600">
                  {lastSubmission ? (
                    <div>
                      <div>{formatSubmissionTime(lastSubmission)}</div>
                      <div className="text-gray-400">
                        {new Date(lastSubmission).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400">Not submitted</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Students Table - Mobile */}
      <div className="lg:hidden space-y-4">
        {filteredStudents.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
            {selectedQuizId
              ? `No students found for the selected quiz ${
                  searchTerm || filterType !== "all" || scoreFilter !== "all"
                    ? "matching your criteria"
                    : ""
                }.`
              : searchTerm || filterType !== "all" || scoreFilter !== "all"
              ? "No students match your search criteria."
              : "No students found."}
          </div>
        ) : (
          // In the mobile view section, add the submission info
          filteredStudents.map((student, index) => {
            const bestScore = getStudentBestScore(student);
            const status = getStudentStatus(student);
            const isSelected = selectedEmails.includes(student.email);
            const lastSubmission = getLastSubmissionTime(student);
            const timeSpent = getTimeSpent(student);

            return (
              <div key={student.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleEmailSelection(student.email)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-500">#{index + 1}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {status === "Pass" ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : status === "Fail" ? (
                      <XCircle className="w-5 h-5 text-red-600" />
                    ) : (
                      <span className="text-gray-400 text-xs">No Attempts</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-medium text-base">{student.name}</div>
                  <div className="text-sm text-gray-600">{student.email}</div>
                  <div className="text-sm text-gray-600">
                    {student.phone || "N/A"}
                  </div>

                  {/* NEW: Submission info for mobile */}
                  {lastSubmission && (
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                      <span className="text-sm text-gray-500">Submitted:</span>
                      <span className="text-sm text-gray-600">
                        {formatSubmissionTime(lastSubmission)}
                      </span>
                    </div>
                  )}

                  {timeSpent && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Time Spent:</span>
                      <span className="text-sm text-gray-600">{timeSpent}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="text-sm text-gray-500">Best Score:</span>
                    {bestScore !== null ? (
                      <span
                        className={`font-medium ${
                          bestScore >= 70 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {bestScore}%
                      </span>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Selection Summary */}
      {selectedEmails.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {selectedEmails.length} student
              {selectedEmails.length !== 1 ? "s" : ""} selected
            </span>
            <div className="flex space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={clearEmailSelection}
                className="bg-white text-blue-600 hover:bg-gray-100"
              >
                Clear
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowConfigPanel(true)}
                className="bg-white text-blue-600 hover:bg-gray-100"
              >
                Generate Docs
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Document Configuration Panel */}
      {showConfigPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  Document Configuration
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConfigPanel(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Issue Date
                  </label>
                  <Input
                    type="date"
                    value={documentConfig.issueDate}
                    onChange={(e) =>
                      setDocumentConfig((prev) => ({
                        ...prev,
                        issueDate: e.target.value,
                      }))
                    }
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Joining Date
                  </label>
                  <Input
                    type="date"
                    value={documentConfig.joiningDate}
                    onChange={(e) =>
                      setDocumentConfig((prev) => ({
                        ...prev,
                        joiningDate: e.target.value,
                      }))
                    }
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={documentConfig.endDate}
                    onChange={(e) =>
                      setDocumentConfig((prev) => ({
                        ...prev,
                        endDate: e.target.value,
                      }))
                    }
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Time Period
                  </label>
                  <Input
                    type="text"
                    value={documentConfig.timePeriod}
                    onChange={(e) =>
                      setDocumentConfig((prev) => ({
                        ...prev,
                        timePeriod: e.target.value,
                      }))
                    }
                    placeholder="e.g., 2 months"
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Monthly Stipend (Rs.)
                  </label>
                  <Input
                    type="text"
                    value={documentConfig.stipend}
                    onChange={(e) =>
                      setDocumentConfig((prev) => ({
                        ...prev,
                        stipend: e.target.value,
                      }))
                    }
                    placeholder="e.g., 2000"
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    <Briefcase className="w-4 h-4 inline mr-1" />
                    Designation
                  </label>
                  <Input
                    type="text"
                    value={documentConfig.designation}
                    onChange={(e) =>
                      setDocumentConfig((prev) => ({
                        ...prev,
                        designation: e.target.value,
                      }))
                    }
                    placeholder="e.g., FullStack Intern"
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Document Format
                  </label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as DocType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="pdf">PDF Format</option>
                    <option value="word">Word Document</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConfigPanel(false)}
                  className="flex-1 text-sm"
                >
                  Cancel
                </Button>
                <Button onClick={handleConfigSubmit} className="flex-1 text-sm">
                  Continue
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Generation Panel */}
      {showDocPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  Generate Offer Letters
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDocPanel(false)}
                  disabled={generatingDocs}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">
                    Selected Students ({selectedEmails.length})
                  </h3>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {students
                      .filter((student) =>
                        selectedEmails.includes(student.email)
                      )
                      .map((student) => (
                        <div key={student.id} className="text-sm text-gray-600">
                          {student.name} ({student.email})
                        </div>
                      ))}
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2 text-blue-800">
                    Document Configuration
                  </h3>
                  <div className="text-sm text-blue-700 space-y-1">
                    <div>
                      Issue Date: {formatDate(documentConfig.issueDate)}
                    </div>
                    <div>
                      Joining Date: {formatDate(documentConfig.joiningDate)}
                    </div>
                    <div>End Date: {formatDate(documentConfig.endDate)}</div>
                    <div>Stipend: Rs. {documentConfig.stipend}</div>
                    <div>Position: {documentConfig.designation}</div>
                    <div>Format: {docType.toUpperCase()}</div>
                  </div>
                </div>

                {generatingDocs && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">
                      Generating documents... This may take a moment.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConfigPanel(true)}
                  disabled={generatingDocs}
                  className="flex-1 text-sm"
                >
                  Back to Config
                </Button>
                <Button
                  onClick={generateOfferLetterDocs}
                  disabled={generatingDocs}
                  className="flex-1 text-sm"
                >
                  {generatingDocs ? "Generating..." : "Generate Documents"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
