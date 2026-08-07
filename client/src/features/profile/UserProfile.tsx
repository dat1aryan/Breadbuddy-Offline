import { useState, useEffect } from 'react';
import { Target, Shield, Check, Edit2, Calendar, GraduationCap, Globe, Sparkles, Trophy, Flame, Award, Lock } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { profileEngine, ProfileData } from '../../lib/profileEngine';
import { preferencesEngine } from '../../lib/preferencesEngine';
import { setAuth } from '../../lib/auth';
import { User as UserType } from '../../lib/types';
import { useProgressionState } from '../../hooks/useProgressionState';
import { validateFinancialInput } from '../../utils/validationUtils';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { savingsEngine, Goal } from '../../lib/savingsEngine';
import { notificationEngine } from '../../lib/notificationEngine';
import { xpEngine } from '../../lib/xpEngine';
import { streakEngine } from '../../lib/streakEngine';
import { achievementEngine } from '../../lib/achievementEngine';
import { formatCurrency } from '../../utils/currencyUtils';

interface UserProfileProps {
  user: UserType;
  onUpdateUser: (updated: UserType) => void;
}

const AVATARS = ['🦊', '🐹', '🐼', '🦁', '🐯', '🐨', '🦄', '🦖', '🐱', '🐶', '🐻', '🦉'];

const PAYMENT_METHODS = ['UPI', 'Cash', 'Debit Card', 'Credit Card', 'Net Banking', 'Other'];

const PERSONALITIES = [
  { id: 'bestie', name: '💅 Bestie' },
  { id: 'professional', name: '💼 Professional' },
  { id: 'coach', name: '🚀 Coach' },
  { id: 'calm', name: '🧘 Calm' },
];

const LEVEL_TIERS = [
  { threshold: 1, label: 'Bread Beginner', emoji: '🥖', nextThreshold: 5 },
  { threshold: 5, label: 'Dough Explorer', emoji: '🍞', nextThreshold: 10 },
  { threshold: 10, label: 'Toast Tactician', emoji: '🔥', nextThreshold: 20 },
  { threshold: 20, label: 'Crust Commander', emoji: '👑', nextThreshold: 35 },
  { threshold: 35, label: 'Bakery Boss', emoji: '🏆', nextThreshold: 50 },
  { threshold: 50, label: 'Bread Legend', emoji: '🌟', nextThreshold: null },
];

const STREAK_TIERS = [
  { target: 3, title: 'Spark', emoji: '⚡' },
  { target: 7, title: 'On Fire', emoji: '🔥' },
  { target: 14, title: 'Unstoppable', emoji: '💥' },
  { target: 30, title: 'Iron Will', emoji: '🛡️' },
  { target: 100, title: 'Century Legend', emoji: '👑' },
];

