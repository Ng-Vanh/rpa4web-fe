# RPA4Web Frontend - Coding Rules & Architecture Guide

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Coding Rules & Conventions](#coding-rules--conventions)
5. [How to Create New Features](#how-to-create-new-features)
6. [Common Patterns](#common-patterns)
7. [API Endpoints & Data Contracts](#api-endpoints--data-contracts)
8. [Best Practices](#best-practices)

---

## 📦 Project Overview

**RPA4Web Frontend** is a Next.js-based testing tool for RPA (Robotic Process Automation) web automation. It enables users to:
- Upload SRS (Software Requirements Specification) documents
- Create and manage test scenarios
- Generate test cases using AI
- Create and edit test steps with script generation
- Manage run configurations for different browsers/environments
- Configure LLM settings for AI features

---

## 🛠 Technology Stack

| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 14.2+ | React framework with SSR/SSG |
| **React** | 18.3+ | UI library |
| **TypeScript** | 5.x | Type-safe JavaScript |
| **Tailwind CSS** | 4.x | Utility-first CSS framework |
| **Radix UI** | latest | Unstyled, accessible UI components |
| **React Hook Form** | latest | Form state management |
| **Axios** | 1.12+ | HTTP client |
| **Zod** | 3.25+ | Schema validation |
| **pnpm** | - | Package manager (recommended) |

---

## 📁 Project Structure

```
rpa4web-fe/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx               # Root layout (metadata, fonts, providers)
│   ├── page.tsx                 # Home page (redirects to login/dashboard)
│   ├── dashboard/               # Main dashboard
│   │   └── page.tsx
│   ├── login/                   # Login page
│   ├── srs/                     # SRS management
│   │   ├── page.tsx             # View SRS
│   │   ├── [id]/page.tsx        # SRS details
│   │   └── upload/page.tsx      # SRS upload
│   └── config/run/              # Run configuration
│       └── page.tsx
│
├── components/                   # Reusable React components
│   ├── ui/                      # Shadcn/ui components (auto-generated)
│   ├── main-dashboard.tsx       # Main dashboard component
│   ├── login-screen.tsx         # Login component
│   ├── authenticated-route.tsx  # Auth wrapper
│   ├── srs-management.tsx       # SRS list & management
│   └── ... (other components)
│
├── features/                     # Feature-based folder structure
│   ├── test-case-detail/        # Example feature
│   │   ├── types.ts             # TypeScript interfaces
│   │   ├── api.ts               # API functions
│   │   ├── constants.ts         # Constants & config
│   │   ├── utils.ts             # Utility functions
│   │   ├── hooks/               # Custom hooks (if needed)
│   │   ├── components/          # Feature-specific components
│   │   └── index.ts             # Barrel export
│   └── (other features)
│
├── service/                      # API & business logic services
│   ├── api-client.tsx           # Axios client with interceptors
│   ├── auth-utils.tsx           # Authentication helpers
│   ├── account.tsx              # Account/user API calls
│   ├── testcase.tsx             # Test case API calls
│   ├── scenario.tsx             # Test scenario API calls
│   ├── srs_document.tsx         # SRS document API calls
│   └── ... (other services)
│
├── lib/                          # Shared utilities
│   └── utils.ts                 # Helper functions (e.g., cn() for Tailwind)
│
├── hooks/                        # Global custom hooks
│   ├── use-mobile.ts            # Mobile detection hook
│   └── use-toast.ts             # Toast notifications hook
│
├── styles/                       # Global styles
│   └── globals.css              # Global CSS & Tailwind config
│
├── public/                       # Static assets
│
├── app/globals.css              # Tailwind CSS directives
├── components.json              # Shadcn/ui components config
├── next.config.mjs              # Next.js configuration
├── tsconfig.json                # TypeScript configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── postcss.config.mjs           # PostCSS configuration
└── package.json                 # Project dependencies & scripts
```

---

## 🎯 Coding Rules & Conventions

### 1. **File Naming Conventions**

| Type | Pattern | Example |
|---|---|---|
| Components | PascalCase | `MainDashboard.tsx`, `LoginScreen.tsx` |
| Pages | lowercase | `page.tsx` (Next.js convention) |
| Utilities/Functions | camelCase | `getUserInfo.ts`, `generateScript.ts` |
| Services | camelCase | `api-client.tsx`, `auth-utils.tsx` |
| Types/Interfaces | PascalCase | `TestCase.ts`, `UserInfo.ts` |
| Folders | lowercase or kebab-case | `test-case-detail`, `components`, `service` |

### 2. **TypeScript Rules**

```typescript
// ✅ GOOD: Use strict typing
interface UserProfile {
  id: number
  username: string
  email: string
  createdAt: Date
}

// ❌ BAD: Avoid using 'any'
function getUser(id: any): any {
  // ...
}

// ✅ GOOD: Use proper typing for API responses
interface ApiResponse<T> {
  status: 'success' | 'error'
  data?: T
  message?: string
}

// ✅ GOOD: Export types for reuse
export type { UserProfile, ApiResponse }
```

### 3. **React Component Rules**

```typescript
// ✅ GOOD: Use "use client" for client components
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface MyComponentProps {
  title: string
  onClose?: () => void
}

export function MyComponent({ title, onClose }: MyComponentProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Side effects here
  }, [])

  return (
    <div>
      <h1>{title}</h1>
      {/* Component content */}
    </div>
  )
}

// ❌ BAD: Don't use default export for named components
export default function MyComponent() { } // Avoid this
```

### 4. **API Service Rules**

```typescript
// ✅ GOOD: Structured service with proper error handling
import axios from "axios"
import { getAuthHeaders } from "./auth-utils"

const API_BASE = process.env.NEXT_PUBLIC_MAIN_BACKEND_URL

export const getUserById = async (id: number): Promise<User> => {
  try {
    const response = await axios.get(`${API_BASE}/users/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(), // Include auth headers
      },
    })
    return response.data
  } catch (error) {
    console.error('Error fetching user:', error)
    throw error
  }
}

