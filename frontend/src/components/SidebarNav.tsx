import { MessageSquare, FileText, BarChart3, Bot, FlaskConical } from 'lucide-react';
import clsx from 'clsx';

interface NavItem {
  id: string;
  label: string;
  icon: typeof MessageSquare;
}

const navItems: NavItem[] = [
  { id: 'chat', label: 'RAG Chat', icon: MessageSquare },
  { id: 'agent', label: 'Agent', icon: Bot },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'eval', label: 'Eval', icon: FlaskConical },
];

interface SidebarNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function SidebarNav({ activeTab, onTabChange }: SidebarNavProps) {
  return (
    <nav className="flex flex-row gap-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={clsx(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-ink-800 text-ink-50 shadow-md'
                : 'text-ink-500 hover:text-ink-700 hover:bg-ink-100'
            )}
          >
            <Icon className="w-4 h-4" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
