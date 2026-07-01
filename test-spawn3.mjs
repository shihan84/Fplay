import { spawn } from 'child_process'

const FONT = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'

const tests = [
  // Test B: localtime with \: separator for format — check for "requires" warning
  { name: 'B: localtime\\:%H-%M-%S', vf: `drawtext=fontfile=${FONT}:text='%{localtime\\:%H-%M-%S}':fontsize=48:fontcolor=white:x=50:y=50` },
  // Test D: gmtime
  { name: 'D: gmtime\\:%H-%M-%S', vf: `drawtext=fontfile=${FONT}:text='%{gmtime\\:%H-%M-%S}':fontsize=48:fontcolor=white:x=50:y=50` },
  // Test F: pts\:localtime\:0\:%H\:%M\:%S (all colons escaped)
  { name: 'F: pts\\:localtime\\:0\\:%H\\:%M\\:%S', vf: `drawtext=fontfile=${FONT}:text='%{pts\\:localtime\\:0\\:%H\\:%M\\:%S}':fontsize=48:fontcolor=white:x=50:y=50` },
]

for (const t of tests) {
  await new Promise(resolve => {
    const args = ['-f', 'lavfi', '-i', 'color=black:size=640x360:rate=25', '-vf', t.vf, '-t', '1', '-f', 'null', '-']
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    proc.stderr.on('data', d => { stderr += d.toString() })
    proc.on('close', (code) => {
      const warn = stderr.split('\n').filter(l => /requires|warn|Parsed_draw/i.test(l))
      console.log(`\n[${t.name}] exit=${code}`)
      if (warn.length) warn.forEach(l => console.log('  WARN:', l))
      else console.log('  No warnings — clock rendering OK')
      resolve()
    })
  })
}
