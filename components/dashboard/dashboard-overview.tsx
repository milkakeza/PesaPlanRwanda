"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { supabase, type Budget, type Expense } from "@/lib/supabase"
import { DollarSign, TrendingUp, Target, AlertTriangle } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface DashboardStats {
  totalExpenses: number
  totalBudget: number
  budgetUsed: number
  expensesThisMonth: number
  budgetsExceeded: number
}

export default function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats>({
    totalExpenses: 0,
    totalBudget: 0,
    budgetUsed: 0,
    expensesThisMonth: 0,
    budgetsExceeded: 0,
  })
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()

    // Set up real-time subscription for expenses
    const expensesSubscription = supabase
      .channel("expenses_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => {
        fetchDashboardData()
      })
      .subscribe()

    // Set up real-time subscription for budgets
    const budgetsSubscription = supabase
      .channel("budgets_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "budgets" }, () => {
        fetchDashboardData()
      })
      .subscribe()

    return () => {
      expensesSubscription.unsubscribe()
      budgetsSubscription.unsubscribe()
    }
  }, [])

  const fetchDashboardData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Fetch ALL expenses for total calculation
      const { data: allExpenses } = await supabase.from("expenses").select("amount").eq("user_id", user.id)

      // Fetch recent expenses for display
      const { data: expenses } = await supabase
        .from("expenses")
        .select(`
          *,
          category:categories(name, icon, color)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5)

      // Fetch budgets with spending
      const { data: budgetsData } = await supabase
        .from("budgets")
        .select(`
          *,
          category:categories(name, icon, color)
        `)
        .eq("user_id", user.id)

      // Calculate current month expenses
      const currentMonth = new Date().toISOString().slice(0, 7)
      const { data: monthlyExpenses } = await supabase
        .from("expenses")
        .select("amount")
        .eq("user_id", user.id)
        .gte("expense_date", `${currentMonth}-01`)
        .lt("expense_date", `${currentMonth}-32`)

      // Calculate total expenses (all time)
      const totalExpenses = allExpenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0

      // Calculate monthly expenses for budget comparison
      const monthlyExpensesTotal = monthlyExpenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0

      const totalBudget = budgetsData?.reduce((sum, budget) => sum + Number(budget.amount), 0) || 0
      const budgetUsed = totalBudget > 0 ? (monthlyExpensesTotal / totalBudget) * 100 : 0

      // Count exceeded budgets
      let budgetsExceeded = 0
      if (budgetsData) {
        for (const budget of budgetsData) {
          const { data: budgetExpenses } = await supabase
            .from("expenses")
            .select("amount")
            .eq("budget_id", budget.id)
            .gte("expense_date", budget.start_date)
            .lte("expense_date", budget.end_date)

          const spent = budgetExpenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0
          if (spent > Number(budget.amount)) {
            budgetsExceeded++
          }
        }
      }

      setStats({
        totalExpenses, // This is now the total of ALL expenses
        totalBudget,
        budgetUsed,
        expensesThisMonth: monthlyExpenses?.length || 0,
        budgetsExceeded,
      })

      setRecentExpenses(expenses || [])
      setBudgets(budgetsData || [])
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-32"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">All time total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalBudget)}</div>
            <p className="text-xs text-muted-foreground">Monthly budget</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Used</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.budgetUsed.toFixed(1)}%</div>
            <Progress value={stats.budgetUsed} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.budgetsExceeded}</div>
            <p className="text-xs text-muted-foreground">Budgets exceeded</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Expenses */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
          <CardDescription>Your latest spending activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentExpenses.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No expenses recorded yet</p>
            ) : (
              recentExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm">{expense.category?.icon || "💰"}</span>
                    </div>
                    <div>
                      <p className="font-medium">{expense.description || "Expense"}</p>
                      <p className="text-sm text-muted-foreground">
                        {expense.category?.name || "Uncategorized"} •{" "}
                        {new Date(expense.expense_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(Number(expense.amount))}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
