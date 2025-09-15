"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "./ui/button";
import { LogOut, History, Github, Terminal } from "lucide-react";

export default function Header() {
  const { data: session, status } = useSession();

  return (
    <header className="bg-background border-b border-border backdrop-blur-sm sticky top-0 z-40">
      <div className="container mx-auto max-w-6xl py-4 px-4 flex justify-between items-center">
        <Link
          href="/"
          className="flex items-center space-x-3 group transition-all duration-200"
        >
          <div className="p-2 bg-terminal-green/20 border border-terminal-green rounded terminal-glow">
            <Terminal className="w-5 h-5 text-terminal-green" />
          </div>
          <div>
            <span className="text-xl font-bold font-mono text-terminal-green group-hover:text-terminal-cyan transition-colors">
              ReadmeGen.AI
            </span>
            <div className="text-xs text-terminal-comment font-mono">
              terminal v2.0
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-2 md:gap-4">
          {status === "loading" ? (
            <div className="terminal-loading h-9 w-24 rounded-md animate-pulse" />
          ) : status === "authenticated" ? (
            <>
              <div className="hidden md:flex items-center space-x-2 text-sm font-mono">
                <span className="text-terminal-comment">user:</span>
                <span className="text-terminal-green">
                  {session.user?.name?.split(" ")[0]}
                </span>
              </div>
              <Link href="/history">
                <Button variant="ghost" size="sm" className="terminal-button">
                  <History className="mr-2 h-4 w-4" />
                  <span className="font-mono">history</span>
                </Button>
              </Link>
              <Button
                onClick={() => signOut()}
                variant="outline"
                size="sm"
                className="terminal-button hover:bg-terminal-red hover:text-background hover:border-terminal-red"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span className="font-mono">logout</span>
              </Button>
            </>
          ) : (
            <Button
              onClick={() => signIn("github")}
              size="sm"
              className="terminal-button hover:bg-terminal-green hover:text-background hover:border-terminal-green"
            >
              <Github className="mr-2 h-4 w-4" />
              <span className="font-mono">signin</span>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
