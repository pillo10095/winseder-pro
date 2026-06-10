"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PausedSession {
  sessionId: string;
  reason: string;
  autoResumeAt?: string | number | null;
}

interface PausedSessionsProps {
  sessions: PausedSession[];
  onResume: (sessionId: string) => void;
}

export function PausedSessions({ sessions, onResume }: PausedSessionsProps) {
  if (sessions.length === 0) return null;

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-destructive animate-pulse" />
          Sesiones en Pausa
        </CardTitle>
        <CardDescription>
          Sesiones pausadas automática o manualmente
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {sessions.map((ps) => (
            <div
              key={ps.sessionId}
              className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">
                  {ps.sessionId.substring(0, 8)}...
                </span>
                <span className="text-xs text-muted-foreground">
                  {ps.reason}
                </span>
                {ps.autoResumeAt && (
                  <span className="text-xs text-muted-foreground/60">
                    Reanudación automática:{" "}
                    {new Date(ps.autoResumeAt).toLocaleTimeString()}
                  </span>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onResume(ps.sessionId)}
              >
                Reanudar
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
