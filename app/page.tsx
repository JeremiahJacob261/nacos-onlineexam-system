import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Clock, FileText, BarChart3, Users, CheckCircle } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center">
            <Image src="/nacos.png" alt="Online Logo" width={60} height={60} priority />
            <div className="ml-4 text-center">
              <h1 className="text-3xl font-bold text-fuoye-green">Online CBT System</h1>
              <p className="text-gray-400">Nigerian Association of Computing Students Testing Platform</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <section className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Welcome to Online CBT System</h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            A comprehensive Computer-Based Testing platform designed specifically for the Nigerian Association of
            Computing Students. Experience secure, reliable, and efficient online examinations.
          </p>
        </section>

        {/* Features Grid */}
        <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <Card>
            <CardHeader>
              <Shield className="h-12 w-12 text-fuoye-green mb-4" />
              <CardTitle>Secure Testing Environment</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Advanced security features including tab monitoring, fullscreen mode, and automatic session management
                to ensure exam integrity.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Clock className="h-12 w-12 text-fuoye-green mb-4" />
              <CardTitle>Real-time Monitoring</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Live tracking of student progress, automatic time management, and instant notifications for
                administrators during active examinations.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <FileText className="h-12 w-12 text-fuoye-green mb-4" />
              <CardTitle>Easy Question Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Intuitive interface for creating, editing, and organizing exam questions with support for multiple
                choice formats and bulk CSV imports.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-12 w-12 text-fuoye-green mb-4" />
              <CardTitle>Comprehensive Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Detailed performance reports, score distributions, and analytics to help educators understand student
                performance and improve teaching methods.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-12 w-12 text-fuoye-green mb-4" />
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Separate portals for students and administrators with role-based access control and comprehensive user
                profile management.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CheckCircle className="h-12 w-12 text-fuoye-green mb-4" />
              <CardTitle>Instant Results</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Automatic grading and immediate result delivery with detailed answer reviews and performance feedback
                for students.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Important Information */}
        <section className="mb-12">
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="text-amber-800">Important Exam Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="text-amber-700">
              <ul className="space-y-2">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Ensure stable internet connection before starting any exam</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Exams must be taken in fullscreen mode - switching tabs will terminate the exam</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <span>All answers are automatically saved as you progress through the exam</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Time warnings will be displayed when 5 minutes remain</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Contact your administrator immediately if you experience technical difficulties</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Login Section */}
        <section className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Access the System</CardTitle>
              <CardDescription className="text-center">Choose your role to continue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button asChild className="w-full bg-fuoye-green hover:bg-fuoye-dark">
                <Link href="/auth/student">Student Portal</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full border-fuoye-green text-fuoye-green hover:bg-fuoye-light/10"
              >
                <Link href="/auth/admin">Administrator Portal</Link>
              </Button>
            </CardContent>
            <CardFooter className="text-sm text-gray-500 text-center">
              <p>
                New to the system? Students can register for an account. Administrators should contact the system
                administrator for access.
              </p>
            </CardFooter>
          </Card>
        </section>

        {/* Technical Support */}
        <section className="mt-12 text-center">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Need Technical Support?</h3>
              <p className="text-blue-700">
                For technical assistance, account issues, or general inquiries, please contact your system administrator
                or the Online technical support team.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-gray-400">
          <p>&copy; 2024 Nigerian Association of Computing Students. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
