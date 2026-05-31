import type { Metadata } from "next";
import "./globals.css";
import Navigation from "../components/Navigation";
import PageTransition from "../components/PageTransition";
import ThemeToggle from "../components/ThemeToggle";

export const metadata: Metadata = {
  title: "Apexion AI | Explainable AI Race Engineer",
  description: "F1 Pit-wall strategy simulator and telemetry engine powered by IBM Granite and LangChain.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-background text-foreground bg-dot-grid min-h-screen flex flex-col md:flex-row relative">
        {/* CRT Scanline effect on the whole page for retro-futuristic pit wall look */}
        <div className="fixed inset-0 pointer-events-none scanlines z-50 mix-blend-overlay" />
        
        {/* Animated ambient backdrop glows */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 bg-background">
          <div className="absolute top-[-15%] left-[-15%] w-[60%] h-[60%] rounded-full bg-f1-red/5 blur-[130px] animate-float-1" />
          <div className="absolute bottom-[-15%] right-[-15%] w-[60%] h-[60%] rounded-full bg-f1-blue/5 blur-[130px] animate-float-2" />
        </div>
        
        {/* Navigation Sidebar */}
        <Navigation />

        {/* Main Content Workspace */}
        <main className="flex-1 flex flex-col min-h-screen overflow-y-auto z-10">
          {/* Top telemetry bar */}
          <header className="border-b border-f1-cardBorder bg-f1-card/95 backdrop-blur-sm px-6 py-3 flex items-center justify-between z-25">
            <div className="flex items-center space-x-3">
              <span className="w-2.5 h-2.5 rounded-full bg-f1-green animate-pulse" />
              <span className="text-xs uppercase tracking-widest font-mono text-f1-textMuted">
                PIT WALL CONSOLE // LIVE TELEMETRY
              </span>
            </div>
            
            <div className="flex items-center space-x-4 md:space-x-6 text-xs font-mono">
              <div className="hidden sm:flex items-center space-x-2">
                <span className="text-f1-textMuted">SYS STATUS:</span>
                <span className="text-f1-green uppercase">NOMINAL</span>
              </div>
              <div className="hidden md:flex items-center space-x-2">
                <span className="text-f1-textMuted">RAG:</span>
                <span className="text-f1-blue uppercase">ACTIVE</span>
              </div>
              <div className="hidden lg:flex items-center space-x-2">
                <span className="text-f1-textMuted">IBM GRANITE:</span>
                <span className="text-f1-yellow uppercase">READY</span>
              </div>
              <ThemeToggle />
            </div>
          </header>
          
          <div className="flex-1 p-4 md:p-6 lg:p-8 flex flex-col">
            <PageTransition>
              {children}
            </PageTransition>
          </div>
        </main>
      </body>
    </html>
  );
}
