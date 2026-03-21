"use client"

import Link from "next/link"
import { Shield, Radar, User, LogOut } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { getSession, signIn, signOut, type UserSession } from "@/lib/auth"

import { supabase } from "@/lib/supabase"

export function Navbar() {
  const [session, setSession] = useState<UserSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSession().then((res) => {
      setSession(res)
      setLoading(false)
    })

    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, activeSession) => {
        if (activeSession?.user) {
          setSession({
            id: activeSession.user.id,
            email: activeSession.user.email || ""
          })
        } else {
          setSession(null)
        }
        setLoading(false)
      })
      return () => subscription.unsubscribe()
    }
  }, [])

  return (
    <header className="relative z-50 animate-fade-in border-b border-border/60 bg-background/60 backdrop-blur-md">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <div className="flex size-10 items-center justify-center rounded-xl border border-cyan-400/35 bg-cyan-300/10 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
            <Shield className="size-5 text-cyan-200" />
          </div>
          <div>
            <h1 className="font-semibold text-xl tracking-tight text-foreground">LaunchGuard</h1>
            <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
              Release Readiness Agent
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-card/55 px-3 py-1.5 text-xs text-muted-foreground lg:flex">
            <Radar className="size-3.5" />
            Spec-to-Screenshot Verification
          </div>

          <div className="h-6 w-px bg-border/60 hidden md:block"></div>

          {!loading && (
            <div className="flex items-center gap-2">
              {session ? (
                <>
                  <span className="hidden sm:inline text-xs text-muted-foreground mr-2 font-medium">
                    {session.email}
                  </span>
                  <Link href="/dashboard">
                    <Button variant="ghost" size="sm" className="hidden sm:flex">
                      History
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={() => signOut()} className="flex items-center gap-2">
                    <LogOut className="size-3.5" />
                    <span className="hidden sm:inline">Logout</span>
                  </Button>
                </>
              ) : (
                <Button variant="default" size="sm" onClick={() => signIn()} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white">
                  <User className="size-3.5" />
                  Sign In
                </Button>
              )}
            </div>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
