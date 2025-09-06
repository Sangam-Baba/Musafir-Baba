"use-client";

import { QueryProvider } from "./query-provider";
//import { ToastProvider } from "./toast-provider";
import { ThemeProvider } from "./theme-provider";

export function RootProvider({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <QueryProvider>
                {children}
            </QueryProvider>
        </ThemeProvider>
    );
};