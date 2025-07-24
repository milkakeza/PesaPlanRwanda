"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Loader2, TrendingUp, Calendar, Target, DollarSign } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

interface CategorySpending {
  id: string
  name: string
  color: string
  icon: string
  amount: number
  percentage: number
  transactionCount: number
}

interface SpendingStats {
  totalSpending: number
  averageDaily: number
  mostFrequentCategory: string
  largestExpense: {
    amount: number
    description: string
    category: string
  }
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([])
  const [stats, setStats] = useState<SpendingStats>({
    totalSpending: 0,
    averageDaily: 0,
    mostFrequentCategory: "",
    largestExpense: { amount: 0, description: "", category: "" },
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchAnalyticsData()
  }, [selectedMonth])

  const fetchAnalyticsData = async () => {
    setLoading(true)
    try {
      const [year, month] = selectedMonth.split("-")
      const startDate = `${year}-${month}-01`
      const endDate = new Date(Number.parseInt(year), Number.parseInt(month), 0).toISOString().split("T")[0]

      // Fetch expenses with categories for the selected month
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
        .gte("expense_date", startDate)
        .lte("expense_date", endDate)
        .order("expense_date", { ascending: false })

      if (error) throw error

      if (!expenses || expenses.length === 0) {
        setCategorySpending([])
        setStats({
          totalSpending: 0,
          averageDaily: 0,
          mostFrequentCategory: "No expenses",
          largestExpense: { amount: 0, description: "No expenses", category: "" },
        })
        return
      }

      // Calculate category spending
      const categoryMap = new Map<string, CategorySpending>()
      let totalSpending = 0
      let largestExpense = { amount: 0, description: "", category: "" }

      expenses.forEach((expense) => {
        const category = expense.categories
        const amount = Number.parseFloat(expense.amount.toString())
        totalSpending += amount

        // Track largest expense
        if (amount > largestExpense.amount) {
          largestExpense = {
            amount,
            description: expense.description || "No description",
            category: category?.name || "Uncategorized",
          }
        }

        if (category) {
          const categoryId = category.id
          if (categoryMap.has(categoryId)) {
            const existing = categoryMap.get(categoryId)!
            existing.amount += amount
            existing.transactionCount += 1
          } else {
            categoryMap.set(categoryId, {
              id: categoryId,
              name: category.name,
              color: category.color,
              icon: category.icon,
              amount,
              percentage: 0,
              transactionCount: 1,
            })
          }
        }
      })

      // Calculate percentages and sort by amount
      const categorySpendingArray = Array.from(categoryMap.values())
        .map((category) => ({
          ...category,
          percentage: totalSpending > 0 ? (category.amount / totalSpending) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount)

      // Find most frequent category
      const mostFrequentCategory =
        categorySpendingArray.reduce(
          (prev, current) => (current.transactionCount > prev.transactionCount ? current : prev),
          categorySpendingArray[0],
        )?.name || "No expenses"

      // Calculate average daily spending
      const daysInMonth = new Date(Number.parseInt(year), Number.parseInt(month), 0).getDate()
      const averageDaily = totalSpending / daysInMonth

      setCategorySpending(categorySpendingArray)
      setStats({
        totalSpending,
        averageDaily,
        mostFrequentCategory,
        largestExpense,
      })
    } catch (error: any) {
      console.error("Error fetching analytics data:", error)
      toast({
        title: "Error fetching analytics data",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-RW", {
      style: "currency",
      currency: "RWF",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-RW").format(num)
  }

  // Generate month options for the current year
  const generateMonthOptions = () => {
    const currentYear = new Date().getFullYear()
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ]

    return months.map((month, index) => ({
      value: `${currentYear}-${String(index + 1).padStart(2, "0")}`,
      label: `${month} ${currentYear}`,
    }))
  }

  // Custom tooltip for the pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
            <span className="font-medium">{data.name}</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {formatCurrency(data.amount)} ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Analyze your spending patterns and financial insights</p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {generateMonthOptions().map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spending</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalSpending)}</div>
            <p className="text-xs text-muted-foreground">RWF for selected month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Daily</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.averageDaily)}</div>
            <p className="text-xs text-muted-foreground">RWF per day average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Frequent</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{stats.mostFrequentCategory}</div>
            <p className="text-xs text-muted-foreground">Category with most transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Largest Expense</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.largestExpense.amount)}</div>
            <p className="text-xs text-muted-foreground truncate">{stats.largestExpense.description}</p>
          </CardContent>
        </Card>
      </div>

      {categorySpending.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-96">
            <div className="text-center">
              <p className="text-lg font-medium text-muted-foreground">No expenses found</p>
              <p className="text-sm text-muted-foreground">No expenses recorded for the selected month</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Donut Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Spending Breakdown</CardTitle>
              <CardDescription>Total spending by category for the selected month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categorySpending}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={2}
                      dataKey="amount"
                    >
                      {categorySpending.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center mt-4">
                <p className="text-2xl font-bold">{formatNumber(stats.totalSpending)}</p>
                <p className="text-sm text-muted-foreground">Total Spending (RWF)</p>
              </div>
            </CardContent>
          </Card>

          {/* Category List */}
          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
              <CardDescription>Detailed breakdown of spending by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {categorySpending.map((category) => (
                  <div key={category.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                        <span className="font-medium text-sm">{category.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {category.percentage.toFixed(0)}%
                        </Badge>
                      </div>
                      <span className="font-bold text-sm">{formatNumber(category.amount)}</span>
                    </div>
                    <Progress
                      value={category.percentage}
                      className="h-2"
                      style={
                        {
                          "--progress-background": category.color,
                        } as React.CSSProperties
                      }
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
