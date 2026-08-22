"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/ui/themes";
import type { ReactNode } from "react";

import { useTheme } from "@/components/theme-provider";

export function ClerkProviderThemed({ children }: { children: ReactNode }) {
    const { resolvedTheme } = useTheme();
    return (
        <ClerkProvider appearance={{ theme: resolvedTheme === "dark" ? dark : undefined }}>
            {children}
        </ClerkProvider>
    );
}
