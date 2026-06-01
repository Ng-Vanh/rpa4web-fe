"use client"

import { useRouter } from "next/navigation"
import { AuthenticatedRoute } from "@/components/authenticated-route"
import { SRSUploadScreen } from "@/components/srs-upload-screen"

export default function SrsUploadPage() {
  const router = useRouter()

  return (
    <AuthenticatedRoute>
      {() => (
        <SRSUploadScreen
          onBack={() => router.push("/dashboard")}
          onContinueToWorkspace={(srs) => router.push(`/srs/${srs.id}`)}
        />
      )}
    </AuthenticatedRoute>
  )
}
