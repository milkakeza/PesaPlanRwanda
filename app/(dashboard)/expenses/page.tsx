"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import ExpenseForm from "@/components/expenses/expense-form"
import { Plus } from "lucide-react"

export default function ExpensesPage() {
  const [open, setOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleExpenseAdded = () => {
    setOpen(false)
    setRefreshKey((prev) => prev + 1) // This will trigger any components listening for changes
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">Track and manage your spending</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <ExpenseForm onSuccess={handleExpenseAdded} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="text-center py-12">
        <p className="text-muted-foreground">Expense list and management features coming soon...</p>
      </div>
    </div>
  )
}
