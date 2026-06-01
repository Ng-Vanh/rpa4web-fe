"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getUserInfo, isAuthenticated } from "@/service/account"

interface AuthenticatedRouteProps {
  children: (user: any) => React.ReactNode
}

export function AuthenticatedRoute({ children }: AuthenticatedRouteProps) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login")
      setChecked(true)
      return
    }

    setUser(getUserInfo())
    setChecked(true)
  }, [router])

  if (!checked || !user) {
    return null
  }

  return <>{children(user)}</>
}
