"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ArrowLeft, FileText, Calendar, User, Search, Loader2 } from "lucide-react"
import { getSrsDocument } from "@/service/srs_document"
import { isLoggedIn } from "@/service/auth-utils"

interface SRSManagementProps {
  onBack: () => void
  onNavigateToWorkspace: (srs: any) => void
}

interface SRSDocument {
  id: number
  name: string
  description?: string
  filePath: string
  uploadedBy: {
    id: number
    username: string
    role: string
  }
  uploadedAt?: string
  updatedAt?: string
}

export function SRSManagement({ onBack, onNavigateToWorkspace }: SRSManagementProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [srsDocuments, setSrsDocuments] = useState<SRSDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Lấy user ID từ localStorage (từ token hoặc user info đã lưu)
  const getUserId = () => {
    try {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const user = JSON.parse(userStr)
        return user.id
      }
      return null
    } catch (error) {
      console.error("Error parsing user data:", error)
      return null
    }
  }

  // Fetch SRS documents khi component mount
  useEffect(() => {
    const fetchSRSDocuments = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const userId = getUserId()
        if (!userId) {
          setError("User not found. Please login again.")
          return
        }

        const response = await getSrsDocument(userId)
        
        // Kiểm tra response structure
        if (response && Array.isArray(response)) {
          setSrsDocuments(response)
        } else if (response && response.data && Array.isArray(response.data)) {
          setSrsDocuments(response.data)
        } else {
          setSrsDocuments([])
        }
      } catch (error: any) {
        console.error("Error fetching SRS documents:", error)
        setError(error.message || "Failed to fetch SRS documents")
      } finally {
        setLoading(false)
      }
    }

    fetchSRSDocuments()
  }, [])

  // Filter SRS documents based on search term
  const filteredSRS = srsDocuments.filter((srs) =>
    srs.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    srs.filePath.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (srs.description && srs.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleSRSSelect = (srs: SRSDocument) => {
    onNavigateToWorkspace(srs)
  }

  const handleNavigateToWorkspace = (srs: SRSDocument) => {
    onNavigateToWorkspace(srs)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return "N/A"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="border-b bg-card">
          <div className="flex h-16 items-center px-6">
            <Button variant="ghost" onClick={onBack} className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-xl font-semibold">SRS Management</h1>
          </div>
        </nav>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Loading SRS documents...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="border-b bg-card">
          <div className="flex h-16 items-center px-6">
            <Button variant="ghost" onClick={onBack} className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-xl font-semibold">SRS Management</h1>
          </div>
        </nav>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-red-500 mb-4">
                <FileText className="h-12 w-12 mx-auto mb-4" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Error Loading SRS Documents</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="flex h-16 items-center px-6">
          <Button variant="ghost" onClick={onBack} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-xl font-semibold">SRS Management</h1>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search SRS documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Debug section - remove in production */}
        {/* <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-semibold mb-2">Debug Info:</h4>
          <div className="text-sm space-y-1">
            <p>User ID: {getUserId() || 'Not found'}</p>
            <p>Is Logged In: {isLoggedIn().toString()}</p>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => {
                // Set test data
                localStorage.setItem('token', 'test-token-123');
                localStorage.setItem('user', JSON.stringify({id: 1, username: 'testuser', role: 'user'}));
                window.location.reload();
              }}
            >
              Set Test Auth Data
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="ml-2"
            >
              Clear All Data
            </Button>
          </div>
        </div> */}

        <div className="space-y-4">
          {filteredSRS.map((srs) => (
            <Card
              key={srs.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleSRSSelect(srs)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold">{srs.name}</h3>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                    {srs.description && (
                      <p className="text-sm text-muted-foreground mb-3">{srs.description}</p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">File:</span>
                        <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                          {srs.filePath}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Uploaded by:</span>
                        <span>{srs.uploadedBy.username}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Modified:</span>
                        <span>{formatDate(srs.updatedAt || srs.uploadedAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredSRS.length === 0 && !loading && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? "No matching SRS documents found" : "No SRS documents found"}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? "Try adjusting your search terms" 
                  : "Upload your first SRS document to get started"
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}