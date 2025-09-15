"use client";

import { useState } from "react";
import { Badge } from "@/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  PlusCircle,
  Trash2,
  Award,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";

interface BadgeGeneratorProps {
  badges: Badge[];
  setBadges: (badges: Badge[]) => void;
}

export function BadgeGenerator({ badges, setBadges }: BadgeGeneratorProps) {
  const [newBadge, setNewBadge] = useState({ name: "", url: "", link: "" });
  const [copied, setCopied] = useState<string | null>(null);

  const handleAddBadge = () => {
    if (newBadge.name && newBadge.url) {
      setBadges([...badges, newBadge]);
      setNewBadge({ name: "", url: "", link: "" });
    }
  };

  const handleRemoveBadge = (index: number) => {
    const updatedBadges = badges.filter((_, i) => i !== index);
    setBadges(updatedBadges);
  };

  const handleCopyBadgeCode = async (badge: Badge) => {
    const markdownCode = badge.link
      ? `[![${badge.name}](${badge.url})](${badge.link})`
      : `![${badge.name}](${badge.url})`;

    try {
      await navigator.clipboard.writeText(markdownCode);
      setCopied(badge.name);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error("Failed to copy badge code:", err);
    }
  };

  const suggestedBadges = [
    {
      name: "Version",
      url: "https://img.shields.io/badge/version-1.0.0-blue.svg",
      link: "",
    },
    {
      name: "License MIT",
      url: "https://img.shields.io/badge/license-MIT-green.svg",
      link: "",
    },
    {
      name: "Node.js",
      url: "https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg",
      link: "",
    },
    {
      name: "TypeScript",
      url: "https://img.shields.io/badge/typescript-%3E%3D4.0-blue.svg",
      link: "",
    },
  ];

  return (
    <div className="terminal-window bg-card">
      {/* Terminal Header */}
      <div className="terminal-header">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-4">
            <div className="terminal-controls">
              <div className="terminal-dot close"></div>
              <div className="terminal-dot minimize"></div>
              <div className="terminal-dot maximize"></div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-1.5 bg-terminal-yellow/20 border border-terminal-yellow rounded">
                <Award className="w-4 h-4 text-terminal-yellow" />
              </div>
              <div>
                <div className="text-sm font-bold text-terminal-yellow font-mono">
                  badge-generator.js
                </div>
                <div className="text-xs text-terminal-comment font-mono">
                  shields.io compatible
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs text-terminal-comment font-mono">
            <span>{badges.length} badges</span>
          </div>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="terminal-content p-6 space-y-6">
        {/* Command prompt */}
        <div className="text-sm font-mono text-terminal-comment">
          <span className="text-terminal-green">$</span> npm run generate-badges
          --interactive
        </div>

        {/* Current badges display */}
        {badges.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-medium font-mono text-terminal-cyan">
              [CURRENT] Active Badges ({badges.length})
            </div>
            <div className="grid gap-3">
              {badges.map((badge, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-secondary/50 border border-border rounded-md hover:bg-secondary transition-colors"
                >
                  <img
                    src={badge.url}
                    alt={badge.name}
                    className="h-5 max-w-[200px] rounded-sm border border-border/50"
                  />
                  <div className="flex-grow">
                    <div className="text-sm font-mono text-foreground font-medium">
                      {badge.name}
                    </div>
                    {badge.link && (
                      <div className="flex items-center space-x-1 text-xs font-mono text-terminal-blue">
                        <ExternalLink className="w-3 h-3" />
                        <span>linked</span>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyBadgeCode(badge)}
                    className="terminal-button p-2 hover:bg-terminal-blue hover:text-background"
                  >
                    {copied === badge.name ? (
                      <Check className="h-4 w-4 text-terminal-green" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveBadge(index)}
                    className="terminal-button p-2 hover:bg-terminal-red hover:text-background"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add new badge form */}
        <div className="space-y-4">
          <div className="text-sm font-medium font-mono text-terminal-yellow">
            [ADD] New Badge Configuration
          </div>

          <div className="grid gap-4">
            <div>
              <label className="text-xs font-mono text-terminal-comment mb-2 block">
                badge_name:
              </label>
              <Input
                placeholder="e.g., Version, License, Build Status"
                value={newBadge.name}
                onChange={(e) =>
                  setNewBadge({ ...newBadge, name: e.target.value })
                }
                className="terminal-input font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-terminal-comment mb-2 block">
                image_url: (shields.io recommended)
              </label>
              <Input
                placeholder="https://img.shields.io/badge/..."
                value={newBadge.url}
                onChange={(e) =>
                  setNewBadge({ ...newBadge, url: e.target.value })
                }
                className="terminal-input font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-terminal-comment mb-2 block">
                link_url: (optional)
              </label>
              <Input
                placeholder="https://example.com (optional)"
                value={newBadge.link || ""}
                onChange={(e) =>
                  setNewBadge({ ...newBadge, link: e.target.value })
                }
                className="terminal-input font-mono"
              />
            </div>
          </div>

          <Button
            onClick={handleAddBadge}
            disabled={!newBadge.name || !newBadge.url}
            className="terminal-button hover:bg-terminal-green hover:text-background hover:border-terminal-green w-full"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            <span className="font-mono">add_badge()</span>
          </Button>
        </div>

        {/* Suggested badges */}
        <div className="space-y-3">
          <div className="text-sm font-medium font-mono text-terminal-magenta">
            [TEMPLATES] Quick Add Suggestions
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestedBadges.map((badge, index) => (
              <button
                key={index}
                onClick={() => setBadges([...badges, badge])}
                className="flex items-center space-x-3 p-3 bg-secondary/30 hover:bg-secondary border border-border rounded-md transition-colors text-left"
              >
                <img
                  src={badge.url}
                  alt={badge.name}
                  className="h-4 rounded-sm border border-border/30"
                />
                <span className="text-sm font-mono text-foreground">
                  {badge.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Terminal footer */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between text-xs font-mono text-terminal-comment">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-terminal-green rounded-full"></div>
                <span>shields.io</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-terminal-blue rounded-full"></div>
                <span>markdown ready</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-terminal-green">$</span>
              <span>badge.generate() --output=markdown</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
