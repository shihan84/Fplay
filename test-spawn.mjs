import { spawn } from 'child_process'

const FONT = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'

// Exactly what our code generates for clock type
const filterComplex = `[1:v]format=rgba,scale=100:50[logo0];[0:v][logo0]overlay=10:10:format=auto,format=yuv420p[vout],[vout]drawtext=fontfile=${FONT}:text='%{localtime\\:%H\\:%M\\:%S}':fontsize=32:fontcolor=white:borderw=2:bordercolor=black:x=100:y=400[vout_final]`

console.log('filter_complex value:')
console.log(filterComplex)
console.log('')

const args = [
  '-f', 'lavfi', '-i', 'color=black:size=1920x1080:rate=25',
  '-f', 'lavfi', '-i', 'color=red:size=100x50:rate=25',
  '-filter_complex', filterComplex,
  '-map', '[vout_final]',
  '-t', '2', '-f', 'null', '-'
]

console.log('Spawning ffmpeg with args:')
console.log('ffmpeg ' + args.join(' '))
console.log('')

const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] })

let stderr = ''
proc.stderr.on('data', d => { stderr += d.toString() })

proc.on('close', (code) => {
  const lines = stderr.split('\n')
  const relevant = lines.filter(l => /error|Error|drawtext|frame=|invalid|warn/i.test(l))
  console.log('Exit code:', code)
  console.log('Relevant output:')
  relevant.forEach(l => console.log(l))
  if (code === 0) console.log('\n✅ SUCCESS — drawtext clock filter works via spawn')
  else console.log('\n❌ FAILED')
})
