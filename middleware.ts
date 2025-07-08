import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  return new NextResponse(
    'Site is currently offline. Check back soon.',
    { status: 503 }
  )
}
