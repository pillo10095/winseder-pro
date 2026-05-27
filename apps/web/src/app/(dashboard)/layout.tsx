import { CrmSidebar } from '../../components/crm/crm-sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-gray-200 bg-gray-50">
        <CrmSidebar />
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
