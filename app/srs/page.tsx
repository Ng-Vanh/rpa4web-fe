"use client"

import { useRouter } from "next/navigation"
import { AuthenticatedRoute } from "@/components/authenticated-route"
import { SRSManagement } from "@/components/srs-management"

export default function SrsListPage() {
  const router = useRouter()

  return (
    <AuthenticatedRoute>
      {() => (
        <SRSManagement
          onBack={() => router.push("/dashboard")}
          onNavigateToWorkspace={(srs) => router.push(`/srs/${srs.id}`)}
        />
      )}
    </AuthenticatedRoute>
  )
}
