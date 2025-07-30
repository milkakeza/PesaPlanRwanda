"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { supabase, type Category, type Budget } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface ExpenseFormProps {
  onSuccess?: () => void
}

export default function ExpenseForm({ onSuccess }: ExpenseFormProps) {
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    notes: "",
    category_id: "",
    budget_id: "",
    expense_date: new Date().toISOString().split("T")[0],
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchCategories()
    fetchBudgets()
  }, [])

  const fetchCategories = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase.from("categories").select("*").eq("user_id", user.id).order("name")

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const fetchBudgets = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("budgets")
        .select(`
          *,
          category:categories(name, icon)
        `)
        .eq("user_id", user.id)
        .order("name")

      if (error) throw error
      setBudgets(data || [])
    } catch (error) {
      console.error("Error fetching budgets:", error)
    }
  }

  const checkBudgetAlert = async (budgetId: string, expenseAmount: number) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Get budget details
      const { data: budget } = await supabase
        .from("budgets")
        .select("*, category:categories(name)")
        .eq("id", budgetId)
        .single()

      if (!budget) return


      const { data: expenses } = await supabase
        .from("expenses")
        .select("amount")
        .eq("budget_id", budgetId)
        .gte("expense_date", budget.start_date)
        .lte("expense_date", budget.end_date)

      const totalSpent = expenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0
      const budgetAmount = Number(budget.amount)
      const percentageUsed = (totalSpent / budgetAmount) * 100


      if (percentageUsed >= 100) {
        await supabase.from("notifications").insert({
          user_id: user.id,
          title: "Budget Exceeded!",
          message: `You have exceeded your "${budget.name}" budget by ${formatCurrency(totalSpent - budgetAmount)}.`,
          type: "budget_alert",
        })
      } else if (percentageUsed >= 80) {
        await supabase.from("notifications").insert({
          user_id: user.id,
          title: "Budget Alert",
          message: `You have used ${percentageUsed.toFixed(1)}% of your "${budget.name}" budget.`,
          type: "budget_alert",
        })
      }
    } catch (error) {
      console.error("Error checking budget alert:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      const { error } = await supabase.from("expenses").insert({
        user_id: user.id,
        amount: Number.parseFloat(formData.amount),
        description: formData.description,
        notes: formData.notes,
        category_id: formData.category_id || null,
        budget_id: formData.budget_id || null,
        expense_date: formData.expense_date,
      })

      if (error) throw error


      if (formData.budget_id) {
        await checkBudgetAlert(formData.budget_id, Number.parseFloat(formData.amount))
      }

      toast({
        title: "Expense added successfully!",
        description: "Your expense has been recorded.",
      })


      setFormData({
        amount: "",
        description: "",
        notes: "",
        category_id: "",
        budget_id: "",
        expense_date: new Date().toISOString().split("T")[0],
      })

      onSuccess?.()
    } catch (error: any) {
      toast({
        title: "Error adding expense",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Add New Expense</h2>
        <p className="text-sm text-muted-foreground">Record your spending to track your budget</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="amount" className="text-sm">
              Amount (RWF)
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => handleInputChange("amount", e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="expense_date" className="text-sm">
              Date
            </Label>
            <Input
              id="expense_date"
              type="date"
              value={formData.expense_date}
              onChange={(e) => handleInputChange("expense_date", e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="description" className="text-sm">
            Description
          </Label>
          <Input
            id="description"
            placeholder="What did you spend on?"
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="category" className="text-sm">
              Category
            </Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => handleInputChange("category_id", value)}
              required
            >
              {" "}
              {/* Category is now required */}
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center space-x-2">
                      <span>{category.icon}</span>
                      <span>{category.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="budget" className="text-sm">
              Budget (Optional)
            </Label>
            <Select value={formData.budget_id} onValueChange={(value) => handleInputChange("budget_id", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select budget" />
              </SelectTrigger>
              <SelectContent>
                {budgets.map((budget) => (
                  <SelectItem key={budget.id} value={budget.id}>
                    <div className="flex items-center space-x-2">
                      <span>{budget.category?.icon}</span>
                      <span>{budget.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="notes" className="text-sm">
            Notes (Optional)
          </Label>
          <Textarea
            id="notes"
            placeholder="Additional notes about this expense"
            value={formData.notes}
            onChange={(e) => handleInputChange("notes", e.target.value)}
            rows={2}
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add Expense
        </Button>
      </form>
    </div>
  )
}
