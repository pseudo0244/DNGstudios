"use client"
import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { Trash2, Music, Keyboard, RotateCcw, Download, Pen, Eraser, Settings, Type, Play, Pause, Volume2 } from "lucide-react"
import { notations, getNotationByKey, type Notation } from "../data/notations"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"

interface PlacedNotation {
  id: string
  notation: Notation
  x: number // X position relative to the left of the scoresheet area
  y: number // Y position relative to the top of the scoresheet area
  staveIndex: number // Kept for data consistency, but less visually relevant now
  octave: number // Kept for data consistency
}

interface ScorePage {
  id: string
  title: string
  notes: PlacedNotation[]
  timeSignature: { numerator: number; denominator: number }
  keySignature: string
  tempo: number
  keyboardLineSpacing: number // Vertical spacing for keyboard-placed notes
  scoreInfoPosition: { x: number; y: number } // Position for score info display
  textElements: TextElement[] // Text elements on the score
}

interface TextElement {
  id: string
  text: string
  x: number
  y: number
  fontSize: number
  bold: boolean
  italic: boolean
  underline: boolean
}

interface ScoreSheetProps {
  selectedNotation: Notation | null
  currentPage: ScorePage
  onAddNote: (note: PlacedNotation) => void
  onRemoveNote: (noteId: string) => void
  onClearPage: () => void
  onUpdatePageSettings: (settings: Partial<ScorePage>) => void
}

// Articulations data
const articulations = [
  { id: "staccato", name: "Staccato", symbol: ".", image: "/articulations/staccato.png" },
  { id: "accent", name: "Accent", symbol: ">", image: "/articulations/accent.png" },
  { id: "tenuto", name: "Tenuto", symbol: "-", image: "/articulations/tenuto.png" },
  { id: "fermata", name: "Fermata", symbol: "𝄐", image: "/articulations/fermata.png" },
  { id: "marcato", name: "Marcato", symbol: "^", image: "/articulations/marcato.png" },
  { id: "slur", name: "Slur", symbol: "⌒", image: "/articulations/slur.png" },
]

// A4 portrait dimensions in pixels at 96 DPI (approx)
const A4_WIDTH_PX = 794
const A4_HEIGHT_PX = 1123

// Initial X position for keyboard notes
const INITIAL_KEYBOARD_NOTE_X_POSITION = 170

// Visual width of a notation image (w-12 is 48px)
const NOTATION_VISUAL_WIDTH = 48

// Spacing between notations when placed by keyboard
const NOTATION_KEYBOARD_X_INCREMENT = 50 // This includes notation width + desired gap

// Define the actual rendered dimensions of the scoresheet area
const RENDERED_SCORESHEET_WIDTH = A4_WIDTH_PX * 1.3
const RENDERED_SCORESHEET_HEIGHT = A4_HEIGHT_PX * 1.3

// Define the fixed Y positions for each of the 11 allowed lines
// You can customize these Y positions to fit your scoresheet design.
const KEYBOARD_LINE_Y_POSITIONS = [
  230, // Line 1
  338, // Line 2
  446, // Line 3
  553, // Line 4
  659, // Line 5
  764, // Line 6
  872, // Line 7
  980, // Line 8
  1087, // Line 9
  1193, // Line 10
  1300, // Line 11
]

// Define horizontal boundaries for notes
const NOTE_BOUNDARY_LEFT = INITIAL_KEYBOARD_NOTE_X_POSITION
const NOTE_BOUNDARY_RIGHT = 1000 // Original value for right boundary before wrapping

// MIDI Note to Notation Mapping
const midiNoteToNotationMap: { [key: number]: string } = {
  // Map MIDI notes to keyboard sequence a-z, then A-S
  60: "a", 61: "b", 62: "c", 63: "d", 64: "e", 65: "f", 66: "g", 67: "h", 68: "i", 69: "j",
  70: "k", 71: "l", 72: "m", 73: "n", 74: "o", 75: "p", 76: "q", 77: "r", 78: "s", 79: "t",
  80: "u", 81: "v", 82: "w", 83: "x", 84: "y", 85: "z",
  86: "A", 87: "B", 88: "C", 89: "D", 90: "E", 91: "F", 92: "G", 93: "H", 94: "I", 95: "J",
  96: "K", 97: "L", 98: "M", 99: "N", 100: "O", 101: "P", 102: "Q", 103: "R", 104: "S"
}

// Options for Key Signatures
const KEY_SIGNATURE_OPTIONS = [
  { label: "C Major / A Minor", value: "C" },
  { label: "G Major / E Minor", value: "G" },
  { label: "D Major / B Minor", value: "D" },
  { label: "F Major / D Minor", value: "F" },
  { label: "B Major / G Minor", value: "B" },
]

// Options for Time Signatures
const TIME_SIGNATURE_OPTIONS = [
  { label: "2/3", numerator: 2, denominator: 3 },
  { label: "3/4", numerator: 3, denominator: 4 },
  { label: "3/8", numerator: 3, denominator: 8 },
  { label: "5/8", numerator: 5, denominator: 8 },
  { label: "4/4", numerator: 4, denominator: 4 },
  { label: "3/3", numerator: 3, denominator: 3 },
]

