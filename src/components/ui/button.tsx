// src/components/ui/button.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "terminal";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "terminal-button inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium font-mono ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:transform active:translateY-0.5",
          {
            "bg-primary text-primary-foreground hover:bg-terminal-green hover:text-background border border-primary":
              variant === "default",
            "bg-destructive text-destructive-foreground hover:bg-terminal-red hover:text-background border border-destructive":
              variant === "destructive",
            "border border-border bg-background hover:bg-secondary hover:text-secondary-foreground":
              variant === "outline",
            "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border":
              variant === "secondary",
            "hover:bg-accent hover:text-accent-foreground border border-transparent":
              variant === "ghost",
            "text-primary underline-offset-4 hover:underline border-none shadow-none":
              variant === "link",
            "bg-secondary text-foreground border border-border hover:bg-terminal-blue hover:text-background hover:border-terminal-blue hover:shadow-lg":
              variant === "terminal",
          },
          {
            "h-10 px-4 py-2": size === "default",
            "h-9 rounded-md px-3": size === "sm",
            "h-11 rounded-md px-8 text-base": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
