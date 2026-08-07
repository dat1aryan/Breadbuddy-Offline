import { useState } from 'react';
import { Database, Info, Sparkles, Award, Lock, ExternalLink, Github } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { settingsEngine } from '../../lib/settingsEngine';
import { preferencesEngine } from '../../lib/preferencesEngine';
import { profileEngine } from '../../lib/profileEngine';
import { setAuth, clearAuth } from '../../lib/auth';
import { User as UserType } from '../../lib/types';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { notificationEngine } from '../../lib/notificationEngine';

interface SettingsProps {
  user: UserType;
  onUpdateUser: (updated: UserType) => void;
}

export function Settings({ user }: SettingsProps) {
  const toast = useToast();
  const [activeSection, setActiveSection] = useState<'data' | 'about'>('data');

  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isNewCycleConfirmOpen, setIsNewCycleConfirmOpen] = useState(false);
  const [isDeleteLocalConfirmOpen, setIsDeleteLocalConfirmOpen] = useState(false);

  // Data management helpers
  const handleExportJSON = () => {
    try {
      const backup = {
        version: '1.2.0',
        userId: user.id,
        profile: {
          name: user.name,
          monthlyAllowance: user.monthlyAllowance,
          avatar: profileEngine.getAvatar(user.id),
          joinDate: profileEngine.getJoinDate(user.id),
        },
        preferences: preferencesEngine.getPreferences(user.id),
        settings: settingsEngine.getSettings(user.id),
        ledger: localStorage.getItem(`breadbuddy_transactions_${user.id}`) ? JSON.parse(localStorage.getItem(`breadbuddy_transactions_${user.id}`)!) : [],
        goals: localStorage.getItem(`breadbuddy_goals_${user.id}`) ? JSON.parse(localStorage.getItem(`breadbuddy_goals_${user.id}`)!) : [],
        xp: localStorage.getItem(`breadbuddy_xp_${user.id}`) ? JSON.parse(localStorage.getItem(`breadbuddy_xp_${user.id}`)!) : {},
        achievements: localStorage.getItem(`breadbuddy_achievements_${user.id}`) ? JSON.parse(localStorage.getItem(`breadbuddy_achievements_${user.id}`)!) : [],
        streaks: localStorage.getItem(`breadbuddy_streak_${user.id}`) ? JSON.parse(localStorage.getItem(`breadbuddy_streak_${user.id}`)!) : {},
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `breadbuddy_backup_${user.name || 'user'}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success('Your wallet is safely backed up 💜');
    } catch {
      toast.error('Failed to export data.');
    }
  };

  const handleExportCSV = () => {
    try {
      const rawTransactions = localStorage.getItem(`breadbuddy_transactions_${user.id}`);
      const transactions = rawTransactions ? JSON.parse(rawTransactions) : [];
      if (transactions.length === 0) {
        toast.error('No transactions to export!');
        return;
      }

      const headers = ['ID', 'Title', 'Amount', 'Type', 'Category', 'Payment Method', 'Date', 'Time', 'Description'];
      const rows = transactions.map((t: any) => [
        t.id,
        `"${t.title.replace(/"/g, '""')}"`,
        t.amount,
        t.type,
        t.category,
        t.paymentMethod,
        t.date,
        t.time,
        `"${(t.description || '').replace(/"/g, '""')}"`
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', encodeURI(csvContent));
      downloadAnchor.setAttribute('download', `breadbuddy_transactions_${user.name || 'user'}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success('CSV history exported successfully! 📊');
    } catch {
      toast.error('Failed to export CSV.');
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setIsImportConfirmOpen(true);
    e.target.value = '';
  };

  const executeImportJSON = () => {
    if (!pendingFile) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const backup = JSON.parse(event.target?.result as string);
        if (!backup.version || !backup.profile || !backup.settings) {
          toast.error('Vibe Check: Invalid backup format or missing fields!');
          return;
        }

        // Store data
        const updatedUser: UserType = {
          ...user,
          name: backup.profile.name,
          monthlyAllowance: backup.profile.monthlyAllowance,
        };
        setAuth(localStorage.getItem('breadbuddy_token') || '', updatedUser);
        profileEngine.setAvatar(user.id, backup.profile.avatar);
        if (backup.profile.joinDate) {
          localStorage.setItem(`breadbuddy_join_date_${user.id}`, backup.profile.joinDate);
        }
        if (backup.preferences) {
          preferencesEngine.savePreferences(user.id, backup.preferences);
        }
        if (backup.settings) {
          settingsEngine.saveSettings(user.id, backup.settings);
        }
        localStorage.setItem(`breadbuddy_transactions_${user.id}`, JSON.stringify(backup.ledger || []));
        localStorage.setItem(`breadbuddy_goals_${user.id}`, JSON.stringify(backup.goals || []));
        localStorage.setItem(`breadbuddy_xp_${user.id}`, JSON.stringify(backup.xp || {}));
        localStorage.setItem(`breadbuddy_achievements_${user.id}`, JSON.stringify(backup.achievements || []));
        localStorage.setItem(`breadbuddy_streak_${user.id}`, JSON.stringify(backup.streaks || {}));

        notificationEngine.addNotification(user.id, {
          title: 'Data Imported 📥',
          message: 'Your backup data was successfully loaded.',
          emoji: '📥',
        });

        toast.success("Welcome back! Everything's right where you left it.");
        setTimeout(() => window.location.reload(), 1500);
      } catch {
        toast.error('Vibe Check: Corrupted or invalid JSON file!');
      } finally {
        setIsImportConfirmOpen(false);
        setPendingFile(null);
      }
    };
    reader.readAsText(pendingFile);
  };

  const handleNewBudgetCycle = () => {
    setIsNewCycleConfirmOpen(true);
  };

  const executeNewBudgetCycle = () => {
    localStorage.setItem(`breadbuddy_cycle_start_${user.id}`, new Date().toISOString());
    toast.success('New budget cycle started.');
    
    // Trigger update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('finance-updated'));
      window.dispatchEvent(new CustomEvent('breadbuddy-settings-updated'));
    }
    setIsNewCycleConfirmOpen(false);
  };

  const handleDeleteLocalData = () => {
    setIsDeleteLocalConfirmOpen(true);
  };

  const executeDeleteLocalData = () => {
    clearAuth();
    localStorage.clear();
    toast.success('All local data wiped. Resetting app...');
    // Force reload to trigger onboarding
    window.location.reload();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start max-w-4xl mx-auto pb-16">
      {/* Sidebar Sections Selection */}
      <Card accent="none" glassy className="p-4 md:col-span-1 space-y-1">
        {[
          { id: 'data', label: 'Your Data', icon: <Database size={14} /> },
          { id: 'about', label: 'About', icon: <Info size={14} /> },
        ].map((sec) => {
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id as any)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-bb-xs text-xs font-bold transition-none border-2 ${
                isActive
                  ? 'bg-bb-violet text-bb-violet-fg border-black'
                  : 'text-bb-text-muted hover:bg-bb-bg hover:text-bb-text-primary border-transparent'
              }`}
            >
              {sec.icon}
              <span>{sec.label}</span>
            </button>
          );
        })}
      </Card>

      {/* Settings Render Panel */}
      <Card accent="none" glassy className="p-6 md:col-span-3 space-y-6 min-h-[400px]">
        {activeSection === 'data' && (
          <div className="space-y-6 animate-fade-in font-sans">
            <div>
              <h3 className="text-sm font-black text-bb-text-primary uppercase tracking-wider font-mono">Your Data</h3>
              <p className="text-[10px] text-bb-text-muted mt-1">Everything stays safely on your device. Backup whenever you want.</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleExportJSON}
                  className="flex flex-col items-center justify-center p-6 h-auto bg-bb-surface border-2 border-bb-border hover:border-bb-violet text-center rounded-bb-sm space-y-2 transition-none"
                >
                  <span className="text-lg">📁</span>
                  <span className="text-xs font-bold text-bb-text-primary">Backup Everything</span>
                  <span className="text-[9px] text-bb-text-muted leading-normal font-semibold">Generates full system recovery file</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="flex flex-col items-center justify-center p-6 h-auto bg-bb-surface border-2 border-bb-border hover:border-bb-violet text-center rounded-bb-sm space-y-2 transition-none"
                >
                  <span className="text-lg">📊</span>
                  <span className="text-xs font-bold text-bb-text-primary">Download Spending History</span>
                  <span className="text-[9px] text-bb-text-muted leading-normal font-semibold">Export expenses for excel analyses</span>
                </button>
              </div>

              {/* Import Backup */}
              <div className="p-4 rounded-bb-sm bg-bb-bg border-2 border-bb-border space-y-3">
                <div>
                  <span className="text-[10px] font-bold font-mono tracking-widest text-bb-text-muted uppercase block">Restore Backup</span>
                  <p className="text-[10px] text-bb-text-muted leading-relaxed mt-1">Upload a valid breadbuddy_backup.json to restore your account.</p>
                </div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  className="w-full text-xs text-bb-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-bb-xs file:border-2 file:border-black file:text-xs file:font-bold file:bg-bb-violet file:text-bb-violet-fg hover:file:bg-bb-text-muted file:cursor-pointer cursor-pointer"
                />
              </div>

              {/* Destructive actions */}
              <div className="pt-4 border-t-2 border-bb-border select-none flex flex-wrap gap-3">
                <Button variant="danger" onClick={handleNewBudgetCycle} className="text-xs font-bold">
                  New budget cycle
                </Button>
                <Button variant="danger" onClick={handleDeleteLocalData} className="text-xs font-bold">
                  Delete My Account
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'about' && (
          <div className="space-y-6 animate-fade-in font-sans select-none">
            {/* Redesigned Hero Header */}
            <div className="p-6 rounded-bb-sm bg-bb-surface/60 border-2 border-bb-border relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-[4px_4px_0px_0px_#000]">
              <div className="space-y-2 max-w-lg">
                <div className="flex items-center gap-2">
                  <span className="text-3xl select-none">🍞</span>
                  <h3 className="text-2xl sm:text-3xl font-display font-black tracking-tight gradient-text leading-none">
                    BreadBuddy
                  </h3>
                  <span className="px-2 py-0.5 rounded-bb-xs bg-bb-lime text-black border border-black font-mono text-[9px] font-black uppercase shadow-[1px_1px_0px_0px_#000]">
                    v2.0.26
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-bb-text-secondary leading-relaxed font-medium">
                  Stop spending like you're doing side quests. BreadBuddy is the student-first, goal-driven money tracker and AI financial companion.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="px-2.5 py-1 rounded-bb-xs bg-bb-surface border-2 border-bb-border text-[10px] font-mono font-bold text-bb-text-primary flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000]">
                    <Lock size={12} className="text-bb-lime" /> 100% Offline & Private
                  </span>
                  <span className="px-2.5 py-1 rounded-bb-xs bg-bb-surface border-2 border-bb-border text-[10px] font-mono font-bold text-bb-text-primary flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000]">
                    <Sparkles size={12} className="text-bb-violet" /> AI Bro Powered
                  </span>
                  <span className="px-2.5 py-1 rounded-bb-xs bg-bb-surface border-2 border-bb-border text-[10px] font-mono font-bold text-bb-text-primary flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000]">
                    <Award size={12} className="text-bb-amber" /> Gamified Ranks
                  </span>
                </div>
              </div>
            </div>

            {/* Core Pillars Grid (Inspired by Overview Page Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pillar 1: Allowance & Safe Spend Rate */}
              <div className="p-5 rounded-bb-sm bg-bb-surface/40 border-2 border-bb-border hover:border-bb-lime transition-all flex flex-col justify-between space-y-3 shadow-[3px_3px_0px_0px_#000]">
                <div className="flex items-center gap-3 border-b-2 border-bb-border/50 pb-3">
                  <div className="w-10 h-10 rounded-bb-xs bg-bb-lime/20 border-2 border-black flex items-center justify-center text-xl shrink-0 shadow-[2px_2px_0px_0px_#000]">
                    💳
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-bb-text-primary uppercase tracking-wider font-mono">
                      Allowance & Safe Spend
                    </h4>
                    <span className="text-[10px] text-bb-lime font-mono font-bold">Pacing & Budget Control</span>
                  </div>
                </div>
                <p className="text-xs text-bb-text-secondary leading-relaxed font-sans">
                  Auto-calculates your daily safe spend limit based on your allowance cycle, ensuring your pocket cash stays healthy without running out before month-end.
                </p>
              </div>

              {/* Pillar 2: AI Bro Companion */}
              <div className="p-5 rounded-bb-sm bg-bb-surface/40 border-2 border-bb-border hover:border-bb-violet transition-all flex flex-col justify-between space-y-3 shadow-[3px_3px_0px_0px_#000]">
                <div className="flex items-center gap-3 border-b-2 border-bb-border/50 pb-3">
                  <div className="w-10 h-10 rounded-bb-xs bg-bb-violet/20 border-2 border-black flex items-center justify-center text-xl shrink-0 shadow-[2px_2px_0px_0px_#000]">
                    🤖
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-bb-text-primary uppercase tracking-wider font-mono">
                      AI Bro Companion
                    </h4>
                    <span className="text-[10px] text-bb-violet font-mono font-bold">Real Advice & Roasts</span>
                  </div>
                </div>
                <p className="text-xs text-bb-text-secondary leading-relaxed font-sans">
                  Instant, unfiltered financial sanity checks and advice. Ask AI Bro if you can afford ₹500 coffee, and get real-time reflections tailored to your vibe.
                </p>
              </div>

              {/* Pillar 3: Manifest Saving Goals */}
              <div className="p-5 rounded-bb-sm bg-bb-surface/40 border-2 border-bb-border hover:border-bb-coral transition-all flex flex-col justify-between space-y-3 shadow-[3px_3px_0px_0px_#000]">
                <div className="flex items-center gap-3 border-b-2 border-bb-border/50 pb-3">
                  <div className="w-10 h-10 rounded-bb-xs bg-bb-coral/20 border-2 border-black flex items-center justify-center text-xl shrink-0 shadow-[2px_2px_0px_0px_#000]">
                    🎯
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-bb-text-primary uppercase tracking-wider font-mono">
                      Saving Goals & Manifesting
                    </h4>
                    <span className="text-[10px] text-bb-coral font-mono font-bold">Targeted Deposits</span>
                  </div>
                </div>
                <p className="text-xs text-bb-text-secondary leading-relaxed font-sans">
                  Manifest your dream purchases with dedicated saving goals, quick-deposit shortcuts, progress bars, and completion milestones.
                </p>
              </div>

              {/* Pillar 4: Gamified Mastery & Streaks */}
              <div className="p-5 rounded-bb-sm bg-bb-surface/40 border-2 border-bb-border hover:border-bb-amber transition-all flex flex-col justify-between space-y-3 shadow-[3px_3px_0px_0px_#000]">
                <div className="flex items-center gap-3 border-b-2 border-bb-border/50 pb-3">
                  <div className="w-10 h-10 rounded-bb-xs bg-bb-amber/20 border-2 border-black flex items-center justify-center text-xl shrink-0 shadow-[2px_2px_0px_0px_#000]">
                    🏆
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-bb-text-primary uppercase tracking-wider font-mono">
                      Gamified Level Mastery
                    </h4>
                    <span className="text-[10px] text-bb-amber font-mono font-bold">Ranks, Streaks & Trophies</span>
                  </div>
                </div>
                <p className="text-xs text-bb-text-secondary leading-relaxed font-sans">
                  Earn XP for logging transactions, level up across 6 rank tiers from Bread Beginner to Bread Legend, build login streak flame leagues, and unlock trophy badges.
                </p>
              </div>
            </div>

            {/* Privacy & Architecture Guarantee */}
            <div className="p-5 rounded-bb-sm bg-bb-surface/60 border-2 border-bb-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[3px_3px_0px_0px_#000]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-bb-xs bg-bb-surface border-2 border-black flex items-center justify-center text-xl shrink-0 shadow-[2px_2px_0px_0px_#000]">
                  🔒
                </div>
                <div>
                  <h4 className="text-xs font-black text-bb-text-primary uppercase tracking-wider font-mono flex items-center gap-2">
                    100% Private & Offline-First
                  </h4>
                  <p className="text-xs text-bb-text-secondary mt-0.5 leading-relaxed font-sans">
                    Your financial data never leaves your device. Everything is saved locally in browser storage with zero remote telemetry.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer & Build info */}
            <div className="pt-4 border-t-2 border-bb-border flex flex-col sm:flex-row justify-between items-center gap-3 text-xs font-mono select-none">
              <div className="flex items-center gap-3 text-bb-text-muted">
                <span>BUILD: LOCAL_SECURE</span>
                <span>•</span>
                <span>VERSION: 2.0.26</span>
              </div>
              <a
                href="https://github.com/dat1aryan/Breadbuddy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1 rounded-bb-xs bg-bb-surface border-2 border-black text-bb-text-primary text-xs font-bold font-mono hover:bg-bb-bg transition-colors shadow-[2px_2px_0px_0px_#000]"
              >
                <Github size={14} /> GitHub Repository <ExternalLink size={12} />
              </a>
            </div>
          </div>
        )}
      </Card>

      <ConfirmModal
        isOpen={isImportConfirmOpen}
        onClose={() => {
          setIsImportConfirmOpen(false);
          setPendingFile(null);
        }}
        onConfirm={executeImportJSON}
        title="Restore Backup"
        message="Are you sure you want to overwrite all local data with this backup? This cannot be undone."
        confirmText="Yes, import it"
        cancelText="Cancel"
      />

      <ConfirmModal
        isOpen={isNewCycleConfirmOpen}
        onClose={() => setIsNewCycleConfirmOpen(false)}
        onConfirm={executeNewBudgetCycle}
        title="New budget cycle"
        message="Are you sure you want to start a new budget cycle? This resets this month's budget progress but keeps all transaction history and analytics."
        confirmText="Yes, start new cycle"
        cancelText="Cancel"
      />

      <ConfirmModal
        isOpen={isDeleteLocalConfirmOpen}
        onClose={() => setIsDeleteLocalConfirmOpen(false)}
        onConfirm={executeDeleteLocalData}
        title="Delete My Account"
        message="Are you sure you want to delete your account? This will permanently wipe all local data, including your transactions, goals, streaks, and profile details."
        confirmText="Yes, delete account"
        cancelText="Cancel"
      />
    </div>
  );
}