const ScoreSheet: React.FC<ScoreSheetProps> = ({
  selectedNotation,
  currentPage,
  onAddNote,
  onRemoveNote,
  onClearPage,
  onUpdatePageSettings,
}) => {
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false)
  const [showToolsDropdown, setShowToolsDropdown] = useState(false) // New state for Tools dropdown
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  const [keyboardEnabled, setKeyboardEnabled] = useState(true)
  const [midiEnabled, setMidiEnabled] = useState(false)
  const [midiInputs, setMidiInputs] = useState<MIDIInput[]>([])
  const [nextNotePosition, setNextNotePosition] = useState(INITIAL_KEYBOARD_NOTE_X_POSITION)
  const [currentKeyboardLineIndex, setCurrentKeyboardLineIndex] = useState(0)
  const currentKeyboardLineY = KEYBOARD_LINE_Y_POSITIONS[currentKeyboardLineIndex]
  
  // Right sidebar states
  const [selectedArticulation, setSelectedArticulation] = useState<any>(null)
  const [textMode, setTextMode] = useState(false)
  const [selectedTextElement, setSelectedTextElement] = useState<TextElement | null>(null)
  const [showTextEditor, setShowTextEditor] = useState(false)
  const [tempTextData, setTempTextData] = useState({
    text: "",
    fontSize: 16,
    bold: false,
    italic: false,
    underline: false
  })
  
  // Metronome states
  const [metronomeEnabled, setMetronomeEnabled] = useState(false)
  const [metronomeInterval, setMetronomeInterval] = useState<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [activeTool, setActiveTool] = useState<"none" | "pen" | "eraser">("none")
  const isInteracting = useRef(false)
  const currentLine = useRef<Array<{ x: number; y: number }>>([])
  const [drawingLines, setDrawingLines] = useState<Array<{ x: number; y: number }[]>>([])
  const [eraserSize] = useState(20) // Default eraser size

  // Initialize audio context for metronome
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  // Metronome functionality
  const playMetronomeClick = useCallback(() => {
    if (!audioContextRef.current) return
    
    const oscillator = audioContextRef.current.createOscillator()
    const gainNode = audioContextRef.current.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContextRef.current.destination)
    
    oscillator.frequency.setValueAtTime(800, audioContextRef.current.currentTime)
    oscillator.type = "square"
    
    gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.1)
    
    oscillator.start(audioContextRef.current.currentTime)
    oscillator.stop(audioContextRef.current.currentTime + 0.1)
  }, [])

  const toggleMetronome = useCallback(() => {
    if (metronomeEnabled) {
      if (metronomeInterval) {
        clearInterval(metronomeInterval)
        setMetronomeInterval(null)
      }
      setMetronomeEnabled(false)
    } else {
      const bpm = currentPage.tempo
      const interval = 60000 / bpm // Convert BPM to milliseconds
      
      const newInterval = setInterval(() => {
        playMetronomeClick()
      }, interval)
      
      setMetronomeInterval(newInterval)
      setMetronomeEnabled(true)
      playMetronomeClick() // Play immediately
    }
  }, [metronomeEnabled, metronomeInterval, currentPage.tempo, playMetronomeClick])

  // Update metronome when tempo changes
  useEffect(() => {
    if (metronomeEnabled && metronomeInterval) {
      clearInterval(metronomeInterval)
      const bpm = currentPage.tempo
      const interval = 60000 / bpm
      
      const newInterval = setInterval(() => {
        playMetronomeClick()
      }, interval)
      
      setMetronomeInterval(newInterval)
    }
  }, [currentPage.tempo, metronomeEnabled, metronomeInterval, playMetronomeClick])

  const placeNotation = useCallback(
    (mappedNotation: Notation) => {
      let finalX = nextNotePosition
      let finalY = currentKeyboardLineY

      if (finalX + NOTATION_VISUAL_WIDTH > NOTE_BOUNDARY_RIGHT) {
        const nextLineIndex = currentKeyboardLineIndex + 1
        if (nextLineIndex < KEYBOARD_LINE_Y_POSITIONS.length) {
          setCurrentKeyboardLineIndex(nextLineIndex)
          finalX = NOTE_BOUNDARY_LEFT
          finalY = KEYBOARD_LINE_Y_POSITIONS[nextLineIndex]
        } else {
          console.warn("Reached maximum number of lines (11), cannot add more notes by wrapping.")
          return
        }
      }

      const newNote: PlacedNotation = {
        id: Date.now().toString(),
        notation: mappedNotation,
        x: finalX,
        y: finalY,
        staveIndex: 0,
        octave: 4,
      }
      onAddNote(newNote)

      setNextNotePosition(finalX + NOTATION_KEYBOARD_X_INCREMENT)
    },
    [nextNotePosition, currentKeyboardLineIndex, currentKeyboardLineY, onAddNote, KEYBOARD_LINE_Y_POSITIONS],
  )

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (!keyboardEnabled || showSettingsDropdown || showKeyboardHelp || showToolsDropdown || activeTool !== "none" || textMode || showTextEditor)
        return
      const target = event.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") {
        return
      }

      const key = event.key
      const mappedNotation = getNotationByKey(key)

      if (key === "Backspace") {
        event.preventDefault()
        event.stopPropagation()
        if (currentPage.notes.length > 0) {
          const lastNote = currentPage.notes[currentPage.notes.length - 1]
          onRemoveNote(lastNote.id)
        }
        return
      }

      if (key === "Enter") {
        event.preventDefault()
        event.stopPropagation()
        setNextNotePosition(INITIAL_KEYBOARD_NOTE_X_POSITION)
        setCurrentKeyboardLineIndex((prevIndex) => {
          const newIndex = prevIndex + 1
          if (newIndex < KEYBOARD_LINE_Y_POSITIONS.length) {
            return newIndex
          } else {
            console.warn("Reached maximum number of lines (11). Cannot add more lines with Enter.")
            return prevIndex
          }
        })
        return
      }

      if (mappedNotation) {
        event.preventDefault()
        event.stopPropagation()
        placeNotation(mappedNotation)
      }
    },
    [
      keyboardEnabled,
      showSettingsDropdown,
      showKeyboardHelp,
      showToolsDropdown, // Added dependency
      activeTool,
      currentPage.notes,
      onRemoveNote,
      placeNotation,
      KEYBOARD_LINE_Y_POSITIONS,
    ],
  )

  const handleMidiMessage = useCallback(
    (event: MIDIMessageEvent) => {
      if (!midiEnabled || showSettingsDropdown || showKeyboardHelp || showToolsDropdown || activeTool !== "none" || textMode || showTextEditor) return

      if (!event.data) {
        console.warn("MIDI message data is null.")
        return
      }

      const status = event.data[0]
      const note = event.data[1]
      const velocity = event.data[2]

      const NOTE_ON = 0x90
      if ((status & 0xf0) === NOTE_ON && velocity > 0) {
        const mappedAlphabet = midiNoteToNotationMap[note]
        if (mappedAlphabet) {
          const mappedNotation = getNotationByKey(mappedAlphabet)
          if (mappedNotation) {
            placeNotation(mappedNotation)
          }
        }
      }
    },
    [midiEnabled, showSettingsDropdown, showKeyboardHelp, showToolsDropdown, activeTool, textMode, showTextEditor, placeNotation],
  )

  useEffect(() => {
    if (keyboardEnabled) {
      const handleKeyDown = (e: KeyboardEvent) => handleKeyPress(e)
      document.addEventListener("keydown", handleKeyDown, true)
      window.addEventListener("keydown", handleKeyDown, true)
      return () => {
        document.removeEventListener("keydown", handleKeyDown, true)
        window.removeEventListener("keydown", handleKeyDown, true)
      }
    }
  }, [handleKeyPress, keyboardEnabled])

  useEffect(() => {
    if (currentPage.notes.length > 0) {
      const lastNote = currentPage.notes[currentPage.notes.length - 1]
      setNextNotePosition(lastNote.x + NOTATION_KEYBOARD_X_INCREMENT)
      const lastNoteLineIndex = KEYBOARD_LINE_Y_POSITIONS.indexOf(lastNote.y)
      if (lastNoteLineIndex !== -1) {
        setCurrentKeyboardLineIndex(lastNoteLineIndex)
      } else {
        setCurrentKeyboardLineIndex(0)
      }
    } else {
      setNextNotePosition(INITIAL_KEYBOARD_NOTE_X_POSITION)
      setCurrentKeyboardLineIndex(0)
    }
  }, [currentPage.notes, KEYBOARD_LINE_Y_POSITIONS])

  useEffect(() => {
    if (keyboardEnabled) {
      document.body.focus()
      document.body.setAttribute("tabindex", "0")
      return () => {
        document.body.removeAttribute("tabindex")
      }
    }
  }, [keyboardEnabled])

  useEffect(() => {
    if (midiEnabled) {
      if (!navigator.requestMIDIAccess) {
        console.warn("Web MIDI API is not supported in this browser.")
        setMidiEnabled(false)
        return
      }

      const enableMidi = async () => {
        try {
          const midiAccess = await navigator.requestMIDIAccess()
          const inputs: MIDIInput[] = []
          midiAccess.inputs.forEach((input) => {
            inputs.push(input)
            input.addEventListener("midimessage", handleMidiMessage)
          })
          setMidiInputs(inputs)
          console.log("MIDI enabled. Listening for messages.")
        } catch (error) {
          console.error("Failed to access MIDI devices:", error)
          setMidiEnabled(false)
        }
      }

      enableMidi()

      return () => {
        midiInputs.forEach((input) => {
          input.removeEventListener("midimessage", handleMidiMessage)
        })
        setMidiInputs([])
      }
    } else {
      midiInputs.forEach((input) => {
        input.removeEventListener("midimessage", handleMidiMessage)
      })
      setMidiInputs([])
    }
  }, [midiEnabled, handleMidiMessage])

  const handleImageClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== "none" && !textMode) {
      console.log("A tool is active. Cannot place notations by click.")
      return
    }
    
    if (textMode) {
      const rect = event.currentTarget.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      
      setTempTextData({ ...tempTextData, text: "New Text" })
      setSelectedTextElement({
        id: Date.now().toString(),
        text: "New Text",
        x: Math.max(20, Math.min(x, rect.width - 20)),
        y: Math.max(20, Math.min(y, rect.height - 20)),
        fontSize: 16,
        bold: false,
        italic: false,
        underline: false
      })
      setShowTextEditor(true)
      return
    }
    
    if (!selectedNotation && !selectedArticulation) {
      console.log("No notation selected. Please select one from the palette first.")
      return
    }
    
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    if (selectedNotation) {
      const newNote: PlacedNotation = {
        id: Date.now().toString(),
        notation: selectedNotation,
        x: Math.max(20, Math.min(x, rect.width - 20)),
        y: Math.max(20, Math.min(y, rect.height - 20)),
        staveIndex: 0,
        octave: 4,
      }
      console.log("Placing selected notation:", newNote)
      onAddNote(newNote)
    }
  }

  const addTextElement = useCallback((textElement: TextElement) => {
    const updatedTextElements = [...(currentPage.textElements || []), textElement]
    onUpdatePageSettings({ textElements: updatedTextElements })
  }, [currentPage.textElements, onUpdatePageSettings])

  const updateTextElement = useCallback((updatedElement: TextElement) => {
    const updatedTextElements = (currentPage.textElements || []).map(el => 
      el.id === updatedElement.id ? updatedElement : el
    )
    onUpdatePageSettings({ textElements: updatedTextElements })
  }, [currentPage.textElements, onUpdatePageSettings])

  const removeTextElement = useCallback((elementId: string) => {
    const updatedTextElements = (currentPage.textElements || []).filter(el => el.id !== elementId)
    onUpdatePageSettings({ textElements: updatedTextElements })
  }, [currentPage.textElements, onUpdatePageSettings])

  const drawLine = useCallback((ctx: CanvasRenderingContext2D, line: { x: number; y: number }[]) => {
    if (line.length < 2) return
    ctx.beginPath()
    ctx.moveTo(line[0].x, line[0].y)
    for (let i = 1; i < line.length; i++) {
      ctx.lineTo(line[i].x, line[i].y)
    }
    ctx.stroke()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.strokeStyle = "black"
    ctx.globalCompositeOperation = "source-over"

    drawingLines.forEach((line) => drawLine(ctx, line))
  }, [drawingLines, drawLine])

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (activeTool === "none" || !canvasRef.current) return
      isInteracting.current = true
      const rect = canvasRef.current.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const ctx = canvasRef.current.getContext("2d")
      if (!ctx) return

      if (activeTool === "pen") {
        currentLine.current = [{ x, y }]
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineWidth = 2
        ctx.lineCap = "round"
        ctx.strokeStyle = "black"
        ctx.globalCompositeOperation = "source-over"
      } else if (activeTool === "eraser") {
        ctx.globalCompositeOperation = "destination-out"
        ctx.beginPath()
        ctx.arc(x, y, eraserSize / 2, 0, Math.PI * 2)
        ctx.fill()
      }
    },
    [activeTool, eraserSize],
  )

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!isInteracting.current || !canvasRef.current) return
      const rect = canvasRef.current.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const ctx = canvasRef.current.getContext("2d")
      if (!ctx) return

      if (activeTool === "pen") {
        ctx.lineTo(x, y)
        ctx.stroke()
        currentLine.current.push({ x, y })
      } else if (activeTool === "eraser") {
        ctx.beginPath()
        ctx.arc(x, y, eraserSize / 2, 0, Math.PI * 2)
        ctx.fill()
      }
    },
    [activeTool, eraserSize],
  )

  const handleMouseUp = useCallback(() => {
    if (!isInteracting.current) return
    isInteracting.current = false
    const ctx = canvasRef.current?.getContext("2d")
    if (ctx) {
      ctx.globalCompositeOperation = "source-over"
    }

    if (activeTool === "pen") {
      if (currentLine.current.length > 1) {
        setDrawingLines((prev) => [...prev, currentLine.current])
      }
      currentLine.current = []
    }
  }, [activeTool])

  const handleClearAll = () => {
    onClearPage()
    setDrawingLines([])
    onUpdatePageSettings({ textElements: [] })
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
  }

  const exportToPDF = async () => {
    const scoresheetElement = document.querySelector(".scoresheet-area") as HTMLElement
    if (!scoresheetElement) return

    try {
      const canvas = await html2canvas(scoresheetElement, {
        backgroundColor: "#ffffff",
        scale: 3,
        useCORS: true,
        width: scoresheetElement.offsetWidth,
        height: scoresheetElement.offsetHeight,
      })

      const imgData = canvas.toDataURL("image/png")

      const pxToMm = 25.4 / 96
      const imgWidthMm = canvas.width * pxToMm
      const imgHeightMm = canvas.height * pxToMm

      const pdf = new jsPDF({
        orientation: imgWidthMm > imgHeightMm ? "landscape" : "portrait",
        unit: "mm",
        format: [imgWidthMm, imgHeightMm],
      })

      pdf.addImage(imgData, "PNG", 0, 0, imgWidthMm, imgHeightMm)
      pdf.save(`${currentPage.title}.pdf`)
    } catch (error) {
      console.error("Error exporting to PDF:", error)
    }
  }

  const handleToolToggle = (tool: "pen" | "eraser") => {
    setActiveTool((prev) => (prev === tool ? "none" : tool))
    setShowToolsDropdown(false) // Close dropdown after selection
  }

  const getCursorStyle = useCallback(() => {
    if (activeTool === "pen") return "crosshair"
    if (activeTool === "eraser") return 'url("/placeholder.svg?width=24&height=24"), auto'
    if (textMode) return "text"
    if ((selectedNotation || selectedArticulation) && activeTool === "none" && !keyboardEnabled && !midiEnabled) return "crosshair"
    return "default"
  }, [activeTool, selectedNotation, selectedArticulation, keyboardEnabled, midiEnabled, textMode])

  return (
    <div className="flex flex-1 bg-gray-100 overflow-hidden">
      {/* Main Content Area */}
      <div 
        className="flex-1 overflow-auto"
        onClick={() => {
          if (keyboardEnabled && activeTool === "none") {
            document.body.focus()
          }
        }}
        tabIndex={keyboardEnabled && activeTool === "none" ? 0 : -1}
      >
        <div className="max-w-6xl mx-auto p-6">
        {/* Compact Header */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-6">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-1">{currentPage.title}</h2>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Music className="w-3 h-3" />
                    <span>{currentPage.notes.length} notations</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Keyboard className="w-3 h-3" />
                    <span className={keyboardEnabled ? "text-green-600 font-medium" : "text-red-600"}>
                      Keyboard {keyboardEnabled ? "ON" : "OFF"}
                    </span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Music className="w-3 h-3" />
                    <span className={midiEnabled ? "text-green-600 font-medium" : "text-red-600"}>
                      MIDI {midiEnabled ? "ON" : "OFF"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Score Settings Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 bg-gray-600 text-white hover:bg-gray-700"
                >
                  <Settings className="w-3 h-3" />
                  Score Settings
                </button>
                {showSettingsDropdown && (
                  <div className="absolute right-0 mt-2 w-56 p-2 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                    <div className="px-2 py-1 text-sm font-semibold text-gray-700">Key Signature</div>
                    <div className="my-1 h-px bg-gray-200" />
                    <div className="space-y-1">
                      {KEY_SIGNATURE_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-sm cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="keySignature"
                            value={option.value}
                            checked={currentPage.keySignature === option.value}
                            onChange={() => onUpdatePageSettings({ keySignature: option.value })}
                            className="form-radio h-4 w-4 text-purple-600"
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>

                    <div className="my-2 h-px bg-gray-200" />
                    <div className="px-2 py-1 text-sm font-semibold text-gray-700">Time Signature</div>
                    <div className="my-1 h-px bg-gray-200" />
                    <div className="space-y-1">
                      {TIME_SIGNATURE_OPTIONS.map((option) => (
                        <label
                          key={`${option.numerator}/${option.denominator}`}
                          className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-sm cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="timeSignature"
                            value={`${option.numerator}/${option.denominator}`}
                            checked={
                              currentPage.timeSignature.numerator === option.numerator &&
                              currentPage.timeSignature.denominator === option.denominator
                            }
                            onChange={() =>
                              onUpdatePageSettings({
                                timeSignature: { numerator: option.numerator, denominator: option.denominator },
                              })
                            }
                            className="form-radio h-4 w-4 text-purple-600"
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>

                    <div className="my-2 h-px bg-gray-200" />
                    <div className="px-2 py-1 text-sm font-semibold text-gray-700">Score Info Position</div>
                    <div className="my-1 h-px bg-gray-200" />
                    <div className="px-2 py-1 space-y-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">X Position: {currentPage.scoreInfoPosition?.x || 40}</label>
                        <input
                          type="range"
                          min={10}
                          max={200}
                          step={1}
                          value={currentPage.scoreInfoPosition?.x || 40}
                          onChange={(e) => onUpdatePageSettings({ 
                            scoreInfoPosition: { 
                              ...currentPage.scoreInfoPosition, 
                              x: Number(e.target.value) 
                            } 
                          })}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Y Position: {currentPage.scoreInfoPosition?.y || 40}</label>
                        <input
                          type="range"
                          min={10}
                          max={200}
                          step={1}
                          value={currentPage.scoreInfoPosition?.y || 40}
                          onChange={(e) => onUpdatePageSettings({ 
                            scoreInfoPosition: { 
                              ...currentPage.scoreInfoPosition, 
                              y: Number(e.target.value) 
                            } 
                          })}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                        />
                      </div>
                    </div>

                    <div className="my-2 h-px bg-gray-200" />
                    <div className="px-2 py-1 text-sm font-semibold text-gray-700">Tempo ({currentPage.tempo} BPM)</div>
                    <div className="my-1 h-px bg-gray-200" />
                    <div className="px-2 py-1">
                      <input
                        type="range"
                        min={40}
                        max={240}
                        step={1}
                        value={currentPage.tempo}
                        onChange={(e) => onUpdatePageSettings({ tempo: Number(e.target.value) })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Tools Dropdown - New consolidated dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowToolsDropdown(!showToolsDropdown)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Settings className="w-3 h-3" />
                  Tools
                </button>
                {showToolsDropdown && (
                  <div className="absolute right-0 mt-2 w-48 p-2 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                    <div className="px-2 py-1 text-sm font-semibold text-gray-700">Actions</div>
                    <div className="my-1 h-px bg-gray-200" />
                    <button
                      onClick={() => {
                        setShowKeyboardHelp(true)
                        setShowToolsDropdown(false)
                      }}
                      className="flex items-center gap-2 w-full text-left px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-sm"
                    >
                      <Keyboard className="w-3 h-3" />
                      Key Map
                    </button>
                    <button
                      onClick={() => {
                        exportToPDF()
                        setShowToolsDropdown(false)
                      }}
                      className="flex items-center gap-2 w-full text-left px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-sm"
                    >
                      <Download className="w-3 h-3" />
                      Export PDF
                    </button>
                    <button
                      onClick={() => {
                        handleClearAll()
                        setShowToolsDropdown(false)
                      }}
                      disabled={currentPage.notes.length === 0 && drawingLines.length === 0}
                      className="flex items-center gap-2 w-full text-left px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear All
                    </button>

                    <div className="my-2 h-px bg-gray-200" />
                    <div className="px-2 py-1 text-sm font-semibold text-gray-700">Drawing Tools</div>
                    <div className="my-1 h-px bg-gray-200" />
                    <button
                      onClick={() => handleToolToggle("pen")}
                      className={`flex items-center gap-2 w-full text-left px-2 py-1.5 text-sm rounded-sm ${
                        activeTool === "pen" ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <Pen className="w-3 h-3" />
                      Pen {activeTool === "pen" && "(Active)"}
                    </button>
                    <button
                      onClick={() => handleToolToggle("eraser")}
                      className={`flex items-center gap-2 w-full text-left px-2 py-1.5 text-sm rounded-sm ${
                        activeTool === "eraser" ? "bg-red-100 text-red-700" : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <Eraser className="w-3 h-3" />
                      Eraser {activeTool === "eraser" && "(Active)"}
                    </button>
                  </div>
                )}
              </div>

              {/* Keyboard and MIDI toggles remain separate */}
              <button
                onClick={() => setKeyboardEnabled(!keyboardEnabled)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  keyboardEnabled
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-gray-600 text-white hover:bg-gray-700"
                }`}
              >
                <Keyboard className="w-3 h-3" />
                Keyboard
              </button>
              <button
                onClick={() => setMidiEnabled(!midiEnabled)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  midiEnabled
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-gray-600 text-white hover:bg-gray-700"
                }`}
              >
                <Music className="w-3 h-3" />
                MIDI
              </button>
              <button
                onClick={toggleMetronome}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  metronomeEnabled
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-gray-600 text-white hover:bg-gray-700"
                }`}
              >
                {metronomeEnabled ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                Metronome
              </button>
              <button
                onClick={() => {
                  setNextNotePosition(INITIAL_KEYBOARD_NOTE_X_POSITION)
                  setCurrentKeyboardLineIndex(0)
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all duration-200 text-xs font-medium"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Pos
              </button>
            </div>
          </div>
        </div>

        {/* Keyboard Status Banner */}
        {(keyboardEnabled || midiEnabled) && activeTool === "none" && !textMode && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-blue-800">
                {keyboardEnabled && <Keyboard className="w-4 h-4" />}
                {midiEnabled && <Music className="w-4 h-4" />}
                <span className="font-medium">
                  {keyboardEnabled && midiEnabled
                    ? "Keyboard & MIDI Modes Active"
                    : keyboardEnabled
                      ? "Keyboard Mode Active"
                      : "MIDI Mode Active"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Text Mode Banner */}
        {textMode && (
          <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-purple-800">
                <Type className="w-4 h-4" />
                <span className="font-medium">Text Mode Active - Click anywhere on the score to add text</span>
              </div>
            </div>
          </div>
        )}

        {/* Score Sheet Area - Main content area with background image */}
        <div
          className="relative bg-white shadow-xl mx-auto scoresheet-area"
          style={{
            width: `${RENDERED_SCORESHEET_WIDTH}px`,
            height: `${RENDERED_SCORESHEET_HEIGHT}px`,
            border: "1px solid #dadada",
          }}
        >
          {/* Background Image */}
          <img
            src="/images/DNGLines.jpg"
            alt="Music Scoresheet Background"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />

          {/* Score Sheet Info Display */}
          <div 
            className="absolute z-20 text-gray-800 font-semibold text-lg"
            style={{
              top: `${currentPage.scoreInfoPosition?.y || 40}px`,
              left: `${currentPage.scoreInfoPosition?.x || 40}px`
            }}
          >
            <div className="flex items-baseline gap-2">
              <span className="text-2xl">{currentPage.timeSignature.numerator}</span>
              <span className="text-2xl leading-none">{currentPage.timeSignature.denominator}</span>
            </div>
            <div className="text-sm mt-1">
              Key:{" "}
              {KEY_SIGNATURE_OPTIONS.find((k) => k.value === currentPage.keySignature)?.label ||
                currentPage.keySignature}
            </div>
            <div className="text-sm">Tempo: {currentPage.tempo} BPM</div>
          </div>

          {/* Overlay for click events, note placement, and drawing */}
          <div
            className="absolute inset-0 z-10"
            onClick={activeTool === "none" ? handleImageClick : undefined}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              cursor: getCursorStyle(),
            }}
          >
            {/* Canvas for drawing (on top of notes) */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 z-30"
              width={RENDERED_SCORESHEET_WIDTH}
              height={RENDERED_SCORESHEET_HEIGHT}
            />

            {/* Placed notations */}
            {currentPage.notes.map((placedNote) => (
              <div
                key={placedNote.id}
                className="absolute group cursor-pointer z-20"
                style={{
                  left: `${placedNote.x}px`,
                  top: `${placedNote.y}px`,
                  transform: "translateX(-50%)",
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  console.log("Playing notation:", placedNote.notation.name)
                }}
              >
                <div className="relative">
                  <img
                    src={placedNote.notation.image || "/placeholder.svg"}
                    alt={placedNote.notation.name}
                    className="w-[72px] h-[72px] object-contain drop-shadow-md"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemoveNote(placedNote.id)
                    }}
                    className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center text-sm font-bold shadow-lg hover:bg-red-600"
                  >
                    &times;
                  </button>
                </div>
              </div>
            ))}

            {/* Text Elements */}
            {(currentPage.textElements || []).map((textElement) => (
              <div
                key={textElement.id}
                className="absolute group cursor-pointer z-20"
                style={{
                  left: `${textElement.x}px`,
                  top: `${textElement.y}px`,
                  fontSize: `${textElement.fontSize}px`,
                  fontWeight: textElement.bold ? 'bold' : 'normal',
                  fontStyle: textElement.italic ? 'italic' : 'normal',
                  textDecoration: textElement.underline ? 'underline' : 'none',
                  color: '#333'
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedTextElement(textElement)
                  setTempTextData({
                    text: textElement.text,
                    fontSize: textElement.fontSize,
                    bold: textElement.bold,
                    italic: textElement.italic,
                    underline: textElement.underline
                  })
                  setShowTextEditor(true)
                }}
              >
                {textElement.text}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeTextElement(textElement.id)
                  }}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center text-xs font-bold shadow-lg hover:bg-red-600"
                >
                  &times;
                </button>
              </div>
            ))}

            {/* Next note position indicator for keyboard input */}
            {(keyboardEnabled || midiEnabled) && activeTool === "none" && !textMode && (
              <div
                className="absolute w-px h-6 bg-blue-400 opacity-100 animate-blink z-20 translate-y-1/2"
                style={{
                  left: `${nextNotePosition}px`,
                  top: `${currentKeyboardLineY}px`,
                }}
              />
            )}

            {/* Help text for notation placement */}
            {currentPage.notes.length === 0 && activeTool === "none" && !textMode && (
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <div className="text-center text-gray-500 bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-200 shadow-lg">
                  <Music className="w-12 h-12 text-purple-500 mx-auto mb-4" />
                  <p className="text-xl font-semibold mb-2">
                    {keyboardEnabled
                      ? "Press keyboard keys to place notations"
                      : midiEnabled
                        ? "Press keys on your MIDI device to place notations"
                        : "Click on the sheet to place notations"}
                  </p>
                  <p className="text-sm">
                    {keyboardEnabled
                      ? "Keyboard mode is active - press any letter key (a-z, A-Z) or Enter for new line"
                      : midiEnabled
                        ? "MIDI mode is active - connect a MIDI device and play!"
                        : selectedNotation
                          ? `Selected: ${selectedNotation.name} (${selectedNotation.alphabet})`
                          : "Select a notation from the palette first"}
                  </p>
                </div>
              </div>
            )}

            {/* Help text for text mode */}
            {textMode && (
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <div className="text-center text-gray-500 bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-200 shadow-lg">
                  <Type className="w-12 h-12 text-purple-500 mx-auto mb-4" />
                  <p className="text-xl font-semibold mb-2">Click anywhere to add text</p>
                  <p className="text-sm">
                    Text mode is active - click on the score sheet to place text elements
                  </p>
                </div>
              </div>
            )}

            {/* Help text for drawing mode */}
            {activeTool === "pen" && (
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <div className="text-center text-gray-500 bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-200 shadow-lg">
                  <Pen className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                  <p className="text-xl font-semibold mb-2">Draw on the sheet with your mouse</p>
                  <p className="text-sm">
                    Click and drag to draw freehand lines. Click the Pen button again to exit drawing mode.
                  </p>
                </div>
              </div>
            )}

            {/* Help text for eraser mode */}
            {activeTool === "eraser" && (
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <div className="text-center text-gray-500 bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-200 shadow-lg">
                  <Eraser className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-xl font-semibold mb-2">Erase drawings on the sheet</p>
                  <p className="text-sm">
                    Click and drag to erase parts of your drawings. Click the Eraser button again to exit erasing mode.
                  </p>
                </div>
              </div>
            )}

            {/* Visual indicator for selected notation */}
            {activeTool === "none" && !keyboardEnabled && !midiEnabled && !textMode && selectedNotation && (
              <div className="absolute top-4 right-4 bg-purple-100 text-purple-800 text-sm px-3 py-1 rounded-full flex items-center gap-2 shadow-md z-20">
                <Music className="w-4 h-4" />
                <span>Selected: {selectedNotation.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-6 shadow-lg">
          <h3 className="font-bold text-blue-900 mb-4 text-lg">How to use DNG Studios:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Select notations from the palette on the left
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Click on the sheet to place notations manually
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <strong>NEW:</strong> Press keyboard keys (a-z, A-Z) to auto-place notations
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Each key maps to a different notation (uppercase vs lowercase)
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <strong>NEW:</strong> Toggle MIDI mode ON to use a connected MIDI keyboard
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                MIDI notes are mapped to specific notations (see Key Map for details)
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <strong>NEW:</strong> Click the "Pen" button to enable freehand drawing on the sheet.
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <strong>NEW:</strong> Click the "Eraser" button to erase drawings on the sheet.
              </li>
            </ul>
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Use "Play All\" to hear your composition
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Toggle keyboard mode on/off as needed
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                View keyboard mapping with "Key Map\" button
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Your work is automatically saved
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <strong>NEW:</strong> Press Backspace to delete the most recent notation
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <strong>NEW:</strong> Press Enter to move to the next line
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <strong>NEW:</strong> Notations will automatically wrap to the next line
              </li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Right Sidebar */}
      <div className="w-64 bg-gradient-to-b from-slate-900 to-slate-800 border-l border-slate-700 shadow-2xl flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Type className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-white">Tools & Elements</h2>
          </div>
        </div>

        {/* Text Tool */}
        <div className="p-4 border-b border-slate-700 flex-shrink-0">
          <button
            onClick={() => setTextMode(!textMode)}
            className={`w-full p-3 rounded-lg border transition-all duration-200 hover:shadow-md ${
              textMode
                ? "border-purple-500 bg-purple-500/10 shadow-md shadow-purple-500/20"
                : "border-slate-600 hover:border-slate-500 bg-slate-800/50 hover:bg-slate-700/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <Type className="w-6 h-6 text-white" />
              <div className="text-left">
                <div className="font-medium text-white text-sm">Text Tool</div>
                <div className="text-xs text-slate-400">
                  {textMode ? "Click to place text" : "Click to activate"}
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Articulations */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <Music className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-medium text-white">Articulations</h3>
            </div>

            {articulations.map((articulation) => (
              <button
                key={articulation.id}
                onClick={() => {
                  setSelectedArticulation(selectedArticulation?.id === articulation.id ? null : articulation)
                }}
                className={`w-full p-3 rounded-lg border transition-all duration-200 hover:shadow-md ${
                  selectedArticulation?.id === articulation.id
                    ? "border-blue-500 bg-blue-500/10 shadow-md shadow-blue-500/20"
                    : "border-slate-600 hover:border-slate-500 bg-slate-800/50 hover:bg-slate-700/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
                    <span className="text-lg font-bold">{articulation.symbol}</span>
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-white text-sm">{articulation.name}</div>
                    <div className="text-xs text-slate-400">Click to select</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* Text Editor Modal */}
    {showTextEditor && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-200">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Edit Text</h2>
              <button
                onClick={() => {
                  setShowTextEditor(false)
                  setSelectedTextElement(null)
                }}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold"
              >
                &times;
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Text</label>
                <input
                  type="text"
                  value={tempTextData.text}
                  onChange={(e) => setTempTextData({ ...tempTextData, text: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter text"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Font Size: {tempTextData.fontSize}px</label>
                <input
                  type="range"
                  min={8}
                  max={48}
                  value={tempTextData.fontSize}
                  onChange={(e) => setTempTextData({ ...tempTextData, fontSize: Number(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setTempTextData({ ...tempTextData, bold: !tempTextData.bold })}
                  className={`px-3 py-2 rounded-lg font-bold transition-colors ${
                    tempTextData.bold ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  B
                </button>
                <button
                  onClick={() => setTempTextData({ ...tempTextData, italic: !tempTextData.italic })}
                  className={`px-3 py-2 rounded-lg italic transition-colors ${
                    tempTextData.italic ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  I
                </button>
                <button
                  onClick={() => setTempTextData({ ...tempTextData, underline: !tempTextData.underline })}
                  className={`px-3 py-2 rounded-lg underline transition-colors ${
                    tempTextData.underline ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  U
                </button>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowTextEditor(false)
                    setSelectedTextElement(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (selectedTextElement) {
                      const updatedElement = {
                        ...selectedTextElement,
                        text: tempTextData.text,
                        fontSize: tempTextData.fontSize,
                        bold: tempTextData.bold,
                        italic: tempTextData.italic,
                        underline: tempTextData.underline
                      }
                      if (selectedTextElement.text === "New Text") {
                        addTextElement(updatedElement)
                      } else {
                        updateTextElement(updatedElement)
                      }
                    }
                    setShowTextEditor(false)
                    setSelectedTextElement(null)
                    setTextMode(false)
                  }}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* Keyboard Help Modal */}
      {showKeyboardHelp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[80vh] overflow-auto border border-gray-200">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Keyboard Mapping</h2>
                <button
                  onClick={() => setShowKeyboardHelp(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  &times;
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                {notations.map((notation) => (
                  <div key={notation.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <kbd
                        className={`px-2 py-1 rounded text-sm font-mono ${
                          notation.alphabet >= "A" && notation.alphabet <= "Z"
                            ? "bg-purple-800 text-white"
                            : "bg-gray-800 text-white"
                        }`}
                      >
                        {notation.alphabet}
                      </kbd>
                      <img
                        src={notation.image || "/placeholder.svg"}
                        alt={notation.name}
                        className="w-6 h-6 object-contain"
                      />
                    </div>
                    <div className="text-xs text-gray-600">
                      <div className="font-medium truncate">{notation.name}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Press any mapped key to place the corresponding notation on the sheet</li>
                  <li>
                    • <kbd className="px-1 py-0.5 bg-gray-800 text-white rounded font-mono text-xs">a-z</kbd> keys place
                    lowercase notations
                  </li>
                  <li>
                    • <kbd className="px-1 py-0.5 bg-purple-800 text-white rounded font-mono text-xs">A-Z</kbd> keys
                    place uppercase notations (different symbols)
                  </li>
                  <li>• Notations are placed automatically from left to right</li>
                  <li>• Use "Reset Position" to start placing notations from the beginning again</li>
                  <li>• Toggle keyboard mode off to use manual placement</li>
                  <li>
                    • Press <kbd className="px-1 py-0.5 bg-gray-800 text-white rounded font-mono text-xs">Enter</kbd> to
                    move to the next line
                  </li>
                  <li>• Notations will automatically wrap to the next line when the current line is full.</li>
                </ul>
                <h3 className="font-semibold text-blue-900 mt-4 mb-2">MIDI Mapping:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  {Object.entries(midiNoteToNotationMap).map(([midiNote, alphabetKey]) => {
                    const notation = getNotationByKey(alphabetKey)
                    return (
                      <li key={midiNote}>
                        • MIDI Note {midiNote} maps to keyboard key{" "}
                        <kbd className="px-1 py-0.5 bg-gray-800 text-white rounded font-mono text-xs">
                          {alphabetKey}
                        </kbd>
                        {notation && ` (${notation.name})`}
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScoreSheet
