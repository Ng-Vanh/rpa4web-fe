"use client"

import { useRouter } from "next/navigation"
import { AuthenticatedRoute } from "@/components/authenticated-route"
import { RunConfigManagementScreen } from "@/components/run-config-management-screen"

export default function RunConfigPage() {
  const router = useRouter()

  return (
    <AuthenticatedRoute>
      {() => <RunConfigManagementScreen onBack={() => router.push("/dashboard")} />}
    </AuthenticatedRoute>
  )
}
