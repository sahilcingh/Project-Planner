"use client";

import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  function toggle() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className="flex size-8 items-center justify-center rounded-full border border-border transition hover:bg-foreground/5"
    >
      <Sun className="theme-toggle-light-icon size-4" strokeWidth={1.5} />
      <Moon className="theme-toggle-dark-icon size-4" strokeWidth={1.5} />
    </button>
  );
}
