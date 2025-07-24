"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ChartTooltip } from "@/components/ui/chart"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface CategorySpending {
  id: string
  name: string
  color: string
  icon: string
  total: number
  percentage: number
  transactionCount: number
}

interface SpendingStats {
  totalSpending: number
  averageDaily: number
  averageMonthly: number
  mostFrequentCategory: {
    name: string
    count: number
  }
  largestExpense: {
    description: string
    amount: number
  }
}

export default function AnalyticsPage() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([])
  const [stats, setStats] = useState<SpendingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const months = [
    { value: "2025-01", label: "January 2025" },
    { value: "2025-02", label: "February 2025" },
    { value: "2025-03", label: "March 2025" },
    { value: "2025-04", label: "April 2025" },
    { value: "2025-05", label: "May 2025" },
    { value: "2025-06", label: "June 2025" },
    { value: "2025-07", label: "July 2025" },
    { value: "2025-08", label: "August 2025" },
    { value: "2025-09", label: "September 2025" },
    { value: "2025-10", label: "October 2025" },
    { value: "2025-11", label: "November 2025" },
    { value: "2025-12", label: "December 2025" },
  ]

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const [year, month] = selectedMonth.split("-")
      const startDate = `${year}-${month}-01`
      const endDate = new Date(Number.parseInt(year), Number.parseInt(month), 0).toISOString().split("T")[0]

      // Fetch expenses for the selected month with category details
      const { data: expenses, error } = await supabase
        .from("expenses")
        .select(`
          id,
          amount,
          description,
          expense_date,
          categories (
            id,
            name,
            color,
            icon
          )
        `)
        .eq("user_id", user.id)
        .gte("expense_date", startDate)
        .lte("expense_date", endDate)

      if (error) throw error

      if (!expenses || expenses.length === 0) {
        setCategorySpending([])
        setStats({
          totalSpending: 0,
          averageDaily: 0,
          averageMonthly: 0,
          mostFrequentCategory: { name: "None", count: 0 },
          largestExpense: { description: "None", amount: 0 },
        })
        return
      }

      // Calculate category spending
      const categoryMap = new Map<
        string,
        {
          id: string
          name: string
          color: string
          icon: string
          total: number
          count: number
        }
      >()

      let totalSpending = 0
      let largestExpense = { description: "", amount: 0 }

      expenses.forEach((expense) => {
        totalSpending += expense.amount

        if (expense.amount > largestExpense.amount) {
          largestExpense = {
            description: expense.description,
            amount: expense.amount,
          }
        }

        if (expense.categories) {
          const categoryId = expense.categories.id
          if (categoryMap.has(categoryId)) {
            const existing = categoryMap.get(categoryId)!
            existing.total += expense.amount
            existing.count += 1
          } else {
            categoryMap.set(categoryId, {
              id: expense.categories.id,
              name: expense.categories.name,
              color: expense.categories.color,
              icon: expense.categories.icon,
              total: expense.amount,
              count: 1,
            })
          }
        }
      })

      // Convert to array and calculate percentages
      const categorySpendingData: CategorySpending[] = Array.from(categoryMap.values())
        .map((category) => ({
          ...category,
          percentage: totalSpending > 0 ? (category.total / totalSpending) * 100 : 0,
          transactionCount: category.count,
        }))
        .sort((a, b) => b.total - a.total)

      // Find most frequent category
      const mostFrequentCategory = categorySpendingData.reduce(
        (max, category) =>
          category.transactionCount > max.count ? { name: category.name, count: category.transactionCount } : max,
        { name: "None", count: 0 },
      )

      // Calculate averages
      const daysInMonth = new Date(Number.parseInt(year), Number.parseInt(month), 0).getDate()
      const averageDaily = totalSpending / daysInMonth
      const averageMonthly = totalSpending

      setCategorySpending(categorySpendingData)
      setStats({
        totalSpending,
        averageDaily,
        averageMonthly,
        mostFrequentCategory,
        largestExpense,
      })
    } catch (error) {
      console.error("Error fetching analytics:", error)
      toast({
        title: "Error",
        description: "Failed to fetch analytics data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [selectedMonth])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-RW", {
      style: "currency",
      currency: "RWF",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(amount)
      .replace("RWF", "")
      .trim()
  }

  // Prepare chart data
  const chartData = categorySpending.map((category) => ({
    name: category.name,
    value: category.total,
    fill: category.color,
  }))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Insights and trends about your spending</p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {months.map((month) => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {stats && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Donut Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Spending Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {categorySpending.length > 0 ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total Spending</p>
                    <p className="text-2xl font-bold">{formatCurrency(stats.totalSpending)}</p>
                  </div>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          nameKey="name"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload
                              return (
                                <div className="rounded-lg border bg-background p-2 shadow-sm">
                                  <div className="space-y-1">
                                    <p className="font-medium">{data.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {formatCurrency(data.value)} (
                                      {((data.value / stats.totalSpending) * 100).toFixed(1)}%)
                                    </p>
                                  </div>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No expenses found for this month</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Categories List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Categories</CardTitle>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Spending</p>
                  <p className="text-lg font-bold">{formatCurrency(stats.totalSpending)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {categorySpending.length > 0 ? (
                <div className="space-y-4 max-h-[300px] overflow-y-auto">
                  {categorySpending.map((category) => (
                    <div key={category.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                          <span className="font-medium text-sm">{category.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">{formatCurrency(category.total)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={category.percentage} className="flex-1 h-2" />
                        <Badge variant="secondary" className="text-xs">
                          {category.percentage.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No categories found for this month</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Monthly Spending</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(stats.averageMonthly)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Daily Spending</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(stats.averageDaily)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Most Frequent Category</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold">{stats.mostFrequentCategory.name}</p>
              <p className="text-sm text-muted-foreground">{stats.mostFrequentCategory.count} transactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Largest Expense</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold">{stats.largestExpense.description || "None"}</p>
              <p className="text-sm text-muted-foreground">{formatCurrency(stats.largestExpense.amount)}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
