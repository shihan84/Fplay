import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET — list all domains
export async function GET() {
  try {
    const domains = await db.domainConfig.findMany({
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    })
    return NextResponse.json(domains)
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 })
  }
}

// POST — create a new domain
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { domain, sslEnabled = true, isDefault = false } = body

    if (!domain || typeof domain !== 'string') {
      return NextResponse.json({ message: 'Domain is required' }, { status: 400 })
    }

    // Normalize domain: remove protocol, trailing slashes, whitespace
    const cleanDomain = domain
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '')
      .trim()
      .toLowerCase()

    if (!cleanDomain || cleanDomain.includes(' ')) {
      return NextResponse.json({ message: 'Invalid domain format' }, { status: 400 })
    }

    // If setting as default, unset all others first
    if (isDefault) {
      await db.domainConfig.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      })
    }

    const created = await db.domainConfig.create({
      data: {
        domain: cleanDomain,
        sslEnabled,
        sslStatus: sslEnabled ? 'pending' : 'none',
        isDefault,
      },
    })

    return NextResponse.json(created, { status: 201 })
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ message: 'Domain already exists' }, { status: 409 })
    }
    return NextResponse.json({ message: err.message }, { status: 500 })
  }
}

// PUT — update a domain
export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ message: 'id required' }, { status: 400 })

    const body = await req.json()
    const { sslEnabled, isDefault } = body

    // If setting as default, unset all others first
    if (isDefault) {
      await db.domainConfig.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      })
    }

    const updateData: any = {}
    if (typeof sslEnabled === 'boolean') {
      updateData.sslEnabled = sslEnabled
      if (!sslEnabled) updateData.sslStatus = 'none'
      if (sslEnabled) updateData.sslStatus = 'pending'
    }
    if (typeof isDefault === 'boolean') updateData.isDefault = isDefault

    const updated = await db.domainConfig.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 })
  }
}

// DELETE — remove a domain
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ message: 'id required' }, { status: 400 })

    await db.domainConfig.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 })
  }
}