export function UserProfile({ user, onUpdateUser }: UserProfileProps) {
  const toast = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const progState = useProgressionState(user.id);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editAllowance, setEditAllowance] = useState<string>('0');
  const [editGoal, setEditGoal] = useState('');
  const [editPayments, setEditPayments] = useState<string[]>([]);
  const [editPersonality, setEditPersonality] = useState<'bestie' | 'professional' | 'coach' | 'calm'>('bestie');

  // New optional fields
  const [editBirthday, setEditBirthday] = useState('');
  const [editCollege, setEditCollege] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editCurrencyPreferred, setEditCurrencyPreferred] = useState('');
  const [editShortBio, setEditShortBio] = useState('');
  const [editFavoriteGoal, setEditFavoriteGoal] = useState('');
  const [savedGoals, setSavedGoals] = useState<Goal[]>([]);
  const [editThemePreference, _setEditThemePreference] = useState<'dark' | 'light'>('dark');

  const loadProfile = () => {
    setSavedGoals(savingsEngine.getGoals(user.id).filter((g) => !g.archived));
    const data = profileEngine.getProfile(user.id, user);
    setProfile(data);
    setEditName(user.name || '');
    setEditAvatar(profileEngine.getAvatar(user.id));
    setEditAllowance(data.monthlyAllowance.toString());
    setEditGoal(data.primaryGoal || '');
    setEditPayments(data.preferredPaymentMethods);
    setEditPersonality(data.aiBroPersonality as any);
    setEditBirthday(data.birthday || '');
    setEditCollege(data.college || '');
    setEditCountry(data.country || '');
    setEditCurrencyPreferred(data.currencyPreferred || user.currency || '₹');
    setEditShortBio(data.shortBio || '');
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  const handleCancelEdit = () => {
    loadProfile();
    setIsEditing(false);
  };

  const handleToggleEdit = () => {
    if (isEditing) {
      handleCancelEdit();
    } else {
      loadProfile();
      setIsEditing(true);
    }
  };

  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);

  const handleSave = () => {
    if (!editName.trim()) {
      toast.error('Preferred Name cannot be empty!');
      return;
    }
    const validation = validateFinancialInput(editAllowance);
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid monthly allowance.');
      return;
    }

    // Always ask Yes/No confirmation when saving profile changes
    setIsSaveConfirmOpen(true);
  };

  const executeSave = () => {
    try {
      const validation = validateFinancialInput(editAllowance);
      const parsedAllowance = validation.isValid ? validation.parsedValue : user.monthlyAllowance;

      // 1. Save in local storage user object
      const updatedUser: UserType = {
        ...user,
        name: editName.trim(),
        monthlyAllowance: parsedAllowance,
        currency: editCurrencyPreferred || user.currency || '₹', // Sync currency immediately
      };
      setAuth(localStorage.getItem('breadbuddy_token') || '', updatedUser);

      // 2. Save in engines
      const targetGoal = editFavoriteGoal || editGoal;
      profileEngine.setAvatar(user.id, editAvatar);
      profileEngine.saveProfileFields(user.id, {
        primaryGoal: targetGoal,
        favoriteGoal: targetGoal,
        preferredPaymentMethods: editPayments,
        birthday: editBirthday,
        college: editCollege,
        country: editCountry,
        currencyPreferred: editCurrencyPreferred,
        shortBio: editShortBio,
      });
      preferencesEngine.savePreferences(user.id, {
        aiBroPersonality: editPersonality,
        themePreference: editThemePreference,
      });

      // 3. Propagate changes back to parent and dispatch window events
      if (parsedAllowance !== user.monthlyAllowance) {
        notificationEngine.addNotification(user.id, {
          title: 'Allowance Updated 💰',
          message: `Monthly allowance set to ${updatedUser.currency}${parsedAllowance.toLocaleString()}. Safe spend rate updated!`,
          emoji: '💰',
        });
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('breadbuddy-settings-updated', { detail: { userId: user.id } }));
        window.dispatchEvent(new CustomEvent('finance-updated', { detail: { userId: user.id } }));
        window.dispatchEvent(new CustomEvent('notifications-updated', { detail: { userId: user.id } }));
        window.dispatchEvent(new CustomEvent('profile-updated', { detail: { userId: user.id } }));
      }

      onUpdateUser(updatedUser);
      loadProfile();
      setIsEditing(false);
      toast.success('Profile changes applied immediately! ✨');
    } catch (err) {
      toast.error('Failed to update profile settings.');
    }
  };

  const handlePaymentToggle = (pm: string) => {
    setEditPayments((prev) =>
      prev.includes(pm) ? prev.filter((p) => p !== pm) : [...prev, pm]
    );
  };

  if (!profile) return null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      {/* Profile Header */}
      <Card accent="violet" glassy className="p-6 flex flex-col md:flex-row justify-between items-center gap-6 select-none relative overflow-hidden">
        <div className="flex items-center gap-5 text-center md:text-left flex-col md:flex-row w-full md:w-auto">
          <div className="w-20 h-20 rounded-bb-sm bg-bb-surface border-2 border-bb-border flex items-center justify-center text-4xl shadow-[4px_4px_0px_#000]">
            {profile.avatar}
          </div>
          <div className="space-y-1">
            <div className="flex flex-col md:flex-row items-center gap-2">
              <h2 className="text-xl md:text-2xl font-display font-black text-bb-text-primary capitalize leading-tight">
                {profile.name || 'bestie'}
              </h2>
              {profile.college && (
                <span className="px-2 py-0.5 rounded-bb-xs bg-bb-surface border-2 border-bb-border text-[9px] text-bb-text-muted font-bold font-mono uppercase tracking-wide">
                  {profile.college}
                </span>
              )}
            </div>
            {profile.shortBio && (
              <p className="text-xs text-bb-text-secondary italic max-w-sm mt-0.5">
                "{profile.shortBio}"
              </p>
            )}
            <p className="text-[10px] text-bb-text-muted font-mono font-bold pt-1">
              Joined {profile.joinDate}
            </p>
            {/* XP bar */}
            <div className="mt-2.5 h-1.5 w-48 bg-bb-border border-2 border-bb-border overflow-hidden rounded-bb-xs">
              <div
                className="bg-bb-lime h-full transition-all duration-300"
                style={{ width: `${progState.progressPercentage}%` }}
              />
            </div>
            <p className="text-[9px] text-bb-text-muted font-mono mt-1">
              {progState.currentLevelXp} / {progState.xpNeededForNext} XP to next level
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center md:items-end gap-1.5 self-center md:self-auto">
          <span className="text-[9px] text-bb-text-muted font-mono font-bold uppercase tracking-wider">Profile Completion</span>
          <span className="text-2xl font-black text-bb-violet tracking-tight">{profile.completionPercentage}%</span>
          <Button variant="secondary" size="sm" onClick={handleToggleEdit} className="mt-2">
            <Edit2 size={12} className="mr-1" /> {isEditing ? 'Cancel' : 'Edit Profile'}
          </Button>
        </div>
      </Card>

      {/* Editing Panel */}
      {isEditing ? (
        <Card accent="none" glassy className="p-6 space-y-6">
          <div>
            <h3 className="text-xs font-black text-bb-text-primary uppercase tracking-wider font-mono">
              Edit Companion Settings
            </h3>
            <p className="text-[10px] text-bb-text-muted mt-1">Fill out fields below to personalize your profile details.</p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="text"
                label="Preferred Name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />

              <Input
                type="number"
                label="Monthly Allowance / Income"
                value={editAllowance}
                onChange={(e) => setEditAllowance(e.target.value)}
                required
              />
            </div>

            {/* Avatar picker */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-bb-text-muted font-mono">
                Select Avatar Emoji
              </label>
              <div className="grid grid-cols-6 gap-2">
                {AVATARS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setEditAvatar(av)}
                    className={`text-2xl p-2 rounded-bb-xs border-2 transition-none ${
                      editAvatar === av
                        ? 'border-black bg-bb-violet text-bb-violet-fg'
                        : 'border-bb-border bg-bb-surface hover:border-bb-violet'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            {/* Short Bio */}
            <Input
              type="text"
              label="Short Bio"
              value={editShortBio}
              onChange={(e) => setEditShortBio(e.target.value)}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Birthday */}
              <Input
                type="date"
                label="Birthday"
                value={editBirthday}
                onChange={(e) => setEditBirthday(e.target.value)}
              />

              {/* College / University / School */}
              <Input
                type="text"
                label="College / University / School"
                value={editCollege}
                onChange={(e) => setEditCollege(e.target.value)}
              />

              {/* Country */}
              <Input
                type="text"
                label="Country"
                value={editCountry}
                onChange={(e) => setEditCountry(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Currency */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-bb-text-muted font-mono">
                  Preferred Currency
                </label>
                <select
                  value={editCurrencyPreferred}
                  onChange={(e) => setEditCurrencyPreferred(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-bb-sm bg-bb-surface border-2 border-bb-border text-xs text-bb-text-primary outline-none cursor-pointer font-sans"
                >
                  <option value="₹" className="bg-bb-surface">₹ INR</option>
                  <option value="$" className="bg-bb-surface">$ USD</option>
                  <option value="€" className="bg-bb-surface">€ EUR</option>
                  <option value="£" className="bg-bb-surface">£ GBP</option>
                  <option value="¥" className="bg-bb-surface">¥ JPY</option>
                  <option value="₩" className="bg-bb-surface">₩ KRW</option>
                </select>
              </div>

              {/* Current Goal — linked to savings goals */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-bb-text-muted font-mono">
                  Current Goal
                </label>
                {savedGoals.length > 0 ? (
                  <select
                    value={editFavoriteGoal}
                    onChange={(e) => setEditFavoriteGoal(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-bb-sm bg-bb-surface border-2 border-bb-border text-xs text-bb-text-primary outline-none cursor-pointer font-sans focus:border-bb-violet transition-all"
                  >
                    <option value="" className="bg-bb-surface">— Select a goal —</option>
                    {savedGoals.map((g) => (
                      <option key={g.id} value={g.title} className="bg-bb-surface">
                        {g.emoji} {g.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value="N/A"
                    disabled
                    readOnly
                    className="w-full px-4 py-2.5 rounded-bb-sm bg-bb-surface/30 border-2 border-bb-border text-xs text-bb-text-muted outline-none cursor-not-allowed font-sans opacity-60 select-none"
                  />
                )}
                <p className="text-[9px] text-bb-text-muted font-semibold">
                  {savedGoals.length > 0
                    ? 'Linked to your active savings goals. Add goals from the Goals section.'
                    : 'No active goals yet. Create one in the Goals section first!'}
                </p>
              </div>
            </div>



            {/* Payment methods */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-bb-text-muted font-mono">
                Preferred Payment Channels
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((pm) => {
                  const isSelected = editPayments.includes(pm);
                  return (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => handlePaymentToggle(pm)}
                      className={`p-2 rounded-bb-xs border-2 flex items-center justify-between transition-none ${
                        isSelected
                          ? 'border-black bg-bb-violet text-bb-violet-fg'
                          : 'border-bb-border bg-bb-surface hover:border-bb-violet text-bb-text-primary'
                      }`}
                    >
                      <span className="text-[10px] font-semibold">{pm}</span>
                      {isSelected && <Check size={10} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Personality selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-bb-text-muted font-mono">
                AI Companion Personality
              </label>
              <select
                value={editPersonality}
                onChange={(e) => setEditPersonality(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-bb-sm bg-bb-surface border-2 border-bb-border text-xs text-bb-text-primary outline-none cursor-pointer font-sans"
              >
                {PERSONALITIES.map((p) => (
                  <option key={p.id} value={p.id} className="bg-bb-surface">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Save & Cancel action buttons */}
            <div className="flex items-center gap-3 pt-2">
              <Button variant="primary" onClick={handleSave} className="flex-1">
                Save Changes
              </Button>
              <Button variant="secondary" onClick={handleCancelEdit} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Top Grid: Personal Details & Your Style */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Details card */}
            <Card accent="none" glassy className="p-5 flex flex-col justify-between h-full">
              <h3 className="text-xs font-bold text-bb-text-primary uppercase tracking-wider font-mono flex items-center gap-2 mb-2">
                <Sparkles className="text-bb-violet" size={14} /> Personal Details
              </h3>

              <div className="flex-1 flex flex-col justify-between text-xs leading-normal select-none font-sans space-y-2">
                <div className="flex justify-between border-b-2 border-bb-border pb-2">
                  <span className="text-bb-text-muted font-semibold flex items-center gap-1.5"><Globe size={12} /> Country</span>
                  <span className="font-bold text-bb-text-primary">{profile.country || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b-2 border-bb-border pb-2">
                  <span className="text-bb-text-muted font-semibold flex items-center gap-1.5"><Calendar size={12} /> Birthday</span>
                  <span className="font-bold text-bb-text-primary">{profile.birthday || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b-2 border-bb-border pb-2">
                  <span className="text-bb-text-muted font-semibold flex items-center gap-1.5"><GraduationCap size={12} /> College / School</span>
                  <span className="font-bold text-bb-text-primary truncate max-w-[150px]">{profile.college || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b-2 border-bb-border pb-2">
                  <span className="text-bb-text-muted font-semibold flex items-center gap-1.5"><Sparkles size={12} /> Short Bio</span>
                  <span className="font-bold text-bb-text-primary truncate max-w-[150px] italic">{profile.shortBio ? `"${profile.shortBio}"` : 'N/A'}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-bb-text-muted font-semibold flex items-center gap-1.5"><Calendar size={12} /> Member Since</span>
                  <span className="font-bold text-bb-text-primary font-mono text-[11px]">{profile.joinDate}</span>
                </div>
              </div>
            </Card>

            {/* Style stat card */}
            <Card accent="none" glassy className="p-5 flex flex-col justify-between h-full">
              <h3 className="text-xs font-bold text-bb-text-primary uppercase tracking-wider font-mono flex items-center gap-2 mb-2">
                <Shield className="text-bb-violet" size={14} /> Your Style
              </h3>

              <div className="flex-1 flex flex-col justify-between text-xs leading-normal select-none font-sans space-y-2">
                <div className="flex justify-between border-b-2 border-bb-border pb-2">
                  <span className="text-bb-text-muted font-semibold">Monthly Budget</span>
                  <span className="font-bold text-bb-text-primary font-numeric">{formatCurrency(profile.monthlyAllowance, profile.currencyPreferred || user.currency || '₹', false)}</span>
                </div>
                <div className="flex justify-between border-b-2 border-bb-border pb-2">
                  <span className="text-bb-text-muted font-semibold">Preferred Currency</span>
                  <span className="font-bold text-bb-text-primary font-mono">{profile.currencyPreferred || user.currency || '₹'}</span>
                </div>
                <div className="flex justify-between border-b-2 border-bb-border pb-2">
                  <span className="text-bb-text-muted font-semibold">Current Goal</span>
                  <span className="font-bold text-bb-text-primary flex items-center gap-1 capitalize">
                    <Target size={12} className="text-bb-violet" />
                    {profile.favoriteGoal || profile.primaryGoal || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between border-b-2 border-bb-border pb-2">
                  <span className="text-bb-text-muted font-semibold">Active Payments</span>
                  <span className="font-bold text-bb-text-primary max-w-[150px] truncate">{profile.preferredPaymentMethods.join(', ') || 'None'}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-bb-text-muted font-semibold">Companion Personality</span>
                  <span className="font-bold text-bb-text-primary capitalize">{profile.aiBroPersonality}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Duolingo-Inspired Gamification & Achievements Pathway */}
          {(() => {
            const xpState = xpEngine.getXPState(user.id);
            const streakState = streakEngine.getStreak(user.id);
            achievementEngine.checkAndUnlock(user.id);
            const achievements = achievementEngine.getAchievements(user.id);

            return (
              <div className="space-y-6 pt-4 select-none">
                {/* Header Title */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-bb-border pb-3 gap-2">
                  <div>
                    <h3 className="text-sm font-black text-bb-text-primary uppercase tracking-wider font-mono flex items-center gap-2">
                      <Trophy className="text-bb-lime fill-bb-lime/20" size={18} /> Achievements & Mastery Pathway
                    </h3>
                    <p className="text-[11px] text-bb-text-muted mt-0.5 font-sans font-medium">
                      Track your level progression, streak flame tiers, and unlocked trophies.
                    </p>
                  </div>
                </div>

                {/* 1. Level Mastery Path (Duolingo Style) */}
                <Card accent="violet" glassy className="p-5 space-y-5 border-2 border-bb-border hover:border-bb-violet transition-colors">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b-2 border-bb-border/50 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl shrink-0 leading-none select-none">⚡</span>
                      <div>
                        <h4 className="text-xs font-black text-bb-text-primary uppercase tracking-wider font-mono flex items-center gap-2">
                          Level Progression Path
                        </h4>
                        <p className="text-[10px] text-bb-text-muted font-mono font-bold mt-0.5">
                          <span className="text-bb-lime font-black">{xpState.currentLevelXp}</span> / {xpState.xpNeededForNext} XP to next level
                        </p>
                      </div>
                    </div>

                    <span className="px-3 py-1 rounded-bb-xs bg-bb-violet text-black border-2 border-black font-mono text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_#000]">
                      {LEVEL_TIERS.filter(t => xpState.level >= t.threshold).length} / {LEVEL_TIERS.length} Unlocked
                    </span>
                  </div>

                  {/* Ranks Milestones Grid */}
                  <div className="overflow-x-auto pb-2 flex sm:grid sm:grid-cols-3 md:grid-cols-6 gap-3 custom-scrollbar">
                    {LEVEL_TIERS.map((tier) => {
                      const isUnlocked = xpState.level >= tier.threshold;
                      const isCurrent = xpState.level >= tier.threshold && (tier.nextThreshold ? xpState.level < tier.nextThreshold : true);
                      return (
                        <div
                          key={tier.threshold}
                          className={`p-3.5 rounded-bb-xs border-2 text-center flex flex-col items-center justify-between gap-2.5 transition-all shrink-0 w-32 sm:w-auto ${
                            isCurrent
                              ? 'border-black bg-bb-lime text-black shadow-[3px_3px_0px_0px_#000]'
                              : isUnlocked
                              ? 'border-bb-violet/80 bg-bb-violet/15 text-bb-text-primary shadow-[2px_2px_0px_0px_rgba(168,85,247,0.3)]'
                              : 'border-bb-border bg-bb-surface/40 opacity-50'
                          }`}
                        >
                          <div className="text-2xl drop-shadow-md">{tier.emoji}</div>
                          <div>
                            <div className={`text-[10px] font-black uppercase leading-tight font-mono ${
                              isCurrent ? 'text-black' : 'text-bb-text-primary'
                            }`}>{tier.label}</div>
                            <div className={`text-[9px] font-bold mt-0.5 font-mono ${
                              isCurrent ? 'text-black/80' : 'text-bb-text-muted'
                            }`}>Lvl {tier.threshold}+</div>
                          </div>
                          {isCurrent ? (
                            <span className="px-2 py-0.5 rounded-bb-xs bg-black text-bb-lime text-[8px] font-black uppercase font-mono shadow-[1px_1px_0px_0px_#ccff00]">
                              Active
                            </span>
                          ) : isUnlocked ? (
                            <span className="text-[9px] font-black text-bb-lime font-mono">✓ Done</span>
                          ) : (
                            <Lock size={12} className="text-bb-text-muted" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* 2. Streak Flame Tiers (Duolingo Flame League) */}
                <Card accent="coral" glassy className="p-5 space-y-5 border-2 border-bb-border hover:border-bb-coral transition-colors">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b-2 border-bb-border/50 pb-3">
                    <h4 className="text-xs font-black text-bb-text-primary uppercase tracking-wider font-mono flex items-center gap-2">
                      <Flame className="text-bb-coral fill-bb-coral/30 animate-pulse" size={16} /> Streak Flame League
                    </h4>
                    <div className="px-3 py-1 rounded-bb-xs bg-bb-coral text-white border-2 border-black font-mono text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_#000] flex items-center gap-1.5">
                      <Flame size={12} className="fill-white shrink-0" />
                      <span>Current: {streakState.currentStreak} {streakState.currentStreak === 1 ? 'Day' : 'Days'}</span>
                      <span className="opacity-60">•</span>
                      <span>Best: {streakState.longestStreak} {streakState.longestStreak === 1 ? 'Day' : 'Days'}</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto pb-2 flex sm:grid sm:grid-cols-5 gap-3 custom-scrollbar">
                    {STREAK_TIERS.map((st) => {
                      const isUnlocked = streakState.longestStreak >= st.target;
                      const currentProgress = Math.min(st.target, streakState.currentStreak);
                      return (
                        <div
                          key={st.target}
                          className={`p-3.5 rounded-bb-xs border-2 text-center flex flex-col items-center justify-between gap-2 transition-all shrink-0 w-32 sm:w-auto ${
                            isUnlocked
                              ? 'border-black bg-bb-coral/20 text-bb-text-primary shadow-[3px_3px_0px_0px_rgba(255,85,85,0.4)]'
                              : 'border-bb-border bg-bb-surface/40 opacity-60'
                          }`}
                        >
                          <span className="text-2xl drop-shadow-md">{st.emoji}</span>
                          <div>
                            <div className="text-[10px] font-black text-bb-text-primary leading-tight font-mono uppercase">{st.title}</div>
                            <div className="text-[9px] text-bb-text-muted font-mono font-bold mt-0.5">{st.target} Days</div>
                          </div>

                          <div className="w-full bg-bb-bg border border-black h-2 rounded-full overflow-hidden mt-1 p-0.5">
                            <div
                              className="h-full bg-gradient-to-r from-bb-coral to-bb-amber rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.round((currentProgress / st.target) * 100))}%` }}
                            />
                          </div>

                          {isUnlocked ? (
                            <span className="px-1.5 py-0.5 rounded-bb-xs bg-bb-coral text-white border border-black text-[8px] font-black uppercase font-mono shadow-[1px_1px_0px_0px_#000]">
                              Unlocked 🔥
                            </span>
                          ) : (
                            <span className="text-[8px] font-bold text-bb-text-muted font-mono">{currentProgress}/{st.target}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* 3. Trophy Cabinet (Achievements Grid) */}
                <Card accent="lime" glassy className="p-5 space-y-5 border-2 border-bb-border hover:border-bb-lime transition-colors">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b-2 border-bb-border/50 pb-3">
                    <h4 className="text-xs font-black text-bb-text-primary uppercase tracking-wider font-mono flex items-center gap-2">
                      <Award className="text-bb-lime" size={16} /> Trophy Cabinet & Badges
                    </h4>
                    <span className="px-3 py-1 rounded-bb-xs bg-bb-lime text-black border-2 border-black font-mono text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_#000]">
                      {achievements.filter(a => a.unlocked).length} / {achievements.length} Unlocked
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1.5 custom-scrollbar">
                    {achievements.map((ach) => (
                      <div
                        key={ach.id}
                        className={`p-4 rounded-bb-xs border-2 flex items-start gap-3.5 transition-all ${
                          ach.unlocked
                            ? 'border-bb-lime bg-bb-violet/25 shadow-[3px_3px_0px_0px_#000]'
                            : 'border-bb-border bg-bb-surface/40 opacity-60 hover:border-bb-violet/50'
                        }`}
                      >
                        <div className={`text-2xl p-2.5 rounded-bb-xs border-2 shrink-0 ${
                          ach.unlocked ? 'border-black bg-bb-violet/20 text-bb-text-primary shadow-[2px_2px_0px_#000]' : 'border-bb-border bg-bb-surface text-bb-text-muted grayscale'
                        }`}>
                          {ach.emoji}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1 font-mono">
                            <h5 className="text-xs font-black text-bb-text-primary uppercase leading-snug break-words">{ach.title}</h5>
                            {ach.unlocked && (
                              <span className="px-2 py-0.5 rounded-bb-xs bg-bb-lime text-black border border-black text-[8px] font-black shrink-0 shadow-[1px_1px_0px_0px_#000]">
                                ✓ UNLOCKED
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-bb-text-muted leading-relaxed font-sans">{ach.description}</p>

                          <div className="mt-3 space-y-1">
                            <div className="w-full bg-bb-bg border border-black h-2 rounded-full overflow-hidden p-0.5">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  ach.unlocked ? 'bg-bb-lime' : 'bg-bb-violet'
                                }`}
                                style={{ width: `${Math.min(100, Math.round((ach.progress / Math.max(ach.target, 1)) * 100))}%` }}
                              />
                            </div>
                            <div className="text-[9px] font-bold font-mono text-bb-text-muted text-right">
                              {ach.unlocked ? '100% Completed' : `${ach.progress} / ${ach.target}`}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            );
          })()}
        </div>
      )}

      <ConfirmModal
        isOpen={isSaveConfirmOpen}
        onClose={() => setIsSaveConfirmOpen(false)}
        onConfirm={() => {
          setIsSaveConfirmOpen(false);
          executeSave();
        }}
        title="Apply Profile Changes Immediately?"
        message="Are you sure you want to save these profile changes? All updated settings will be applied immediately across BreadBuddy."
        confirmText="Yes"
        cancelText="No"
        variant="primary"
      />
    </div>
  );
}
