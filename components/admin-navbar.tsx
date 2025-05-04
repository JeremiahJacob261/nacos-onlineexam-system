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
import { BookOpen, User, LogOut, Menu, Settings, BarChart3, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function AdminNavbar() {
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
                <Image src="/nacos.png" alt="NACOS Logo" width={40} height={40} />
                <span className="font-bold text-nacos-green">NACOS CBT</span>
              </div>
              <nav className="flex flex-col gap-4 mt-8">
                <Link
                  href="/admin/dashboard"
                  className="flex items-center gap-2 text-lg font-medium"
                  onClick={() => setOpen(false)}
                >
                  <BookOpen className="h-5 w-5" />
                  Dashboard
                </Link>
                <Link
                  href="/admin/students"
                  className="flex items-center gap-2 text-lg font-medium"
                  onClick={() => setOpen(false)}
                >
                  <Users className="h-5 w-5" />
                  Students
                </Link>
                <Link
                  href="/admin/reports"
                  className="flex items-center gap-2 text-lg font-medium"
                  onClick={() => setOpen(false)}
                >
                  <BarChart3 className="h-5 w-5" />
                  Reports
                </Link>
                <Button variant="ghost" className="justify-start px-2" onClick={handleLogout}>
                  Logout
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
          <Link href="/admin/dashboard" className="hidden items-center space-x-2 md:flex">
            <Image src="/nacos.png" alt="NACOS Logo" width={32} height={32} />
            <span className="font-bold text-nacos-green">NACOS CBT</span>
          </Link>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={userProfile?.imageUrl || "/placeholder.svg"} alt={userProfile?.name} />
                <AvatarFallback className="bg-nacos-green text-white">
                  {getInitials(userProfile?.name || "Guest")}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium leading-none">{userProfile?.name}</span>
                <span className="text-xs leading-none text-muted-foreground">{userProfile?.email}</span>
              </div>
            </DropdownMenuLabel>  
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
