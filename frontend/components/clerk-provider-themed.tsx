"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/ui/themes";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";

export function ClerkProviderThemed({ children }: { children: ReactNode }) {
    const { resolvedTheme } = useTheme();
    return (
        <ClerkProvider appearance={{ theme: resolvedTheme === "dark" ? dark : undefined }}>
            {children}
        </ClerkProvider>
    );
}
