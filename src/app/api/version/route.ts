import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const versionPath = path.join(process.cwd(), 'version.json')
    const versionData = fs.readFileSync(versionPath, 'utf-8')
    const version = JSON.parse(versionData)
    
    return NextResponse.json(version)
  } catch (error) {
    // Fallback version if file doesn't exist
    return NextResponse.json({
      version: 'alpha 0.01',
      lastUpdated: new Date().toISOString().split('T')[0]
    })
  }
}

