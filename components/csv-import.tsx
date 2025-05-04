"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, FileSpreadsheet, Loader2, Upload } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { parseCSV, importQuestionsToExam, type QuestionImportData } from "@/lib/csv-import"

interface CSVImportProps {
  examId: string
  onSuccess: () => void
  onCancel: () => void
}

export function CSVImport({ examId, onSuccess, onCancel }: CSVImportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [preview, setPreview] = useState<QuestionImportData[]>([])
  const [isPreviewMode, setIsPreviewMode] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)

      // Read the file to preview
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const csvText = event.target?.result as string
          const parsedQuestions = parseCSV(csvText)
          setPreview(parsedQuestions)
          setIsPreviewMode(true)
          setError("")
        } catch (err) {
          setError("Failed to parse CSV file. Please check the format.")
          console.error(err)
        }
      }
      reader.readAsText(selectedFile)
    }
  }

  const handleImport = async () => {
    if (!file || preview.length === 0) {
      setError("No valid questions found in the CSV file.")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const result = await importQuestionsToExam(examId, preview)

      if (result.success) {
        onSuccess()
      } else {
        setError("Failed to import questions. Please try again.")
      }
    } catch (err) {
      setError("An error occurred during import")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Import Questions from CSV</CardTitle>
        <CardDescription>
          Upload a CSV file with questions, options, and answers. Format: question, option a, option b, option c, option
          d, answer (A/B/C/D)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isPreviewMode ? (
          <div className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="csv-file">CSV File</Label>
              <div className="flex gap-2">
                <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} className="flex-1" />
                <Button variant="outline" size="icon">
                  <FileSpreadsheet className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="rounded-md border p-4">
              <div className="flex flex-col items-center justify-center space-y-2 py-4">
                <FileSpreadsheet className="h-10 w-10 text-gray-400" />
                <div className="text-sm text-gray-500">Upload a CSV file with questions and options</div>
                <div className="text-xs text-gray-400">Example: "What is 2+2?", "3", "4", "5", "6", "B"</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm font-medium">Preview: {preview.length} questions found</div>
            <div className="max-h-96 overflow-y-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-2 text-left">Question</th>
                    <th className="p-2 text-left">A</th>
                    <th className="p-2 text-left">B</th>
                    <th className="p-2 text-left">C</th>
                    <th className="p-2 text-left">D</th>
                    <th className="p-2 text-left">Answer</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((q, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">{q.question}</td>
                      <td className="p-2">{q.optionA}</td>
                      <td className="p-2">{q.optionB}</td>
                      <td className="p-2">{q.optionC}</td>
                      <td className="p-2">{q.optionD}</td>
                      <td className="p-2 font-medium">{q.answer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        {isPreviewMode ? (
          <Button onClick={handleImport} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import Questions
              </>
            )}
          </Button>
        ) : (
          <Button disabled={!file}>Preview</Button>
        )}
      </CardFooter>
    </Card>
  )
}
