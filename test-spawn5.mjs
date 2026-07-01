import { spawn } from 'child_process'

const FONT = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'

// Test different ways to escape the format string inside %{localtime:}
const tests = [
  // The colons inside %H:%M:%S need special escaping inside %{} expression
  // According to FFmpeg drawtext docs: inside %{} you use \: for colon separator
  // But %H:%M:%S has colons that are PART of the format string, not separators
  // Solution: use a format without colons, or use Unicode hyphen lookalike
  
  { name: 'A: %H-%M-%S (hyphens — no colon issue)', 
    txt: `'%{localtime\\:%H-%M-%S}'` },
  
  { name: 'B: %H\\\\:%M\\\\:%S (double-escape colons in format)',
    txt: `'%{localtime\\:%H\\\\:%M\\\\:%S}'` },
    
  { name: 'C: pts\\:localtime\\:0 with \\\\: in fmt',
    txt: `'%{pts\\:localtime\\:0\\:%H\\\\:%M\\\\:%S}'` },

  // Use strftime via drawtext's expansion: text_shaping or direct strftime call
  { name: 'D: expansion_char + strftime as text option',
    txt: `'TIME'` }, // just a static placeholder for comparison
    
  // Write to a file and read — use textfile option instead
]

for (const t of tests) {
  await new Promise(resolve => {
    const vf = `drawtext=fontfile=${FONT}:text=${t.txt}:fontsize=48:fontcolor=yellow:borderw=3:bordercolor=black:x=50:y=50`
    const args = ['-f', 'lavfi', '-i', 'color=black:size=640x360:rate=25', '-vf', vf, '-t', '1', '-f', 'null', '-']
    console.log(`\n[${t.name}]`)
    console.log('  text =', t.txt)
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    proc.stderr.on('data', d => { stderr += d.toString() })
    proc.on('close', code => {
      const warn = stderr.split('\n').filter(l => /requires|warn|Parsed_draw|Invalid/i.test(l)).slice(0,3)
      console.log(`  exit=${code} ${code===0?'✅':'❌'}`, warn.length ? '' : '(no warnings)')
      warn.forEach(l => console.log('  >', l.trim()))
      resolve()
    })
  })
}
