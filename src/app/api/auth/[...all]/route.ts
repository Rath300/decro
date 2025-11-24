import { auth } from "@/lib/auth"

// BetterAuth handler for all HTTP methods
export const GET = auth.handler
export const POST = auth.handler
