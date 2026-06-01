"use client"

import { useRouter } from "next/navigation"
import { AuthenticatedRoute } from "@/components/authenticated-route"
import { MainDashboard } from "@/components/main-dashboard"
import { logout } from "@/service/account"

export default function DashboardPage() {
  const router = useRouter()

  return (
    <AuthenticatedRoute>
      {(user) => (
        <MainDashboard
          user={user}
          onLogout={() => {
            logout()
            router.replace("/login")
          }}
        />
      )}
    </AuthenticatedRoute>
  )
}
