import { auth } from '@/lib/auth'

// Export BetterAuth handler directly as GET and POST
// BetterAuth handles Next.js App Router requests natively
export const GET = auth.handler
export const POST = auth.handler