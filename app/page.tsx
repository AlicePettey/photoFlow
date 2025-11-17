"use client"

import React, { useState, useRef, useEffect, ChangeEvent } from 'react'
import { Camera, FolderOpen, Settings, Plus, X, Upload, Trash2, Edit, Check, ChevronLeft, ChevronRight, Download, List, Tag, ChevronUp, ChevronDown, Save } from 'lucide-react'

const Button = ({ children, onClick, variant = 'default', size = 'default', className = '', disabled = false }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
      variant === 'outline' ? 'border border-gray-300 hover:bg-gray-50' :
      variant === 'ghost' ? 'hover:bg-gray-100' :
      'bg-blue-600 text-white hover:bg-blue-700'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
  >
    {children}
  </button>
)

const Input = ({ className = '', ...props }: any) => (
  <input
    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    {...props}
  />
)

const Label = ({ children, htmlFor, className = '' }: any) => (
  <label htmlFor={htmlFor} className={`block text-sm font-medium text-gray-700 mb-1 ${className}`}>
    {children}
  </label>
)

const Card = ({ children, className = '', onClick }: any) => (
  <div onClick={onClick} className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
    {children}
  </div>
)

const CardHeader = ({ children }: any) => <div className="p-4 border-b border-gray-200">{children}</div>
const CardTitle = ({ children }: any) => <h3 className="text-lg font-semibold">{children}</h3>
const CardDescription = ({ children }: any) => <p className="text-sm text-gray-500 mt-1">{children}</p>
const CardContent = ({ children, className = '' }: any) => <div className={`p-4 ${className}`}>{children}</div>

const Textarea = ({ className = '', ...props }: any) => (
  <textarea
    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    {...props}
  />
)

interface Template {
  id: string
  name: string
  tags: string[]
  description: string
  createdAt: Date
}

interface Project {
  id: string
  name: string
  tags: string[]
  currentTags: string[]
  imageCount: number
  lastModified: Date
  images: CapturedImage[]
  templateId?: string
}

interface CapturedImage {
  id: string
  filename: string
  dataUrl: string
  note: string
  timestamp: Date
  tags: string[]
  sequenceNumber: number
}

const ZOOM_LEVELS = [1, 1.5, 2, 3, 5, 10]
const STORAGE_KEYS = {
  PROJECTS: 'camera_app_projects',
  TEMPLATES: 'camera_app_templates',
  ACTIVE_PROJECT: 'camera_app_active_project'
}

