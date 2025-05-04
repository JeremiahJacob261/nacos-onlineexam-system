"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { AdminNavbar } from "@/components/admin-navbar"
import {
  PlusCircle,
  Users,
  Clock,
  Calendar,
  BookOpen,
  BarChart3,
  FileText,
  Edit,
  Trash2,
  Loader2,
  FileDown,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RealTimeMonitoring } from "@/components/real-time-monitoring"

// Function to download CSV
const downloadCSV = (data: any[], filename: string) => {
  const csv = convertArrayOfObjectsToCSV(data)
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Function to convert JSON to CSV
const convertArrayOfObjectsToCSV = (data: any[]) => {
  if (!data || data.length === 0) {
    return ""
  }

  const columnDelimiter = ","
  const lineDelimiter = "\n"
  const keys = Object.keys(data[0])
  let result = ""

  result += keys.join(columnDelimiter)
  result += lineDelimiter

  data.forEach((item) => {
    let ctr = 0
    keys.forEach((key) => {
      if (ctr > 0) result += columnDelimiter

      result += item[key]
      ctr++
    })
    result += lineDelimiter
  })

  return result
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("exams")
  const [showNewExamDialog, setShowNewExamDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [examToDelete, setExamToDelete] = useState<string | null>(null)
  const [exams, setExams] = useState<any[]>([])
  const [activeStudents, setActiveStudents] = useState<any[]>([])
  const [results, setResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [newExamData, setNewExamData] = useState({
    title: "",
    code: "",
    description: "",
    duration: "60",
    date: "",
    time: "",
    status: "draft",
    passingScore: "60",
  })

  useEffect(() => {
    fetchExams()
    fetchActiveStudents()
    fetchResults()
  }, [])

  const fetchExams = async () => {
    try {
      const { data, error } = await supabase.from("exam_exams").select("*").order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      setExams(data || [])
    } catch (error) {
      console.error("Error fetching exams:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchActiveStudents = async () => {
    try {
      const { data, error } = await supabase
        .from("exam_attempts")
        .select(`
          id, start_time, status,
          exam_users (full_name, student_id),
          exam_exams (title)
        `)
        .eq("status", "in_progress")

      if (error) {
        throw error
      }

      // Format the data
      const formattedData = data?.map((attempt) => ({
        id: attempt.id,
        name: attempt.exam_users?.full_name || "Unknown",
        studentId: attempt.exam_users?.student_id || "Unknown",
        exam: attempt.exam_exams?.title || "Unknown",
        startTime: new Date(attempt.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        progress: Math.floor(Math.random() * 100), // Placeholder for now
      }))

      setActiveStudents(formattedData || [])
    } catch (error) {
      console.error("Error fetching active students:", error)
    }
  }

  const fetchResults = async () => {
    try {
      const { data, error } = await supabase
        .from("exam_results")
        .select(`
          id, score, total_questions, correct_answers, passed,
          exam_exams (id, title, code)
        `)
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      // Group results by exam
      const groupedResults: Record<string, any> = {}
      data?.forEach((result) => {
        const examId = result.exam_exams?.id
        if (!examId) return

        if (!groupedResults[examId]) {
          groupedResults[examId] = {
            id: examId,
            exam: result.exam_exams?.title || "Unknown",
            code: result.exam_exams?.code || "Unknown",
            date: new Date(result.created_at).toLocaleDateString(),
            students: 0,
            avgScore: 0,
            highScore: 0,
            lowScore: 100,
            totalScore: 0,
          }
        }

        const group = groupedResults[examId]
        group.students += 1
        group.totalScore += result.score
        group.highScore = Math.max(group.highScore, result.score)
        group.lowScore = Math.min(group.lowScore, result.score)
        group.avgScore = Math.round(group.totalScore / group.students)
      })

      setResults(Object.values(groupedResults))
    } catch (error) {
      console.error("Error fetching results:", error)
    }
  }

  const handleDeleteClick = (examId: string) => {
    setExamToDelete(examId)
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    if (!examToDelete) return

    try {
      // Delete the exam
      const { error } = await supabase.from("exam_exams").delete().eq("id", examToDelete)

      if (error) {
        throw error
      }

      // Update the local state
      setExams(exams.filter((exam) => exam.id !== examToDelete))
      setSuccess("Exam deleted successfully")
    } catch (error) {
      console.error("Error deleting exam:", error)
      setError("Failed to delete exam")
    } finally {
      setShowDeleteDialog(false)
      setExamToDelete(null)
    }
  }

  const handleExamInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNewExamData({
      ...newExamData,
      [name]: value,
    })
  }

  const handleSelectChange = (name: string, value: string) => {
    setNewExamData({
      ...newExamData,
      [name]: value,
    })
  }

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")
    setSuccess("")

    try {
      // Validate form
      if (!newExamData.title || !newExamData.code || !newExamData.duration) {
        throw new Error("Please fill in all required fields")
      }

      // Format date and time if provided
      let startDate = null
      if (newExamData.date && newExamData.time) {
        startDate = new Date(`${newExamData.date}T${newExamData.time}:00`)
      }

      // Create the exam
      const { data, error } = await supabase
        .from("exam_exams")
        .insert({
          title: newExamData.title,
          code: newExamData.code,
          description: newExamData.description,
          duration: Number.parseInt(newExamData.duration),
          passing_score: Number.parseInt(newExamData.passingScore),
          status: newExamData.status,
          created_by: user?.id,
          start_date: startDate ? startDate.toISOString() : null,
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Add the new exam to the state
      setExams([data, ...exams])
      setSuccess("Exam created successfully")

      // Reset form and close dialog
      setNewExamData({
        title: "",
        code: "",
        description: "",
        duration: "60",
        date: "",
        time: "",
        status: "draft",
        passingScore: "60",
      })
      setShowNewExamDialog(false)
    } catch (error: any) {
      console.error("Error creating exam:", error)
      setError(error.message || "Failed to create exam")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />

      <main className="container mx-auto p-4 md:p-6">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-500">Manage exams, monitor students, and view results</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setShowNewExamDialog(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Exam
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/students">
                <Users className="mr-2 h-4 w-4" />
                Manage Students
              </Link>
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 border-green-500 bg-green-50">
            <AlertDescription className="text-green-700">{success}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="exams" onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="exams">Exams</TabsTrigger>
            <TabsTrigger value="active">Active Students</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          {/* Exams Tab */}
          <TabsContent value="exams" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : exams.length > 0 ? (
              exams.map((exam) => (
                <Card key={exam.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{exam.title}</CardTitle>
                        <CardDescription>Course Code: {exam.code}</CardDescription>
                      </div>
                      <Badge
                        variant={
                          exam.status === "active" ? "default" : exam.status === "scheduled" ? "outline" : "secondary"
                        }
                      >
                        {exam.status === "active" ? "Active" : exam.status === "scheduled" ? "Scheduled" : "Draft"}
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
                        <span>Passing Score: {exam.passing_score}%</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                        <span>
                          {exam.start_date
                            ? new Date(exam.start_date).toLocaleString([], {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                            : "No date set"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" className="flex-1 sm:flex-none">
                      <Link href={`/admin/exams/${exam.id}/edit`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Exam
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="flex-1 sm:flex-none">
                      <Link href={`/admin/exams/${exam.id}/questions`}>
                        <FileText className="mr-2 h-4 w-4" />
                        Manage Questions
                      </Link>
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1 sm:flex-none"
                      onClick={() => handleDeleteClick(exam.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500 mb-4">No exams have been created yet.</p>
                  <Button onClick={() => setShowNewExamDialog(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Your First Exam
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Active Students Tab */}
          <TabsContent value="active" className="space-y-4">
            {activeTab === "active" && <RealTimeMonitoring examId="" />}
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-4">
            {results.length > 0 ? (
              results.map((result) => (
                <Card key={result.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{result.exam}</CardTitle>
                        <CardDescription>Course Code: {result.code}</CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{result.avgScore}%</div>
                        <div className="text-sm text-gray-500">Average Score</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                        <span>{result.date}</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="mr-2 h-4 w-4 text-gray-500" />
                        <span>{result.students} students</span>
                      </div>
                      <div className="flex items-center">
                        <BarChart3 className="mr-2 h-4 w-4 text-green-500" />
                        <span>Highest: {result.highScore}%</span>
                      </div>
                      <div className="flex items-center">
                        <BarChart3 className="mr-2 h-4 w-4 text-red-500" />
                        <span>Lowest: {result.lowScore}%</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-wrap gap-2">
                    <Button asChild className="w-full sm:w-auto">
                      <Link href={`/admin/reports?exam=${result.id}`}>View Detailed Results</Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        // Format the data for export
                        const exportData = [
                          {
                            Exam_Title: result.exam,
                            Exam_Code: result.code,
                            Date: result.date,
                            Total_Students: result.students,
                            Average_Score: `${result.avgScore}%`,
                            Highest_Score: `${result.highScore}%`,
                            Lowest_Score: `${result.lowScore}%`,
                          },
                        ]

                        // Generate filename
                        const filename = `${result.code}_summary_${new Date().toISOString().split("T")[0]}.csv`

                        // Download the CSV
                        downloadCSV(exportData, filename)
                      }}
                    >
                      <FileDown className="mr-2 h-4 w-4" />
                      Export Summary
                    </Button>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">No exam results available yet.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Create Exam Dialog */}
      <Dialog open={showNewExamDialog} onOpenChange={setShowNewExamDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Exam</DialogTitle>
            <DialogDescription>
              Fill in the details to create a new exam. You can add questions later.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateExam}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Exam Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="e.g. Introduction to Computer Science"
                    value={newExamData.title}
                    onChange={handleExamInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">
                    Course Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="code"
                    name="code"
                    placeholder="e.g. CS101"
                    value={newExamData.code}
                    onChange={handleExamInputChange}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Provide a brief description of the exam"
                  value={newExamData.description}
                  onChange={handleExamInputChange}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">
                    Duration (minutes) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="duration"
                    name="duration"
                    type="number"
                    min="1"
                    placeholder="60"
                    value={newExamData.duration}
                    onChange={handleExamInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" name="date" type="date" value={newExamData.date} onChange={handleExamInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input id="time" name="time" type="time" value={newExamData.time} onChange={handleExamInputChange} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    name="status"
                    value={newExamData.status}
                    onValueChange={(value) => handleSelectChange("status", value)}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passingScore">
                    Passing Score (%) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="passingScore"
                    name="passingScore"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="60"
                    value={newExamData.passingScore}
                    onChange={handleExamInputChange}
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setShowNewExamDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Exam"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this exam? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
