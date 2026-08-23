"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    // Get initial theme from DOM class (set by inline script)
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    
    try {
      localStorage.setItem("theme", newTheme);
    } catch (e) {
      // localStorage might not be available
    }

    // Trigger custom event for chart updates
    window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: newTheme } }));
  };

  return { theme, toggleTheme };
}