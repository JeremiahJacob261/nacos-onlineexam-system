"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { StudentNavbar } from "@/components/student-navbar"
import { Clock, Calendar, BookOpen, BarChart3, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function StudentDashboard() {
  const { userProfile } = useAuth()
  const [activeTab, setActiveTab] = useState("available")
  const [availableExams, setAvailableExams] = useState<any[]>([])
  const [pastExams, setPastExams] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchExams = async () => {
      if (!userProfile) return

      setIsLoading(true)
      try {
        // Fetch available exams
        const { data: examsData, error: examsError } = await supabase
          .from("exam_exams")
          .select("*")
          .in("status", ["active", "scheduled"])
          .order("start_date", { ascending: true })

        if (examsError) {
          throw examsError
        }

        // Format exams and check if student has already attempted them
        const formattedExams = []
        for (const exam of examsData || []) {
          // Check if student has already attempted this exam
          const { data: attemptData, error: attemptError } = await supabase
            .from("exam_attempts")
            .select("id, status")
            .eq("exam_id", exam.id)
            .eq("user_id", userProfile.id)
            .not("status", "eq", "in_progress")
            .maybeSingle()

          if (attemptError) {
            console.error("Error checking attempt:", attemptError)
          }

          // Only show exams that haven't been completed
          if (!attemptData) {
            // Count questions for this exam
            const { count: questionCount, error: countError } = await supabase
              .from("exam_questions")
              .select("id", { count: "exact", head: true })
              .eq("exam_id", exam.id)

            if (countError) {
              console.error("Error counting questions:", countError)
            }

            // Format date and time
            let formattedDate = "No date set"
            let formattedTime = ""
            if (exam.start_date) {
              const date = new Date(exam.start_date)
              formattedDate = date.toLocaleDateString()
              formattedTime = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            }

            formattedExams.push({
              id: exam.id,
              title: exam.title,
              code: exam.code,
              duration: exam.duration,
              questions: questionCount || 0,
              date: formattedDate,
              time: formattedTime,
              status: exam.status,
            })
          }
        }

        setAvailableExams(formattedExams)

        // Fetch past exam results
        const { data: resultsData, error: resultsError } = await supabase
          .from("exam_results")
          .select(`
            id, score, total_questions, correct_answers, passed, created_at,
            exam_exams (id, title, code)
          `)
          .eq("user_id", userProfile.id)
          .order("created_at", { ascending: false })

        if (resultsError) {
          throw resultsError
        }

        // Format past exams
        const formattedResults = resultsData.map((result) => ({
          id: result.id,
          examId: result.exam_exams.id,
          title: result.exam_exams.title,
          code: result.exam_exams.code,
          date: new Date(result.created_at).toLocaleDateString(),
          score: result.score,
          totalQuestions: result.total_questions,
          correctAnswers: result.correct_answers,
          passed: result.passed,
        }))

        setPastExams(formattedResults)
      } catch (error: any) {
        console.error("Error fetching exams:", error)
        setError(error.message || "Failed to load exams")
      } finally {
        setIsLoading(false)
      }
    }

    fetchExams()
  }, [userProfile])

  return (
    <div className="min-h-screen bg-gray-50">
      <StudentNavbar />

      <main className="container mx-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Student Dashboard</h1>
          <p className="text-gray-500">Welcome back, {userProfile?.full_name || "Student"}</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="available" onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="available">Available Exams</TabsTrigger>
            <TabsTrigger value="results">Past Results</TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : availableExams.length > 0 ? (
              availableExams.map((exam) => (
                <Card key={exam.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{exam.title}</CardTitle>
                        <CardDescription>Course Code: {exam.code}</CardDescription>
                      </div>
                      <Badge variant={exam.status === "active" ? "default" : "outline"}>
                        {exam.status === "active" ? "Available" : "Upcoming"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4 text-gray-500" />
                        <span>{exam.duration} minutes</span>
                      </div>
                      <div className="flex items-center">
                        <BookOpen className="mr-2 h-4 w-4 text-gray-500" />
                        <span>{exam.questions} questions</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                        <span>
                          {exam.date} {exam.time && `at ${exam.time}`}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      asChild={exam.status === "active"}
                      disabled={exam.status !== "active"}
                      className="w-full sm:w-auto"
                    >
                      {exam.status === "active" ? (
                        <Link href={`/student/exam/${exam.id}`}>Start Exam</Link>
                      ) : (
                        "Not Available Yet"
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">No exams are currently available.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : pastExams.length > 0 ? (
              pastExams.map((exam) => (
                <Card key={exam.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{exam.title}</CardTitle>
                        <CardDescription>Course Code: {exam.code}</CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{exam.score}%</div>
                        <div className="text-sm text-gray-500">Score</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                        <span>Taken on {exam.date}</span>
                      </div>
                      <div className="flex items-center">
                        <BookOpen className="mr-2 h-4 w-4 text-gray-500" />
                        <span>
                          {exam.correctAnswers} of {exam.totalQuestions} correct
                        </span>
                      </div>
                      <div className="flex items-center">
                        <BarChart3 className="mr-2 h-4 w-4 text-gray-500" />
                        <span>
                          {exam.score >= 90
                            ? "Excellent"
                            : exam.score >= 80
                              ? "Very Good"
                              : exam.score >= 70
                                ? "Good"
                                : exam.score >= 60
                                  ? "Average"
                                  : "Needs Improvement"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" asChild className="w-full sm:w-auto">
                      <Link href={`/student/results/${exam.id}`}>View Detailed Results</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">You haven't taken any exams yet.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
