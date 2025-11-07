"use client";

/**
 * @author: @kokonutui
 * @description: AI Text Loading
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";

interface AITextLoadingProps {
    texts?: string[];
    className?: string;
    interval?: number;
    color?: "black" | "blue" | "green" | "orange";
}

export default function AITextLoading({
    texts = [
        "Thinking...",
        "Processing...",
        "Analyzing...",
        "Computing...",
        "Almost...",
    ],
    className,
    interval = 2000,
    color = "orange",
}: AITextLoadingProps) {
    const [currentTextIndex, setCurrentTextIndex] = useState(0);

    // Configuración de colores (matching Rings component)
    const colorConfig = {
        black: {
            light: "from-gray-900 via-gray-600 to-black",
            dark: "dark:from-white dark:via-neutral-600 dark:to-white"
        },
        blue: {
            light: "from-blue-700 via-blue-400 to-blue-900",
            dark: "dark:from-blue-400 dark:via-blue-300 dark:to-blue-500"
        },
        green: {
            light: "from-green-700 via-green-400 to-green-900",
            dark: "dark:from-green-400 dark:via-green-300 dark:to-green-500"
        },
        orange: {
            light: "from-orange-700 via-orange-400 to-orange-950",
            dark: "dark:from-orange-400 dark:via-orange-300 dark:to-orange-500"
        }
    };

    const gradientClasses = `${colorConfig[color].light} ${colorConfig[color].dark}`;

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTextIndex((prevIndex) => (prevIndex + 1) % texts.length);
        }, interval);

        return () => clearInterval(timer);
    }, [interval, texts.length]);

    return (
        <div className="flex items-center justify-center">
            <motion.div
                className="relative w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentTextIndex}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            backgroundPosition: ["200% center", "-200% center"],
                        }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{
                            opacity: { duration: 0.3 },
                            y: { duration: 0.3 },
                            backgroundPosition: {
                                duration: 2.5,
                                ease: "linear",
                                repeat: Infinity,
                            },
                        }}
                        className={cn(
                            "flex justify-center text-md font-medium bg-linear-to-r bg-[length:200%_100%] bg-clip-text text-transparent whitespace-nowrap min-w-max",
                            gradientClasses,
                            className
                        )}
                    >
                        {texts[currentTextIndex]}
                    </motion.div>
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
