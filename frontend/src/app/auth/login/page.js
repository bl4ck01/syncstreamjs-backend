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
import { login } from "@/server/actions";
import { toast } from "sonner";

const loginSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string(),
});

export default function Login() {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const form = useForm({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const onSubmit = async (data) => {
        setIsLoading(true);
        try {
            // Simulate API call
            const response = await login(data.email, data.password);
            console.log("Login data:", response);
            if (response.success) {
                router.push("/");
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            console.error("Login error:", error);
            toast.error(error.message || "An error occurred, please try again.");
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
                    <h1 className="text-3xl font-bold text-white mb-2">Welcome to SyncStream</h1>
                    <p className="text-white/60">
                        Don&apos;t have an account?{" "}
                        <button
                            onClick={() => router.push("/auth/register")}
                            className="underline hover:text-white"
                        >
                            Sign up
                        </button>
                    </p>
                </div>

                {/* Login Form */}
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                            {isLoading ? "Logging in..." : "Login"}
                        </Button>
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