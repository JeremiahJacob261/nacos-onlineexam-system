"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AdminNavbar } from "@/components/admin-navbar"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function EditExamPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [examData, setExamData] = useState({
    title: "",
    code: "",
    description: "",
    duration: "",
    date: "",
    time: "",
    status: "",
    passingScore: "",
  })

  useEffect(() => {
    fetchExamData()
  }, [params.id])

  const fetchExamData = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.from("exam_exams").select("*").eq("id", params.id).single()

      if (error) {
        throw error
      }

      if (data) {
        // Format date and time
        let date = ""
        let time = ""
        if (data.start_date) {
          const startDate = new Date(data.start_date)
          date = startDate.toISOString().split("T")[0]
          time = startDate.toTimeString().slice(0, 5)
        }

        setExamData({
          title: data.title || "",
          code: data.code || "",
          description: data.description || "",
          duration: data.duration?.toString() || "",
          date,
          time,
          status: data.status || "draft",
          passingScore: data.passing_score?.toString() || "",
        })
      }
    } catch (error) {
      console.error("Error fetching exam data:", error)
      setError("Failed to load exam data")
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setExamData({
      ...examData,
      [name]: value,
    })
  }

  const handleSelectChange = (name: string, value: string) => {
    setExamData({
      ...examData,
      [name]: value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError("")
    setSuccess("")

    try {
      // Validate form
      if (!examData.title || !examData.code || !examData.duration || !examData.passingScore) {
        throw new Error("Please fill in all required fields")
      }

      // Format date and time if provided
      let startDate = null
      if (examData.date && examData.time) {
        startDate = new Date(`${examData.date}T${examData.time}:00`)
      }

      // Update the exam
      const { error } = await supabase
        .from("exam_exams")
        .update({
          title: examData.title,
          code: examData.code,
          description: examData.description,
          duration: Number.parseInt(examData.duration),
          passing_score: Number.parseInt(examData.passingScore),
          status: examData.status,
          start_date: startDate ? startDate.toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id)

      if (error) {
        throw error
      }

      setSuccess("Exam updated successfully")
    } catch (error: any) {
      console.error("Error updating exam:", error)
      setError(error.message || "Failed to update exam")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <main className="container mx-auto p-4 md:p-6">
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />

      <main className="container mx-auto p-4 md:p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/dashboard">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-3xl font-bold">Edit Exam</h1>
          </div>
          <p className="text-gray-500">Update exam details</p>
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

        <Card>
          <CardHeader>
            <CardTitle>Exam Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Exam Title <span className="text-red-500">*</span>
                  </Label>
                  <Input id="title" name="title" value={examData.title} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">
                    Course Code <span className="text-red-500">*</span>
                  </Label>
                  <Input id="code" name="code" value={examData.code} onChange={handleInputChange} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={examData.description}
                  onChange={handleInputChange}
                  className="min-h-[100px]"
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
                    value={examData.duration}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" name="date" type="date" value={examData.date} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input id="time" name="time" type="time" value={examData.time} onChange={handleInputChange} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    name="status"
                    value={examData.status}
                    onValueChange={(value) => handleSelectChange("status", value)}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
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
                    value={examData.passingScore}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" asChild>
                  <Link href="/admin/dashboard">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
