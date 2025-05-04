import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Check auth condition
  if (!session) {
    // If the user is not signed in and trying to access a protected route
    const isProtectedRoute = req.nextUrl.pathname.startsWith("/student") || req.nextUrl.pathname.startsWith("/admin")

    if (isProtectedRoute) {
      const redirectUrl = new URL("/", req.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // If user is signed in, check user type for proper authorization
  if (session) {
    // Get user profile to check user type
    const { data: userData } = await supabase
      .from("exam_users")
      .select("user_type")
      .eq("auth_id", session.user.id)
      .single()

    // Redirect if user is trying to access unauthorized routes
    if (userData) {
      const isStudentRoute = req.nextUrl.pathname.startsWith("/student")
      const isAdminRoute = req.nextUrl.pathname.startsWith("/admin")

      if (isStudentRoute && userData.user_type !== "student") {
        const redirectUrl = new URL("/", req.url)
        return NextResponse.redirect(redirectUrl)
      }

      if (isAdminRoute && userData.user_type !== "admin") {
        const redirectUrl = new URL("/", req.url)
        return NextResponse.redirect(redirectUrl)
      }
    }
  }

  return res
}

export const config = {
  matcher: ["/student/:path*", "/admin/:path*"],
}
