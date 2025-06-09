"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface ExamSecurityOptions {
  onTabSwitch: () => void
  onTimeWarning: () => void
  onTimeUp: () => void
  examDuration: number // in seconds
  warningTime?: number // seconds before exam ends to show warning
}

export function useExamSecurity({
  onTabSwitch,
  onTimeWarning,
  onTimeUp,
  examDuration,
  warningTime = 300, // 5 minutes default
}: ExamSecurityOptions) {
  const [isVisible, setIsVisible] = useState(true)
  const [timeLeft, setTimeLeft] = useState(examDuration)
  const [hasWarned, setHasWarned] = useState(false)
  const [violations, setViolations] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<Date>(new Date())

  // Handle visibility change (tab switching)
  const handleVisibilityChange = useCallback(() => {
    const isCurrentlyVisible = !document.hidden
    setIsVisible(isCurrentlyVisible)

    if (!isCurrentlyVisible) {
      setViolations((prev) => prev + 1)
      onTabSwitch()
    }
  }, [onTabSwitch])

  // Handle focus/blur events
  const handleFocus = useCallback(() => {
    setIsVisible(true)
  }, [])

  const handleBlur = useCallback(() => {
    setIsVisible(false)
    setViolations((prev) => prev + 1)
    onTabSwitch()
  }, [onTabSwitch])

  // Prevent right-click context menu
  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault()
  }, [])

  // Prevent certain keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Prevent F12, Ctrl+Shift+I, Ctrl+U, etc.
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && e.key === "I") ||
        (e.ctrlKey && e.shiftKey && e.key === "C") ||
        (e.ctrlKey && e.key === "u") ||
        (e.ctrlKey && e.key === "s") ||
        (e.altKey && e.key === "Tab") ||
        (e.ctrlKey && e.key === "Tab")
      ) {
        e.preventDefault()
        setViolations((prev) => prev + 1)
        onTabSwitch()
      }
    },
    [onTabSwitch],
  )

  // Timer management
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1

        // Show warning
        if (newTime === warningTime && !hasWarned) {
          setHasWarned(true)
          onTimeWarning()
        }

        // Time up
        if (newTime <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current)
          }
          onTimeUp()
          return 0
        }

        return newTime
      })
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [warningTime, hasWarned, onTimeWarning, onTimeUp])

  // Set up event listeners
  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)
    window.addEventListener("blur", handleBlur)
    document.addEventListener("contextmenu", handleContextMenu)
    document.addEventListener("keydown", handleKeyDown)

    // Prevent text selection
    document.body.style.userSelect = "none"
    document.body.style.webkitUserSelect = "none"

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
      window.removeEventListener("blur", handleBlur)
      document.removeEventListener("contextmenu", handleContextMenu)
      document.removeEventListener("keydown", handleKeyDown)

      // Restore text selection
      document.body.style.userSelect = ""
      document.body.style.webkitUserSelect = ""
    }
  }, [handleVisibilityChange, handleFocus, handleBlur, handleContextMenu, handleKeyDown])

  // Force fullscreen
  const enterFullscreen = useCallback(() => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(console.error)
    }
  }, [])

  const exitFullscreen = useCallback(() => {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(console.error)
    }
  }, [])

  return {
    isVisible,
    timeLeft,
    violations,
    enterFullscreen,
    exitFullscreen,
    formatTime: (seconds: number) => {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    },
  }
}
