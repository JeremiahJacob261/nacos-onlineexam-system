import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">CBT System</h1>
          <p className="mt-2 text-gray-600">Online Computer-Based Testing Platform</p>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Choose your role</CardTitle>
              <CardDescription>Log in based on your role in the system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button asChild className="w-full">
                <Link href="/auth/student">Student Login</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/auth/admin">Admin Login</Link>
              </Button>
            </CardContent>
            <CardFooter className="text-sm text-gray-500 text-center">
              Contact your administrator if you need help accessing the system.
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
