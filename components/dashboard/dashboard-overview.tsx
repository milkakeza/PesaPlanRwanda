"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { supabase, type Budget, type Expense } from "@/lib/supabase"
import { Banknote, TrendingUp, Target, AlertTriangle } from "lucide-react"
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

    // Real-time subscription for expenses
    const expensesSubscription = supabase
      .channel("expenses_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => {
        fetchDashboardData()
      })
      .subscribe()

    // Real-time subscription for budgets
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


      const { data: allExpenses } = await supabase.from("expenses").select("amount").eq("user_id", user.id)


      const { data: expenses } = await supabase
        .from("expenses")
        .select(`
          *,
          category:categories(name, icon, color)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5)


      const { data: budgetsData } = await supabase
        .from("budgets")
        .select(`
          *,
          category:categories(name, icon, color)
        `)
        .eq("user_id", user.id)


      const now = new Date()
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]


      const { data: monthlyExpenses } = await supabase
        .from("expenses")
        .select("amount, expense_date")
        .eq("user_id", user.id)
        .gte("expense_date", currentMonthStart)
        .lte("expense_date", currentMonthEnd)


      const totalExpenses = allExpenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0


      const monthlyExpensesTotal = monthlyExpenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0


      const totalBudget = budgetsData?.reduce((sum, budget) => sum + Number(budget.amount), 0) || 0


      let budgetUsed = 0
      if (totalBudget > 0) {
        budgetUsed = (monthlyExpensesTotal / totalBudget) * 100
      }


      let budgetsExceeded = 0
      const exceededBudgets: Array<{
        name: string
        categoryName: string
        spent: number
        budgetAmount: number
        overAmount: number
      }> = []

      if (budgetsData && budgetsData.length > 0) {
        for (const budget of budgetsData) {

          const budgetStart = budget.start_date || currentMonthStart
          const budgetEnd = budget.end_date || currentMonthEnd


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

          const spent = budgetExpenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0

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
          }
        }
      }

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


  const getBudgetStatus = (percentage: number) => {
    if (percentage <= 50) {
      return {
        color: "text-money-green-dark",
        bgColor: "bg-money-green-light",
        message: "On track",
        progressColor: "bg-money-green",
      }
    } else if (percentage <= 80) {
      return {
        color: "text-money-gold-dark",
        bgColor: "bg-money-gold-light",
        message: "Caution",
        progressColor: "bg-money-gold",
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
        color: "text-money-red-dark",
        bgColor: "bg-money-red-light",
        message: "Over budget",
        progressColor: "bg-money-red",
      }
    }
  }

  const budgetStatus = getBudgetStatus(stats.budgetUsed)

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse border-money-green/20">
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
        <Card className="border-money-green/20 hover:border-money-green/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <div className="p-2 bg-money-green-light rounded-full">
              <Banknote className="h-4 w-4 text-money-green-dark" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-money-green-dark">{formatCurrency(stats.totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">All time total</p>
          </CardContent>
        </Card>

        <Card className="border-money-blue/20 hover:border-money-blue/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <div className="p-2 bg-money-blue-light rounded-full">
              <Target className="h-4 w-4 text-money-blue-dark" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-money-blue-dark">{formatCurrency(stats.totalBudget)}</div>
            <p className="text-xs text-muted-foreground">Monthly budget</p>
          </CardContent>
        </Card>

        <Card className="border-money-gold/20 hover:border-money-gold/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Used</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-money-gold-light rounded-full">
                <TrendingUp className="h-4 w-4 text-money-gold-dark" />
              </div>
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
                <div className="text-2xl font-bold text-money-gold-dark">{stats.budgetUsed.toFixed(1)}%</div>
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

        <Card
          className={`transition-colors ${stats.budgetsExceeded > 0 ? "border-money-red/40 bg-money-red-light/20" : "border-money-green/20 hover:border-money-green/40"}`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Alerts</CardTitle>
            <div
              className={`p-2 rounded-full ${stats.budgetsExceeded > 0 ? "bg-money-red-light" : "bg-money-green-light"}`}
            >
              <AlertTriangle
                className={`h-4 w-4 ${stats.budgetsExceeded > 0 ? "text-money-red-dark" : "text-money-green-dark"}`}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div
                className={`text-2xl font-bold ${stats.budgetsExceeded > 0 ? "text-money-red-dark" : "text-money-green-dark"}`}
              >
                {stats.budgetsExceeded}
              </div>
              {stats.budgetsExceeded > 0 ? (
                <div className="space-y-1">
                  {stats.exceededBudgets.map((budget, index) => (
                    <div key={index} className="text-xs">
                      <div className="font-medium text-money-red-dark">{budget.categoryName}</div>
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
      <Card className="border-money-blue/20">
        <CardHeader className="bg-gradient-to-r from-money-blue-light to-money-green-light">
          <CardTitle className="text-money-blue-dark">Recent Expenses</CardTitle>
          <CardDescription className="text-money-blue-dark/70">Your latest spending activity</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {recentExpenses.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No expenses recorded yet</p>
            ) : (
              recentExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-money-green-light/30 to-money-blue-light/30 hover:from-money-green-light/50 hover:to-money-blue-light/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center border-2 border-money-green/20">
                      <span className="text-lg">{expense.category?.icon || "💰"}</span>
                    </div>
                    <div>
                      <p className="font-medium text-money-blue-dark">{expense.description || "Expense"}</p>
                      <p className="text-sm text-muted-foreground">
                        {expense.category?.name || "Uncategorized"} •{" "}
                        {new Date(expense.expense_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-money-green-dark">{formatCurrency(Number(expense.amount))}</p>
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
