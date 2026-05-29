'use client';

import {
  Phone,
  Mail,
  MessageSquare,
  FileText,
  Calendar,
  Bot,
  type LucideIcon,
} from 'lucide-react';

export interface Activity {
  id: string;
  type: string;
  description: string;
  activity_date: string;
  created_by_name?: string;
}

const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  llamada: Phone,
  whatsapp: MessageSquare,
  email: Mail,
  nota: FileText,
  cita: Calendar,
  CALL: Phone,
  WHATSAPP: MessageSquare,
  EMAIL: Mail,
  NOTE: FileText,
  MEETING: Calendar,
  SYSTEM: Bot,
};

const ACTIVITY_COLORS: Record<string, string> = {
  llamada: 'text-blue-600 bg-blue-100',
  whatsapp: 'text-green-600 bg-green-100',
  email: 'text-purple-600 bg-purple-100',
  nota: 'text-gray-600 bg-gray-100',
  cita: 'text-amber-600 bg-amber-100',
  CALL: 'text-blue-600 bg-blue-100',
  WHATSAPP: 'text-green-600 bg-green-100',
  EMAIL: 'text-purple-600 bg-purple-100',
  NOTE: 'text-gray-600 bg-gray-100',
  MEETING: 'text-amber-600 bg-amber-100',
  SYSTEM: 'text-slate-600 bg-slate-100',
};

const ACTIVITY_LABELS: Record<string, string> = {
  CALL: 'Llamada',
  WHATSAPP: 'WhatsApp',
  EMAIL: 'Email',
  NOTE: 'Nota',
  MEETING: 'Cita',
  SYSTEM: 'Sistema',
};

interface ActivityTimelineProps {
  activities: Activity[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <p className="text-sm text-muted-foreground">
          Sin actividades registradas
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {activities.map((activity, i) => {
        const Icon = ACTIVITY_ICONS[activity.type] || FileText;
        const colorClass =
          ACTIVITY_COLORS[activity.type] || 'text-gray-600 bg-gray-100';
        const label = ACTIVITY_LABELS[activity.type] || activity.type;
        const isLast = i === activities.length - 1;

        return (
          <div key={activity.id} className="relative flex gap-3 pb-4">
            {!isLast && (
              <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />
            )}

            <div
              className={`flex size-8 shrink-0 items-center justify-center rounded-sm ${colorClass}`}
            >
              <Icon className="size-4" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-muted-foreground">{label}</p>
              <p className="text-sm">{activity.description}</p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">
                  {new Date(activity.activity_date).toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {activity.created_by_name && (
                  <>
                    <span className="text-[11px] text-muted-foreground/40">
                      •
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {activity.created_by_name}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
