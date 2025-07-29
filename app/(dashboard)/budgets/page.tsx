"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import BudgetForm from "@/components/budgets/budget-form"
import { Plus, Trash2, AlertTriangle, Edit } from "lucide-react" // Import Edit icon
import { supabase, type Budget as SupabaseBudget } from "@/lib/supabase" // Import Supabase Budget type
import { useToast } from "@/hooks/use-toast"

// Define a local interface that extends the Supabase Budget type for display purposes
interface BudgetWithSpentAndCategory extends SupabaseBudget {
  spent: number
  category: {
    name: string
    color: string
    icon: string
  }
}

export default function BudgetsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false) // State for create dialog
  const [editingBudget, setEditingBudget] = useState<SupabaseBudget | null>(null) // State for editing budget
  const [budgets, setBudgets] = useState<BudgetWithSpentAndCategory[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchBudgets = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // First get budgets with categories
      const { data: budgetsData, error: budgetsError } = await supabase
        .from("budgets")
        .select(`
          id,
          name,
          amount,
          period,
          start_date,
          end_date,
          category:categories(name, color, icon)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (budgetsError) throw budgetsError

      // Then calculate spent amount for each budget
      const budgetsWithSpent = await Promise.all(
        (budgetsData || []).map(async (budget) => {
          const { data: expensesData, error: expensesError } = await supabase
            .from("expenses")
            .select("amount")
            .eq("budget_id", budget.id)
            .gte("expense_date", budget.start_date)
            .lte("expense_date", budget.end_date)

          if (expensesError) {
            console.error("Error fetching expenses for budget:", expensesError)
            return { ...budget, spent: 0 }
          }

          const spent = expensesData?.reduce((sum, expense) => sum + expense.amount, 0) || 0
          return { ...budget, spent }
        }),
      )

      setBudgets(budgetsWithSpent)
    } catch (error) {
      console.error("Error fetching budgets:", error)
      toast({
        title: "Error",
        description: "Failed to load budgets",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBudgets()
  }, [])

  const handleBudgetFormSuccess = () => {
    setIsCreateDialogOpen(false)
    setEditingBudget(null) // Clear editing state
    fetchBudgets() // Refresh the list
  }

  const handleDeleteBudget = async (id: string) => {
    try {
      const { error } = await supabase.from("budgets").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Budget deleted successfully",
      })
      fetchBudgets()
    } catch (error) {
      console.error("Error deleting budget:", error)
      toast({
        title: "Error",
        description: "Failed to delete budget",
        variant: "destructive",
      })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-RW", {
      style: "currency",
      currency: "RWF",
      minimumFractionDigits: 0,
    })
      .format(amount)
      .replace("RF", "RWF")
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-RW", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getProgressColor = (spent: number, budget: number) => {
    const percentage = (spent / budget) * 100
    if (percentage >= 100) return "bg-red-500"
    if (percentage >= 80) return "bg-yellow-500"
    return "bg-green-500"
  }

  const getBudgetStatus = (spent: number, budget: number) => {
    const percentage = (spent / budget) * 100
    if (percentage >= 100) return { status: "Over Budget", color: "destructive" as const }
    if (percentage >= 80) return { status: "Near Limit", color: "secondary" as const }
    return { status: "On Track", color: "default" as const }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground">Set and manage your spending limits</p>
        </div>
        <Dialog
          open={isCreateDialogOpen || !!editingBudget}
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateDialogOpen(false)
              setEditingBudget(null)
            } else {
              setIsCreateDialogOpen(true)
            }
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Budget
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <BudgetForm onSuccess={handleBudgetFormSuccess} initialData={editingBudget || undefined} />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading budgets...</p>
        </div>
      ) : budgets.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              No budgets found. Create your first budget to start tracking your spending!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => {
            const progressPercentage = Math.min((budget.spent / budget.amount) * 100, 100)
            const { status, color } = getBudgetStatus(budget.spent, budget.amount)

            return (
              <Card key={budget.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="text-xs"
                        style={{ backgroundColor: `${budget.category.color}20`, color: budget.category.color }}
                      >
                        <span className="mr-1">{budget.category.icon}</span>
                        {budget.category.name}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditingBudget(budget)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteBudget(budget.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-lg">{budget.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Spent</span>
                      <span className="font-medium">{formatCurrency(budget.spent)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Budget</span>
                      <span className="font-medium">{formatCurrency(budget.amount)}</span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">{progressPercentage.toFixed(1)}% used</span>
                      <Badge variant={color} className="text-xs">
                        {progressPercentage >= 100 && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {status}
                      </Badge>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Period: {budget.period}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>
                        {formatDate(budget.start_date)} - {formatDate(budget.end_date)}
                      </span>
                    </div>
                  </div>

                  {budget.spent > budget.amount && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-2">
                      <div className="flex items-center gap-2 text-red-700 text-xs">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Over budget by {formatCurrency(budget.spent - budget.amount)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
