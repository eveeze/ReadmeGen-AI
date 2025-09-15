// src/components/Questionnaire.tsx
"use client";

import { useState } from "react";
import { AgenticQuestion } from "@/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Terminal, HelpCircle } from "lucide-react";

interface QuestionnaireProps {
  questions: AgenticQuestion[];
  onSubmit: (answers: Record<string, string>) => void;
  isLoading: boolean;
}

export function Questionnaire({
  questions,
  onSubmit,
  isLoading,
}: QuestionnaireProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleInputChange = (question: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [question]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(answers);
  };

  const allQuestionsAnswered = questions.every((q) =>
    answers[q.question]?.trim()
  );

  return (
    <div className="my-8 animate-slide-up max-w-4xl mx-auto">
      <div className="terminal-window bg-card shadow-2xl">
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
                  <HelpCircle className="w-4 h-4 text-terminal-yellow" />
                </div>
                <div>
                  <div className="text-sm font-bold text-terminal-yellow font-mono">
                    readmegen-agent.sh --ask
                  </div>
                  <div className="text-xs text-terminal-comment font-mono">
                    menunggu input pengguna
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="terminal-content p-8">
          <p className="text-sm text-terminal-comment font-mono mb-6">
            <span className="text-terminal-green">$</span> echo &quot;AI
            membutuhkan informasi tambahan untuk membuat README yang lebih
            baik.&quot;
          </p>
          <form onSubmit={handleSubmit} className="space-y-6">
            {questions.map((q) => (
              <div key={q.id}>
                <label
                  htmlFor={q.id}
                  className="block text-sm font-medium font-mono text-foreground mb-2"
                >
                  {`> ${q.question}`}
                </label>
                <Input
                  id={q.id}
                  name={q.id}
                  placeholder={q.placeholder || "Jawaban Anda..."}
                  onChange={(e) =>
                    handleInputChange(q.question, e.target.value)
                  }
                  className="terminal-input"
                />
              </div>
            ))}
            <Button
              type="submit"
              className="w-full terminal-button hover:bg-terminal-green hover:text-background"
              disabled={!allQuestionsAnswered || isLoading}
            >
              <span className="font-mono">
                {isLoading ? "Memproses..." : "Lanjutkan Generasi README"}
              </span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
