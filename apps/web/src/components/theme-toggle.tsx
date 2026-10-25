import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

/**
 * Switches between light and dark. Both icons are rendered and one is revealed
 * by the `.dark` class rather than by React state, so the control looks right on
 * the very first paint and there is nothing to hydrate a mismatch about.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const next = resolvedTheme === "dark" ? "light" : "dark";

  return (
    <button
      aria-label={`Switch to ${next} appearance`}
      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/60 inline-flex size-9 items-center justify-center rounded-full transition-[color,transform] duration-150 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none focus-visible:ring-2 active:scale-95 motion-reduce:transition-none"
      onClick={() => setTheme(next)}
      type="button"
    >
      <Sun aria-hidden="true" className="hidden size-4 dark:block" />
      <Moon aria-hidden="true" className="size-4 dark:hidden" />
    </button>
  );
}
