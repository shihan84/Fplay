import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import fs from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

function generateCaddyfile(domains: { domain: string; sslEnabled: boolean }[]): string {
  const sslDomains = domains.filter((d) => d.sslEnabled).map((d) => d.domain)
  const httpDomains = domains.filter((d) => !d.sslEnabled).map((d) => d.domain)

  const sharedConfig = `
	# Route XTransformPort=3005 to the realtime (Socket.IO) service
	@realtime_port query XTransformPort=3005
	handle @realtime_port {
		reverse_proxy realtime:3005 {
			header_up Host {host}
			header_up X-Forwarded-For {remote_host}
			header_up X-Forwarded-Proto {scheme}
			header_up X-Real-IP {remote_host}
		}
	}

	# Serve uploaded media files directly from the shared volume
	handle_path /media/* {
		root * /srv/media
		file_server
	}

	# Serve uploaded logo files directly from the shared volume
	handle_path /logos/* {
		root * /srv/logos
		file_server
	}

	# Default: Next.js app
	handle {
		reverse_proxy app:3000 {
			header_up Host {host}
			header_up X-Forwarded-For {remote_host}
			header_up X-Forwarded-Proto {scheme}
			header_up X-Real-IP {remote_host}
		}
	}
`

  const blocks: string[] = []

  // SSL domains (Caddy auto-provisions Let's Encrypt certs)
  if (sslDomains.length > 0) {
    blocks.push(`${sslDomains.join(', ')} {\n${sharedConfig}}\n`)
  }

  // HTTP-only domains (explicit http:// prefix disables auto-HTTPS)
  if (httpDomains.length > 0) {
    const httpHosts = httpDomains.map((d) => `http://${d}`).join(', ')
    blocks.push(`${httpHosts} {\n${sharedConfig}}\n`)
  }

  // If no domains at all, fall back to :80 (accept any host)
  if (domains.length === 0) {
    blocks.push(`:80 {\n${sharedConfig}}\n`)
  }

  return blocks.join('\n')
}

// POST /api/domains/reload — regenerate Caddyfile and reload Caddy
export async function POST() {
  try {
    const domains = await db.domainConfig.findMany({
      orderBy: { createdAt: 'asc' },
    })

    const caddyfile = generateCaddyfile(domains)

    // Write the Caddyfile to the mounted volume path
    // In Docker, Caddyfile is mounted at /etc/caddy/Caddyfile
    // From the app container, we write to a shared path
    const caddyfilePath = process.env.CADDYFILE_PATH || '/data/Caddyfile'
    await fs.mkdir(path.dirname(caddyfilePath), { recursive: true })
    await fs.writeFile(caddyfilePath, caddyfile, 'utf-8')

    // Reload Caddy via its admin API
    // Caddy's admin endpoint is at caddy:2019 inside Docker network
    const caddyAdminUrl = process.env.CADDY_ADMIN_URL || 'http://caddy:2019'
    try {
      const loadRes = await fetch(`${caddyAdminUrl}/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/caddyfile' },
        body: caddyfile,
      })
      if (!loadRes.ok) {
        const errText = await loadRes.text()
        console.error('Caddy reload error:', errText)

        // Update SSL status for domains
        await db.domainConfig.updateMany({
          where: { sslEnabled: true, sslStatus: 'pending' },
          data: { sslStatus: 'error' },
        })

        return NextResponse.json(
          { success: false, message: `Caddy reload failed: ${errText}`, caddyfile },
          { status: 502 }
        )
      }
    } catch (fetchErr: any) {
      console.error('Failed to connect to Caddy admin API:', fetchErr.message)
      return NextResponse.json(
        { success: false, message: `Cannot reach Caddy admin API: ${fetchErr.message}`, caddyfile },
        { status: 502 }
      )
    }

    // Mark SSL domains as active (Caddy will handle provisioning)
    await db.domainConfig.updateMany({
      where: { sslEnabled: true, sslStatus: { in: ['pending', 'none'] } },
      data: { sslStatus: 'active' },
    })

    return NextResponse.json({
      success: true,
      message: `Caddyfile updated with ${domains.length} domain(s)`,
      domains: domains.map((d) => d.domain),
      caddyfile,
    })
  } catch (err: any) {
    console.error('Domain reload error:', err)
    return NextResponse.json({ message: err.message }, { status: 500 })
  }
}
