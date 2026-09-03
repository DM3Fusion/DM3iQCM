import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
export const metadata:Metadata={title:{default:"DM3iQ™ — Case Management Intelligence",template:"%s | DM3iQ™"},description:"Case Management Intelligence"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><AppShell>{children}</AppShell></body></html>}
