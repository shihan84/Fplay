import { spawn } from 'child_process'

const FONT = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'

const tests = [
  // Test A: pts:localtime with strftime format as one arg
  `drawtext=fontfile=${FONT}:text='%{pts\\:localtime\\:0\\:%H-%M-%S}':fontsize=48:fontcolor=white:borderw=3:bordercolor=black:x=50:y=50`,
  // Test B: localtime with format as single escaped arg  
  `drawtext=fontfile=${FONT}:text='%{localtime\\:%H-%M-%S}':fontsize=48:fontcolor=white:borderw=3:bordercolor=black:x=50:y=50`,
  // Test C: localtime no format arg (just shows epoch or default)
  `drawtext=fontfile=${FONT}:text='Time\\: %{localtime}':fontsize=48:fontcolor=white:borderw=3:bordercolor=black:x=50:y=50`,
  // Test D: use gmtime instead
  `drawtext=fontfile=${FONT}:text='%{gmtime\\:%H-%M-%S}':fontsize=48:fontcolor=white:borderw=3:bordercolor=black:x=50:y=50`,
  // Test E: pts\:hms format
  `drawtext=fontfile=${FONT}:text='%{pts\\:hms}':fontsize=48:fontcolor=white:borderw=3:bordercolor=black:x=50:y=50`,
]

for (let i = 0; i < tests.length; i++) {
  await new Promise(resolve => {
    const args = [
      '-f', 'lavfi', '-i', `color=black:size=640x360:rate=25`,
      '-vf', tests[i],
      '-t', '1', '-f', 'null', '-'
    ]
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    proc.stderr.on('data', d => { stderr += d.toString() })
    proc.on('close', (code) => {
      const warn = stderr.split('\n').filter(l => /warn|error|Error|requires|frame=/i.test(l)).slice(-2)
      console.log(`Test ${String.fromCharCode(65+i)} [${code===0?'✅':'❌'}]: ${warn.join(' | ')}`)
      resolve()
    })
  })
}
