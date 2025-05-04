"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { AdminNavbar } from "@/components/admin-navbar"
import { PlusCircle, FileSpreadsheet, ArrowLeft, Edit, Trash2, Save, X, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { CSVImport } from "@/components/csv-import"

export default function QuestionsPage({ params }: { params: { id: string } }) {
  const [examData, setExamData] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null)
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null)
  const [newQuestion, setNewQuestion] = useState({
    text: "",
    options: [
      { id: "a", text: "" },
      { id: "b", text: "" },
      { id: "c", text: "" },
      { id: "d", text: "" },
    ],
    correctAnswer: "a",
  })

  useEffect(() => {
    fetchExamData()
    fetchQuestions()
  }, [params.id])

  const fetchExamData = async () => {
    try {
      const { data, error } = await supabase.from("exam_exams").select("*").eq("id", params.id).single()

      if (error) {
        throw error
      }

      setExamData(data)
    } catch (error) {
      console.error("Error fetching exam data:", error)
    }
  }

  const fetchQuestions = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("exam_questions")
        .select(`
          *,
          options:exam_options(*)
        `)
        .eq("exam_id", params.id)
        .order("question_order", { ascending: true })

      if (error) {
        throw error
      }

      // Format the questions data
      const formattedQuestions = data.map((q) => ({
        id: q.id,
        text: q.question_text,
        options: q.options.map((o: any) => ({
          id: o.option_label,
          text: o.option_text,
        })),
        correctAnswer: q.options.find((o: any) => o.is_correct)?.option_label || "a",
      }))

      setQuestions(formattedQuestions)
    } catch (error) {
      console.error("Error fetching questions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteClick = (questionId: string) => {
    setQuestionToDelete(questionId)
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    if (!questionToDelete) return

    try {
      // First delete the options
      const { error: optionsError } = await supabase.from("exam_options").delete().eq("question_id", questionToDelete)

      if (optionsError) {
        throw optionsError
      }

      // Then delete the question
      const { error: questionError } = await supabase.from("exam_questions").delete().eq("id", questionToDelete)

      if (questionError) {
        throw questionError
      }

      // Update the local state
      setQuestions(questions.filter((q) => q.id !== questionToDelete))
    } catch (error) {
      console.error("Error deleting question:", error)
    } finally {
      setShowDeleteDialog(false)
      setQuestionToDelete(null)
    }
  }

  const handleEditClick = (questionId: string) => {
    setEditingQuestion(questionId)
  }

  const handleSaveEdit = async (questionId: string, updatedQuestion: any) => {
    try {
      // Update the question text
      const { error: questionError } = await supabase
        .from("exam_questions")
        .update({ question_text: updatedQuestion.text })
        .eq("id", questionId)

      if (questionError) {
        throw questionError
      }

      // Update each option
      for (const option of updatedQuestion.options) {
        const { error: optionError } = await supabase
          .from("exam_options")
          .update({
            option_text: option.text,
            is_correct: option.id === updatedQuestion.correctAnswer,
          })
          .eq("question_id", questionId)
          .eq("option_label", option.id)

        if (optionError) {
          throw optionError
        }
      }

      // Update the local state
      setQuestions(questions.map((q) => (q.id === questionId ? updatedQuestion : q)))
    } catch (error) {
      console.error("Error updating question:", error)
    } finally {
      setEditingQuestion(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingQuestion(null)
  }

  const handleAddQuestion = async () => {
    try {
      // Create the question
      const { data: questionData, error: questionError } = await supabase
        .from("exam_questions")
        .insert({
          exam_id: params.id,
          question_text: newQuestion.text,
          question_order: questions.length + 1,
        })
        .select()
        .single()

      if (questionError || !questionData) {
        throw questionError
      }

      // Create the options
      for (const option of newQuestion.options) {
        const { error: optionError } = await supabase.from("exam_options").insert({
          question_id: questionData.id,
          option_text: option.text,
          option_label: option.id,
          is_correct: option.id === newQuestion.correctAnswer,
        })

        if (optionError) {
          throw optionError
        }
      }

      // Add to local state
      setQuestions([
        ...questions,
        {
          id: questionData.id,
          text: newQuestion.text,
          options: newQuestion.options,
          correctAnswer: newQuestion.correctAnswer,
        },
      ])

      // Reset the form
      setNewQuestion({
        text: "",
        options: [
          { id: "a", text: "" },
          { id: "b", text: "" },
          { id: "c", text: "" },
          { id: "d", text: "" },
        ],
        correctAnswer: "a",
      })
    } catch (error) {
      console.error("Error adding question:", error)
    } finally {
      setShowAddDialog(false)
    }
  }

  const handleNewQuestionChange = (field: string, value: string) => {
    setNewQuestion({
      ...newQuestion,
      [field]: value,
    })
  }

  const handleNewOptionChange = (optionId: string, value: string) => {
    setNewQuestion({
      ...newQuestion,
      options: newQuestion.options.map((option) => (option.id === optionId ? { ...option, text: value } : option)),
    })
  }

  const handleImportSuccess = () => {
    setShowImportDialog(false)
    fetchQuestions()
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
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/dashboard">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <h1 className="text-3xl font-bold">{examData?.title || "Loading..."}</h1>
            </div>
            <p className="text-gray-500">Manage questions for {examData?.code || ""}</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setShowAddDialog(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Question
            </Button>
            <Button variant="outline" onClick={() => setShowImportDialog(true)}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Import Questions
            </Button>
          </div>
        </div>

        <Tabs defaultValue="list">
          <TabsList className="mb-4">
            <TabsTrigger value="list">Question List</TabsTrigger>
            <TabsTrigger value="preview">Exam Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            {questions.length > 0 ? (
              questions.map((question, index) => (
                <Card key={question.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="flex items-start gap-2">
                        <span className="bg-gray-100 text-gray-700 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                          {index + 1}
                        </span>
                        {editingQuestion === question.id ? (
                          <Textarea
                            defaultValue={question.text}
                            className="min-h-[60px]"
                            onChange={(e) => {
                              const updatedQuestion = { ...question, text: e.target.value }
                              setQuestions(questions.map((q) => (q.id === question.id ? updatedQuestion : q)))
                            }}
                          />
                        ) : (
                          <span>{question.text}</span>
                        )}
                      </CardTitle>
                      {editingQuestion === question.id ? (
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                            <X className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(question.id, question)}>
                            <Save className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEditClick(question.id)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteClick(question.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {editingQuestion === question.id ? (
                      <div className="space-y-4">
                        {question.options.map((option: any) => (
                          <div key={option.id} className="flex items-center gap-2">
                            <div className="bg-gray-200 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                              {option.id.toUpperCase()}
                            </div>
                            <Input
                              defaultValue={option.text}
                              className="flex-1"
                              onChange={(e) => {
                                const updatedOptions = question.options.map((o: any) =>
                                  o.id === option.id ? { ...o, text: e.target.value } : o,
                                )
                                const updatedQuestion = { ...question, options: updatedOptions }
                                setQuestions(questions.map((q) => (q.id === question.id ? updatedQuestion : q)))
                              }}
                            />
                            <RadioGroup
                              value={question.correctAnswer}
                              onValueChange={(value) => {
                                const updatedQuestion = { ...question, correctAnswer: value }
                                setQuestions(questions.map((q) => (q.id === question.id ? updatedQuestion : q)))
                              }}
                              className="flex"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value={option.id} id={`correct-${question.id}-${option.id}`} />
                                <Label htmlFor={`correct-${question.id}-${option.id}`}>Correct</Label>
                              </div>
                            </RadioGroup>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {question.options.map((option: any) => (
                          <div
                            key={option.id}
                            className={`flex items-center space-x-2 rounded-md border p-3 ${
                              option.id === question.correctAnswer ? "bg-green-50 border-green-200" : ""
                            }`}
                          >
                            <div className="bg-gray-200 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                              {option.id.toUpperCase()}
                            </div>
                            <span>{option.text}</span>
                            {option.id === question.correctAnswer && (
                              <span className="ml-auto text-green-600 text-sm font-medium">Correct</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500 mb-4">No questions have been added to this exam yet.</p>
                  <Button onClick={() => setShowAddDialog(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Your First Question
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle>Exam Preview</CardTitle>
                <CardDescription>This is how students will see the exam</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {questions.length > 0 ? (
                  questions.map((question, index) => (
                    <div key={question.id} className="space-y-4">
                      <div className="flex items-start gap-2">
                        <span className="bg-gray-100 text-gray-700 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                          {index + 1}
                        </span>
                        <span className="font-medium">{question.text}</span>
                      </div>
                      <RadioGroup className="ml-10 space-y-3">
                        {question.options.map((option: any) => (
                          <div key={option.id} className="flex items-center space-x-2 rounded-md border p-4">
                            <RadioGroupItem value={option.id} id={`preview-${index}-${option.id}`} />
                            <Label htmlFor={`preview-${index}-${option.id}`} className="flex items-center">
                              <span className="bg-gray-200 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">
                                {option.id.toUpperCase()}
                              </span>
                              {option.text}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-8">
                    <p className="text-gray-500">
                      No questions to preview. Add questions to see how they will appear to students.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Add Question Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Question</DialogTitle>
            <DialogDescription>Create a new multiple choice question for this exam.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="question-text">Question</Label>
              <Textarea
                id="question-text"
                placeholder="Enter your question here"
                value={newQuestion.text}
                onChange={(e) => handleNewQuestionChange("text", e.target.value)}
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-4">
              <Label>Options</Label>
              {newQuestion.options.map((option) => (
                <div key={option.id} className="flex items-center gap-2">
                  <div className="bg-gray-200 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                    {option.id.toUpperCase()}
                  </div>
                  <Input
                    placeholder={`Option ${option.id.toUpperCase()}`}
                    value={option.text}
                    onChange={(e) => handleNewOptionChange(option.id, e.target.value)}
                    className="flex-1"
                  />
                  <RadioGroup
                    value={newQuestion.correctAnswer}
                    onValueChange={(value) => handleNewQuestionChange("correctAnswer", value)}
                    className="flex"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value={option.id} id={`new-correct-${option.id}`} />
                      <Label htmlFor={`new-correct-${option.id}`}>Correct</Label>
                    </div>
                  </RadioGroup>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button type="submit" onClick={handleAddQuestion}>
              Add Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this question? This action cannot be undone.
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

      {/* CSV Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Import Questions from CSV</DialogTitle>
          </DialogHeader>
          <CSVImport examId={params.id} onSuccess={handleImportSuccess} onCancel={() => setShowImportDialog(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
