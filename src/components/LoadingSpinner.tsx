import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: number;
  variant?: "default" | "terminal";
}

export function LoadingSpinner({
  className,
  size = 24,
  variant = "default",
}: LoadingSpinnerProps) {
  if (variant === "terminal") {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-terminal-green rounded-full animate-pulse"></div>
          <div
            className="w-2 h-2 bg-terminal-yellow rounded-full animate-pulse"
            style={{ animationDelay: "0.2s" }}
          ></div>
          <div
            className="w-2 h-2 bg-terminal-blue rounded-full animate-pulse"
            style={{ animationDelay: "0.4s" }}
          ></div>
        </div>
        <span className="text-xs font-mono text-terminal-comment">
          processing...
        </span>
      </div>
    );
  }

  return (
    <Loader2
      className={cn("animate-spin text-terminal-green", className)}
      size={size}
    />
  );
}
