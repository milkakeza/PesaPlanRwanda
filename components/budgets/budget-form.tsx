"use client"
import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import type { Category, Budget } from "@/lib/supabase" // Import Budget type

const formSchema = z.object({
  name: z.string().min(1, "Budget name is required."),
  amount: z.coerce.number().min(1, "Amount is required and must be positive."),
  category_id: z.string().min(1, "Category is required."),
  period: z.enum(["weekly", "monthly", "yearly"], {
    required_error: "Period is required.",
  }),
  start_date: z.date({
    required_error: "Start date is required.",
  }),
  end_date: z.date({
    required_error: "End date is required.",
  }),
})

interface BudgetFormProps {
  onSuccess: () => void
  isOpen: boolean
  onClose: () => void
  initialData?: Budget // For editing
}

export default function BudgetForm({ onSuccess, isOpen, onClose, initialData }: BudgetFormProps) {
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      amount: initialData?.amount || 0,
      category_id: initialData?.category_id || "",
      period: initialData?.period || "monthly",
      start_date: initialData?.start_date ? new Date(initialData.start_date) : new Date(),
      end_date: initialData?.end_date ? new Date(initialData.end_date) : new Date(),
    },
  })

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        amount: initialData.amount,
        category_id: initialData.category_id,
        period: initialData.period,
        start_date: new Date(initialData.start_date),
        end_date: new Date(initialData.end_date),
      })
    } else {
      form.reset({
        name: "",
        amount: 0,
        category_id: "",
        period: "monthly",
        start_date: new Date(),
        end_date: new Date(),
      })
    }
  }, [initialData, form])

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase.from("categories").select("*").order("name")

        if (error) throw error
        setCategories(data || [])
      } catch (error) {
        console.error("Error fetching categories:", error)
        toast({
          title: "Error",
          description: "Failed to load categories.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    if (isOpen) {
      fetchCategories()
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
          description: "You must be logged in to add a budget.",
          variant: "destructive",
        })
        return
      }

      const budgetData = {
        user_id: user.id,
        name: values.name,
        amount: values.amount,
        category_id: values.category_id,
        period: values.period,
        start_date: values.start_date.toISOString().split("T")[0], // Format date for DB
        end_date: values.end_date.toISOString().split("T")[0], // Format date for DB
      }

      if (initialData) {
        // Update existing budget
        const { error } = await supabase.from("budgets").update(budgetData).eq("id", initialData.id)

        if (error) throw error
        toast({
          title: "Success",
          description: "Budget updated successfully!",
        })
      } else {
        // Insert new budget
        const { error } = await supabase.from("budgets").insert(budgetData)

        if (error) throw error
        toast({
          title: "Success",
          description: "Budget added successfully!",
        })
      }
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error("Error submitting budget:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save budget.",
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Budget Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Groceries" {...field} required />
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
                <Input type="number" placeholder="e.g., 100000" {...field} required />
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
          name="period"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Period</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} required>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
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
                      disabled={(date) => date < new Date("1900-01-01")}
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
            name="end_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End Date</FormLabel>
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
                      disabled={(date) => date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || loading}>
          {initialData ? "Update Budget" : "Add Budget"}
        </Button>
      </form>
    </Form>
  )
}
