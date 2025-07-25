import { supabase } from "./supabase"

export const signUp = async (email: string, password: string, fullName: string) => {
  // 1️⃣ Create the user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  })

  if (error) throw error

  // 2️⃣ Ensure we have an authenticated session
  // ‣ If email confirmation is OFF, Supabase returns a session immediately.
  // ‣ If confirmation is ON, try to sign-in right away (will succeed in local dev).
  let session = data.session
  if (!session) {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (!signInError) session = signInData.session
  }

  // 3️⃣ Create default categories **only** if we now have a session
  if (session?.user) {
    try {
      await createDefaultCategories()
    } catch (catErr) {
      // Don’t block signup if categories fail; they’ll be created on first login
      console.warn("Skipping default category creation:", (catErr as Error).message)
    }
  }

  return data
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const getCurrentUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export const changePassword = async (newPassword: string) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  })
  if (error) throw error
  return data
}

const createDefaultCategories = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Not authenticated")

  const defaultCategories = [
    { name: "Transport", icon: "🚗", color: "#3B82F6" },
    { name: "Food & Dining", icon: "🍽️", color: "#EF4444" },
    { name: "Shopping", icon: "🛍️", color: "#8B5CF6" },
    { name: "Entertainment", icon: "🎬", color: "#F59E0B" },
    { name: "Bills & Utilities", icon: "💡", color: "#10B981" },
    { name: "Healthcare", icon: "🏥", color: "#EC4899" },
    { name: "Education", icon: "📚", color: "#6366F1" },
    { name: "Savings", icon: "💰", color: "#059669" },
    { name: "Other", icon: "📦", color: "#6B7280" },
  ]

  const { error } = await supabase.from("categories").insert(
    defaultCategories.map((cat) => ({
      ...cat,
      user_id: user.id,
    })),
  )

  // Ignore “duplicate key” errors so we don’t break if the user refreshes mid-process
  if (error && error.code !== "23505") throw error
}
