"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BookOpen, User, LogOut, Menu } from "lucide-react"
import { useRouter } from "next/navigation"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function StudentNavbar() {
  const router = useRouter()
  const { signOut, userProfile } = useAuth()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    await signOut()
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[240px] sm:w-[300px]">
              <div className="flex items-center gap-2 mb-8">
                <Image src="/fuoye.png" alt="fuoye Logo" width={40} height={40} />
                <span className="font-bold text-fuoye-green">fuoye CBT</span>
              </div>
              <nav className="flex flex-col gap-4">
                <Link
                  href="/student/dashboard"
                  className="flex items-center gap-2 text-lg font-medium"
                  onClick={() => setOpen(false)}
                >
                  <BookOpen className="h-5 w-5" />
                  Dashboard
                </Link>
                <Link
                  href="/student/profile"
                  className="flex items-center gap-2 text-lg font-medium"
                  onClick={() => setOpen(false)}
                >
                  <User className="h-5 w-5" />
                  Profile
                </Link>
                <Button variant="ghost" className="justify-start px-2" onClick={handleLogout}>
                  <LogOut className="mr-2 h-5 w-5" />
                  Logout
                </Button>
              </nav>
            </SheetContent>
          </Sheet>

          <Link href="/student/dashboard" className="flex items-center gap-2">
            <Image src="/fuoye.png" alt="fuoye Logo" width={32} height={32} className="hidden sm:block" />
            <span className="font-bold text-fuoye-green text-xl hidden sm:inline-block">fuoye CBT</span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/student/dashboard" className="text-sm font-medium transition-colors hover:text-fuoye-green">
            Dashboard
          </Link>
          <Link href="/student/profile" className="text-sm font-medium transition-colors hover:text-fuoye-green">
            Profile
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder-user.jpg" alt="Profile" />
                  <AvatarFallback className="bg-fuoye-green text-white">
                    {userProfile?.full_name ? getInitials(userProfile.full_name) : "ST"}
                  </AvatarFallback>
                </Avatar>
                <span className="sr-only">User menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{userProfile?.full_name || "Student"}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/student/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
