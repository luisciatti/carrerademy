"use client";

import { SWRConfig } from "swr";
import type { ReactNode } from "react";

export function SwrProvider({ children }: { children: ReactNode }) {
    return (
        <SWRConfig
            value={{
                revalidateOnFocus: false,
                shouldRetryOnError: false,
                dedupingInterval: 10_000,
                focusThrottleInterval: 10_000,
            }}
        >
            {children}
        </SWRConfig>
    );
}
