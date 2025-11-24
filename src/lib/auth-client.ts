import { signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "next-auth/react"

// Sign up function
export async function signUp(data: {
  email: string
  password: string
  name: string
}) {
  try {
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || "Signup failed")
    }

    // Auto sign-in after signup
    const signInResult = await nextAuthSignIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    })

    if (signInResult?.error) {
      throw new Error(signInResult.error)
    }

    return { success: true, data: result }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Sign in function
export async function signIn(data: {
  email: string
  password: string
  callbackUrl?: string
}) {
  try {
    const result = await nextAuthSignIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
      callbackUrl: data.callbackUrl || "/feed",
    })

    if (result?.error) {
      throw new Error(result.error)
    }

    return { success: true, data: result }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Sign out function
export async function signOut() {
  try {
    await nextAuthSignOut({ redirect: false })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Legacy client object for backward compatibility
export const client = {
  signUp: {
    email: async (data: { email: string; password: string; name: string }) => {
      return signUp(data)
    },
  },
  signIn: {
    email: async (data: { email: string; password: string; callbackUrl?: string }) => {
      return signIn(data)
    },
  },
  signOut: async () => {
    return signOut()
  },
}
