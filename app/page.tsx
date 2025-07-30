"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { AuthForm } from "@/components/auth/auth-form"
import { Loader2 } from "lucide-react"

export default function HomePage() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session) {
          router.push("/dashboard")
        } else {
          setLoading(false)
        }
      } catch (error) {
        console.error("Error checking auth:", error)
        setLoading(false)
      }
    }

    checkAuth()


    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.push("/dashboard")
      } else if (event === "SIGNED_OUT") {
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-money-green-light to-money-blue-light">
        <Loader2 className="h-8 w-8 animate-spin text-money-green" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-money-green-light via-white to-money-blue-light">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-money-green to-money-blue rounded-full flex items-center justify-center shadow-lg">
              <span className="text-3xl">💰</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-money-green to-money-blue bg-clip-text text-transparent">
            PesaPlan
          </h1>
          <p className="mt-2 text-money-blue-dark">Manage your finances with ease</p>
          <p className="text-sm text-muted-foreground mt-1">Built for Rwandan youth and families</p>
        </div>
        <AuthForm />
      </div>
    </div>
  )
}
