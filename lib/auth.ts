import { supabase } from "./supabase"

export type UserSession = {
  id: string
  email: string
}

const MOCK_SESSION_KEY = "launchguard_mock_session"

export async function signIn() {
  if (supabase) {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    })
  } else {
    // Fallback to mock session
    const mockUser: UserSession = {
      id: "mock-user-1234",
      email: "mock-user@example.com",
    }
    localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(mockUser))
    window.location.href = "/dashboard"
  }
}

export async function signOut() {
  if (supabase) {
    await supabase.auth.signOut()
  } else {
    localStorage.removeItem(MOCK_SESSION_KEY)
  }
  window.location.href = "/"
}

export async function getSession(): Promise<UserSession | null> {
  if (supabase) {
    const { data } = await supabase.auth.getSession()
    if (data.session?.user) {
      return {
        id: data.session.user.id,
        email: data.session.user.email || "",
      }
    }
    return null
  } else {
    // Fallback mock check
    if (typeof window !== "undefined") {
      const mock = localStorage.getItem(MOCK_SESSION_KEY)
      if (mock) {
        return JSON.parse(mock) as UserSession
      }
    }
    return null
  }
}
