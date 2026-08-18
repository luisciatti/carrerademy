"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyTrailPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/constelacao");
    }, [router]);

    return (
        <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
    );
}
