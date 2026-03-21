import { supabase } from "./supabase"

export type UserSession = {
  id: string
  email: string
}

type MockUser = UserSession

const MOCK_SESSION_KEY = "launchguard_mock_session"
const MOCK_USERS_KEY = "launchguard_mock_users"
const LAST_SIGNED_IN_EMAIL_KEY = "launchguard_last_signed_in_email"

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function makeMockId(email: string) {
  const local = email.split("@")[0] || "user"
  return `mock-${local}-${Math.random().toString(36).slice(2, 8)}`
}

function getStoredMockUsers(): MockUser[] {
  if (typeof window === "undefined") return []
  const raw = localStorage.getItem(MOCK_USERS_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as MockUser[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveStoredMockUsers(users: MockUser[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users))
}

function saveMockSession(user: MockUser) {
  if (typeof window === "undefined") return
  localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(user))
  localStorage.setItem(LAST_SIGNED_IN_EMAIL_KEY, user.email)
}

function getRedirectToDashboard() {
  if (typeof window === "undefined") return undefined
  return `${window.location.origin}/dashboard`
}

function getLastSignedInEmail() {
  if (typeof window === "undefined") return null
  return localStorage.getItem(LAST_SIGNED_IN_EMAIL_KEY)
}

export async function signUpWithEmail(emailInput: string) {
  const email = normalizeEmail(emailInput)
  if (!isValidEmail(email)) {
    throw new Error("Please enter a valid email address.")
  }

  if (supabase) {
    if (typeof window !== "undefined") {
      localStorage.setItem(LAST_SIGNED_IN_EMAIL_KEY, email)
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: getRedirectToDashboard(),
      },
    })
    if (error) {
      if (error.message.toLowerCase().includes("rate limit")) {
        throw new Error("Email rate limit exceeded")
      }
      throw new Error(error.message)
    }
    return
  }

  const users = getStoredMockUsers()
  const existing = users.find((user) => user.email === email)
  const user = existing ?? { id: makeMockId(email), email }
  if (!existing) {
    users.push(user)
    saveStoredMockUsers(users)
  }
  saveMockSession(user)
}

export async function signInWithEmail(emailInput: string) {
  const email = normalizeEmail(emailInput)
  if (!isValidEmail(email)) {
    throw new Error("Please enter a valid email address.")
  }

  if (supabase) {
    if (typeof window !== "undefined") {
      localStorage.setItem(LAST_SIGNED_IN_EMAIL_KEY, email)
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: getRedirectToDashboard(),
      },
    })
    if (error) {
      if (error.message.toLowerCase().includes("rate limit")) {
        throw new Error("Email rate limit exceeded")
      }
      throw new Error(error.message)
    }
    return
  }

  const users = getStoredMockUsers()
  const existing = users.find((user) => user.email === email)
  if (!existing) {
    throw new Error("No account found for this email. Please sign up first.")
  }
  saveMockSession(existing)
}

export async function signIn() {
  if (supabase) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: getRedirectToDashboard(),
      },
    })
    if (error) {
      throw new Error(error.message)
    }
    return
  }

  const email = getLastSignedInEmail() ?? "mock-user@example.com"
  await signUpWithEmail(email)
  if (typeof window !== "undefined") {
    window.location.href = "/dashboard"
  }
}

export async function signOut() {
  if (supabase) {
    await supabase.auth.signOut()
  } else if (typeof window !== "undefined") {
    localStorage.removeItem(MOCK_SESSION_KEY)
  }

  if (typeof window !== "undefined") {
    window.location.href = "/"
  }
}

export async function getSession(): Promise<UserSession | null> {
  if (supabase) {
    const { data } = await supabase.auth.getSession()
    if (data.session?.user) {
      const email = data.session.user.email || ""
      if (typeof window !== "undefined" && email) {
        localStorage.setItem(LAST_SIGNED_IN_EMAIL_KEY, email)
      }
      return {
        id: data.session.user.id,
        email,
      }
    }
    return null
  }

  if (typeof window === "undefined") {
    return null
  }

  const mock = localStorage.getItem(MOCK_SESSION_KEY)
  if (!mock) {
    return null
  }
  try {
    return JSON.parse(mock) as UserSession
  } catch {
    return null
  }
}
