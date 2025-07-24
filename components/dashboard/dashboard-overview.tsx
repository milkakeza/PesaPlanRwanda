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
  monthlyExpenses: number
  expensesThisMonth: number
  budgetsExceeded: number
  exceededBudgets: Array<{
    name: string
    categoryName: string
    spent: number
    budgetAmount: number
    overAmount: number
  }>
}

export default function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats>({
    totalExpenses: 0,
    totalBudget: 0,
    budgetUsed: 0,
    monthlyExpenses: 0,
    expensesThisMonth: 0,
    budgetsExceeded: 0,
    exceededBudgets: [],
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

      // Get current month start and end dates
      const now = new Date()
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]

      console.log("Date range:", currentMonthStart, "to", currentMonthEnd)

      // Calculate current month expenses with better date handling
      const { data: monthlyExpenses } = await supabase
        .from("expenses")
        .select("amount, expense_date")
        .eq("user_id", user.id)
        .gte("expense_date", currentMonthStart)
        .lte("expense_date", currentMonthEnd)

      console.log("Monthly expenses data:", monthlyExpenses)

      // Calculate total expenses (all time)
      const totalExpenses = allExpenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0

      // Calculate monthly expenses for budget comparison
      const monthlyExpensesTotal = monthlyExpenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0

      console.log("Monthly expenses total:", monthlyExpensesTotal)

      // Calculate total budget (sum of all active budgets)
      const totalBudget = budgetsData?.reduce((sum, budget) => sum + Number(budget.amount), 0) || 0

      console.log("Total budget:", totalBudget)

      // Calculate budget used percentage
      let budgetUsed = 0
      if (totalBudget > 0) {
        budgetUsed = (monthlyExpensesTotal / totalBudget) * 100
      }

      console.log("Budget used percentage:", budgetUsed)

      // Count exceeded budgets and track details
      let budgetsExceeded = 0
      const exceededBudgets: Array<{
        name: string
        categoryName: string
        spent: number
        budgetAmount: number
        overAmount: number
      }> = []

      if (budgetsData && budgetsData.length > 0) {
        console.log("Checking budgets for exceeded amounts...")

        for (const budget of budgetsData) {
          console.log(`Checking budget: ${budget.name} (${budget.category?.name}) - Amount: ${budget.amount}`)

          // Get the budget period dates, default to current month if not specified
          const budgetStart = budget.start_date || currentMonthStart
          const budgetEnd = budget.end_date || currentMonthEnd

          console.log(`Budget period: ${budgetStart} to ${budgetEnd}`)

          // Get expenses for this budget's category within the budget period
          const { data: budgetExpenses, error } = await supabase
            .from("expenses")
            .select("amount, description, expense_date")
            .eq("user_id", user.id)
            .eq("category_id", budget.category_id)
            .gte("expense_date", budgetStart)
            .lte("expense_date", budgetEnd)

          if (error) {
            console.error("Error fetching budget expenses:", error)
            continue
          }

          console.log(`Expenses for budget ${budget.name}:`, budgetExpenses)

          const spent = budgetExpenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0
          console.log(`Total spent: ${spent}, Budget amount: ${budget.amount}`)

          if (spent > Number(budget.amount)) {
            budgetsExceeded++
            const overAmount = spent - Number(budget.amount)
            exceededBudgets.push({
              name: budget.name || "Unnamed Budget",
              categoryName: budget.category?.name || "Unknown Category",
              spent,
              budgetAmount: Number(budget.amount),
              overAmount,
            })
            console.log(`Budget ${budget.name} is exceeded! Spent: ${spent}, Budget: ${budget.amount}`)
          }
        }
      }

      console.log("Total budgets exceeded:", budgetsExceeded)
      console.log("Exceeded budgets details:", exceededBudgets)

      setStats({
        totalExpenses,
        totalBudget,
        budgetUsed,
        monthlyExpenses: monthlyExpensesTotal,
        expensesThisMonth: monthlyExpenses?.length || 0,
        budgetsExceeded,
        exceededBudgets,
      })

      setRecentExpenses(expenses || [])
      setBudgets(budgetsData || [])
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to get budget status color and message
  const getBudgetStatus = (percentage: number) => {
    if (percentage <= 50) {
      return {
        color: "text-green-600",
        bgColor: "bg-green-100",
        message: "On track",
        progressColor: "bg-green-500",
      }
    } else if (percentage <= 80) {
      return {
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
        message: "Caution",
        progressColor: "bg-yellow-500",
      }
    } else if (percentage <= 100) {
      return {
        color: "text-orange-600",
        bgColor: "bg-orange-100",
        message: "Near limit",
        progressColor: "bg-orange-500",
      }
    } else {
      return {
        color: "text-red-600",
        bgColor: "bg-red-100",
        message: "Over budget",
        progressColor: "bg-red-500",
      }
    }
  }

  const budgetStatus = getBudgetStatus(stats.budgetUsed)

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
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span
                className={`text-xs px-2 py-1 rounded-full ${budgetStatus.bgColor} ${budgetStatus.color} font-medium`}
              >
                {budgetStatus.message}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-bold">{stats.budgetUsed.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(stats.monthlyExpenses)} / {formatCurrency(stats.totalBudget)}
                </div>
              </div>
              <div className="space-y-1">
                <Progress value={Math.min(stats.budgetUsed, 100)} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Spent this month</span>
                  <span>
                    {stats.totalBudget - stats.monthlyExpenses > 0
                      ? `${formatCurrency(stats.totalBudget - stats.monthlyExpenses)} remaining`
                      : `${formatCurrency(stats.monthlyExpenses - stats.totalBudget)} over budget`}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Alerts</CardTitle>
            <AlertTriangle
              className={`h-4 w-4 ${stats.budgetsExceeded > 0 ? "text-red-500" : "text-muted-foreground"}`}
            />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className={`text-2xl font-bold ${stats.budgetsExceeded > 0 ? "text-red-600" : ""}`}>
                {stats.budgetsExceeded}
              </div>
              {stats.budgetsExceeded > 0 ? (
                <div className="space-y-1">
                  {stats.exceededBudgets.map((budget, index) => (
                    <div key={index} className="text-xs">
                      <div className="font-medium text-red-600">{budget.categoryName}</div>
                      <div className="text-muted-foreground">{formatCurrency(budget.overAmount)} over budget</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">All budgets on track</p>
              )}
            </div>
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
