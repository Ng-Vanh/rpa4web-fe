"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { login } from "@/service/account" 

interface LoginScreenProps {
  onLogin: (user: any) => void
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [email, setEmail] = useState("")
  const [loginMode, setLoginMode] = useState<"username" | "email">("username")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

 
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");
  setIsLoading(true);

  try {
    const loginCredential = loginMode === "username" ? username : email;
    const res = await login(loginCredential, password);

    if (res.success && res.user) {
      onLogin(res.user);
    } else {
      setError(res.message || "Login failed. Please check your credentials.");
    }
  } catch (err: any) {
    setError(err.message || "An error occurred during login");
  } finally {
    setIsLoading(false);
  }
};


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
          <CardDescription className="text-center">Sign in to your RPA4Web testing account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {loginMode === "username" ? (
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {loginMode === "username" && (
              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setLoginMode("email")}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Login with Email instead
                </Button>
              </div>
            )}

            {loginMode === "email" && (
              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setLoginMode("username")}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Login with Username instead
                </Button>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
