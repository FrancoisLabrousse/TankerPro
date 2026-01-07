import { useState } from 'react';
import { LayoutDashboard, History, ShoppingBag, Settings } from 'lucide-react';
import clsx from 'clsx';
import { Dashboard } from './components/Dashboard/Dashboard';
import { HistoryList } from './components/History/HistoryList';
import { PurchasesView } from './components/Purchases/PurchasesView';
import { SettingsView } from './components/Settings/SettingsView';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';

function AppContent() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'purchases' | 'history' | 'settings'>('dashboard');
  const { t } = useLanguage();

  return (
    <div className="flex flex-col h-[100dvh] max-w-md mx-auto bg-slate-900 border-x border-slate-800 shadow-2xl relative">
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 scrollbar-hide">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'purchases' && <PurchasesView />}
        {activeTab === 'history' && <HistoryList />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 w-full bg-slate-950/90 backdrop-blur-lg border-t border-slate-800 z-50">
        <div className="flex justify-around items-center h-16">
          <NavButton
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
            icon={<LayoutDashboard size={24} />}
            label={t('nav.tacho')}
          />
          <NavButton
            active={activeTab === 'purchases'}
            onClick={() => setActiveTab('purchases')}
            icon={<ShoppingBag size={24} />}
            label={t('nav.purchases')}
          />
          <NavButton
            active={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
            icon={<History size={24} />}
            label={t('nav.history')}
          />
          <NavButton
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
            icon={<Settings size={24} />}
            label={t('nav.settings')}
          />
        </div>
      </nav>
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

const NavButton = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) => (
  <button
    onClick={onClick}
    className={clsx(
      "flex flex-col items-center justify-center w-full h-full transition-colors duration-200 active:scale-95",
      active ? "text-indigo-400" : "text-slate-500 hover:text-slate-300"
    )}
  >
    <div className={clsx("mb-1 transition-transform duration-200", active && "-translate-y-0.5")}>{icon}</div>
    <span className="text-[10px] font-medium tracking-wide">{label}</span>
  </button>
);

export default App;
