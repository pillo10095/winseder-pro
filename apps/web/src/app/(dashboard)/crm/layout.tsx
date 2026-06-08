import type { ReactNode } from "react";
import { CrmNav } from "@/components/crm/crm-nav";

export default function CrmLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0">
      <CrmNav />
      {children}
    </div>
  );
}
