export interface Note {
  id: string
  name: string
  value: number
  symbol: string
  frequency: number
  pitch: string
  image: string
  octave?: number
}

export interface PlacedNote {
  id: string
  note: Note
  x: number
  y: number
  staffLine: number
  accidental?: "sharp" | "flat" | "natural"
  octave: number
}

export interface ScorePage {
  id: string
  title: string
  notes: PlacedNote[]
  timeSignature: {
    numerator: number
    denominator: number
  }
  keySignature: string
  tempo: number
  scoreInfoPosition?: { x: number; y: number }
  textElements?: TextElement[]
}

export interface TextElement {
  id: string
  text: string
  x: number
  y: number
  fontSize: number
  bold: boolean
  italic: boolean
  underline: boolean
}
