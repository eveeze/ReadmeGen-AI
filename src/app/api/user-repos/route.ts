// src/app/api/user-repos/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import axios from "axios";
import { UserRepo } from "@/types";

// Definisikan tipe untuk session dengan accessToken
interface SessionWithToken {
  accessToken?: string;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !(session as SessionWithToken).accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await axios.get(
      "https://api.github.com/user/repos?sort=updated&per_page=50",
      {
        headers: {
          Authorization: `Bearer ${(session as SessionWithToken).accessToken}`,
        },
      }
    );

    // Beri tipe eksplisit pada repo
    const repos: UserRepo[] = response.data.map(
      (repo: { id: number; full_name: string; html_url: string }) => ({
        id: repo.id,
        name: repo.full_name,
        url: repo.html_url,
      })
    );

    return NextResponse.json(repos);
  } catch (error) {
    console.error("Failed to fetch repos:", error);
    return NextResponse.json(
      { error: "Failed to fetch repositories" },
      { status: 500 }
    );
  }
}