export default function CameraOrganizationApp() {
  const [activeTab, setActiveTab] = useState<'camera' | 'projects' | 'settings'>('camera')
  const [projects, setProjects] = useState<Project[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const [showTagFlyout, setShowTagFlyout] = useState(false)
  const [selectedImage, setSelectedImage] = useState<CapturedImage | null>(null)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectTag, setNewProjectTag] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateDescription, setNewTemplateDescription] = useState('')
  const [newTemplateTags, setNewTemplateTags] = useState<string[]>([''])
  const [currentNote, setCurrentNote] = useState('')
  const [lastCapturedImage, setLastCapturedImage] = useState<CapturedImage | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [zoomLevelIndex, setZoomLevelIndex] = useState(0)
  const [isOnline, setIsOnline] = useState(true)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [isNavCollapsed, setIsNavCollapsed] = useState(false)
  const [selectedTagsForCapture, setSelectedTagsForCapture] = useState<string[]>([])
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    loadFromStorage()
  }, [])

  useEffect(() => {
    saveToStorage()
  }, [projects, templates, activeProject])

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'camera' && !cameraStream) {
      initializeCamera()
    }
    
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [activeTab, facingMode])

  useEffect(() => {
    setZoomLevel(ZOOM_LEVELS[zoomLevelIndex])
  }, [zoomLevelIndex])

  useEffect(() => {
    if (activeProject && activeProject.currentTags.length > 0) {
      setSelectedTagsForCapture(activeProject.currentTags)
    }
  }, [activeProject])

  const loadFromStorage = () => {
    try {
      const savedProjects = localStorage.getItem(STORAGE_KEYS.PROJECTS)
      const savedTemplates = localStorage.getItem(STORAGE_KEYS.TEMPLATES)
      const savedActiveProjectId = localStorage.getItem(STORAGE_KEYS.ACTIVE_PROJECT)

      if (savedProjects) {
        const parsedProjects = JSON.parse(savedProjects).map((p: any) => ({
          ...p,
          lastModified: new Date(p.lastModified),
          images: p.images.map((img: any) => ({
            ...img,
            timestamp: new Date(img.timestamp)
          }))
        }))
        setProjects(parsedProjects)

        if (savedActiveProjectId) {
          const active = parsedProjects.find((p: Project) => p.id === savedActiveProjectId)
          if (active) {
            setActiveProject(active)
          }
        }
      }

      if (savedTemplates) {
        const parsedTemplates = JSON.parse(savedTemplates).map((t: any) => ({
          ...t,
          createdAt: new Date(t.createdAt)
        }))
        setTemplates(parsedTemplates)
      }
    } catch (error) {
      console.error('Error loading from storage:', error)
    }
  }

  const saveToStorage = () => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects))
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates))
      if (activeProject) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT, activeProject.id)
      }
    } catch (error) {
      console.error('Error saving to storage:', error)
    }
  }

  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setCameraStream(stream)
      }
    } catch (error) {
      console.error('Camera access error:', error)
    }
  }

  const createTemplate = () => {
    if (!newTemplateName.trim()) {
      alert('Please enter a template name')
      return
    }

    const validTags = newTemplateTags
      .map(tag => tag.trim().replace(/[^a-zA-Z0-9-_]/g, ''))
      .filter(tag => tag.length > 0)

    if (validTags.length === 0) {
      alert('Please enter at least one valid tag')
      return
    }

    const newTemplate: Template = {
      id: Date.now().toString(),
      name: newTemplateName.trim(),
      tags: validTags,
      description: newTemplateDescription.trim(),
      createdAt: new Date()
    }

    setTemplates([...templates, newTemplate])
    setNewTemplateName('')
    setNewTemplateDescription('')
    setNewTemplateTags([''])
    setShowTemplateModal(false)
  }

  const deleteTemplate = (templateId: string) => {
    if (confirm('Delete this template?')) {
      setTemplates(templates.filter(t => t.id !== templateId))
    }
  }

  const addTemplateTagInput = () => {
    setNewTemplateTags([...newTemplateTags, ''])
  }

  const updateTemplateTag = (index: number, value: string) => {
    const updated = [...newTemplateTags]
    updated[index] = value
    setNewTemplateTags(updated)
  }

  const removeTemplateTag = (index: number) => {
    if (newTemplateTags.length > 1) {
      setNewTemplateTags(newTemplateTags.filter((_, i) => i !== index))
    }
  }

  const createProject = () => {
    if (!newProjectName.trim()) {
      alert('Please enter a project name')
      return
    }

    let projectTags: string[] = []
    let initialTags: string[] = []
    let templateId: string | undefined = undefined

    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId)
      if (template) {
        projectTags = [...template.tags]
        initialTags = [...template.tags]
        templateId = template.id
      }
    } else if (newProjectTag.trim()) {
      const sanitizedTag = newProjectTag.trim().replace(/[^a-zA-Z0-9-_]/g, '')
      projectTags = [sanitizedTag]
      initialTags = [sanitizedTag]
    } else {
      alert('Please select a template or enter an initial tag')
      return
    }

    const newProject: Project = {
      id: Date.now().toString(),
      name: newProjectName.trim(),
      tags: projectTags,
      currentTags: initialTags,
      imageCount: 0,
      lastModified: new Date(),
      images: [],
      templateId
    }

    setProjects([...projects, newProject])
    setActiveProject(newProject)
    setNewProjectName('')
    setNewProjectTag('')
    setSelectedTemplateId('')
    setShowProjectModal(false)
    setActiveTab('camera')
  }

  const capturePhoto = () => {
    if (!activeProject) {
      setShowProjectModal(true)
      return
    }

    if (selectedTagsForCapture.length === 0) {
      alert('Please select at least one tag')
      return
    }

    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)

      const tagString = selectedTagsForCapture.sort().join('-')
      const sequenceNumber = activeProject.images.filter(img => 
        img.tags.sort().join('-') === tagString
      ).length + 1
      const filename = `${tagString}_${String(sequenceNumber).padStart(4, '0')}.jpg`

      const newImage: CapturedImage = {
        id: Date.now().toString(),
        filename,
        dataUrl,
        note: '',
        timestamp: new Date(),
        tags: [...selectedTagsForCapture],
        sequenceNumber
      }

      setLastCapturedImage(newImage)
      setShowNoteModal(true)
    }
  }

  const saveImageWithNote = () => {
    if (!lastCapturedImage || !activeProject) return

    const imageWithNote = { ...lastCapturedImage, note: currentNote }
    
    const updatedProject = {
      ...activeProject,
      images: [...activeProject.images, imageWithNote],
      imageCount: activeProject.imageCount + 1,
      lastModified: new Date()
    }

    setProjects(projects.map(p => p.id === activeProject.id ? updatedProject : p))
    setActiveProject(updatedProject)
    
    setCurrentNote('')
    setLastCapturedImage(null)
    setShowNoteModal(false)
  }

  const deleteImage = (imageId: string) => {
    if (!activeProject) return

    const updatedProject = {
      ...activeProject,
      images: activeProject.images.filter(img => img.id !== imageId),
      imageCount: activeProject.imageCount - 1,
      lastModified: new Date()
    }

    setProjects(projects.map(p => p.id === activeProject.id ? updatedProject : p))
    setActiveProject(updatedProject)
    setSelectedImage(null)
  }

  const deleteProject = (projectId: string) => {
    if (confirm('Delete this project and all its images?')) {
      setProjects(projects.filter(p => p.id !== projectId))
      if (activeProject?.id === projectId) {
        setActiveProject(null)
      }
    }
  }

  const toggleTagSelection = (tag: string) => {
    if (selectedTagsForCapture.includes(tag)) {
      setSelectedTagsForCapture(selectedTagsForCapture.filter(t => t !== tag))
    } else {
      setSelectedTagsForCapture([...selectedTagsForCapture, tag])
    }
  }

  const updateProjectCurrentTags = () => {
    if (!activeProject || selectedTagsForCapture.length === 0) return

    const updatedProject = {
      ...activeProject,
      currentTags: [...selectedTagsForCapture]
    }

    setProjects(projects.map(p => p.id === activeProject.id ? updatedProject : p))
    setActiveProject(updatedProject)
    setShowTagFlyout(false)
  }

  const addCustomTag = () => {
    if (!activeProject) return

    const newTag = prompt('Enter new custom tag:', '')
    if (!newTag) return

    const sanitizedTag = newTag.trim().replace(/[^a-zA-Z0-9-_]/g, '')
    
    if (!sanitizedTag) {
      alert('Invalid tag name')
      return
    }

    const updatedProject = {
      ...activeProject,
      tags: activeProject.tags.includes(sanitizedTag) ? activeProject.tags : [...activeProject.tags, sanitizedTag]
    }

    setProjects(projects.map(p => p.id === activeProject.id ? updatedProject : p))
    setActiveProject(updatedProject)
  }

  const downloadProjectFiles = async (project: Project) => {
    try {
      if (!('showDirectoryPicker' in window)) {
        alert('File System Access API not supported. Images are stored in browser memory. Use a Chromium-based browser for file system access.')
        downloadManifestOnly(project)
        return
      }

      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite'
      })

      const projectFolderHandle = await dirHandle.getDirectoryHandle(project.name, { create: true })

      for (const image of project.images) {
        const response = await fetch(image.dataUrl)
        const blob = await response.blob()
        const fileHandle = await projectFolderHandle.getFileHandle(image.filename, { create: true })
        const writable = await fileHandle.createWritable()
        await writable.write(blob)
        await writable.close()
      }

      const manifestContent = generateManifest(project)
      const manifestBlob = new Blob([manifestContent], { type: 'text/plain' })
      const manifestHandle = await projectFolderHandle.getFileHandle('manifest.txt', { create: true })
      const manifestWritable = await manifestHandle.createWritable()
      await manifestWritable.write(manifestBlob)
      await manifestWritable.close()

      alert(`Project files saved to folder: ${project.name}`)
    } catch (error) {
      console.error('Error saving files:', error)
      alert('Error saving files. Downloading manifest only.')
      downloadManifestOnly(project)
    }
  }

  const generateManifest = (project: Project): string => {
    let manifest = `Project: ${project.name}\n`
    manifest += `Created: ${new Date(project.lastModified).toLocaleString()}\n`
    manifest += `Total Images: ${project.imageCount}\n`
    manifest += `Tags: ${project.tags.join(', ')}\n`
    manifest += `\n${'='.repeat(80)}\n\n`

    project.images.forEach((image, index) => {
      manifest += `Image ${index + 1}:\n`
      manifest += `  Filename: ${image.filename}\n`
      manifest += `  Tags: ${image.tags.join(', ')}\n`
      manifest += `  Timestamp: ${image.timestamp.toLocaleString()}\n`
      if (image.note) {
        manifest += `  Note: ${image.note}\n`
      }
      manifest += `\n`
    })

    return manifest
  }

  const downloadManifestOnly = (project: Project) => {
    const manifestContent = generateManifest(project)
    const blob = new Blob([manifestContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name}_manifest.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const switchCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
    setFacingMode(facingMode === 'user' ? 'environment' : 'user')
  }

  const cycleZoom = () => {
    const nextIndex = (zoomLevelIndex + 1) % ZOOM_LEVELS.length
    setZoomLevelIndex(nextIndex)
  }

  const getNextFilename = () => {
    if (!activeProject) return 'No project selected'
    if (selectedTagsForCapture.length === 0) return 'Select tags first'
    const tagString = selectedTagsForCapture.sort().join('-')
    const nextNumber = activeProject.images.filter(img => 
      img.tags.sort().join('-') === tagString
    ).length + 1
    return `${tagString}_${String(nextNumber).padStart(4, '0')}.jpg`
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="flex-1 overflow-hidden">
        {activeTab === 'camera' && (
          <div className="relative h-full w-full bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: `scale(${zoomLevel})` }}
            />
            <canvas ref={canvasRef} className="hidden" />
            
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent">
              <div className="flex items-center justify-between">
                <div className="text-white">
                  <div className="text-sm opacity-75">Current Project</div>
                  <div className="font-semibold">{activeProject?.name || 'No Project'}</div>
                  <button
                    onClick={() => setShowTagFlyout(true)}
                    className="flex items-center gap-2 mt-1 px-3 py-1 bg-blue-600 rounded-full text-sm hover:bg-blue-700 transition-colors"
                    disabled={!activeProject}
                  >
                    <Tag className="w-3 h-3" />
                    {selectedTagsForCapture.length > 0 ? selectedTagsForCapture.join(', ') : 'Select Tags'}
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <Button
                  onClick={switchCamera}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                >
                  Switch
                </Button>
              </div>
              {!isOnline && (
                <div className="mt-2 px-3 py-1 bg-yellow-500 text-black text-sm rounded-full inline-block">
                  Offline Mode
                </div>
              )}
            </div>

            <div className="absolute top-1/2 right-4 -translate-y-1/2 flex flex-col gap-3">
              <button
                onClick={cycleZoom}
                className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm text-white font-semibold text-sm border-2 border-white/30 hover:bg-black/70 transition-all active:scale-95"
              >
                {zoomLevel}x
              </button>
            </div>

            <div className="absolute bottom-32 left-0 right-0 text-center">
              <div className="text-white text-sm bg-black/50 inline-block px-4 py-2 rounded-full">
                Next: {getNextFilename()}
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
              <div className="flex items-center justify-center gap-4 mb-4">
                <Button
                  onClick={() => setShowTagFlyout(true)}
                  variant="outline"
                  size="lg"
                  className="bg-white/20 text-white border-white/30 hover:bg-white/30"
                  disabled={!activeProject}
                >
                  <List className="w-5 h-5" />
                </Button>
                
                <button
                  onClick={capturePhoto}
                  className="w-20 h-20 rounded-full bg-white border-4 border-white/50 hover:scale-105 transition-transform active:scale-95"
                  disabled={!activeProject || selectedTagsForCapture.length === 0}
                />
                
                <Button
                  onClick={() => setShowGallery(true)}
                  variant="outline"
                  size="lg"
                  className="bg-white/20 text-white border-white/30 hover:bg-white/30"
                  disabled={!activeProject || activeProject.imageCount === 0}
                >
                  <FolderOpen className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {showTagFlyout && activeProject && (
              <div className="absolute inset-0 bg-black/80 flex items-end z-40">
                <div className="w-full bg-white rounded-t-3xl p-6 max-h-[70vh] overflow-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">Select Tags</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowTagFlyout(false)}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>

                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      Select one or more tags for your next photos. Images will be named with all selected tags.
                    </p>
                  </div>

                  <div className="space-y-2 mb-4">
                    {activeProject.tags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTagSelection(tag)}
                        className={`w-full p-4 rounded-lg text-left transition-colors ${
                          selectedTagsForCapture.includes(tag)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold">{tag}</div>
                            <div className={`text-sm ${selectedTagsForCapture.includes(tag) ? 'text-blue-100' : 'text-gray-500'}`}>
                              {activeProject.images.filter(img => img.tags.includes(tag)).length} images
                            </div>
                          </div>
                          {selectedTagsForCapture.includes(tag) && (
                            <Check className="w-5 h-5" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={addCustomTag}
                      variant="outline"
                      className="flex-1"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Tag
                    </Button>
                    <Button
                      onClick={updateProjectCurrentTags}
                      className="flex-1"
                      disabled={selectedTagsForCapture.length === 0}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Confirm
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="h-full overflow-auto bg-gray-50 p-4">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">Projects</h1>
              <Button onClick={() => setShowProjectModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-4">No projects yet</p>
                <Button onClick={() => setShowProjectModal(true)}>Create Your First Project</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {projects.map(project => (
                  <Card
                    key={project.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1" onClick={() => {
                          setActiveProject(project)
                          setShowGallery(true)
                        }}>
                          <CardTitle>{project.name}</CardTitle>
                          <CardDescription>
                            {project.imageCount} images • Active: {project.currentTags.join(', ')}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              downloadProjectFiles(project)
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteProject(project.id)
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 flex-wrap">
                        {project.tags.map(tag => (
                          <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        Last modified: {project.lastModified.toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="h-full overflow-auto bg-gray-50 p-4">
            <h1 className="text-2xl font-bold mb-6">Settings</h1>

            <Card className="mb-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Tag Templates</CardTitle>
                    <CardDescription>Manage reusable tag collections</CardDescription>
                  </div>
                  <Button onClick={() => setShowTemplateModal(true)} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    New
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {templates.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No templates yet. Create templates to quickly start new projects with predefined tags.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {templates.map(template => (
                      <div key={template.id} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-semibold">{template.name}</div>
                            {template.description && (
                              <div className="text-sm text-gray-500">{template.description}</div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteTemplate(template.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {template.tags.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Storage Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Projects:</span>
                    <span className="font-semibold">{projects.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Images:</span>
                    <span className="font-semibold">
                      {projects.reduce((sum, p) => sum + p.imageCount, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Templates:</span>
                    <span className="font-semibold">{templates.length}</span>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Data is stored in your browser. Use the download button on each project to save images and manifest to your device.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {activeTab === 'camera' && (
        <button
          onClick={() => setIsNavCollapsed(!isNavCollapsed)}
          className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 bg-black/50 backdrop-blur-sm text-white p-2 rounded-full hover:bg-black/70 transition-all"
        >
          {isNavCollapsed ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      )}

      <div className={`border-t bg-white transition-transform duration-300 ${isNavCollapsed && activeTab === 'camera' ? 'translate-y-full' : 'translate-y-0'}`}>
        <div className="flex items-center justify-around p-2">
          <button
            onClick={() => {
              setActiveTab('camera')
              setIsNavCollapsed(false)
            }}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              activeTab === 'camera' ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
            }`}
          >
            <Camera className="w-6 h-6" />
            <span className="text-xs">Camera</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('projects')
              setIsNavCollapsed(false)
            }}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              activeTab === 'projects' ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
            }`}
          >
            <FolderOpen className="w-6 h-6" />
            <span className="text-xs">Projects</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('settings')
              setIsNavCollapsed(false)
            }}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              activeTab === 'settings' ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
            }`}
          >
            <Settings className="w-6 h-6" />
            <span className="text-xs">Settings</span>
          </button>
        </div>
      </div>

      {showProjectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>New Project</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowProjectModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="projectName">Project Name</Label>
                <Input
                  id="projectName"
                  placeholder="Building Inspection 2024"
                  value={newProjectName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setNewProjectName(e.target.value)}
                />
              </div>

              {templates.length > 0 && (
                <div>
                  <Label htmlFor="template">Use Template</Label>
                  <select
                    id="template"
                    value={selectedTemplateId}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedTemplateId(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">No template</option>
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name} ({template.tags.join(', ')})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {!selectedTemplateId && (
                <div>
                  <Label htmlFor="projectTag">Initial Tag</Label>
                  <Input
                    id="projectTag"
                    placeholder="BLDG"
                    value={newProjectTag}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setNewProjectTag(e.target.value)}
                  />
                </div>
              )}

              <Button onClick={createProject} className="w-full">
                Create Project
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md max-h-[80vh] overflow-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>New Template</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowTemplateModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="templateName">Template Name</Label>
                <Input
                  id="templateName"
                  placeholder="Building Inspection"
                  value={newTemplateName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setNewTemplateName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="templateDescription">Description</Label>
                <Input
                  id="templateDescription"
                  placeholder="Standard tags for inspections"
                  value={newTemplateDescription}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setNewTemplateDescription(e.target.value)}
                />
              </div>

              <div>
                <Label>Tags</Label>
                <div className="space-y-2 mt-2">
                  {newTemplateTags.map((tag, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder={`Tag ${index + 1}`}
                        value={tag}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => updateTemplateTag(index, e.target.value)}
                      />
                      {newTemplateTags.length > 1 && (
                        <Button variant="outline" size="sm" onClick={() => removeTemplateTag(index)}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={addTemplateTagInput} className="w-full mt-2">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Tag
                </Button>
              </div>

              <Button onClick={createTemplate} className="w-full">
                Create Template
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {showNoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add Note (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lastCapturedImage && (
                <div>
                  <img
                    src={lastCapturedImage.dataUrl}
                    alt="Captured"
                    className="w-full h-48 object-cover rounded mb-2"
                  />
                  <p className="text-sm text-gray-600 font-medium">{lastCapturedImage.filename}</p>
                  <p className="text-xs text-gray-500">Tags: {lastCapturedImage.tags.join(', ')}</p>
                </div>
              )}
              <Textarea
                placeholder="Enter notes about this image..."
                value={currentNote}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setCurrentNote(e.target.value)}
                rows={4}
              />
              <div className="flex gap-2">
                <Button onClick={saveImageWithNote} variant="outline" className="flex-1">
                  Skip
                </Button>
                <Button onClick={saveImageWithNote} className="flex-1">
                  <Check className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showGallery && activeProject && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setShowGallery(false)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="text-center">
              <h2 className="font-semibold">{activeProject.name}</h2>
              <p className="text-xs text-gray-500">{activeProject.imageCount} images</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadProjectFiles(activeProject)}
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {activeProject.images.length === 0 ? (
              <div className="text-center py-12">
                <Camera className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No images yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {activeProject.images.map(image => (
                  <div
                    key={image.id}
                    className="relative aspect-square cursor-pointer"
                    onClick={() => setSelectedImage(image)}
                  >
                    <img
                      src={image.dataUrl}
                      alt={image.filename}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent rounded-b-lg">
                      <p className="text-white text-xs truncate">{image.filename}</p>
                      <p className="text-white/70 text-xs">{image.tags.join(', ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedImage && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="p-4 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setSelectedImage(null)} className="text-white">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => deleteImage(selectedImage.id)} className="text-white">
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <img
              src={selectedImage.dataUrl}
              alt={selectedImage.filename}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          <div className="p-4 bg-black/50">
            <p className="text-white font-semibold">{selectedImage.filename}</p>
            <p className="text-white/70 text-sm">Tags: {selectedImage.tags.join(', ')}</p>
            <p className="text-white/70 text-sm">{selectedImage.timestamp.toLocaleString()}</p>
            {selectedImage.note && (
              <div className="bg-white/10 rounded p-3 mt-2">
                <p className="text-white text-sm">{selectedImage.note}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// END OF FILE
