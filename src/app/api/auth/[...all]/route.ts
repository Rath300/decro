import { auth } from "@/lib/auth"

// Try using the handler directly - BetterAuth 1.4.1 should handle Next.js properly
export const { GET, POST } = auth.api
