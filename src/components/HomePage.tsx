"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Plus, Music2, Calendar, User, FileText, Trash2, Edit, Search, Lock } from "lucide-react"

interface ProjectSummary {
  id: string
  title: string
  composer: string
  description?: string
  pageCount: number
  noteCount: number
  updatedAt: Date
  projectType: "DNG" | "DNR" // Added projectType
}

interface HomePageProps {
  projects: ProjectSummary[]
  onCreateProject: (title: string, composer: string, description?: string) => void
  onOpenProject: (projectId: string) => void
  onDeleteProject: (projectId: string) => void
}

const HomePage: React.FC<HomePageProps> = ({ projects, onCreateProject, onOpenProject, onDeleteProject }) => {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loginData, setLoginData] = useState({ username: "", password: "" })
  const [loginError, setLoginError] = useState("")
  const [formData, setFormData] = useState({
    title: "",
    composer: "",
    description: "",
    projectType: "" as "DNG" | "DNR" | "", // Added projectType to form data
  })

  useEffect(() => {
    // Check if user is already logged in
    const loggedIn = sessionStorage.getItem("dng-logged-in")
    if (loggedIn === "true") {
      setIsLoggedIn(true)
    }

    // 3-second entry animation
    const timer = setTimeout(() => setIsLoaded(true), 1000)
    return () => clearTimeout(timer)
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (loginData.username === "dngstudios" && loginData.password === "dngstudios123") {
      setIsLoggedIn(true)
      sessionStorage.setItem("dng-logged-in", "true")
      setLoginError("")
      setLoginData({ username: "", password: "" })
    } else {
      setLoginError("Invalid username or password")
    }
  }

  const filteredProjects = projects.filter(
    (project) =>
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.composer.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.title.trim() && formData.composer.trim() && formData.projectType.trim()) {
      onCreateProject(
        formData.title,
        formData.composer,
        formData.description || undefined,
        formData.projectType as "DNG" | "DNR",
      )
      setFormData({ title: "", composer: "", description: "", projectType: "" })
      setShowCreateModal(false)
    } else {
      alert("Please select a project type (DNG or DNR) and fill in all required fields.")
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date)
  }

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        {/* Loading Animation Overlay */}
        <div
          className={`fixed inset-0 bg-gray-950 z-50 flex items-center justify-center transition-all duration-300 ${
            isLoaded ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <div className="text-center">
            <div className="w-20 h-20 bg-purple-600 rounded-lg flex items-center justify-center mx-auto mb-6">
              <Music2 className="w-10 h-10 text-white animate-pulse" />
            </div>
            <div className="text-3xl font-bold text-white mb-2">DNG Studios</div>
            <div className="text-sm text-gray-400">Professional Music Notation</div>
            <div className="mt-6 w-48 h-1 bg-gray-800 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-purple-600 rounded-full animate-pulse" style={{ width: "100%" }}></div>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <div
          className={`flex items-center justify-center min-h-screen transition-all duration-800 delay-500 ${
            isLoaded ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div className="bg-gray-900 rounded-lg border border-gray-700 p-8 w-full max-w-md">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Welcome to DNG Studios</h1>
              <p className="text-gray-400">Please sign in to continue</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
                <input
                  type="text"
                  value={loginData.username}
                  onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 text-white placeholder-gray-400"
                  placeholder="Enter username"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                <input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 text-white placeholder-gray-400"
                  placeholder="Enter password"
                  required
                />
              </div>

              {loginError && (
                <div className="text-red-400 text-sm text-center bg-red-900/20 border border-red-800 rounded-lg p-2">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 font-medium"
              >
                Sign In
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-gray-500">Professional Music Notation Software</div>
          </div>
        </div>
      </div>
    )
  }

  // Main Application (existing code)
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Loading Animation Overlay - 3 seconds */}
      <div
        className={`fixed inset-0 bg-gray-950 z-50 flex items-center justify-center transition-all duration-300 ${
          isLoaded ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <div className="text-center">
          <div className="w-20 h-20 bg-purple-600 rounded-lg flex items-center justify-center mx-auto mb-6">
            <Music2 className="w-10 h-10 text-white animate-pulse" />
          </div>
          <div className="text-3xl font-bold text-white mb-2">DNG Studios</div>
          <div className="text-sm text-gray-400">Professional Music Notation</div>
          <div className="mt-6 w-48 h-1 bg-gray-800 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-purple-600 rounded-full animate-pulse" style={{ width: "100%" }}></div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div
        className={`bg-gray-900 border-b border-gray-800 transition-all duration-800 delay-500 ${
          isLoaded ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <Music2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">DNG Studios</h1>
                <p className="text-xs text-gray-400">Professional Music Notation</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`max-w-7xl mx-auto px-6 py-6 transition-all duration-800 delay-700 ${
          isLoaded ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
      >
        {/* Search and Stats */}
        <div className="flex items-center justify-between mb-6">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 w-80 text-white placeholder-gray-400"
            />
          </div>
          <div className="text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-full">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div
            className={`text-center py-16 transition-all duration-800 delay-900 ${
              isLoaded ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Music2 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {projects.length === 0 ? "Welcome to DNG Studios" : "No projects found"}
            </h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              {projects.length === 0
                ? "Create your first musical composition to get started"
                : "Try adjusting your search terms to find what you're looking for"}
            </p>
            {projects.length === 0 && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 font-medium"
              >
                <Plus className="w-4 h-4" />
                Create Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProjects.map((project, index) => (
              <div
                key={project.id}
                className={`bg-gray-900 rounded-lg border border-gray-800 p-4 hover:bg-gray-850 hover:border-gray-700 transition-all duration-200 group ${
                  isLoaded ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
                }`}
                style={{
                  transitionDelay: `${900 + index * 100}ms`,
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-medium text-white mb-1 truncate">{project.title}</h3>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                      <User className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{project.composer}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm("Are you sure you want to delete this project?")) {
                        onDeleteProject(project.id)
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 rounded transition-all duration-200 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {project.description && (
                  <p className="text-xs text-gray-400 mb-3 line-clamp-2">{project.description}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  <div className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    <span>{project.pageCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Music2 className="w-3 h-3" />
                    <span>{project.noteCount}</span>
                  </div>
                  {/* Display Project Type */}
                  <div className="flex items-center gap-1">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        project.projectType === "DNG" ? "bg-purple-600 text-white" : "bg-blue-600 text-white"
                      }`}
                    >
                      {project.projectType}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs text-gray-500 mb-4">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(project.updatedAt)}</span>
                </div>

                <button
                  onClick={() => onOpenProject(project.id, project.projectType)} // Pass projectType
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-purple-600 transition-colors duration-200 text-sm"
                >
                  <Edit className="w-4 h-4" />
                  Open
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-lg max-w-md w-full border border-gray-700">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Create New Project</h2>
              {/* NEW: Project Type Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Project Type *</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, projectType: "DNG" })}
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors duration-200 font-medium ${
                      formData.projectType === "DNG"
                        ? "bg-purple-600 text-white hover:bg-purple-700"
                        : "bg-gray-800 text-gray-300 border border-gray-600 hover:bg-gray-700"
                    }`}
                  >
                    DNG
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, projectType: "DNR" })}
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors duration-200 font-medium ${
                      formData.projectType === "DNR"
                        ? "bg-purple-600 text-white hover:bg-purple-700"
                        : "bg-gray-800 text-gray-300 border border-gray-600 hover:bg-gray-700"
                    }`}
                  >
                    DNR
                  </button>
                </div>
                {!formData.projectType && <p className="text-red-400 text-xs mt-1">Please select a project type.</p>}
              </div>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 text-white placeholder-gray-400"
                    placeholder="Enter project title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Composer *</label>
                  <input
                    type="text"
                    value={formData.composer}
                    onChange={(e) => setFormData({ ...formData, composer: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 text-white placeholder-gray-400"
                    placeholder="Enter composer name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 text-white placeholder-gray-400 resize-none"
                    placeholder="Optional description"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      setFormData({ title: "", composer: "", description: "", projectType: "" })
                    }}
                    className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 font-medium"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HomePage
