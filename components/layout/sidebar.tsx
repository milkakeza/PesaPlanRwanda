"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Home, CreditCard, Target, BarChart3, LogOut, User } from "lucide-react"
import { signOut } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Sidebar } from "@/components/ui/sidebar"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Expenses", href: "/expenses", icon: CreditCard },
  { name: "Budgets", href: "/budgets", icon: Target },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Profile", href: "/profile", icon: User },
]

export default function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      toast({
        title: "Signed out successfully",
        description: "You have been logged out.",
      })
      router.push("/")
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const SidebarContentComponent = () => (
    <div className="flex h-full flex-col bg-gradient-to-b from-money-green to-money-green-dark">
      <div className="flex h-14 items-center border-b border-money-green-dark/20 px-4 lg:h-[60px] lg:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <span className="text-xl">💰</span>
          </div>
          <span className="text-xl font-bold text-white">PesaPlan</span>
        </Link>
      </div>
      <div className="flex-1">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4 mt-4">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-white/80 transition-all hover:text-white hover:bg-white/10",
                  isActive && "bg-white/20 text-white font-semibold shadow-sm",
                )}
                onClick={() => setOpen(false)}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
      <div className="mt-auto p-4">
        <Button
          variant="outline"
          className="w-full justify-start bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  )

  return (
    <Sidebar className="border-r-0">
      <SidebarContentComponent />
    </Sidebar>
  )
}
