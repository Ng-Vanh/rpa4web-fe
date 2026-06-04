"use client"

import { useEffect } from "react"

const RELOAD_FLAG = "rpa4web-chunk-reload-attempted"

function isChunkLoadError(value: unknown) {
  const message =
    value instanceof Error
      ? value.message
      : typeof value === "string"
        ? value
        : value && typeof value === "object" && "message" in value
          ? String((value as { message?: unknown }).message)
          : ""

  return /ChunkLoadError|Loading chunk \d+ failed|_next\/static\/chunks/i.test(message)
}

export function ChunkLoadRecovery() {
  useEffect(() => {
    const reloadOnce = () => {
      if (sessionStorage.getItem(RELOAD_FLAG) === "1") return
      sessionStorage.setItem(RELOAD_FLAG, "1")
      window.location.reload()
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isChunkLoadError(event.reason)) {
        reloadOnce()
      }
    }

    const handleError = (event: ErrorEvent) => {
      if (isChunkLoadError(event.error) || isChunkLoadError(event.message)) {
        reloadOnce()
      }
    }

    const clearFlag = () => {
      sessionStorage.removeItem(RELOAD_FLAG)
    }

    window.addEventListener("unhandledrejection", handleUnhandledRejection)
    window.addEventListener("error", handleError)
    window.addEventListener("load", clearFlag)

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
      window.removeEventListener("error", handleError)
      window.removeEventListener("load", clearFlag)
    }
  }, [])

  return null
}
