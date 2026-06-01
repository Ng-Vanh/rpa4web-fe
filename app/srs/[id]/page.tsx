"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AuthenticatedRoute } from "@/components/authenticated-route"
import { SRSWorkspace } from "@/components/srs-workspace"
import { getSrsDocumentById } from "@/service/srs_document"

export default function SrsWorkspacePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [srs, setSrs] = useState<any>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!params?.id) return

    getSrsDocumentById(Number(params.id))
      .then(setSrs)
      .catch((err) => setError(err?.message || "Không tải được SRS"))
  }, [params?.id])

  return (
    <AuthenticatedRoute>
      {() => {
        if (error) {
          return (
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-sm text-destructive">{error}</div>
            </div>
          )
        }

        if (!srs) {
          return null
        }

        return <SRSWorkspace srs={srs} onBack={() => router.push("/srs")} />
      }}
    </AuthenticatedRoute>
  )
}
