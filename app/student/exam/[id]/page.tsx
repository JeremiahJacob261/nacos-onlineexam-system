"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Clock, ArrowLeft, ArrowRight, AlertTriangle, Loader2, Shield, Eye, EyeOff } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { StudentNavbar } from "@/components/student-navbar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useExamSecurity } from "@/hooks/use-exam-security"
import Link from "next/link"

interface Question {
  id: string
  text: string
  options: {
    optionId: any
    id: string
    text: string
  }[]
}

interface ExamData {
  id: string
  title: string
  code: string
  duration: number
  description?: string
  passing_score: number
  questions: Question[]
}

export default function ExamPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { user, userProfile } = useAuth()
  const [examData, setExamData] = useState<ExamData | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Security and warning states
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [showSecurityWarning, setShowSecurityWarning] = useState(false)
  const [showTimeWarning, setShowTimeWarning] = useState(false)
  const [showViolationWarning, setShowViolationWarning] = useState(false)
  const [examStarted, setExamStarted] = useState(false)
  const [securityViolations, setSecurityViolations] = useState(0)

  // Handle security violations
  const handleTabSwitch = useCallback(async () => {
    if (!examStarted || !attemptId) return

    const newViolationCount = securityViolations + 1
    setSecurityViolations(newViolationCount)

    // Log the violation
    try {
      await supabase.from("exam_violations").insert({
        attempt_id: attemptId,
        violation_type: "tab_switch",
        violation_count: newViolationCount,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Error logging violation:", error)
    }

    if (newViolationCount === 1) {
      setShowViolationWarning(true)
    } else if (newViolationCount >= 2) {
      // Terminate exam after 2 violations
      await terminateExam("security_violation")
    }
  }, [examStarted, attemptId, securityViolations])

  const handleTimeWarning = useCallback(() => {
    setShowTimeWarning(true)
  }, [])

  const handleTimeUp = useCallback(async () => {
    await terminateExam("time_up")
  }, [])

  // Use exam security hook
  const { isVisible, timeLeft, violations, enterFullscreen, exitFullscreen, formatTime } = useExamSecurity({
    onTabSwitch: handleTabSwitch,
    onTimeWarning: handleTimeWarning,
    onTimeUp: handleTimeUp,
    examDuration: examData?.duration ? examData.duration * 60 : 0,
    warningTime: 300, // 5 minutes
  })

  // Terminate exam function
  const terminateExam = async (reason: string) => {
    if (!attemptId) return

    setIsSubmitting(true)
    try {
      // Update attempt status
      await supabase
        .from("exam_attempts")
        .update({
          status: reason === "time_up" ? "timed_out" : "terminated",
          end_time: new Date().toISOString(),
          termination_reason: reason,
        })
        .eq("id", attemptId)

      // Calculate and save results with current answers
      await calculateAndSaveResults()

      // Exit fullscreen
      exitFullscreen()

      // Redirect to results
      router.push(`/student/results/${attemptId}?terminated=${reason}`)
    } catch (error) {
      console.error("Error terminating exam:", error)
    }
  }

  // Calculate and save results
  const calculateAndSaveResults = async () => {
    if (!attemptId || !examData) return

    try {
      // Get all questions and correct answers
      const { data: questionsWithAnswers, error: questionsError } = await supabase
        .from("exam_questions")
        .select(`
          id,
          exam_options (id, option_label, is_correct)
        `)
        .eq("exam_id", examData.id)

      if (questionsError) throw questionsError

      // Get student answers
      const { data: studentAnswers, error: answersError } = await supabase
        .from("exam_answers")
        .select("question_id, selected_option_id")
        .eq("attempt_id", attemptId)

      if (answersError) throw answersError

      // Calculate score
      let correctAnswers = 0
      const totalQuestions = questionsWithAnswers.length

      studentAnswers.forEach((answer) => {
        const question = questionsWithAnswers.find((q) => q.id === answer.question_id)
        if (question) {
          const correctOption = question.exam_options.find((o) => o.is_correct)
          if (correctOption && correctOption.id === answer.selected_option_id) {
            correctAnswers++
          }
        }
      })

      const score = Math.round((correctAnswers / totalQuestions) * 100)
      const passed = score >= examData.passing_score

      // Save results
      await supabase.from("exam_results").insert({
        attempt_id: attemptId,
        user_id: userProfile?.id,
        exam_id: examData.id,
        score,
        total_questions: totalQuestions,
        correct_answers: correctAnswers,
        passed,
      })
    } catch (error) {
      console.error("Error calculating results:", error)
    }
  }

  // Fetch exam data
  useEffect(() => {
    const fetchExamData = async () => {
      setIsLoading(true)
      try {
        // Fetch exam details
        const { data: examData, error: examError } = await supabase
          .from("exam_exams")
          .select("*")
          .eq("id", params.id)
          .eq("status", "active")
          .single()

        if (examError) {
          throw new Error("Exam not found or not active")
        }

        // Fetch questions for this exam
        const { data: questionsData, error: questionsError } = await supabase
          .from("exam_questions")
          .select("id, question_text, question_order")
          .eq("exam_id", params.id)
          .order("question_order", { ascending: true })

        if (questionsError) throw questionsError

        // Fetch options for all questions
        const questionIds = questionsData.map((q) => q.id)
        const { data: optionsData, error: optionsError } = await supabase
          .from("exam_options")
          .select("id, question_id, option_text, option_label")
          .in("question_id", questionIds)

        if (optionsError) throw optionsError

        // Format questions with their options
        const questions = questionsData.map((question) => {
          const questionOptions = optionsData
            .filter((option) => option.question_id === question.id)
            .map((option) => ({
              id: option.option_label,
              text: option.option_text,
              optionId: option.id,
            }))

          return {
            id: question.id,
            text: question.question_text,
            options: questionOptions,
          }
        })

        setExamData({
          id: examData.id,
          title: examData.title,
          code: examData.code,
          duration: examData.duration,
          description: examData.description,
          passing_score: examData.passing_score,
          questions,
        })

        // Check for existing attempt
        await checkExistingAttempt(examData.id)
      } catch (error: any) {
        console.error("Error fetching exam data:", error)
        setError(error.message || "Failed to load exam")
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchExamData()
    }
  }, [params.id, user])

  // Check existing attempt
  const checkExistingAttempt = async (examId: string) => {
    try {
      const { data: attemptData, error: attemptError } = await supabase
        .from("exam_attempts")
        .select("id, start_time, status")
        .eq("exam_id", examId)
        .eq("user_id", userProfile?.id)
        .eq("status", "in_progress")
        .maybeSingle()

      if (attemptError) throw attemptError

      if (attemptData) {
        setAttemptId(attemptData.id)
        setExamStarted(true)

        // Fetch existing answers
        const { data: answersData, error: answersError } = await supabase
          .from("exam_answers")
          .select("question_id, selected_option_id")
          .eq("attempt_id", attemptData.id)

        if (answersError) throw answersError

        // Format answers
        const formattedAnswers: Record<string, string> = {}
        answersData.forEach((answer) => {
          const question = examData?.questions.find((q) => q.id === answer.question_id)
          if (question) {
            const option = question.options.find((o) => o.optionId === answer.selected_option_id)
            if (option) {
              formattedAnswers[answer.question_id] = option.id
            }
          }
        })

        setAnswers(formattedAnswers)
      }
    } catch (error) {
      console.error("Error checking existing attempt:", error)
    }
  }

  // Start exam
  const startExam = async () => {
    if (!examData) return

    try {
      const { data, error } = await supabase
        .from("exam_attempts")
        .insert({
          exam_id: examData.id,
          user_id: userProfile?.id,
          start_time: new Date().toISOString(),
          status: "in_progress",
        })
        .select()
        .single()

      if (error) throw error

      setAttemptId(data.id)
      setExamStarted(true)
      enterFullscreen()
    } catch (error) {
      console.error("Error starting exam:", error)
      setError("Failed to start exam")
    }
  }

  // Save answer
  const saveAnswer = useCallback(
    async (questionId: string, optionId: string) => {
      if (!attemptId) return

      setIsSaving(true)
      try {
        const question = examData?.questions.find((q) => q.id === questionId)
        if (!question) return

        const option = question.options.find((o) => o.id === optionId)
        if (!option) return

        const { data: existingAnswer, error: checkError } = await supabase
          .from("exam_answers")
          .select("id")
          .eq("attempt_id", attemptId)
          .eq("question_id", questionId)
          .maybeSingle()

        if (checkError) throw checkError

        if (existingAnswer) {
          await supabase
            .from("exam_answers")
            .update({
              selected_option_id: option.optionId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingAnswer.id)
        } else {
          await supabase.from("exam_answers").insert({
            attempt_id: attemptId,
            question_id: questionId,
            selected_option_id: option.optionId,
          })
        }
      } catch (error) {
        console.error("Error saving answer:", error)
      } finally {
        setIsSaving(false)
      }
    },
    [attemptId, examData?.questions],
  )

  // Handle answer selection
  const handleAnswerSelect = (value: string) => {
    if (!examData?.questions[currentQuestion]) return

    const questionId = examData.questions[currentQuestion].id
    setAnswers({
      ...answers,
      [questionId]: value,
    })

    saveAnswer(questionId, value)
  }

  // Navigation functions
  const nextQuestion = () => {
    if (examData && currentQuestion < examData.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  // Submit exam
  const handleSubmit = async () => {
    if (!attemptId || !examData) return

    setIsSubmitting(true)
    try {
      await supabase
        .from("exam_attempts")
        .update({
          status: "completed",
          end_time: new Date().toISOString(),
        })
        .eq("id", attemptId)

      await calculateAndSaveResults()
      exitFullscreen()
      router.push(`/student/results/${attemptId}`)
    } catch (error) {
      console.error("Error submitting exam:", error)
      setError("Failed to submit exam. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Loading exam...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <StudentNavbar />
        <div className="container mx-auto p-4 md:p-6">
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button asChild>
            <Link href="/student/dashboard">Return to Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (!examData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <StudentNavbar />
        <div className="container mx-auto p-4 md:p-6">
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>Exam not found or not available</AlertDescription>
          </Alert>
          <Button asChild>
            <Link href="/student/dashboard">Return to Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Pre-exam instructions
  if (!examStarted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <StudentNavbar />
        <div className="container mx-auto p-4 md:p-6 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-center text-fuoye-green">{examData.title}</CardTitle>
              <p className="text-center text-gray-600">{examData.code}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Exam Information</h3>
                  <ul className="space-y-1 text-sm">
                    <li>Duration: {examData.duration} minutes</li>
                    <li>Questions: {examData.questions.length}</li>
                    <li>Passing Score: {examData.passing_score}%</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Security Features</h3>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-center">
                      <Shield className="h-4 w-4 mr-2 text-fuoye-green" />
                      Fullscreen mode required
                    </li>
                    <li className="flex items-center">
                      <Eye className="h-4 w-4 mr-2 text-fuoye-green" />
                      Tab monitoring active
                    </li>
                    <li className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-fuoye-green" />
                      Auto-save enabled
                    </li>
                  </ul>
                </div>
              </div>

              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-red-800">
                  <strong>Important Security Notice:</strong>
                  <ul className="mt-2 space-y-1">
                    <li>• Switching tabs or leaving the exam window will be detected</li>
                    <li>• First violation will show a warning</li>
                    <li>• Second violation will automatically terminate the exam</li>
                    <li>• The exam must be completed in fullscreen mode</li>
                    <li>• Right-click and keyboard shortcuts are disabled</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {examData.description && (
                <div>
                  <h3 className="font-semibold mb-2">Instructions</h3>
                  <p className="text-sm text-gray-600">{examData.description}</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button onClick={startExam} className="bg-fuoye-green hover:bg-fuoye-dark" size="lg">
                Start Exam
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    )
  }

  const question = examData.questions[currentQuestion]
  const currentAnswer = question ? answers[question.id] : undefined
  const progressPercentage = (Object.keys(answers).length / examData.questions.length) * 100

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Security indicator */}
      {!isVisible && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 z-50">
          <div className="flex items-center justify-center">
            <EyeOff className="h-4 w-4 mr-2" />
            SECURITY VIOLATION DETECTED - Return to exam immediately
          </div>
        </div>
      )}

      {/* Exam Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-xl font-bold">{examData.title}</h1>
            <p className="text-sm text-gray-500">{examData.code}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <Clock className="mr-2 h-4 w-4 text-gray-500" />
              <span className={`font-mono ${timeLeft < 300 ? "text-red-500 font-bold" : ""}`}>
                {formatTime(timeLeft)}
              </span>
            </div>

            {securityViolations > 0 && (
              <div className="flex items-center text-red-600">
                <AlertTriangle className="mr-1 h-4 w-4" />
                <span className="text-sm">Violations: {securityViolations}</span>
              </div>
            )}

            <Button variant="outline" size="sm" onClick={() => setShowSubmitDialog(true)}>
              Submit Exam
            </Button>
          </div>
        </div>

        <div className="container mx-auto px-4 pb-2">
          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <span>Progress</span>
            <span>
              {Object.keys(answers).length} of {examData.questions.length} answered
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </header>

      {/* Exam Content */}
      <main className="flex-1 container mx-auto p-4 md:p-6">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-start gap-2">
              <span className="bg-gray-100 text-gray-700 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                {currentQuestion + 1}
              </span>
              <span>{question.text}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={currentAnswer || ""} onValueChange={handleAnswerSelect} className="space-y-3">
              {question.options.map((option) => (
                <div
                  key={option.id}
                  className={`flex items-center space-x-2 rounded-md border p-4 transition-colors cursor-pointer ${
                    currentAnswer === option.id ? "bg-fuoye-light/10 border-fuoye-green" : "hover:bg-gray-50"
                  }`}
                  onClick={() => handleAnswerSelect(option.id)}
                >
                  <RadioGroupItem value={option.id} id={`option-${option.id}`} />
                  <Label htmlFor={`option-${option.id}`} className="flex items-center cursor-pointer w-full">
                    <span className="bg-gray-200 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">
                      {option.id.toUpperCase()}
                    </span>
                    {option.text}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {isSaving && (
              <div className="mt-2 text-xs text-gray-500 flex items-center">
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Saving...
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={prevQuestion} disabled={currentQuestion === 0}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            <Button onClick={nextQuestion} disabled={currentQuestion === examData.questions.length - 1}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>

        {/* Question Navigation */}
        <div className="max-w-3xl mx-auto mt-6">
          <h3 className="text-sm font-medium mb-2">Question Navigation</h3>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {examData.questions.map((_, index) => (
              <Button
                key={index}
                variant={
                  index === currentQuestion
                    ? "default"
                    : answers[examData.questions[index].id]
                      ? "secondary"
                      : "outline"
                }
                size="sm"
                className="h-10 w-10"
                onClick={() => setCurrentQuestion(index)}
              >
                {index + 1}
              </Button>
            ))}
          </div>
        </div>
      </main>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Exam</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit your exam? You have answered {Object.keys(answers).length} out of{" "}
              {examData.questions.length} questions.
              {Object.keys(answers).length < examData.questions.length && (
                <div className="mt-2 text-amber-600 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  You have unanswered questions.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Security Violation Warning */}
      <AlertDialog open={showViolationWarning} onOpenChange={setShowViolationWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Security Violation Detected</AlertDialogTitle>
            <AlertDialogDescription>
              You have switched tabs or left the exam window. This is your first warning.
              <div className="mt-2 p-3 bg-red-50 rounded-md">
                <strong className="text-red-800">Important:</strong> Another violation will automatically terminate your
                exam. Please remain focused on the exam window.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700">I Understand</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Time Warning Dialog */}
      <AlertDialog open={showTimeWarning} onOpenChange={setShowTimeWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-amber-600">Time Warning</AlertDialogTitle>
            <AlertDialogDescription>
              You have 5 minutes remaining to complete the exam. Please review your answers and submit when ready.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
