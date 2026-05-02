import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { SidebarNav } from './components/SidebarNav';
import { ChatPage } from './pages/ChatPage';
import { AgentPage } from './pages/AgentPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { DashboardPage } from './pages/DashboardPage';
import { EvalPage } from './pages/EvalPage';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-ink-50">
      <div className="grain-overlay" />

      {/* Top bar */}
      <header className="flex-shrink-0 h-14 border-b border-ink-100 bg-white/80 backdrop-blur-sm flex items-center px-5 z-10 gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-display text-xl text-ink-800 tracking-tight">DocMind</h1>
          <span className="text-[10px] font-mono text-ink-300 bg-ink-100 px-2 py-0.5 rounded-full">
            AI-native
          </span>
        </div>

        <SidebarNav activeTab={activeTab} onTabChange={setActiveTab} />
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'chat' && <ChatPage />}
        {activeTab === 'agent' && <AgentPage />}
        {activeTab === 'documents' && (
          <div className="h-full overflow-y-auto">
            <DocumentsPage />
          </div>
        )}
        {activeTab === 'dashboard' && (
          <div className="h-full overflow-y-auto">
            <DashboardPage />
          </div>
        )}
        {activeTab === 'eval' && (
          <div className="h-full overflow-y-auto">
            <EvalPage />
          </div>
        )}
      </main>
    </div>
  );
}
