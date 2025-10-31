"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Upload, 
  Trash2, 
  Shield, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Loader2,
  Calendar,
  Database,
  RefreshCw,
  FileUp,
  Info,
  Lock,
  LogOut,
  Eye,
  EyeOff,
  Play,
  Zap
} from "lucide-react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "fpl25"

interface GameWeek {
  gameweek: number
  count: number
}

export default function AdminPage() {
  // Authentication
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState("")
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  // Feature 1: Upload CSV
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle")
  const [uploadMessage, setUploadMessage] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Feature 2: Clear Game Week
  const [gameWeeks, setGameWeeks] = useState<GameWeek[]>([])
  const [loadingGameWeeks, setLoadingGameWeeks] = useState(false)
  const [clearingGameWeek, setClearingGameWeek] = useState<number | null>(null)
  const [clearStatus, setClearStatus] = useState<"idle" | "success" | "error">("idle")
  const [clearMessage, setClearMessage] = useState("")

  // Feature 3: Process Notebook
  const [processingNotebook, setProcessingNotebook] = useState(false)
  const [processStatus, setProcessStatus] = useState<"idle" | "success" | "error">("idle")
  const [processMessage, setProcessMessage] = useState("")

  // Check authentication on mount
  useEffect(() => {
    const authToken = sessionStorage.getItem("admin_auth")
    if (authToken === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
    }
    setIsCheckingAuth(false)
  }, [])

  // Handle login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError("")

    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem("admin_auth", password)
      setIsAuthenticated(true)
      setPassword("")
    } else {
      setAuthError("Invalid password. Please try again.")
      setPassword("")
    }
  }

  // Handle logout
  const handleLogout = () => {
    sessionStorage.removeItem("admin_auth")
    setIsAuthenticated(false)
    setPassword("")
  }

  // Fetch available game weeks on mount
  useEffect(() => {
    fetchGameWeeks()
  }, [])

  const fetchGameWeeks = async () => {
    setLoadingGameWeeks(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/gameweeks`)
      if (!response.ok) throw new Error("Failed to fetch game weeks")
      const data = await response.json()
      setGameWeeks(data.gameweeks || [])
    } catch (error) {
      console.error("Error fetching game weeks:", error)
      // Fallback mock data for demonstration
      setGameWeeks([
        { gameweek: 15, count: 10 },
        { gameweek: 14, count: 10 },
        { gameweek: 13, count: 10 },
      ])
    } finally {
      setLoadingGameWeeks(false)
    }
  }

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.name.endsWith('.csv')) {
        setSelectedFile(file)
        setUploadStatus("idle")
        setUploadMessage("")
      } else {
        setUploadStatus("error")
        setUploadMessage("Please select a valid CSV file")
        setSelectedFile(null)
      }
    }
  }

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus("error")
      setUploadMessage("Please select a file first")
      return
    }

    setUploadStatus("uploading")
    setUploadMessage("Uploading and processing file...")

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)

      const response = await fetch(`${API_BASE_URL}/api/admin/upload`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Upload failed")
      }

      const result = await response.json()
      setUploadStatus("success")
      setUploadMessage(`Successfully uploaded ${selectedFile.name}. ${result.message || ""}`)
      
      // Reset file selection after successful upload
      setTimeout(() => {
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
        setUploadStatus("idle")
        setUploadMessage("")
      }, 3000)
    } catch (error) {
      setUploadStatus("error")
      setUploadMessage(error instanceof Error ? error.message : "Upload failed")
    }
  }

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    const file = e.dataTransfer.files?.[0]
    if (file && file.name.endsWith('.csv')) {
      setSelectedFile(file)
      setUploadStatus("idle")
      setUploadMessage("")
    } else {
      setUploadStatus("error")
      setUploadMessage("Please drop a valid CSV file")
    }
  }

  // Handle clear game week
  const handleClearGameWeek = async (gameweek: number) => {
    if (!confirm(`Are you sure you want to clear all fixtures for Game Week ${gameweek}? This action cannot be undone.`)) {
      return
    }

    setClearingGameWeek(gameweek)
    setClearStatus("idle")
    setClearMessage("")

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/clear-gameweek`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ gameweek }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to clear game week")
      }

      const result = await response.json()
      setClearStatus("success")
      setClearMessage(`Successfully cleared Game Week ${gameweek}. ${result.message || ""}`)
      
      // Refresh game weeks list
      setTimeout(() => {
        fetchGameWeeks()
        setClearStatus("idle")
        setClearMessage("")
      }, 2000)
    } catch (error) {
      setClearStatus("error")
      setClearMessage(error instanceof Error ? error.message : "Failed to clear game week")
    } finally {
      setClearingGameWeek(null)
    }
  }

  // Handle process notebook
  const handleProcessNotebook = async () => {
    if (!confirm("This will process the CSV data and regenerate all analytics. This may take a few minutes. Continue?")) {
      return
    }

    setProcessingNotebook(true)
    setProcessStatus("idle")
    setProcessMessage("Processing data... This may take a few minutes.")

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/process-notebook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to process data")
      }

      const result = await response.json()
      setProcessStatus("success")
      setProcessMessage(result.message || "Successfully processed all data and updated analytics")
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setProcessStatus("idle")
        setProcessMessage("")
      }, 5000)
    } catch (error) {
      setProcessStatus("error")
      setProcessMessage(error instanceof Error ? error.message : "Failed to process data")
    } finally {
      setProcessingNotebook(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "uploading":
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return null
    }
  }

  // Show loading state while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/5 to-secondary/10">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-secondary/5 to-secondary/10">
        <Card className="w-full max-w-md border-border bg-card/50 backdrop-blur-md shadow-2xl">
          <CardHeader className="space-y-3 pb-6">
            <div className="flex justify-center">
              <div className="p-3 rounded-full bg-gradient-to-br from-orange-500 to-red-600 shadow-lg">
                <Lock className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Admin Panel Access</CardTitle>
            <CardDescription className="text-center">
              Please enter the admin password to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    className="w-full px-4 py-3 pr-12 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {authError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 animate-in slide-in-from-top-2 fade-in">
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">{authError}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 transition-all duration-300"
                disabled={!password.trim()}
              >
                <Lock className="mr-2 h-5 w-5" />
                Access Admin Panel
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-background via-secondary/5 to-secondary/10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 shadow-lg">
                <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-4xl font-bold text-foreground">
                  Admin Panel
                </h1>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="gap-2 hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/30 transition-all"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
          <p className="text-sm sm:text-lg text-muted-foreground">
            Manage data uploads and fixture data with advanced administrative controls
          </p>
        </div>

        {/* Warning Banner */}
        <div className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-orange-800 dark:text-orange-300 mb-1">
              Administrative Access Required
            </h3>
            <p className="text-sm text-orange-700 dark:text-orange-400">
              These operations will modify system data. Please ensure you have proper authorization before proceeding.
            </p>
          </div>
        </div>

        {/* Process Data Feature - Prominent Card */}
        <Card className="mb-6 border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-purple-500/5 to-blue-500/5 backdrop-blur-md shadow-2xl">
          <CardHeader className="pb-4 bg-gradient-to-r from-primary/10 to-purple-500/10">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-purple-600 shadow-lg">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl text-foreground">
                  Process FPL Data
                </CardTitle>
                <CardDescription className="text-sm mt-1">
                  Run analytics workflow to generate JSON files from CSV data
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3 mb-3">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-semibold mb-2">Workflow:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Upload your CSV file (fpl-data-stats.csv)</li>
                    <li>Click "Process Data" below</li>
                    <li>System runs Jupyter notebook to analyze data</li>
                    <li>All JSON analytics files are automatically updated</li>
                    <li>Frontend displays refreshed data</li>
                  </ol>
                </div>
              </div>
            </div>

            <Button
              onClick={handleProcessNotebook}
              disabled={processingNotebook}
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-primary via-purple-600 to-blue-600 hover:from-primary/90 hover:via-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              {processingNotebook ? (
                <>
                  <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                  Processing Data...
                </>
              ) : (
                <>
                  <Play className="mr-3 h-6 w-6" />
                  Process Data & Generate Analytics
                </>
              )}
            </Button>

            {/* Process Status Message */}
            {processMessage && (
              <div
                className={`
                  flex items-start gap-3 p-4 rounded-xl border animate-in slide-in-from-top-2 fade-in duration-300
                  ${processStatus === "success" 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : processStatus === "error"
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-blue-500/10 border-blue-500/30'
                  }
                `}
              >
                {processStatus === "success" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : processStatus === "error" ? (
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                ) : (
                  <Loader2 className="h-5 w-5 text-blue-500 animate-spin flex-shrink-0" />
                )}
                <p className={`
                  text-sm flex-1
                  ${processStatus === "success" 
                    ? 'text-green-700 dark:text-green-300' 
                    : processStatus === "error"
                    ? 'text-red-700 dark:text-red-300'
                    : 'text-blue-700 dark:text-blue-300'
                  }
                `}>
                  {processMessage}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Feature 1: Upload CSV */}
          <Card className="border-border bg-card/50 backdrop-blur-md shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="pb-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
              <div className="flex items-center gap-2">
                <FileUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <CardTitle className="text-lg sm:text-xl text-foreground">
                  Upload FPL Data
                </CardTitle>
              </div>
              <CardDescription className="text-sm">
                Upload fpl-data-stats.csv to update player statistics and performance data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300
                  ${selectedFile 
                    ? 'border-green-500 bg-green-500/5' 
                    : 'border-border hover:border-primary/50 bg-secondary/30 hover:bg-secondary/50'
                  }
                  cursor-pointer
                `}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <div className="flex flex-col items-center gap-3">
                  {selectedFile ? (
                    <>
                      <div className="p-3 rounded-full bg-green-500/20">
                        <FileText className="h-8 w-8 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(selectedFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        File Selected
                      </Badge>
                    </>
                  ) : (
                    <>
                      <div className="p-3 rounded-full bg-primary/10">
                        <Upload className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground mb-1">
                          Drop CSV file here or click to browse
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Supports: fpl-data-stats.csv
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Upload Button */}
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploadStatus === "uploading"}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
              >
                {uploadStatus === "uploading" ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-5 w-5" />
                    Upload & Override
                  </>
                )}
              </Button>

              {/* Status Message */}
              {uploadMessage && (
                <div
                  className={`
                    flex items-start gap-3 p-4 rounded-xl border animate-in slide-in-from-top-2 fade-in duration-300
                    ${uploadStatus === "success" 
                      ? 'bg-green-500/10 border-green-500/30' 
                      : uploadStatus === "error"
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-blue-500/10 border-blue-500/30'
                    }
                  `}
                >
                  {getStatusIcon(uploadStatus)}
                  <p className={`
                    text-sm flex-1
                    ${uploadStatus === "success" 
                      ? 'text-green-700 dark:text-green-300' 
                      : uploadStatus === "error"
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-blue-700 dark:text-blue-300'
                    }
                  `}>
                    {uploadMessage}
                  </p>
                </div>
              )}

              {/* Info Box */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Uploading will override the existing fpl-data-stats.csv file. Make sure your data is properly formatted.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Feature 2: Clear Game Week */}
          <Card className="border-border bg-card/50 backdrop-blur-md shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="pb-4 bg-gradient-to-r from-red-500/10 to-orange-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <CardTitle className="text-lg sm:text-xl text-foreground">
                    Clear Game Week Data
                  </CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchGameWeeks}
                  disabled={loadingGameWeeks}
                  className="h-8 gap-2"
                >
                  {loadingGameWeeks ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <CardDescription className="text-sm">
                Remove fixture data for specific game weeks from the system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Message */}
              {clearMessage && (
                <div
                  className={`
                    flex items-start gap-3 p-4 rounded-xl border animate-in slide-in-from-top-2 fade-in duration-300
                    ${clearStatus === "success" 
                      ? 'bg-green-500/10 border-green-500/30' 
                      : 'bg-red-500/10 border-red-500/30'
                    }
                  `}
                >
                  {clearStatus === "success" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <p className={`
                    text-sm flex-1
                    ${clearStatus === "success" 
                      ? 'text-green-700 dark:text-green-300' 
                      : 'text-red-700 dark:text-red-300'
                    }
                  `}>
                    {clearMessage}
                  </p>
                </div>
              )}

              {/* Game Weeks List */}
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {loadingGameWeeks ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : gameWeeks.length === 0 ? (
                  <div className="text-center py-8">
                    <Database className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-muted-foreground">No game weeks found</p>
                  </div>
                ) : (
                  gameWeeks.map((gw) => (
                    <div
                      key={gw.gameweek}
                      className="flex items-center justify-between p-4 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/50 transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            Game Week {gw.gameweek}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {gw.count} fixture{gw.count !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleClearGameWeek(gw.gameweek)}
                        disabled={clearingGameWeek === gw.gameweek}
                        className="gap-2 hover:scale-105 transition-transform"
                      >
                        {clearingGameWeek === gw.gameweek ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Clearing...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4" />
                            Clear
                          </>
                        )}
                      </Button>
                    </div>
                  ))
                )}
              </div>

              {/* Warning Box */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 dark:text-red-300">
                  Clearing a game week will permanently delete all fixture data for that week. This action cannot be undone.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Info Section */}
        <Card className="mt-6 border-border bg-card/50 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">API Endpoint</p>
                <p className="text-sm font-mono text-foreground bg-secondary/50 px-3 py-2 rounded-lg">
                  {API_BASE_URL}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Supported File Format</p>
                <p className="text-sm font-mono text-foreground bg-secondary/50 px-3 py-2 rounded-lg">
                  .csv (CSV files only)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
