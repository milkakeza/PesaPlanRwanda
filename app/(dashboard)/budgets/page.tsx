"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import BudgetForm from "@/components/budgets/budget-form"
import { Plus, Trash2, Edit } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import type { Budget } from "@/lib/supabase"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function BudgetsPage() {
  const [open, setOpen] = useState(false)
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>(undefined)
  const { toast } = useToast()

  const fetchBudgets = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("budgets")
        .select(`*, category:categories(name, color, icon)`)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error

      setBudgets(data || [])
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

  const handleBudgetAdded = () => {
    setOpen(false)
    setEditingBudget(undefined) // Clear editing state
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

  const handleEditBudget = (budget: Budget) => {
    setEditingBudget(budget)
    setOpen(true)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-RW", {
      style: "currency",
      currency: "RWF",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-RW", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground">Set spending limits to manage your finances</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingBudget(undefined)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Budget
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <BudgetForm
              onSuccess={handleBudgetAdded}
              isOpen={open}
              onClose={() => setOpen(false)}
              initialData={editingBudget}
            />
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
              No budgets found. Add your first budget to start managing your spending!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => (
            <Card key={budget.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">{budget.name}</CardTitle>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEditBudget(budget)}>
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Edit budget</span>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4 text-red-500" />
                        <span className="sr-only">Delete budget</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your budget.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteBudget(budget.id)}>Continue</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold">{formatCurrency(budget.amount)}</div>
                <p className="text-sm text-muted-foreground">
                  {budget.period} budget for{" "}
                  <Badge
                    variant="secondary"
                    className="text-xs"
                    style={{
                      backgroundColor: `${budget.category?.color}20`,
                      color: budget.category?.color,
                    }}
                  >
                    <span className="mr-1">{budget.category?.icon}</span>
                    {budget.category?.name}
                  </Badge>
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(budget.start_date)} - {formatDate(budget.end_date)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
