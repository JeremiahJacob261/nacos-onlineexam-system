"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { StudentNavbar } from "@/components/student-navbar"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { Loader2, CheckCircle, XCircle, Clock, Calendar, BookOpen, BarChart3 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function ResultsPage({ params }: { params: { id: string } }) {
  const { userProfile } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [result, setResult] = useState<any>(null)
  const [examDetails, setExamDetails] = useState<any>(null)
  const [answers, setAnswers] = useState<any[]>([])

  useEffect(() => {
    const fetchResults = async () => {
      setIsLoading(true)
      try {
        // Fetch the result
        const { data: resultData, error: resultError } = await supabase
          .from("exam_results")
          .select("*, exam_exams(*)")
          .eq("attempt_id", params.id)
          .single()

        if (resultError) {
          throw resultError
        }

        // Verify this result belongs to the current user
        if (resultData.user_id !== userProfile?.id) {
          throw new Error("You do not have permission to view this result")
        }

        setResult(resultData)
        setExamDetails(resultData.exam_exams)

        // Fetch the attempt details
        const { data: attemptData, error: attemptError } = await supabase
          .from("exam_attempts")
          .select("*")
          .eq("id", params.id)
          .single()

        if (attemptError) {
          throw attemptError
        }

        // Calculate time taken
        const startTime = new Date(attemptData.start_time)
        const endTime = new Date(attemptData.end_time || startTime)
        const timeTakenMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000)

        // Fetch questions, answers and correct options
        const { data: questionsData, error: questionsError } = await supabase
          .from("exam_questions")
          .select(
            `
            id, question_text, question_order,
            exam_options (id, option_text, option_label, is_correct)
          `,
          )
          .eq("exam_id", resultData.exam_id)
          .order("question_order", { ascending: true })

        if (questionsError) {
          throw questionsError
        }

        // Fetch student answers
        const { data: answersData, error: answersError } = await supabase
          .from("exam_answers")
          .select("question_id, selected_option_id")
          .eq("attempt_id", params.id)

        if (answersError) {
          throw answersError
        }

        // Combine questions with answers
        const formattedAnswers = questionsData.map((question) => {
          const studentAnswer = answersData.find((a) => a.question_id === question.id)
          const selectedOption = studentAnswer
            ? question.exam_options.find((o) => o.id === studentAnswer.selected_option_id)
            : null
          const correctOption = question.exam_options.find((o) => o.is_correct)

          return {
            questionId: question.id,
            questionText: question.question_text,
            questionOrder: question.question_order,
            options: question.exam_options,
            selectedOptionId: studentAnswer?.selected_option_id || null,
            selectedOptionLabel: selectedOption?.option_label || null,
            correctOptionId: correctOption?.id || null,
            correct: studentAnswer?.selected_option_id === correctOption?.id,
            isAnswered: !!studentAnswer,
          }
        })

        setAnswers(formattedAnswers)

        // Update exam details with time taken
        setExamDetails({
          ...resultData.exam_exams,
          timeTaken: timeTakenMinutes,
        })
      } catch (error: any) {
        console.error("Error fetching results:", error)
        setError(error.message || "Failed to load results")
      } finally {
        setIsLoading(false)
      }
    }

    if (userProfile) {
      fetchResults()
    }
  }, [params.id, userProfile])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <StudentNavbar />
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
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

  return (
    <div className="min-h-screen bg-gray-50">
      <StudentNavbar />

      <main className="container mx-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Exam Results</h1>
          <p className="text-gray-500">{examDetails?.title}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Results Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Results Summary</CardTitle>
              <CardDescription>Your performance on this exam</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center">
                <div className={`text-4xl font-bold mb-2 ${result.passed ? "text-green-600" : "text-red-600"}`}>
                  {result.score}%
                </div>
                <div
                  className={`text-sm font-medium px-3 py-1 rounded-full ${
                    result.passed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  {result.passed ? "Passed" : "Failed"}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Score</span>
                  <span>{result.score}%</span>
                </div>
                <Progress value={result.score} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">Passing Score</span>
                  <span className="font-medium">{examDetails?.passing_score}%</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">Questions</span>
                  <span className="font-medium">
                    {result.correct_answers} of {result.total_questions} correct
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">Time Taken</span>
                  <span className="font-medium">{examDetails?.timeTaken} minutes</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">Date</span>
                  <span className="font-medium">{new Date(result.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/student/dashboard">Return to Dashboard</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Exam Details */}
          <Card>
            <CardHeader>
              <CardTitle>Exam Details</CardTitle>
              <CardDescription>Information about this exam</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <BookOpen className="mr-2 h-4 w-4 text-gray-500" />
                    <div>
                      <div className="text-sm text-gray-500">Course Code</div>
                      <div>{examDetails?.code}</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-gray-500" />
                    <div>
                      <div className="text-sm text-gray-500">Duration</div>
                      <div>{examDetails?.duration} minutes</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <BarChart3 className="mr-2 h-4 w-4 text-gray-500" />
                    <div>
                      <div className="text-sm text-gray-500">Passing Score</div>
                      <div>{examDetails?.passing_score}%</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                    <div>
                      <div className="text-sm text-gray-500">Date Taken</div>
                      <div>{new Date(result.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>

                {examDetails?.description && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Description</div>
                    <div className="text-sm">{examDetails.description}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Answers */}
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-4">Question Review</h2>
          <div className="space-y-4">
            {answers.map((answer, index) => (
              <Card key={answer.questionId}>
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-2">
                    <span className="bg-gray-100 text-gray-700 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <CardTitle className="text-base">{answer.questionText}</CardTitle>
                    </div>
                    {answer.isAnswered ? (
                      answer.correct ? (
                        <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                      )
                    ) : (
                      <XCircle className="h-6 w-6 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {answer.options.map((option) => (
                      <div
                        key={option.id}
                        className={`flex items-center space-x-2 rounded-md border p-3 ${
                          option.is_correct
                            ? "bg-green-50 border-green-200"
                            : option.id === answer.selectedOptionId && !option.is_correct
                              ? "bg-red-50 border-red-200"
                              : ""
                        }`}
                      >
                        <div className="bg-gray-200 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                          {option.option_label.toUpperCase()}
                        </div>
                        <span>{option.option_text}</span>
                        {option.is_correct && (
                          <span className="ml-auto text-green-600 text-sm font-medium">Correct</span>
                        )}
                        {option.id === answer.selectedOptionId && !option.is_correct && (
                          <span className="ml-auto text-red-600 text-sm font-medium">Your Answer</span>
                        )}
                      </div>
                    ))}
                  </div>
                  {!answer.isAnswered && (
                    <div className="mt-2 text-sm text-gray-500">You did not answer this question.</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
