import { getAuthHandler } from "@/lib/auth"

export const GET = async (...args: any) => {
  const handler = getAuthHandler()
  // @ts-ignore - delegate to generated handler
  return handler(...args)
}

export const POST = async (...args: any) => {
  const handler = getAuthHandler()
  // @ts-ignore - delegate to generated handler
  return handler(...args)
}


