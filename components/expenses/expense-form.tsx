"use client"
import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import type { Category, Expense } from "@/lib/supabase" // Import Expense type

const formSchema = z.object({
  amount: z.coerce.number().min(1, "Amount is required and must be positive."),
  description: z.string().min(1, "Description is required."),
  category_id: z.string().min(1, "Category is required."),
  expense_date: z.date({
    required_error: "A date is required.",
  }),
  notes: z.string().optional(),
  budget_id: z.string().optional().nullable(),
})

interface ExpenseFormProps {
  onSuccess: () => void
  isOpen: boolean
  onClose: () => void
  initialData?: Expense // Added for editing
}

export default function ExpenseForm({ onSuccess, isOpen, onClose, initialData }: ExpenseFormProps) {
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [budgets, setBudgets] = useState<any[]>([]) // Consider defining a Budget type if not already
  const [loading, setLoading] = useState(true)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: initialData?.amount || 0,
      description: initialData?.description || "",
      category_id: initialData?.category_id || "",
      expense_date: initialData?.expense_date ? new Date(initialData.expense_date) : new Date(),
      notes: initialData?.notes || "",
      budget_id: initialData?.budget_id || null,
    },
  })

  useEffect(() => {
    if (initialData) {
      form.reset({
        amount: initialData.amount,
        description: initialData.description,
        category_id: initialData.category_id,
        expense_date: new Date(initialData.expense_date),
        notes: initialData.notes || "",
        budget_id: initialData.budget_id || null,
      })
    } else {
      form.reset({
        amount: 0,
        description: "",
        category_id: "",
        expense_date: new Date(),
        notes: "",
        budget_id: null,
      })
    }
  }, [initialData, form])

  useEffect(() => {
    const fetchDependencies = async () => {
      setLoading(true)
      try {
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("categories")
          .select("*")
          .order("name")

        if (categoriesError) throw categoriesError
        setCategories(categoriesData || [])

        const { data: budgetsData, error: budgetsError } = await supabase
          .from("budgets")
          .select("id, name")
          .order("name")

        if (budgetsError) throw budgetsError
        setBudgets(budgetsData || [])
      } catch (error) {
        console.error("Error fetching categories or budgets:", error)
        toast({
          title: "Error",
          description: "Failed to load categories or budgets.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    if (isOpen) {
      fetchDependencies()
    }
  }, [isOpen, toast])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to add an expense.",
          variant: "destructive",
        })
        return
      }

      const expenseData = {
        user_id: user.id,
        amount: values.amount,
        description: values.description,
        category_id: values.category_id,
        expense_date: values.expense_date.toISOString().split("T")[0], // Format date for DB
        notes: values.notes,
        budget_id: values.budget_id,
      }

      if (initialData) {
        // Update existing expense
        const { error } = await supabase.from("expenses").update(expenseData).eq("id", initialData.id)

        if (error) throw error
        toast({
          title: "Success",
          description: "Expense updated successfully!",
        })
      } else {
        // Insert new expense
        const { error } = await supabase.from("expenses").insert(expenseData)

        if (error) throw error
        toast({
          title: "Success",
          description: "Expense added successfully!",
        })
      }
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error("Error submitting expense:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save expense.",
        variant: "destructive",
      })
    }
  }

  if (!isOpen) return null

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Groceries, Rent" {...field} required />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (RWF)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 50000" {...field} required />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} required>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="budget_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Budget (Optional)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a budget" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="null">No Budget</SelectItem> {/* Option to clear budget */}
                  {budgets.map((budget) => (
                    <SelectItem key={budget.id} value={budget.id}>
                      {budget.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="expense_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                      required
                    >
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Any additional notes" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || loading}>
          {initialData ? "Update Expense" : "Add Expense"}
        </Button>
      </form>
    </Form>
  )
}
