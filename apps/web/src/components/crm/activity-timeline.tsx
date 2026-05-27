'use client';

import { Phone, Mail, Handshake, FileText, CheckCircle, Pin } from 'lucide-react';

interface Activity {
  id: string;
  type: string;
  description: string;
  date: string;
  by: string;
}

interface ActivityTimelineProps {
  activities: Activity[];
}

const TYPE_ICONS: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Handshake,
  note: FileText,
  task: CheckCircle,
};

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No activities yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const Icon = TYPE_ICONS[activity.type] || Pin;
        return (
          <div key={activity.id} className="geometric-frame flex items-start gap-3 pl-4 py-2">
            <Icon className="mt-0.5 h-4 w-4 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-foreground">{activity.description}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {activity.date} · {activity.by}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