// ❌ BAD: No error handling or auth
export const getUser = async (id: number) => {
  return axios.get(`${API_BASE}/users/${id}`)
}
```

### 5. **Tailwind CSS Rules**

```typescript
// ✅ GOOD: Use Tailwind classes for styling
function Button() {
  return (
    <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
      Click me
    </button>
  )
}

// ✅ GOOD: Use cn() utility for conditional classes
import { cn } from "@/lib/utils"

function Button({ disabled }: { disabled: boolean }) {
  return (
    <button
      className={cn(
        "px-4 py-2 bg-blue-600 text-white rounded",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      Click me
    </button>
  )
}

// ❌ BAD: Don't mix Tailwind with inline styles
<div style={{ padding: '1rem', color: 'blue' }} className="rounded">
  // This mixes approaches
</div>
```

### 6. **Environment Variables**

- Use `NEXT_PUBLIC_` prefix for client-side variables
- Store in `.env.local` (not committed to git)
- Example:
  ```
  NEXT_PUBLIC_MAIN_BACKEND_URL=http://localhost:8124/api
  NEXT_PUBLIC_AI_BACKEND_URL=http://localhost:8130
  ```

---

## 🚀 How to Create New Features

### Step 1: Create Feature Folder Structure

Create a new feature folder in `features/` directory:

```
features/my-new-feature/
├── index.ts              # Barrel exports
├── types.ts              # TypeScript interfaces
├── api.ts                # API service functions
├── constants.ts          # Constants (API endpoints, default values)
├── utils.ts              # Utility functions
├── hooks/                # Custom hooks (optional)
│   └── useMyFeature.ts
└── components/           # Feature-specific components
    ├── MyFeatureScreen.tsx
    └── MyFeatureModal.tsx
```

### Step 2: Define Types

**`features/my-new-feature/types.ts`:**

```typescript
export interface MyFeatureItem {
  id: number
  name: string
  description: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateMyFeatureItemRequest {
  name: string
  description: string
}

export interface MyFeatureScreenProps {
  onClose?: () => void
  itemId?: number
}
```

### Step 3: Create API Service

**`features/my-new-feature/api.ts`:**

```typescript
import axios from "axios"
import { getAuthHeaders } from "@/service/auth-utils"
import type { MyFeatureItem, CreateMyFeatureItemRequest } from "./types"

const API_BASE = process.env.NEXT_PUBLIC_MAIN_BACKEND_URL

export const getMyFeatureItems = async (): Promise<MyFeatureItem[]> => {
  try {
    const response = await axios.get(`${API_BASE}/my-features`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data.data || response.data
  } catch (error) {
    console.error('Error fetching features:', error)
    throw error
  }
}

export const createMyFeatureItem = async (
  data: CreateMyFeatureItemRequest
): Promise<MyFeatureItem> => {
  try {
    const response = await axios.post(`${API_BASE}/my-features`, data, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error) {
    console.error('Error creating feature item:', error)
    throw error
  }
}

export const updateMyFeatureItem = async (
  id: number,
  data: Partial<CreateMyFeatureItemRequest>
): Promise<MyFeatureItem> => {
  try {
    const response = await axios.put(`${API_BASE}/my-features/${id}`, data, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error) {
    console.error('Error updating feature item:', error)
    throw error
  }
}

export const deleteMyFeatureItem = async (id: number): Promise<void> => {
  try {
    await axios.delete(`${API_BASE}/my-features/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
  } catch (error) {
    console.error('Error deleting feature item:', error)
    throw error
  }
}
```

### Step 4: Create Components

**`features/my-new-feature/components/MyFeatureScreen.tsx`:**

```typescript
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import {
  getMyFeatureItems,
  createMyFeatureItem,
  deleteMyFeatureItem,
} from "../api"
import type { MyFeatureItem, MyFeatureScreenProps } from "../types"

export function MyFeatureScreen({ onClose }: MyFeatureScreenProps) {
  const [items, setItems] = useState<MyFeatureItem[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    setLoading(true)
    try {
      const data = await getMyFeatureItems()
      setItems(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load items",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteMyFeatureItem(id)
      setItems(items.filter((item) => item.id !== id))
      toast({
        title: "Success",
        description: "Item deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>My Feature Items</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border rounded"
                >
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {onClose && (
        <Button onClick={onClose} variant="outline">
          Close
        </Button>
      )}
    </div>
  )
}
```

### Step 5: Create Barrel Export

**`features/my-new-feature/index.ts`:**

```typescript
// Export components
export { MyFeatureScreen } from "./components/MyFeatureScreen"

// Export types
export type { MyFeatureItem, MyFeatureScreenProps } from "./types"

// Export API functions
export { getMyFeatureItems, createMyFeatureItem } from "./api"
```

### Step 6: Integrate into App

**`app/my-feature/page.tsx`:**

```typescript
"use client"

import { useRouter } from "next/navigation"
import { AuthenticatedRoute } from "@/components/authenticated-route"
import { MyFeatureScreen } from "@/features/my-new-feature"

export default function MyFeaturePage() {
  const router = useRouter()

  return (
    <AuthenticatedRoute>
      {(user) => (
        <div className="min-h-screen bg-background p-6">
          <MyFeatureScreen onClose={() => router.back()} />
        </div>
      )}
    </AuthenticatedRoute>
  )
}
```

---

## 📚 Common Patterns

### Pattern 1: Authentication Check

```typescript
import { isAuthenticated, getUserInfo } from "@/service/account"

// Check if user is authenticated
if (!isAuthenticated()) {
  router.replace("/login")
  return
}

// Get user information
const user = getUserInfo()
console.log(user.id, user.email)
```

### Pattern 2: Form Handling with React Hook Form

```typescript
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

type FormData = z.infer<typeof schema>

export function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    // Submit data
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("email")} placeholder="Email" />
      {errors.email && <span>{errors.email.message}</span>}
      <input {...register("password")} type="password" placeholder="Password" />
      <button type="submit">Login</button>
    </form>
  )
}
```

### Pattern 3: Modal/Dialog Component

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export function MyModal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
```

### Pattern 4: Data Fetching with Loading State

```typescript
export function DataList() {
  const [data, setData] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await getItems()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) return <div>Loading...</div>
  if (error) return <div className="text-red-600">Error: {error}</div>
  
  return (
    <ul>
      {data.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  )
}
```

### Pattern 5: Notification/Toast

```typescript
import { useToast } from "@/hooks/use-toast"

export function NotifyExample() {
  const { toast } = useToast()

  const handleSuccess = () => {
    toast({
      title: "Success",
      description: "Operation completed successfully",
      variant: "default", // or "destructive"
    })
  }

  const handleError = () => {
    toast({
      title: "Error",
      description: "Something went wrong",
      variant: "destructive",
    })
  }

  return (
    <div>
      <button onClick={handleSuccess}>Show Success</button>
      <button onClick={handleError}>Show Error</button>
    </div>
  )
}
```

---

## 🔌 API Endpoints & Data Contracts

### Base URLs
- `NEXT_PUBLIC_MAIN_BACKEND_URL` is the main API base URL used by the frontend.
- Default fallback: `http://localhost:8124/api`.
- `NEXT_PUBLIC_AI_BACKEND_URL` is reserved for future AI services.
- `service/api-client.tsx` exports `apiClient`, an Axios instance with:
  - `baseURL: MAIN_API_BASE_URL`
  - default `Content-Type: application/json`
  - request interceptor that adds `getAuthHeaders()` automatically.

### Auth & headers
- `service/auth-utils.tsx` stores `token` and `user` in `localStorage`.
- `getAuthHeaders()` returns `Authorization: Bearer <token>` when token exists.
- `service/account.tsx` handles login/signup and token persistence.
- Some endpoints use raw `axios` with explicit `getAuthHeaders()`.

### Main API endpoints used by the frontend

#### Auth
- `POST /auth/signup`
  - Request payload: `{ username, password, role }`
  - Response: `{ success, message, user?, token? }`
- `POST /auth/login`
  - Request payload: `{ usernameOrEmail, password }`
  - Response: `{ success, message, user?, token? }`
- `GET /auth/me`
  - Used to fetch current user info if local token is missing or expired.

#### SRS document
- `GET /srs/user/{userId}`
  - Returns list of SRS documents for a user.
- `GET /srs/{srsId}`
  - Returns a single SRS document details.
- `POST /srs/upload-file`
  - Upload form data with fields including file and `userId`.
  - Uses `multipart/form-data` and auth headers.
- `DELETE /srs/{srsId}`
  - Delete a SRS document.
- `GET /srs/{srsId}/preview`
  - Returns PDF blob data for preview.

#### Test scenarios
- `GET /scenarios`
  - Returns all scenarios.
- `GET /scenarios/{id}`
  - Returns scenario detail.
- `GET /scenarios/srs/{srsId}`
  - Returns scenarios belonging to an SRS document.
- `POST /scenarios`
  - Payload fields: `srsId`, `title`, `description`, `webUrl`.
  - The frontend normalizes `description` to string if needed.
- `PATCH /scenarios/{id}`
  - Updates scenario fields.
- `DELETE /scenarios/{id}`
  - Removes a scenario.

#### Test cases
- `GET /test-cases/scenario/{scenarioId}`
  - List test cases for a scenario.
- `GET /test-cases/{id}`
  - Load a specific test case.
- `POST /test-cases`
  - Payload fields: `scenarioId`, `testItem`, `testClassification`, `priority`, `status`, `source`.
- `POST /generation/test-cases/{scenarioId}`
  - Generate test cases for a scenario using backend generation.
- `PATCH /test-cases/{tcId}`
  - Update a test case.
- `DELETE /test-cases/{tcId}`
  - Delete a test case.

#### Test case steps
- `GET /test-steps/test-case/{testCaseId}`
  - Get steps for a specific test case.
- `POST /test-steps`
  - Payload fields: `testCaseId`, `stepOrder`, `actionDescription`, `inputData`, `expectedOutput`, `scriptCode`.
- `PATCH /test-steps/{stepId}`
  - Update step fields, optionally including `stepType`, `scriptLanguage`, `imgUrl`, `objectImgUrl`, `relatedObjectImgUrl`.
- `DELETE /test-steps/{stepId}`
  - Delete a step.
- `POST /upload/step-image`
  - Supports image upload for future step image handling.

#### Execution / scoring
- `POST /test-execution-steps/{stepId}/execute`
  - Execute a specific step.
- `GET /test-execution-steps/{executionId}`
  - Fetch execution result steps.
- `GET /test-execution-steps/{stepId}/latest-score`
  - Get latest score for a step.
- `POST /test-execution-steps/{stepId}/check-score`
  - Trigger score checking.

#### Execution configs / LLM config
- `GET /execution-configs`
  - Get all browser/environment execution configs.
- `GET /execution-configs/{configId}`
  - Get a single config by ID.
- `POST /execution-configs`
  - Create a new execution config.
- `PATCH /execution-configs/{configId}`
  - Update an existing config.
- `GET /config/llm/{userId}`
  - Get LLM settings for a user.
- `POST /config/llm`
  - Create/update LLM configuration with payload: `userId`, `provider`, `modelName`, `apiKeyEncrypted`, `isDefault`.

### Notes on data flow
- Most frontend services return `response.data` directly.
- `service/scenario.tsx` normalizes `description` from string or JSON.
- `service/api-client.tsx` adds auth headers automatically for requests using `apiClient`.
- Direct `axios` calls must manually include `getAuthHeaders()`.

---

## ✅ Best Practices

### 1. **Keep Components Small & Focused**
- One component = one responsibility
- Break large components into smaller ones
- Use composition over inheritance

### 2. **Error Handling**
- Always wrap API calls in try-catch
- Log errors for debugging
- Show user-friendly error messages with toast

### 3. **Type Safety**
- Use TypeScript strict mode
- Define interfaces for all data structures
- Avoid using `any` type

### 4. **Performance**
- Use `useCallback` for memoized functions
- Use `useMemo` for expensive computations
- Lazy load components with `dynamic`

### 5. **Code Organization**
- One file per component
- Use barrel exports (index.ts) for cleaner imports
- Keep utilities in separate files

### 6. **Security**
- Validate form inputs with Zod
- Use environment variables for secrets
- Sanitize user inputs before displaying

### 7. **Testing**
- Write tests for business logic in service files
- Use mock data for API calls in development
- Test error scenarios

### 8. **Documentation**
- Add JSDoc comments for complex functions
- Document component props with TypeScript
- Keep README updated

---

## 🔧 Development Workflow

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Start Development Server
```bash
pnpm dev
```
Open [http://localhost:3001](http://localhost:3001)

### 3. Build for Production
```bash
pnpm build
pnpm start
```

### 4. Lint Code
```bash
pnpm lint
```

---

## 📖 Quick Reference

| Task | Command |
|---|---|
| Add new UI component | `npx shadcn-ui@latest add [component-name]` |
| Create new page | Add `page.tsx` in `app/[feature]/` |
| Create new feature | Follow "How to Create New Features" guide |
| Run tests | `pnpm test` (if configured) |
| Format code | `pnpm format` (if configured) |

---

## 🤝 Contributing Guidelines

1. Follow the naming conventions and rules above
2. Create features in the `features/` folder
3. Write types in separate `types.ts` files
4. Keep components in `components/` or feature folders
5. Use service layer for API calls
6. Always handle errors and show user feedback
7. Test your changes before committing

---

## 📞 Common Issues & Solutions

| Issue | Solution |
|---|---|
| Components not rendering | Check if using "use client" for client components |
| API calls failing | Verify `getAuthHeaders()` is included |
| Tailwind not working | Ensure class names follow Tailwind conventions |
| Type errors | Run `pnpm tsc --noEmit` to check types |
| Module not found | Verify path alias `@/` is correctly configured |

---

**Last Updated:** June 2026  
**Version:** 1.0
