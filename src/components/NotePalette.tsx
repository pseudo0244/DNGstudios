"use client"

import type React from "react"
import { useState } from "react"
import { Music, Circle, Music4, Keyboard, Search } from "lucide-react"
import { notations, getLowercaseNotations, getUppercaseNotations, type Notation } from "../data/notations"

interface NotationPaletteProps {
  selectedNotation: Notation | null
  onNotationSelect: (notation: Notation) => void
}

const NotationPalette: React.FC<NotationPaletteProps> = ({ selectedNotation, onNotationSelect }) => {
  const [showCase, setShowCase] = useState<"lowercase" | "uppercase" | "all">("all")
  const [searchTerm, setSearchTerm] = useState("")

  const getFilteredNotations = () => {
    let filtered = notations

    if (showCase === "lowercase") {
      filtered = getLowercaseNotations()
    } else if (showCase === "uppercase") {
      filtered = getUppercaseNotations()
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (notation) =>
          notation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          notation.alphabet.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    return filtered
  }

  return (
    <div className="w-64 bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700 shadow-2xl flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-600 rounded-lg">
            <Music className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-white">DNG Notation Palette</h2>
        </div>
        <p className="text-xs text-slate-400">Select notations and press keyboard keys to place them</p>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-slate-700 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search notations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Filter by Case */}
      <div className="p-4 border-b border-slate-700 flex-shrink-0">
        <div className="flex bg-slate-800 rounded-lg p-1">
          <button
            onClick={() => setShowCase("all")}
            className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-all duration-200 ${
              showCase === "all"
                ? "bg-purple-600 text-white shadow-md"
                : "text-slate-300 hover:text-white hover:bg-slate-700"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setShowCase("lowercase")}
            className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-all duration-200 ${
              showCase === "lowercase"
                ? "bg-purple-600 text-white shadow-md"
                : "text-slate-300 hover:text-white hover:bg-slate-700"
            }`}
          >
            a-z
          </button>
          <button
            onClick={() => setShowCase("uppercase")}
            className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-all duration-200 ${
              showCase === "uppercase"
                ? "bg-purple-600 text-white shadow-md"
                : "text-slate-300 hover:text-white hover:bg-slate-700"
            }`}
          >
            A-Z
          </button>
        </div>
      </div>

      {/* Notations - Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Music4 className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-medium text-white">Notations ({getFilteredNotations().length})</h3>
          </div>

          {getFilteredNotations().map((notation) => (
            <button
              key={notation.id}
              onClick={() => {
                onNotationSelect(notation)
                console.log("Notation selected:", notation.name, notation.alphabet) // NEW: Log selection
              }}
              className={`w-full p-3 rounded-lg border transition-all duration-200 hover:shadow-md group ${
                selectedNotation?.id === notation.id
                  ? "border-purple-500 bg-purple-500/10 shadow-md shadow-purple-500/20"
                  : "border-slate-600 hover:border-slate-500 bg-slate-800/50 hover:bg-slate-700/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center">
                    <img
                      src={notation.image || "/placeholder.svg"}
                      alt={notation.name}
                      className="w-[60px] h-[60px] object-contain"
                    />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-white text-sm">{notation.name}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <kbd className="px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded text-xs font-mono">
                        {notation.alphabet}
                      </kbd>
                      <span>Press to place</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedNotation?.id === notation.id && <Circle className="w-3 h-3 text-purple-400 fill-current" />}
                  <Keyboard className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </button>
          ))}

          {getFilteredNotations().length === 0 && (
            <div className="text-center py-8">
              <Music className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No notations found</p>
              <p className="text-slate-500 text-xs">Try adjusting your search or filter</p>
            </div>
          )}
        </div>
      </div>

      {/* Keyboard Shortcut Info - Fixed at bottom */}
      <div className="p-4 border-t border-slate-700 flex-shrink-0">
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-600">
          <div className="flex items-center gap-2 mb-2">
            <Keyboard className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-medium text-white">Keyboard Shortcuts</h3>
          </div>
          <div className="text-xs text-slate-400 space-y-1">
            <div>
              • Press <kbd className="px-1 py-0.5 bg-slate-700 rounded font-mono">a-z</kbd> for lowercase notations
            </div>
            <div>
              • Press <kbd className="px-1 py-0.5 bg-slate-700 rounded font-mono">A-Z</kbd> for uppercase notations
            </div>
            <div>• Notes are placed automatically on the staff</div>
            <div>• When keyboard is off, click on staff to place selected notation</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotationPalette
