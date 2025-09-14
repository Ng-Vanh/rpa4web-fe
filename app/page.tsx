"use client"

import { useState } from "react"
import { LoginScreen } from "@/components/login-screen"
import { MainDashboard } from "@/components/main-dashboard"

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  const handleLogin = (user: any) => {
    setCurrentUser(user)
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setIsAuthenticated(false)
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />
  }

  return <MainDashboard user={currentUser} onLogout={handleLogout} />
}
