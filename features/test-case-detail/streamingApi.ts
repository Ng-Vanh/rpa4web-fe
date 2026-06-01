// streamingApi.ts - SSE API cho real-time progress

import { StepProgress } from "./types"

const STREAMING_URL = `${process.env.NEXT_PUBLIC_MAIN_BACKEND_URL}/auto-test-streaming`

export interface StreamCallbacks {
  onStart?: () => void
  onStep?: (progress: StepProgress) => void
  onInfo?: (message: string) => void
  onComplete?: (data: { 
    status: string
    exitCode: number
    output: string
    generatedScript: string 
  }) => void
  onError?: (error: string) => void
}

// Helper: Parse SSE message
const parseSSEMessage = (message: string) => {
  const lines = message.split('\n')
  let eventName = 'message'
  let data = ''

  for (const line of lines) {
    if (line.startsWith('event:')) {
      eventName = line.substring(6).trim()
    } else if (line.startsWith('data:')) {
      data = line.substring(5).trim()
    }
  }

  return { eventName, data }
}

export const streamingApiService = {
  /**
   * Stream Run (DOM) với real-time progress updates
   */
  runScriptDOMStream: async (
    script: string, 
    url: string, 
    callbacks: StreamCallbacks
  ): Promise<void> => {
    try {
      const response = await fetch(`${STREAMING_URL}/run-script-dom-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ script, url })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const messages = buffer.split('\n\n')
        buffer = messages.pop() || ''

        for (const message of messages) {
          if (!message.trim()) continue

          const { eventName, data } = parseSSEMessage(message)

          try {
            const parsedData = JSON.parse(data)

            switch (eventName) {
              case 'start':
                callbacks.onStart?.()
                break
              case 'step':
                callbacks.onStep?.(parsedData)
                break
              case 'info':
                callbacks.onInfo?.(parsedData.message)
                break
              case 'complete':
                callbacks.onComplete?.(parsedData)
                break
              case 'error':
                callbacks.onError?.(parsedData.message)
                break
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', e)
          }
        }
      }
    } catch (error) {
      console.error('Stream error:', error)
      callbacks.onError?.(error instanceof Error ? error.message : 'Unknown error')
    }
  },

  /**
   * Stream Run (Image) với real-time progress updates
   */
  runScriptImageStream: async (
    script: string, 
    url: string, 
    callbacks: StreamCallbacks
  ): Promise<void> => {
    try {
      const response = await fetch(`${STREAMING_URL}/run-script-image-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ script, url })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const messages = buffer.split('\n\n')
        buffer = messages.pop() || ''

        for (const message of messages) {
          if (!message.trim()) continue

          const { eventName, data } = parseSSEMessage(message)

          try {
            const parsedData = JSON.parse(data)

            switch (eventName) {
              case 'start':
                callbacks.onStart?.()
                break
              case 'step':
                callbacks.onStep?.(parsedData)
                break
              case 'info':
                callbacks.onInfo?.(parsedData.message)
                break
              case 'complete':
                callbacks.onComplete?.(parsedData)
                break
              case 'error':
                callbacks.onError?.(parsedData.message)
                break
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', e)
          }
        }
      }
    } catch (error) {
      console.error('Stream error:', error)
      callbacks.onError?.(error instanceof Error ? error.message : 'Unknown error')
    }
  }
}