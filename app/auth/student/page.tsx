"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Loader2 } from "lucide-react"
import Image from 'next/image';
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth-context"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function StudentLogin() {
  const router = useRouter()
  const { signIn } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const supabase = createClientComponentClient()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const { error, data } = await signIn(formData.email, formData.password)

      if (error) {
        setError(error.message)
        return
      }

      // Check if the user is a student
      const { data: userData, error: userError } = await supabase
        .from("exam_users")
        .select("user_type")
        .eq("auth_id", data.user?.id)
        .single()

      if (userError || !userData) {
        setError("User profile not found")
        return
      }

      if (userData.user_type !== "student") {
        setError("Access denied. This login is for students only.")
        return
      }

      router.push("/student/dashboard")
    } catch (err) {
      setError("An error occurred during login")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
      <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Image src="/nacos.png" alt="NACOS Logo" width={80} height={80} priority />
            </div>
            <CardTitle className="text-nacos-green">Student Login</CardTitle>
            <CardDescription>Enter your email and password to access your exams</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-nacos-green hover:bg-nacos-dark" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Login"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Link href="/" className="text-sm text-gray-500 hover:text-nacos-green">
              Back to home
            </Link>
            <Link href="/auth/student/register" className="text-sm text-nacos-green hover:text-nacos-dark">
              Register
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
