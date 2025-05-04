"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { Loader2 } from "lucide-react"

interface MonitoringProps {
  examId: string
}

export function RealTimeMonitoring({ examId }: MonitoringProps) {
  const [activeStudents, setActiveStudents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchActiveStudents = async () => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from("exam_attempts")
          .select(`
            id, start_time, status,
            exam_users (id, full_name, student_id),
            exam_answers (id)
          `)
          .eq("exam_id", examId)
          .eq("status", "in_progress")

        if (error) {
          throw error
        }

        // Process the data to calculate progress
        const processedData = data?.map((attempt) => {
          // Count answers as progress
          const answeredQuestions = attempt.exam_answers?.length || 0

          // Calculate time elapsed
          const startTime = new Date(attempt.start_time)
          const currentTime = new Date()
          const elapsedMinutes = Math.floor((currentTime.getTime() - startTime.getTime()) / 60000)

          return {
            id: attempt.id,
            student: attempt.exam_users,
            startTime: startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            elapsedMinutes,
            progress: Math.min(100, answeredQuestions * 5), // Assuming 20 questions total
          }
        })

        setActiveStudents(processedData || [])
      } catch (error) {
        console.error("Error fetching active students:", error)
      } finally {
        setIsLoading(false)
      }
    }

    // Initial fetch
    fetchActiveStudents()

    // Set up real-time subscription
    const subscription = supabase
      .channel("exam_attempts_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "exam_attempts",
          filter: `exam_id=eq.${examId}`,
        },
        () => {
          fetchActiveStudents()
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "exam_answers",
        },
        () => {
          fetchActiveStudents()
        },
      )
      .subscribe()

    // Clean up subscription
    return () => {
      subscription.unsubscribe()
    }
  }, [examId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Students</CardTitle>
        <CardDescription>Students currently taking this exam</CardDescription>
      </CardHeader>
      <CardContent>
        {activeStudents.length === 0 ? (
          <div className="text-center p-4 text-gray-500">No students are currently taking this exam</div>
        ) : (
          <div className="rounded-md border">
            <div className="grid grid-cols-5 gap-4 p-4 font-medium border-b">
              <div>Student</div>
              <div>ID</div>
              <div>Started</div>
              <div>Time Elapsed</div>
              <div>Progress</div>
            </div>
            {activeStudents.map((student) => (
              <div key={student.id} className="grid grid-cols-5 gap-4 p-4 border-b last:border-0">
                <div>{student.student.full_name}</div>
                <div>{student.student.student_id}</div>
                <div>{student.startTime}</div>
                <div>
                  {student.elapsedMinutes} min
                  {student.elapsedMinutes > 45 && (
                    <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-700 border-amber-200">
                      Almost Done
                    </Badge>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Progress value={student.progress} className="h-2" />
                    <span className="text-sm">{student.progress}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
