import { ThemeProvider as NextThemes } from "next-themes";
import type { ReactNode } from "react";

/**
 * Appearance is a class on `<html>`, which is what the Card's scrim and photo
 * filters key off. `system` is the default so a reader arrives in the
 * appearance their device is already in; the header's control overrides it and
 * the choice survives a reload.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemes>
  );
}
