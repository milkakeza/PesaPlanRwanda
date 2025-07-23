"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import BudgetForm from "@/components/budgets/budget-form"
import { Plus } from "lucide-react"

export default function BudgetsPage() {
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground">Set and manage your spending limits</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Budget
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <BudgetForm onSuccess={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="text-center py-12">
        <p className="text-muted-foreground">Budget list and management features coming soon...</p>
      </div>
    </div>
  )
}
