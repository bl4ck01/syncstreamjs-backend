"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { GoogleIcon } from "@/components/icons";
import { register } from "@/server/actions";

const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(80, "Full name is too long"),
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password is too long"),
  })

export default function Register() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const response = await register(data.fullName, data.email, data.password);

      if (response.success) {
        // If shouldRedirect is true, redirect to the specified path
        if (response.shouldRedirect && response.redirectTo) {
          router.push(response.redirectTo);
        }
      } else {
        // Handle error - show error message
        form.setError("root", {
          type: "manual",
          message: response.message || "Registration failed. Please try again."
        });
      }
    } catch (error) {
      console.error("Register error:", error);
      form.setError("root", {
        type: "manual",
        message: "An unexpected error occurred. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    console.log("Google login clicked");
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-4">
            <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-sm"></div>
            </div>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Create an account</h1>
          <p className="text-white/60">
            Already have an account?{" "}
            <button
              onClick={() => router.push("/auth/login")}
              className="underline hover:text-white"
            >
              Sign in
            </button>
          </p>
        </div>

        {/* Register Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <label className="text-white text-sm font-medium">Full name</label>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      placeholder="Jane Doe"
                      className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus-visible:ring-rose-300/50 focus-visible:border-rose-400  h-12"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <label className="text-white text-sm font-medium">Email</label>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="m@example.com"
                      className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus-visible:ring-rose-300/50 focus-visible:border-rose-400  h-12"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <label className="text-white text-sm font-medium">Password</label>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder="********"
                      className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus-visible:ring-rose-300/50 focus-visible:border-rose-400  h-12"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-rose-600 text-rose-50 hover:bg-rose-600/90 font-semibold h-12"
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>

            {form.formState.errors.root && (
              <p className="text-red-400 text-sm text-center mt-2">
                {form.formState.errors.root.message}
              </p>
            )}
          </form>
        </Form>

        {/* Separator */}
        <div className="relative">
          <Separator className="bg-gray-600" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="bg-black px-4 text-gray-400 text-sm">Or</span>
          </div>
        </div>

        {/* Social Login Buttons */}
        <Button
          onClick={handleGoogleLogin}
          variant="outline"
          className="w-full border-gray-600 bg-gray-800 text-white hover:bg-gray-700 h-12"
        >
          <GoogleIcon className="mr-3" />
          Continue with Google
        </Button>

        {/* Legal Disclaimer */}
        <p className="text-center text-gray-400 text-sm">
          By clicking continue, you agree to our{" "}
          <button className="underline hover:text-white">Terms of Service</button>{" "}
          and{" "}
          <button className="underline hover:text-white">Privacy Policy</button>.
        </p>
      </div>
    </div>
  );
}