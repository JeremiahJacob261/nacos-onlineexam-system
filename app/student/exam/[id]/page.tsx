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
import { Clock, ArrowLeft, ArrowRight, AlertTriangle, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { StudentNavbar } from "@/components/student-navbar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

interface Question {
  id: string
  text: string
  options: {
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
  const [timeLeft, setTimeLeft] = useState(0)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [showTimeWarning, setShowTimeWarning] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
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

        if (questionsError) {
          throw questionsError
        }

        // Fetch options for all questions
        const questionIds = questionsData.map((q) => q.id)
        const { data: optionsData, error: optionsError } = await supabase
          .from("exam_options")
          .select("id, question_id, option_text, option_label")
          .in("question_id", questionIds)

        if (optionsError) {
          throw optionsError
        }

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

        // Set exam data
        setExamData({
          id: examData.id,
          title: examData.title,
          code: examData.code,
          duration: examData.duration,
          description: examData.description,
          passing_score: examData.passing_score,
          questions,
        })

        // Set timer
        setTimeLeft(examData.duration * 60)

        // Check if user already has an attempt for this exam
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

  // Check if user already has an attempt
  const checkExistingAttempt = async (examId: string) => {
    try {
      // Check for an existing in-progress attempt
      const { data: attemptData, error: attemptError } = await supabase
        .from("exam_attempts")
        .select("id, start_time, status")
        .eq("exam_id", examId)
        .eq("user_id", userProfile?.id)
        .eq("status", "in_progress")
        .maybeSingle()

      if (attemptError) {
        throw attemptError
      }

      if (attemptData) {
        // Existing attempt found
        setAttemptId(attemptData.id)

        // Calculate remaining time
        const startTime = new Date(attemptData.start_time)
        const currentTime = new Date()
        const elapsedSeconds = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000)
        const remainingSeconds = Math.max(0, examData!.duration * 60 - elapsedSeconds)
        setTimeLeft(remainingSeconds)

        // Fetch existing answers
        const { data: answersData, error: answersError } = await supabase
          .from("exam_answers")
          .select("question_id, selected_option_id")
          .eq("attempt_id", attemptData.id)

        if (answersError) {
          throw answersError
        }

        // Format answers
        const formattedAnswers: Record<string, string> = {}
        answersData.forEach((answer) => {
          // Find the question and option
          const question = examData?.questions.find((q) => q.id === answer.question_id)
          if (question) {
            const option = question.options.find((o) => o.optionId === answer.selected_option_id)
            if (option) {
              formattedAnswers[answer.question_id] = option.id
            }
          }
        })

        setAnswers(formattedAnswers)
      } else {
        // Create a new attempt
        await createAttempt(examId)
      }
    } catch (error) {
      console.error("Error checking existing attempt:", error)
    }
  }

  // Create a new attempt
  const createAttempt = async (examId: string) => {
    try {
      const { data, error } = await supabase
        .from("exam_attempts")
        .insert({
          exam_id: examId,
          user_id: userProfile?.id,
          start_time: new Date().toISOString(),
          status: "in_progress",
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      setAttemptId(data.id)
    } catch (error) {
      console.error("Error creating attempt:", error)
    }
  }

  // Save answer to database
  const saveAnswer = useCallback(
    async (questionId: string, optionId: string) => {
      if (!attemptId) return

      setIsSaving(true)
      try {
        // Find the selected option's ID
        const question = examData?.questions.find((q) => q.id === questionId)
        if (!question) return

        const option = question.options.find((o) => o.id === optionId)
        if (!option) return

        // Check if answer already exists
        const { data: existingAnswer, error: checkError } = await supabase
          .from("exam_answers")
          .select("id")
          .eq("attempt_id", attemptId)
          .eq("question_id", questionId)
          .maybeSingle()

        if (checkError) {
          throw checkError
        }

        if (existingAnswer) {
          // Update existing answer
          const { error: updateError } = await supabase
            .from("exam_answers")
            .update({
              selected_option_id: option.optionId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingAnswer.id)

          if (updateError) {
            throw updateError
          }
        } else {
          // Insert new answer
          const { error: insertError } = await supabase.from("exam_answers").insert({
            attempt_id: attemptId,
            question_id: questionId,
            selected_option_id: option.optionId,
          })

          if (insertError) {
            throw insertError
          }
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

    // Save answer to database
    saveAnswer(questionId, value)
  }

  // Navigate to next question
  const nextQuestion = () => {
    if (examData && currentQuestion < examData.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  // Navigate to previous question
  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  // Handle exam submission
  const handleSubmit = async () => {
    if (!attemptId || !examData) return

    setIsSubmitting(true)
    try {
      // Update attempt status
      const { error: attemptError } = await supabase
        .from("exam_attempts")
        .update({
          status: "completed",
          end_time: new Date().toISOString(),
        })
        .eq("id", attemptId)

      if (attemptError) {
        throw attemptError
      }

      // Calculate results
      // 1. Get all questions and correct answers
      const { data: questionsWithAnswers, error: questionsError } = await supabase
        .from("exam_questions")
        .select(
          `
          id,
          exam_options (id, option_label, is_correct)
        `,
        )
        .eq("exam_id", examData.id)

      if (questionsError) {
        throw questionsError
      }

      // 2. Get student answers
      const { data: studentAnswers, error: answersError } = await supabase
        .from("exam_answers")
        .select("question_id, selected_option_id")
        .eq("attempt_id", attemptId)

      if (answersError) {
        throw answersError
      }

      // 3. Calculate score
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

      // 4. Save results
      const { error: resultError } = await supabase.from("exam_results").insert({
        attempt_id: attemptId,
        user_id: userProfile?.id,
        exam_id: examData.id,
        score,
        total_questions: totalQuestions,
        correct_answers: correctAnswers,
        passed,
      })

      if (resultError) {
        throw resultError
      }

      // 5. Update analytics
      await updateExamAnalytics(examData.id, score, timeLeft)

      // Redirect to results page
      router.push(`/student/results/${attemptId}`)
    } catch (error) {
      console.error("Error submitting exam:", error)
      setError("Failed to submit exam. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Update exam analytics
  const updateExamAnalytics = async (examId: string, score: number, timeRemaining: number) => {
    try {
      // Check if analytics record exists
      const { data: existingAnalytics, error: checkError } = await supabase
        .from("exam_analytics")
        .select("*")
        .eq("exam_id", examId)
        .maybeSingle()

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError
      }

      const completionTime = examData!.duration * 60 - timeRemaining

      if (existingAnalytics) {
        // Update existing analytics
        const newTotalAttempts = existingAnalytics.total_attempts + 1
        const newTotalScore = existingAnalytics.avg_score * existingAnalytics.total_attempts + score
        const newAvgScore = newTotalScore / newTotalAttempts
        const newPassCount =
          existingAnalytics.pass_rate * existingAnalytics.total_attempts * 0.01 +
          (score >= examData!.passing_score ? 1 : 0)
        const newPassRate = (newPassCount / newTotalAttempts) * 100

        // Calculate new average completion time
        let newAvgCompletionTime = existingAnalytics.avg_completion_time || 0
        if (existingAnalytics.avg_completion_time) {
          newAvgCompletionTime =
            (existingAnalytics.avg_completion_time * existingAnalytics.total_attempts + completionTime) /
            newTotalAttempts
        } else {
          newAvgCompletionTime = completionTime
        }

        await supabase
          .from("exam_analytics")
          .update({
            total_attempts: newTotalAttempts,
            avg_score: newAvgScore,
            pass_rate: newPassRate,
            avg_completion_time: newAvgCompletionTime,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingAnalytics.id)
      } else {
        // Create new analytics record
        await supabase.from("exam_analytics").insert({
          exam_id: examId,
          total_attempts: 1,
          avg_score: score,
          pass_rate: score >= examData!.passing_score ? 100 : 0,
          avg_completion_time: completionTime,
        })
      }
    } catch (error) {
      console.error("Error updating analytics:", error)
    }
  }

  // Toggle fullscreen
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`)
      })
      setIsFullScreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
        setIsFullScreen(false)
      }
    }
  }

  // Timer effect
  useEffect(() => {
    if (!attemptId || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer)
          handleTimeUp()
          return 0
        }

        // Show warning when 5 minutes left
        if (prev === 300) {
          setShowTimeWarning(true)
        }

        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [attemptId, timeLeft])

  // Handle time up
  const handleTimeUp = async () => {
    if (!attemptId) return

    try {
      // Update attempt status
      await supabase
        .from("exam_attempts")
        .update({
          status: "timed_out",
          end_time: new Date().toISOString(),
        })
        .eq("id", attemptId)

      // Submit the exam with whatever answers were provided
      handleSubmit()
    } catch (error) {
      console.error("Error handling time up:", error)
    }
  }

  // Enter fullscreen on component mount
  useEffect(() => {
    if (examData) {
      toggleFullScreen()

      // Handle fullscreen change
      const handleFullscreenChange = () => {
        setIsFullScreen(!!document.fullscreenElement)
      }

      document.addEventListener("fullscreenchange", handleFullscreenChange)

      return () => {
        document.removeEventListener("fullscreenchange", handleFullscreenChange)
        // Exit fullscreen when component unmounts
        if (document.fullscreenElement) {
          document.exitFullscreen()
        }
      }
    }
  }, [examData])

  // Calculate progress percentage
  const progressPercentage = examData ? (Object.keys(answers).length / examData.questions.length) * 100 : 0

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

  const question = examData.questions[currentQuestion]
  const currentAnswer = question ? answers[question.id] : undefined

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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
                  className={`flex items-center space-x-2 rounded-md border p-4 transition-colors ${
                    currentAnswer === option.id ? "bg-gray-100 border-gray-300" : ""
                  }`}
                  onClick={() => handleAnswerSelect(option.id)}
                >
                  <RadioGroupItem value={option.id} id={`option-${option.id}`} className="sr-only" />
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

      {/* Time Warning Dialog */}
      <AlertDialog open={showTimeWarning} onOpenChange={setShowTimeWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Time Warning</AlertDialogTitle>
            <AlertDialogDescription>You have 5 minutes remaining to complete the exam.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
