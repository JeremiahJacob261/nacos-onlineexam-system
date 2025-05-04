"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminNavbar } from "@/components/admin-navbar"
import { supabase } from "@/lib/supabase"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2, Download, FileDown } from "lucide-react"
import { downloadCSV } from "@/lib/export-utils"

export default function ReportsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [exams, setExams] = useState<any[]>([])
  const [selectedExam, setSelectedExam] = useState<string | null>(null)
  const [examResults, setExamResults] = useState<any[]>([])
  const [examAnalytics, setExamAnalytics] = useState<any | null>(null)
  const [scoreDistribution, setScoreDistribution] = useState<any[]>([])
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    const fetchExams = async () => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from("exam_exams")
          .select("id, title, code")
          .order("created_at", { ascending: false })

        if (error) {
          throw error
        }

        setExams(data || [])
        if (data && data.length > 0) {
          setSelectedExam(data[0].id)
        }
      } catch (error) {
        console.error("Error fetching exams:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchExams()
  }, [])

  useEffect(() => {
    if (selectedExam) {
      fetchExamData(selectedExam)
    }
  }, [selectedExam])

  const fetchExamData = async (examId: string) => {
    setIsLoading(true)
    try {
      // Fetch exam results
      const { data: results, error: resultsError } = await supabase
        .from("exam_results")
        .select(`
          id, score, total_questions, correct_answers, passed, created_at,
          exam_users (full_name, student_id)
        `)
        .eq("exam_id", examId)
        .order("score", { ascending: false })

      if (resultsError) {
        throw resultsError
      }

      setExamResults(results || [])

      // Fetch exam analytics
      const { data: analytics, error: analyticsError } = await supabase
        .from("exam_analytics")
        .select("*")
        .eq("exam_id", examId)
        .single()

      if (analyticsError && analyticsError.code !== "PGRST116") {
        throw analyticsError
      }

      setExamAnalytics(
        analytics || {
          total_attempts: results?.length || 0,
          avg_score: results?.reduce((sum, r) => sum + r.score, 0) / (results?.length || 1),
          pass_rate: (results?.filter((r) => r.passed).length / (results?.length || 1)) * 100,
        },
      )

      // Calculate score distribution
      const distribution = calculateScoreDistribution(results || [])
      setScoreDistribution(distribution)
    } catch (error) {
      console.error("Error fetching exam data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateScoreDistribution = (results: any[]) => {
    const ranges = [
      { name: "0-20%", min: 0, max: 20, count: 0 },
      { name: "21-40%", min: 21, max: 40, count: 0 },
      { name: "41-60%", min: 41, max: 60, count: 0 },
      { name: "61-80%", min: 61, max: 80, count: 0 },
      { name: "81-100%", min: 81, max: 100, count: 0 },
    ]

    results.forEach((result) => {
      const score = result.score
      for (const range of ranges) {
        if (score >= range.min && score <= range.max) {
          range.count++
          break
        }
      }
    })

    return ranges
  }

  const handleExportResults = () => {
    if (!examResults.length) return

    setIsExporting(true)

    try {
      // Get the selected exam details
      const selectedExamDetails = exams.find((exam) => exam.id === selectedExam)

      // Format the data for export
      const exportData = examResults.map((result) => ({
        Student_Name: result.exam_users.full_name,
        Student_ID: result.exam_users.student_id,
        Score: `${result.score}%`,
        Correct_Answers: result.correct_answers,
        Total_Questions: result.total_questions,
        Status: result.passed ? "Passed" : "Failed",
        Date_Taken: new Date(result.created_at).toLocaleString(),
      }))

      // Generate filename with exam code and date
      const filename = `${selectedExamDetails?.code || "exam"}_results_${new Date().toISOString().split("T")[0]}.csv`

      // Download the CSV
      downloadCSV(exportData, filename)
    } catch (error) {
      console.error("Error exporting results:", error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportAnalytics = () => {
    if (!examAnalytics || !scoreDistribution.length) return

    setIsExporting(true)

    try {
      // Get the selected exam details
      const selectedExamDetails = exams.find((exam) => exam.id === selectedExam)

      // Format the analytics data
      const analyticsData = [
        {
          Exam_Title: selectedExamDetails?.title,
          Exam_Code: selectedExamDetails?.code,
          Total_Attempts: examAnalytics.total_attempts,
          Average_Score: `${examAnalytics.avg_score.toFixed(2)}%`,
          Pass_Rate: `${examAnalytics.pass_rate.toFixed(2)}%`,
          Date_Generated: new Date().toLocaleString(),
        },
      ]

      // Format the distribution data
      const distributionData = scoreDistribution.map((range) => ({
        Score_Range: range.name,
        Number_of_Students: range.count,
        Percentage: `${((range.count / examAnalytics.total_attempts) * 100).toFixed(2)}%`,
      }))

      // Generate filenames
      const analyticsFilename = `${selectedExamDetails?.code || "exam"}_analytics_${new Date().toISOString().split("T")[0]}.csv`
      const distributionFilename = `${selectedExamDetails?.code || "exam"}_distribution_${new Date().toISOString().split("T")[0]}.csv`

      // Download the CSVs
      downloadCSV(analyticsData, analyticsFilename)
      setTimeout(() => {
        downloadCSV(distributionData, distributionFilename)
      }, 500) // Small delay to prevent browser issues with multiple downloads
    } catch (error) {
      console.error("Error exporting analytics:", error)
    } finally {
      setIsExporting(false)
    }
  }

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"]

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />

      <main className="container mx-auto p-4 md:p-6">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Exam Reports & Analytics</h1>
            <p className="text-gray-500">View detailed analytics and performance metrics</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportResults} disabled={isExporting || !examResults.length}>
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
              Export Results
            </Button>
            <Button variant="outline" onClick={handleExportAnalytics} disabled={isExporting || !examAnalytics}>
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Export Analytics
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <div className="max-w-xs">
            <Label htmlFor="exam-select">Select Exam</Label>
            <Select
              value={selectedExam || undefined}
              onValueChange={(value) => setSelectedExam(value)}
              disabled={isLoading}
            >
              <SelectTrigger id="exam-select">
                <SelectValue placeholder="Select an exam" />
              </SelectTrigger>
              <SelectContent>
                {exams.map((exam) => (
                  <SelectItem key={exam.id} value={exam.id}>
                    {exam.title} ({exam.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <Tabs defaultValue="overview">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="results">Individual Results</TabsTrigger>
              <TabsTrigger value="questions">Question Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{examAnalytics?.total_attempts || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{(examAnalytics?.avg_score || 0).toFixed(1)}%</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{(examAnalytics?.pass_rate || 0).toFixed(1)}%</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Completion Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {examAnalytics?.avg_completion_time
                        ? `${Math.floor(examAnalytics.avg_completion_time / 60)}m ${examAnalytics.avg_completion_time % 60}s`
                        : "N/A"}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Score Distribution</CardTitle>
                    <CardDescription>Distribution of student scores by range</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={scoreDistribution} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" name="Number of Students" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Pass/Fail Ratio</CardTitle>
                    <CardDescription>Percentage of students who passed vs failed</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: "Passed", value: examResults.filter((r) => r.passed).length },
                              { name: "Failed", value: examResults.filter((r) => !r.passed).length },
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {[0, 1].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? "#4ade80" : "#f87171"} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="results">
              <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Individual Student Results</CardTitle>
                    <CardDescription>Detailed results for each student</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportResults}
                    disabled={isExporting || !examResults.length}
                    className="mt-2 sm:mt-0"
                  >
                    {isExporting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileDown className="mr-2 h-4 w-4" />
                    )}
                    Export to CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <div className="grid grid-cols-5 gap-4 p-4 font-medium border-b">
                      <div>Student</div>
                      <div>ID</div>
                      <div>Score</div>
                      <div>Correct / Total</div>
                      <div>Status</div>
                    </div>
                    {examResults.length > 0 ? (
                      examResults.map((result) => (
                        <div key={result.id} className="grid grid-cols-5 gap-4 p-4 border-b last:border-0">
                          <div>{result.exam_users.full_name}</div>
                          <div>{result.exam_users.student_id}</div>
                          <div>{result.score}%</div>
                          <div>
                            {result.correct_answers} / {result.total_questions}
                          </div>
                          <div>
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                result.passed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                              }`}
                            >
                              {result.passed ? "Passed" : "Failed"}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500">No results found for this exam</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="questions">
              <Card>
                <CardHeader>
                  <CardTitle>Question Analysis</CardTitle>
                  <CardDescription>Performance metrics for individual questions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center p-8">
                    <p className="text-gray-500">
                      Question analysis will be available after students have taken the exam.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  )
}
