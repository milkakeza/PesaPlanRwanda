"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { signIn, signUp } from "@/lib/auth";
import { Loader2 } from "lucide-react";

export function AuthForm() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) throw error;

      toast({
        title: "Success",
        description: "Signed in successfully!",
      });

      router.push("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signUp(email, password, fullName);
      if (error) throw error;

      toast({
        title: "Success",
        description: "Account created successfully! You can now sign in.",
      });

      setEmail("");
      setPassword("");
      setFullName("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto border-money-green/20 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-money-green-light to-money-blue-light">
        <CardTitle className="text-money-green-dark">
          Welcome to PesaPlan
        </CardTitle>
        <CardDescription className="text-money-blue-dark/70">
          Sign in to your account or create a new one
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-money-green-light">
            <TabsTrigger
              value="signin"
              className="data-[state=active]:bg-money-green data-[state=active]:text-white"
            >
              Sign In
            </TabsTrigger>
            <TabsTrigger
              value="signup"
              className="data-[state=active]:bg-money-green data-[state=active]:text-white"
            >
              Sign Up
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email" className="text-money-blue-dark">
                  Email
                </Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-money-green/30 focus:border-money-green"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="signin-password"
                  className="text-money-blue-dark"
                >
                  Password
                </Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-money-green/30 focus:border-money-green"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-money-green hover:bg-money-green-dark"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name" className="text-money-blue-dark">
                  Full Name
                </Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="border-money-green/30 focus:border-money-green"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-money-blue-dark">
                  Email
                </Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-money-green/30 focus:border-money-green"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="signup-password"
                  className="text-money-blue-dark"
                >
                  Password
                </Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-money-green/30 focus:border-money-green"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-money-green hover:bg-money-green-dark"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign Up
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
