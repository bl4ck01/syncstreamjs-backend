"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
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
            if (response.success) {
                router.push("/");
            } else {
                toast.error(response.message);
            }
        } catch (error) {
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
            <motion.div
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.4 }}
                variants={{
                    hidden: { filter: "blur(8px)", opacity: 0, y: 8 },
                    visible: { filter: "blur(0px)", opacity: 1, y: 0 },
                }}
                className="w-full max-w-md space-y-8"
            >
                {/* Logo */}
                <motion.div
                    initial="hidden"
                    animate="visible"
                    transition={{ duration: 0.45, delay: 0.05 }}
                    variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
                    className="text-center"
                >
                    <div className="mx-auto w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-4">
                        <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
                            <div className="w-4 h-4 bg-white rounded-sm"></div>
                        </div>
                    </div>
                </motion.div>

                {/* Welcome Message */}
                <motion.div
                    initial="hidden"
                    animate="visible"
                    transition={{ duration: 0.45, delay: 0.12 }}
                    variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
                    className="text-center"
                >
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
                </motion.div>

                {/* Login Form */}
                <Form {...form}>
                    <motion.form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-6"
                        initial="hidden"
                        animate="visible"
                        transition={{ duration: 0.45, delay: 0.18 }}
                        variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
                    >
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
                    </motion.form>
                </Form>

                {/* Separator */}
                <motion.div
                    className="relative"
                    initial="hidden"
                    animate="visible"
                    transition={{ duration: 0.45, delay: 0.24 }}
                    variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
                >
                    <Separator className="bg-gray-600" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="bg-black px-4 text-gray-400 text-sm">Or</span>
                    </div>
                </motion.div>

                {/* Social Login Buttons */}
                <motion.button
                    onClick={handleGoogleLogin}
                    className="w-full border border-gray-600 bg-gray-800 text-white hover:bg-gray-700 h-12 rounded-md inline-flex items-center justify-center gap-2"
                    initial="hidden"
                    animate="visible"
                    transition={{ duration: 0.45, delay: 0.3 }}
                    variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
                >
                    <GoogleIcon className="w-4 h-4 mr-1.5" />
                    Continue with Google
                </motion.button>

                {/* Legal Disclaimer */}
                <motion.p
                    className="text-center text-gray-400 text-sm"
                    initial="hidden"
                    animate="visible"
                    transition={{ duration: 0.45, delay: 0.35 }}
                    variants={{ hidden: { opacity: 0, y: 4 }, visible: { opacity: 1, y: 0 } }}
                >
                    By clicking continue, you agree to our{" "}
                    <button className="underline hover:text-white">Terms of Service</button>{" "}
                    and{" "}
                    <button className="underline hover:text-white">Privacy Policy</button>.
                </motion.p>
            </motion.div>
        </div>
    );
}