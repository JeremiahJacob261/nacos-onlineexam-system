"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "./supabase"
import { useRouter } from "next/navigation"

type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signIn: (
    email: string,
    password: string,
  ) => Promise<{
    error: Error | null
    data: { user: User | null; session: Session | null }
  }>
  signUp: (
    email: string,
    password: string,
    userData: any,
  ) => Promise<{
    error: Error | null
    data: { user: User | null; session: Session | null }
  }>
  signOut: () => Promise<void>
  userType: "student" | "admin" | null
  userProfile: any | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userType, setUserType] = useState<"student" | "admin" | null>(null)
  const [userProfile, setUserProfile] = useState<any | null>(null)
  const router = useRouter()

  useEffect(() => {
    const getSession = async () => {
      setIsLoading(true)
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error) {
        console.error("Error getting session:", error)
      }

      setSession(session)
      setUser(session?.user || null)

      if (session?.user) {
        // Fetch user type and profile
        const { data: userData, error: userError } = await supabase
          .from("exam_users")
          .select("*")
          .eq("auth_id", session.user.id)
          .single()

        if (userError) {
          console.error("Error fetching user data:", userError)
        } else if (userData) {
          setUserType(userData.user_type)
          setUserProfile(userData)
        }
      }

      setIsLoading(false)
    }

    getSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user || null)

      if (session?.user) {
        // Fetch user type and profile when auth state changes
        const fetchUserData = async () => {
          const { data: userData, error: userError } = await supabase
            .from("exam_users")
            .select("*")
            .eq("auth_id", session.user.id)
            .single()

          if (userError) {
            console.error("Error fetching user data:", userError)
          } else if (userData) {
            setUserType(userData.user_type)
            setUserProfile(userData)
          }
        }

        fetchUserData()
      } else {
        setUserType(null)
        setUserProfile(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    setIsLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setIsLoading(false)
    return { data, error }
  }

  const signUp = async (email: string, password: string, userData: any) => {
    setIsLoading(true)

    // First create the auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error || !data.user) {
      setIsLoading(false)
      return { data, error }
    }

    // Then create the user profile
    const { error: profileError } = await supabase.from("exam_users").insert([
      {
        auth_id: data.user.id,
        email: email,
        ...userData,
      },
    ])

    if (profileError) {
      console.error("Error creating user profile:", profileError)
      // If profile creation fails, we should delete the auth user
      // But Supabase doesn't expose a direct method for this in the client
      // In a real app, you'd handle this with a server function
    }

    setIsLoading(false)
    return { data, error: profileError || error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setUserType(null)
    setUserProfile(null)
    router.push("/")
  }

  const value = {
    user,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
    userType,
    userProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
