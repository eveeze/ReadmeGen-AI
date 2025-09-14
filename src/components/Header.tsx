"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "./ui/button";
import { LogOut, History, Github } from "lucide-react";

export default function Header() {
  const { data: session, status } = useSession();

  return (
    <header className="container mx-auto max-w-6xl py-4 px-4 flex justify-between items-center">
      <Link
        href="/"
        className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
      >
        ReadmeGen AI
      </Link>
      <nav className="flex items-center gap-2 md:gap-4">
        {status === "loading" ? (
          <div className="h-9 w-24 rounded-md bg-gray-200 animate-pulse" />
        ) : status === "authenticated" ? (
          <>
            <span className="text-sm hidden md:inline">
              Hi, {session.user?.name?.split(" ")[0]}
            </span>
            <Link href="/history">
              <Button variant="ghost" size="sm">
                <History className="mr-2 h-4 w-4" />
                History
              </Button>
            </Link>
            <Button onClick={() => signOut()} variant="outline" size="sm">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </>
        ) : (
          <Button onClick={() => signIn("github")} size="sm">
            <Github className="mr-2 h-4 w-4" />
            Sign in with GitHub
          </Button>
        )}
      </nav>
    </header>
  );
}
