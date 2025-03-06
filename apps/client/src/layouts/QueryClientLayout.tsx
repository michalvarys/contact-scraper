"use client";

// Tento soubor je nyní prázdný, protože QueryClientProvider je součástí TRPCProvider
// Ponecháváme ho pro zpětnou kompatibilitu, ale v budoucnu by měl být odstraněn

export function QueryClientLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
