"use client";

import { useState } from "react";
import { Badge } from "@/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { PlusCircle, Trash2 } from "lucide-react";

interface BadgeGeneratorProps {
  badges: Badge[];
  setBadges: (badges: Badge[]) => void;
}

export function BadgeGenerator({ badges, setBadges }: BadgeGeneratorProps) {
  const [newBadge, setNewBadge] = useState({ name: "", url: "", link: "" });

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

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="text-lg font-medium text-card-foreground">
        Custom Badges
      </h3>
      <div className="space-y-2">
        {badges.map((badge, index) => (
          <div
            key={index}
            className="flex items-center gap-2 p-2 bg-muted rounded-md"
          >
            <img src={badge.url} alt={badge.name} className="h-5" />
            <span className="text-sm font-mono text-muted-foreground flex-grow">
              {badge.name}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveBadge(index)}
              className="h-8 w-8"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Badge Name (e.g., Version)"
          value={newBadge.name}
          onChange={(e) => setNewBadge({ ...newBadge, name: e.target.value })}
        />
        <Input
          placeholder="Image URL (shields.io)"
          value={newBadge.url}
          onChange={(e) => setNewBadge({ ...newBadge, url: e.target.value })}
        />
        <Input
          placeholder="Link URL (Optional)"
          value={newBadge.link || ""}
          onChange={(e) => setNewBadge({ ...newBadge, link: e.target.value })}
        />
        <Button onClick={handleAddBadge} className="w-full sm:w-auto">
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Badge
        </Button>
      </div>
    </div>
  );
}
