import React, { useState } from 'react';
import { CaptainAuthProvider, useCaptainAuth } from './context/CaptainAuthContext';
import CaptainNavbar from './components/CaptainNavbar';
import CaptainDashboard from './pages/CaptainDashboard';
import EarningsPage from './pages/EarningsPage';
import RideHistoryPage from './pages/RideHistoryPage';
import CaptainProfilePage from './pages/CaptainProfilePage';
import CaptainAuthPage from './pages/CaptainAuthPage';
import SafetyCenterModal from './components/SafetyCenterModal';
import ScenarioTestModal from './components/ScenarioTestModal';
import { 
  Navigation, 
  History, 
  IndianRupee, 
  User, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Info 
} from 'lucide-react';

function CaptainMainApp() {
  const { captain, token, toasts, activeRide } = useCaptainAuth();
  const [activeTab, setActiveTab] = useState('home'); // home, rides, earnings, profile
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [isScenarioTestOpen, setIsScenarioTestOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-dark-900 text-slate-100 font-sans selection:bg-brand-500 selection:text-dark-900">
      {/* Top Navbar */}
      <CaptainNavbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSos={() => setIsSosOpen(true)}
        onOpenScenarioTest={() => setIsScenarioTestOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col pb-16 md:pb-0 overflow-y-auto">
        {activeTab === 'home' && (
          <CaptainDashboard onOpenScenarioTest={() => setIsScenarioTestOpen(true)} />
        )}
        {activeTab === 'earnings' && <EarningsPage />}
        {activeTab === 'rides' && <RideHistoryPage />}
        {activeTab === 'profile' && <CaptainProfilePage onOpenAuth={() => setActiveTab('auth')} />}
        {activeTab === 'auth' && <CaptainAuthPage onSuccess={() => setActiveTab('home')} />}
      </main>

      {/* Bottom Navigation Bar (Hidden during active trip to avoid covering COMPLETE RIDE button) */}
      {!activeRide && (
        <>
          <nav className="fixed bottom-0 left-0 right-0 z-40 bg-dark-900/95 backdrop-blur-lg border-t border-dark-600/80 px-4 py-2 flex items-center justify-around shadow-2xl md:hidden">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
                activeTab === 'home' ? 'text-brand-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Navigation className="w-5 h-5" />
              <span className="text-[10px] uppercase tracking-wider">Home</span>
            </button>

            <button
              onClick={() => setActiveTab('rides')}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
                activeTab === 'rides' ? 'text-brand-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-5 h-5" />
              <span className="text-[10px] uppercase tracking-wider">Rides</span>
            </button>

            <button
              onClick={() => setActiveTab('earnings')}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
                activeTab === 'earnings' ? 'text-brand-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <IndianRupee className="w-5 h-5" />
              <span className="text-[10px] uppercase tracking-wider">Earnings</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
                activeTab === 'profile' ? 'text-brand-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-5 h-5" />
              <span className="text-[10px] uppercase tracking-wider">Profile</span>
            </button>
          </nav>

          {/* Desktop Floating Tab Bar */}
          <div className="hidden md:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-dark-800/90 backdrop-blur-md border border-dark-600 rounded-full px-4 py-2 shadow-2xl items-center gap-1">
            {[
              { id: 'home', label: 'Dashboard', icon: Navigation },
              { id: 'rides', label: 'Ride History', icon: History },
              { id: 'earnings', label: 'Earnings', icon: IndianRupee },
              { id: 'profile', label: 'Profile & Vehicle', icon: User },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                    isActive
                      ? 'bg-brand-500 text-dark-900 shadow-glow-gold'
                      : 'text-slate-400 hover:text-white hover:bg-dark-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Toast Notification Container */}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`p-3.5 rounded-2xl shadow-2xl border text-xs font-semibold flex items-center gap-2.5 pointer-events-auto animate-in slide-in-from-right-5 ${
              t.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                : t.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
                : t.type === 'warning'
                ? 'bg-amber-950/90 border-amber-500/50 text-amber-200'
                : 'bg-dark-800/95 border-dark-600 text-slate-200'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {t.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {t.type === 'warning' && <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />}
            {t.type === 'info' && <Info className="w-4 h-4 text-brand-400 shrink-0" />}
            <span className="flex-1">{t.message}</span>
          </div>
        ))}
      </div>

      {/* Modals */}
      {isSosOpen && (
        <SafetyCenterModal
          ride={activeRide}
          isOpen={isSosOpen}
          onClose={() => setIsSosOpen(false)}
        />
      )}

      {isScenarioTestOpen && (
        <ScenarioTestModal
          isOpen={isScenarioTestOpen}
          onClose={() => setIsScenarioTestOpen(false)}
        />
      )}
    </div>
  );
}

export function App() {
  return (
    <CaptainAuthProvider>
      <CaptainMainApp />
    </CaptainAuthProvider>
  );
}

export default App;
