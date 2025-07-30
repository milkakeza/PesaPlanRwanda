"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase, type Category, type Budget } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface BudgetFormProps {
  onSuccess?: () => void;
  initialData?: Budget;
}

export default function BudgetForm({
  onSuccess,
  initialData,
}: BudgetFormProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    amount: initialData?.amount.toString() || "",
    category_id: initialData?.category_id || "",
    period:
      (initialData?.period as "weekly" | "monthly" | "yearly") || "monthly",
    start_date:
      initialData?.start_date || new Date().toISOString().split("T")[0],
    end_date: initialData?.end_date || "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    calculateEndDate();
  }, [formData.period, formData.start_date]);

  const fetchCategories = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const calculateEndDate = () => {
    if (!formData.start_date) return;

    const startDate = new Date(formData.start_date);
    const endDate = new Date(startDate);

    switch (formData.period) {
      case "weekly":
        endDate.setDate(startDate.getDate() + 7);
        break;
      case "monthly":
        endDate.setMonth(startDate.getMonth() + 1);
        break;
      case "yearly":
        endDate.setFullYear(startDate.getFullYear() + 1);
        break;
    }

    setFormData((prev) => ({
      ...prev,
      end_date: endDate.toISOString().split("T")[0],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const budgetData = {
        user_id: user.id,
        name: formData.name,
        amount: Number.parseFloat(formData.amount),
        category_id: formData.category_id,
        period: formData.period,
        start_date: formData.start_date,
        end_date: formData.end_date,
      };

      let error = null;
      if (initialData) {
        const { error: updateError } = await supabase
          .from("budgets")
          .update(budgetData)
          .eq("id", initialData.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("budgets")
          .insert(budgetData);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: initialData
          ? "Budget updated successfully!"
          : "Budget created successfully!",
        description: initialData
          ? "Your budget has been updated."
          : "Your budget has been set up.",
      });

      if (!initialData) {
        setFormData({
          name: "",
          amount: "",
          category_id: "",
          period: "monthly",
          start_date: new Date().toISOString().split("T")[0],
          end_date: "",
        });
      }

      onSuccess?.();
    } catch (error: any) {
      toast({
        title: initialData ? "Error updating budget" : "Error creating budget",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>
          {initialData ? "Edit Budget" : "Create New Budget"}
        </CardTitle>
        <CardDescription>
          Set spending limits to manage your finances
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Budget Name</Label>
            <Input
              id="name"
              placeholder="e.g., Monthly Groceries"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (RWF)</Label>
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

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => handleInputChange("category_id", value)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
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

          <div className="space-y-2">
            <Label htmlFor="period">Period</Label>
            <Select
              value={formData.period}
              onValueChange={(value: "weekly" | "monthly" | "yearly") =>
                handleInputChange("period", value)
              }
              required
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) =>
                  handleInputChange("start_date", e.target.value)
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                readOnly
                className="bg-muted"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Update Budget" : "Create Budget"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
