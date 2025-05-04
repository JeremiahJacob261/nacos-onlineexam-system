import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://rfbxdvwqgyhsyuamqcbl.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmYnhkdndxZ3loc3l1YW1xY2JsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzM5NTIwMSwiZXhwIjoyMDU4OTcxMjAxfQ.9URdxFPYckfvxv3J5aS8CVy4w-QLevArtpnpgtgVQyI"

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: "supabase-auth",
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export type Tables = {
  exam_users: {
    id: string
    auth_id: string
    email: string
    full_name: string
    user_type: "student" | "admin"
    student_id?: string
    created_at: string
    updated_at: string
  }
  exam_exams: {
    id: string
    title: string
    code: string
    description?: string
    duration: number
    passing_score: number
    status: "draft" | "scheduled" | "active" | "completed"
    created_by: string
    start_date?: string
    end_date?: string
    created_at: string
    updated_at: string
  }
  exam_questions: {
    id: string
    exam_id: string
    question_text: string
    question_order: number
    created_at: string
    updated_at: string
  }
  exam_options: {
    id: string
    question_id: string
    option_text: string
    option_label: string
    is_correct: boolean
    created_at: string
  }
  exam_attempts: {
    id: string
    exam_id: string
    user_id: string
    start_time: string
    end_time?: string
    status: "in_progress" | "completed" | "timed_out"
    created_at: string
    updated_at: string
  }
  exam_answers: {
    id: string
    attempt_id: string
    question_id: string
    selected_option_id?: string
    created_at: string
    updated_at: string
  }
  exam_results: {
    id: string
    attempt_id: string
    user_id: string
    exam_id: string
    score: number
    total_questions: number
    correct_answers: number
    passed: boolean
    created_at: string
  }
  exam_analytics: {
    id: string
    exam_id: string
    total_attempts: number
    avg_score: number
    pass_rate: number
    avg_completion_time?: number
    created_at: string
    updated_at: string
  }
}
