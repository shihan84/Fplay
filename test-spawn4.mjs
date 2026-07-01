import { spawn } from 'child_process'
import { existsSync } from 'fs'

// Reproduce exact buildTextFilter logic with the saved overlay values
const overlay = {
  type: 'clock', active: true, text: 'Sample Text',
  fontFile: '', fontSize: 32, fontColor: 'white',
  bgColor: '#100e0e', bgOpacity: 0.5, outline: 2, outlineColor: 'black',
  posX: 'right', posY: 'top', offsetX: 40, offsetY: 400,
  scrollSpeed: 100, subText: '', subFontSize: 22
}

const FONTS = [
  '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
]
const DEFAULT_FONT = FONTS.find(existsSync) || FONTS[0]
const fontPath = overlay.fontFile || DEFAULT_FONT
const font = `fontfile=${fontPath}:`
const color = overlay.fontColor || 'white'
const outlineColor = overlay.outlineColor || 'black'
const outline = overlay.outline ?? 2
const fs = overlay.fontSize || 32
const ox = overlay.offsetX ?? 0
const oy = overlay.offsetY ?? 40

const x = overlay.posX === 'left' ? `${ox}` : overlay.posX === 'right' ? `w-tw-${ox}` : ox !== 0 ? `(w-tw)/2+${ox}` : '(w-tw)/2'
const y = overlay.posY === 'top' ? `${oy}` : overlay.posY === 'bottom' ? `h-th-${oy}` : oy !== 0 ? `(h-th)/2+${oy}` : '(h-th)/2'

const clockFilter = `drawtext=${font}text='%{localtime\\:%H\\:%M\\:%S}':fontsize=${fs}:fontcolor=${color}:borderw=${outline}:bordercolor=${outlineColor}:x=${x}:y=${y}`

console.log('Generated filter:')
console.log(clockFilter)
console.log('\nx =', x, '  y =', y)
console.log('On 1920x1080: x = 1920 - tw - 40, y =', oy)
console.log('')

// Test it
const args = [
  '-f', 'lavfi', '-i', 'color=black:size=1920x1080:rate=25',
  '-vf', clockFilter,
  '-t', '2', '-f', 'null', '-'
]
const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] })
let stderr = ''
proc.stderr.on('data', d => { stderr += d.toString() })
proc.on('close', code => {
  const lines = stderr.split('\n').filter(l => /warn|error|Error|frame=|draw/i.test(l))
  console.log('Exit:', code, code === 0 ? '✅' : '❌')
  lines.slice(-5).forEach(l => console.log(l))
})
