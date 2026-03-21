'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Github, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import {
  getSession,
  signIn,
  signUpWithEmail,
} from '@/lib/auth'

export default function HomePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  useEffect(() => {
    let mounted = true
    getSession().then((session) => {
      if (!mounted) return
      if (session) {
        router.replace('/dashboard')
        return
      }
      setIsCheckingSession(false)
    })
    return () => {
      mounted = false
    }
  }, [router])

  const handleEmailAuth = async () => {
    const normalized = email.trim().toLowerCase()
    if (!normalized) {
      toast({
        title: 'Email required',
        description: 'Enter your email to continue.',
      })
      return
    }

    setIsLoading(true)
    try {
      await signUpWithEmail(normalized)

      toast({
        title: 'Continuing with email',
        description:
          'If you use Supabase email auth, check your inbox. If mock mode is active, you are signed in now.',
      })

      const active = await getSession()
      if (active) {
        router.push('/dashboard')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.'
      if (message.toLowerCase().includes('rate limit')) {
        toast({
          title: 'Check your inbox',
          description:
            'A sign-in email was sent recently. Use the latest email link, or wait about a minute before requesting another.',
        })
        return
      }
      toast({
        title: 'Email auth failed',
        description: message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGithubSignIn = async () => {
    setIsLoading(true)
    try {
      await signIn()
    } catch (error) {
      toast({
        title: 'GitHub sign-in failed',
        description: error instanceof Error ? error.message : 'Please try again.',
      })
      setIsLoading(false)
    }
  }

  if (isCheckingSession) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-3xl items-center justify-center px-6">
        <p className="animate-pulse text-sm text-muted-foreground">Checking session...</p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-3xl items-center px-6 py-12">
      <Card className="w-full border-border/70 bg-card/50">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Sign in to LaunchGuard</CardTitle>
          <CardDescription>
            Sign up or sign in first. After auth, you will be redirected to your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isLoading}
            />
            <Button
              type="button"
              variant="default"
              className="w-full"
              disabled={isLoading}
              onClick={handleEmailAuth}
            >
              <Mail className="size-4" />
              Sign up/Sign in with Email
            </Button>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={isLoading}
            onClick={handleGithubSignIn}
          >
            <Github className="size-4" />
            Continue with GitHub
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
