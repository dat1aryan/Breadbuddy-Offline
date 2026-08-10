import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Lock, Check } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { getUser, setAuth } from '../../lib/auth';
import { onboardingEngine } from '../../lib/onboardingEngine';
import { preferencesEngine } from '../../lib/preferencesEngine';
import { profileEngine } from '../../lib/profileEngine';
import { savingsEngine } from '../../lib/savingsEngine';
import { formatCurrency } from '../../utils/currencyUtils';
import { api } from '../../lib/api';

const AVATARS = ['🦊', '🐹', '🐼', '🦁', '🐯', '🐨', '🦄', '🦖', '🐱', '🐶', '🐻', '🦉'];

const CURRENCIES = [
  { symbol: '₹', name: 'Indian Rupee', code: 'INR', flag: '🇮🇳' },
  { symbol: '$', name: 'US Dollar', code: 'USD', flag: '🇺🇸' },
  { symbol: '€', name: 'Euro', code: 'EUR', flag: '🇪🇺' },
  { symbol: '£', name: 'British Pound', code: 'GBP', flag: '🇬🇧' },
  { symbol: '¥', name: 'Japanese Yen', code: 'JPY', flag: '🇯🇵' },
  { symbol: '₩', name: 'Korean Won', code: 'KRW', flag: '🇰🇷' },
];

const CURRENCY_INCOME_PRESETS: Record<string, { label: string; value: number }[]> = {
  '₹': [
    { label: '₹2,000', value: 2000 },
    { label: '₹5,000', value: 5000 },
    { label: '₹10,000', value: 10000 },
    { label: '₹15,000+', value: 15000 },
  ],
  '$': [
    { label: '$100', value: 100 },
    { label: '$250', value: 250 },
    { label: '$500', value: 500 },
    { label: '$1,000+', value: 1000 },
  ],
  '€': [
    { label: '€100', value: 100 },
    { label: '€250', value: 250 },
    { label: '€500', value: 500 },
    { label: '€1,000+', value: 1000 },
  ],
  '£': [
    { label: '£80', value: 80 },
    { label: '£200', value: 200 },
    { label: '£400', value: 400 },
    { label: '£800+', value: 800 },
  ],
  '¥': [
    { label: '¥15,000', value: 15000 },
    { label: '¥30,000', value: 30000 },
    { label: '¥60,000', value: 60000 },
    { label: '¥120,000+', value: 120000 },
  ],
  '₩': [
    { label: '₩150,000', value: 150000 },
    { label: '₩300,000', value: 300000 },
    { label: '₩600,000', value: 600000 },
    { label: '₩1,200,000+', value: 1200000 },
  ],
};

const CURRENCY_TARGET_PRESETS: Record<string, number[]> = {
  '₹': [5000, 10000, 25000, 50000, 100000],
  '$': [100, 250, 500, 1000, 2500],
  '€': [100, 250, 500, 1000, 2500],
  '£': [80, 200, 400, 800, 2000],
  '¥': [15000, 30000, 60000, 150000, 300000],
  '₩': [150000, 300000, 600000, 1500000, 3000000],
};

const GOALS_PRESETS = [
  { label: 'Laptop', value: 'Laptop', emoji: '💻' },
  { label: 'Phone', value: 'Phone', emoji: '📱' },
  { label: 'Gaming Setup', value: 'Gaming Setup', emoji: '🎮' },
  { label: 'Travel', value: 'Travel', emoji: '✈️' },
  { label: 'Education', value: 'Education', emoji: '🎓' },
  { label: 'Emergency Fund', value: 'Emergency Fund', emoji: '💰' },
];

const PAYMENT_METHODS = ['UPI', 'Cash', 'Debit Card', 'Credit Card', 'Net Banking', 'Other'];

const PERSONALITIES = [
  {
    id: 'bestie',
    emoji: '💅',
    name: 'Bestie',
    desc: 'Friendly, Gen Z, Supportive, and absolute vibe-check energy.',
  },
  {
    id: 'professional',
    emoji: '💼',
    name: 'Professional',
    desc: 'Minimal, Analytical, Direct, and focus-driven advice.',
  },
  {
    id: 'coach',
    emoji: '🚀',
    name: 'Coach',
    desc: 'Motivational, Disciplined, Goal-focused, and high-energy encouragement.',
  },
  {
    id: 'calm',
    emoji: '🧘',
    name: 'Calm',
    desc: 'Mindful, Gentle, Encouraging, and peaceful financial support.',
  },
];

export default function Onboarding() {
  const [user, setUser] = useState<any>(null);
  const toast = useToast();
  const navigate = useNavigate();
  const customInputRef = useRef<HTMLInputElement>(null);

  // Onboarding step (Step 0 to 12 -> 0-indexed)
  // Step 0: Welcome screen
  // Step 1: Name and avatar (compulsory)
  // Step 2: Country (compulsory)
  // Step 3: Birthday (compulsory)
  // Step 4: College / University / School (compulsory)
  // Step 5: Short Bio (OPTIONAL - with Skip button)
  // Step 6: Currency (compulsory)
  // Step 7: Monthly allowance (compulsory)
  // Step 8: Primary goal (compulsory)
  // Step 9: Target amount (compulsory)
  // Step 10: Payment methods (compulsory)
  // Step 11: AI personality (compulsory)
  // Step 12: Summary breakdown
  const [step, setStep] = useState(0);

  // Onboarding variables
  const [preferredName, setPreferredName] = useState('');
  const [avatar, setAvatar] = useState('🦊');
  const [country, setCountry] = useState('');
  const [birthday, setBirthday] = useState('');
  const [college, setCollege] = useState('');
  const [shortBio, setShortBio] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('₹');
  const [monthlyIncome, setMonthlyIncome] = useState<string>('5000');
  const [incomeMode, setIncomeMode] = useState<'preset' | 'custom'>('preset');
  const [primaryGoal, setPrimaryGoal] = useState('');
  const [primaryGoalEmoji, setPrimaryGoalEmoji] = useState('🎯');
  const [customGoalName, setCustomGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState<string>('10000');
  const [targetMode, setTargetMode] = useState<'preset' | 'custom'>('preset');
  const targetCustomRef = useRef<HTMLInputElement>(null);
  const [preferredPayments, setPreferredPayments] = useState<string[]>([]);
  const [aiPersonality, setAiPersonality] = useState<'bestie' | 'professional' | 'coach' | 'calm'>('bestie');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const incomePresets = CURRENCY_INCOME_PRESETS[selectedCurrency] || CURRENCY_INCOME_PRESETS['₹'];
  const targetPresets = CURRENCY_TARGET_PRESETS[selectedCurrency] || CURRENCY_TARGET_PRESETS['₹'];

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      toast.error('Please sign in first, bestie! 🫠');
      navigate('/login');
      return;
    }
    setUser(currentUser);
    setPreferredName(currentUser.name || '');

    // Resume progress if exists
    const savedStep = onboardingEngine.getResumeStep(currentUser.id);
    if (savedStep > 0 && savedStep < 12) {
      setStep(savedStep);
    }
  }, [navigate]);

  // Save progress step
  useEffect(() => {
    if (user && step > 0 && step < 12) {
      onboardingEngine.saveResumeStep(user.id, step);
    }
  }, [step, user]);

  const handleCurrencySelect = (sym: string) => {
    setSelectedCurrency(sym);
    const incPresets = CURRENCY_INCOME_PRESETS[sym] || CURRENCY_INCOME_PRESETS['₹'];
    const tgtPresets = CURRENCY_TARGET_PRESETS[sym] || CURRENCY_TARGET_PRESETS['₹'];
    setMonthlyIncome(incPresets[1].value.toString());
    setTargetAmount(tgtPresets[1].toString());
    setIncomeMode('preset');
    setTargetMode('preset');
  };

  const handleNext = () => {
    if (step === 1 && !preferredName.trim()) {
      toast.error('Please tell us your preferred name!');
      return;
    }
    if (step === 2 && !country.trim()) {
      toast.error('Please enter your country!');
      return;
    }
    if (step === 3 && !birthday.trim()) {
      toast.error('Please select your date of birth!');
      return;
    }
    if (step === 4 && !college.trim()) {
      toast.error('Please enter your college, university, or school!');
      return;
    }
    // Step 5: Short Bio is optional!
    if (step === 6 && !selectedCurrency) {
      toast.error('Please pick a currency!');
      return;
    }
    if (step === 7 && (monthlyIncome === '' || Number(monthlyIncome) <= 0)) {
      toast.error('Please enter a valid monthly allowance!');
      return;
    }
    if (step === 8 && !primaryGoal && !customGoalName.trim()) {
      toast.error('Please select or specify what you are saving for!');
      return;
    }
    if (step === 9) {
      const amt = Number(targetAmount);
      if (targetAmount === '' || isNaN(amt) || amt <= 0) {
        toast.error('Please enter a valid target amount greater than zero!');
        return;
      }
      if (amt > 1000000000) {
        toast.error('Please set a realistic target amount!');
        return;
      }
    }
    if (step === 10 && preferredPayments.length === 0) {
      toast.error('Please select at least one preferred payment method!');
      return;
    }

    if (step < 12) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handlePaymentToggle = (pm: string) => {
    setPreferredPayments((prev) =>
      prev.includes(pm) ? prev.filter((p) => p !== pm) : [...prev, pm]
    );
  };

  const handleComplete = () => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    try {
      // 1. Update user identity info in local storage user object
      const updatedUser = {
        ...user,
        name: preferredName,
        monthlyAllowance: Number(monthlyIncome),
        currency: selectedCurrency,
        isOnboarded: true,
      };
      setAuth(localStorage.getItem('breadbuddy_token') || '', updatedUser);

      // Sync onboarding status to server
      api.updateProfile({
        name: preferredName,
        monthlyAllowance: Number(monthlyIncome),
        currency: selectedCurrency,
        isOnboarded: true,
      }).catch(() => {});

      // 2. Save profile settings and preferences locally
      const initialGoal = primaryGoal === 'custom' ? customGoalName : primaryGoal;
      profileEngine.setAvatar(user.id, avatar);
      profileEngine.saveProfileFields(user.id, {
        primaryGoal: initialGoal,
        favoriteGoal: initialGoal,
        preferredPaymentMethods: preferredPayments,
        currencyPreferred: selectedCurrency,
        birthday,
        college,
        country,
        shortBio,
      });
      preferencesEngine.savePreferences(user.id, {
        aiBroPersonality: aiPersonality,
      });

      // 3. Create the initial savings goal silently (skip achievement popups during transition)
      const finalGoalName = primaryGoal === 'custom' ? customGoalName : primaryGoal;
      const finalGoalEmoji = primaryGoal === 'custom' ? '✨' : primaryGoalEmoji;
      savingsEngine.createGoal(user.id, finalGoalName, finalGoalEmoji, Number(targetAmount), null, true);

      // 4. Mark onboarding as completed
      onboardingEngine.setCompleted(user.id, true);

      // Seamless redirect to dashboard without intermediate toast or popup flashes
      window.location.replace('/dashboard');
    } catch (err) {
      toast.error('Error setting up your profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center py-10 px-4 select-none">
      <Card accent="violet" className="w-full max-w-xl p-8 flex flex-col justify-between min-h-[540px]">
        {/* Step progress dots (13 steps: 0 through 12) */}
        <div className="flex items-center gap-1 mb-6">
          {Array.from({ length: 13 }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-bb-xs transition-all duration-300 ${
                i <= step ? 'bg-bb-violet flex-1' : 'bg-bb-border w-2'
              }`}
            />
          ))}
        </div>

        {/* Form Screens */}
        <div className="flex-1 flex flex-col justify-center py-4">
          <AnimatePresence mode="wait">
            {/* Step 0: Welcome Screen */}
            {step === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4 text-center"
              >
                <span className="text-5xl block animate-float">🍞</span>
                <h1 className="text-2xl font-black text-bb-text-primary leading-tight">
                  Welcome to BreadBuddy
                </h1>
                <p className="text-xs text-bb-text-muted font-mono uppercase tracking-widest select-none">
                  your money's bestie
                </p>
              </motion.div>
            )}

            {/* Step 1: Name and Avatar */}
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <h2 className="text-lg font-black text-bb-text-primary">What should we call you?</h2>
                  <p className="text-xs text-bb-text-muted">Pick a preferred name and avatar for your profile.</p>
                </div>

                <div className="space-y-4">
                  <Input
                    type="text"
                    placeholder="Enter preferred name"
                    value={preferredName}
                    onChange={(e) => setPreferredName(e.target.value)}
                    required
                  />

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-bb-text-muted font-mono">
                      Avatar Preview: <span className="text-lg ml-1">{avatar}</span>
                    </label>
                    <div className="grid grid-cols-6 gap-2">
                      {AVATARS.map((av) => (
                        <button
                          key={av}
                          type="button"
                          onClick={() => setAvatar(av)}
                          className={`text-2xl p-2 rounded-bb-xs border-2 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bb-violet cursor-pointer ${
                            avatar === av
                              ? 'border-bb-violet bg-bb-violet text-bb-violet-fg scale-105'
                              : 'border-bb-border bg-bb-surface text-bb-text-primary hover:border-bb-violet'
                          }`}
                        >
                          {av}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Country (Compulsory) */}
            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <h2 className="text-lg font-black text-bb-text-primary">Where are you based?</h2>
                  <p className="text-xs text-bb-text-muted">Select your home region for local money vibes.</p>
                </div>

                <Input
                  type="text"
                  label="Country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  required
                />
              </motion.div>
            )}

            {/* Step 3: Birthday (Compulsory) */}
            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <h2 className="text-lg font-black text-bb-text-primary">When's your birthday?</h2>
                  <p className="text-xs text-bb-text-muted">Lock in your date so we can celebrate you.</p>
                </div>

                <Input
                  type="date"
                  label="Date of Birth"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  required
                />
              </motion.div>
            )}

            {/* Step 4: College / University / School (Compulsory) */}
            {step === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <h2 className="text-lg font-black text-bb-text-primary">Where do you study?</h2>
                  <p className="text-xs text-bb-text-muted">Tell us your campus for student-tailored goals.</p>
                </div>

                <Input
                  type="text"
                  label="College / University / School"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  required
                />
              </motion.div>
            )}

            {/* Step 5: Short Bio (OPTIONAL - Skip available) */}
            {step === 5 && (
              <motion.div
                key="step-5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-black text-bb-text-primary">Write a short bio</h2>
                    <span className="text-[10px] font-mono font-bold text-bb-violet uppercase tracking-wider bg-bb-violet/10 px-2 py-0.5 rounded-bb-xs border border-bb-violet/30">
                      Optional
                    </span>
                  </div>
                  <p className="text-xs text-bb-text-muted">Share a quick motto about your main vibe.</p>
                </div>

                <Input
                  type="text"
                  label="Short Bio"
                  value={shortBio}
                  onChange={(e) => setShortBio(e.target.value)}
                />

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleNext}
                    className="text-xs font-bold text-bb-text-muted hover:text-bb-violet underline transition-colors cursor-pointer"
                  >
                    Skip bio for now →
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 6: Currency Selection */}
            {step === 6 && (
              <motion.div
                key="step-6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <h2 className="text-lg font-black text-bb-text-primary">What's your currency?</h2>
                  <p className="text-xs text-bb-text-muted">Select the currency you daily use.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {CURRENCIES.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleCurrencySelect(c.symbol)}
                      className={`p-4 rounded-bb-sm border-2 text-left flex items-center gap-3 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bb-violet cursor-pointer ${
                        selectedCurrency === c.symbol
                          ? 'border-bb-violet bg-bb-violet text-bb-violet-fg'
                          : 'border-bb-border bg-bb-surface text-bb-text-primary hover:border-bb-violet'
                      }`}
                    >
                      <span className="text-2xl">{c.flag}</span>
                      <div>
                        <div className="text-sm font-black font-mono">{c.symbol} {c.code}</div>
                        <div className={`text-[10px] font-semibold mt-0.5 ${
                          selectedCurrency === c.symbol ? 'text-bb-violet-fg/70' : 'text-bb-text-muted'
                        }`}>{c.name}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 7: Monthly Allowance (Prices dynamically formatted according to currency) */}
            {step === 7 && (
              <motion.div
                key="step-7"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <h2 className="text-lg font-black text-bb-text-primary">What's your monthly allowance?</h2>
                  <p className="text-xs text-bb-text-muted">Pick your monthly cash bracket. We won't tell your parents.</p>
                </div>

                <div className="space-y-5">
                  <div className="flex flex-wrap gap-2">
                    {incomePresets.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => {
                          setMonthlyIncome(preset.value.toString());
                          setIncomeMode('preset');
                        }}
                        className={`px-4 py-2 rounded-bb-xs text-xs font-bold font-mono transition-all duration-150 border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bb-violet cursor-pointer ${
                          incomeMode === 'preset' && monthlyIncome === preset.value.toString()
                            ? 'bg-bb-violet text-bb-violet-fg border-black'
                            : 'bg-bb-surface border-bb-border text-bb-text-secondary hover:border-bb-violet'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setIncomeMode('custom');
                        setTimeout(() => customInputRef.current?.focus(), 50);
                      }}
                      className={`px-4 py-2 rounded-bb-xs text-xs font-bold font-mono transition-all duration-150 border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bb-violet cursor-pointer ${
                        incomeMode === 'custom'
                          ? 'bg-bb-violet text-bb-violet-fg border-black'
                          : 'bg-bb-surface border-bb-border text-bb-text-secondary hover:border-bb-violet'
                      }`}
                    >
                      Custom
                    </button>
                  </div>

                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-bb-text-muted text-xs font-mono font-bold select-none">{selectedCurrency}</span>
                    <input
                      ref={customInputRef}
                      type="number"
                      inputMode="decimal"
                      placeholder="Enter custom amount"
                      value={monthlyIncome}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMonthlyIncome(val);
                        setIncomeMode('custom');
                      }}
                      onKeyDown={(e) => {
                        if (['e', 'E', '+', '-'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      className="w-full pl-8 pr-4 py-2.5 rounded-bb-sm bg-bb-surface border-2 border-bb-border text-xs text-bb-text-primary placeholder-bb-text-muted focus:outline-none focus:border-bb-violet transition-all font-mono"
                      required
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 8: Primary Goal */}
            {step === 8 && (
              <motion.div
                key="step-8"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <h2 className="text-lg font-black text-bb-text-primary">What are we saving for?</h2>
                  <p className="text-xs text-bb-text-muted">Select a category. Your goal helps customize your insights.</p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {GOALS_PRESETS.map((g) => (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => {
                          setPrimaryGoal(g.value);
                          setPrimaryGoalEmoji(g.emoji);
                        }}
                        className={`p-4 rounded-bb-sm border-2 text-left flex items-center gap-3 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bb-violet cursor-pointer ${
                          primaryGoal === g.value
                            ? 'border-bb-violet bg-bb-violet text-bb-violet-fg'
                            : 'border-bb-border bg-bb-surface text-bb-text-primary hover:border-bb-violet'
                        }`}
                      >
                        <span className="text-xl">{g.emoji}</span>
                        <span className="text-xs font-semibold">{g.label}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPrimaryGoal('custom')}
                      className={`p-4 rounded-bb-sm border-2 text-left flex items-center gap-3 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bb-violet cursor-pointer ${
                        primaryGoal === 'custom'
                          ? 'border-bb-violet bg-bb-violet text-bb-violet-fg'
                          : 'border-bb-border bg-bb-surface text-bb-text-primary hover:border-bb-violet'
                      }`}
                    >
                      <span className="text-xl">✨</span>
                      <span className="text-xs font-semibold">Something Else</span>
                    </button>
                  </div>

                  {primaryGoal === 'custom' && (
                    <Input
                      type="text"
                      placeholder="e.g. Save for concert tickets"
                      value={customGoalName}
                      onChange={(e) => setCustomGoalName(e.target.value)}
                      required
                    />
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 9: Target Amount (Preset prices dynamically formatted according to currency) */}
            {step === 9 && (
              <motion.div
                key="step-9"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <h2 className="text-lg font-black text-bb-text-primary">How much cash is required?</h2>
                  <p className="text-xs text-bb-text-muted">Set a target amount for your goal. You can change this anytime.</p>
                </div>

                <div className="space-y-5">
                  <div className="flex flex-wrap gap-2">
                    {targetPresets.map((presetVal) => {
                      const formatted = formatCurrency(presetVal, selectedCurrency, false);
                      return (
                        <button
                          key={presetVal}
                          type="button"
                          onClick={() => {
                            setTargetAmount(presetVal.toString());
                            setTargetMode('preset');
                          }}
                          className={`px-4 py-2 rounded-bb-xs text-xs font-bold font-mono transition-all duration-150 border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bb-violet cursor-pointer ${
                            targetMode === 'preset' && targetAmount === presetVal.toString()
                              ? 'bg-bb-violet text-bb-violet-fg border-black'
                              : 'bg-bb-surface border-bb-border text-bb-text-secondary hover:border-bb-violet'
                          }`}
                        >
                          {formatted}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        setTargetMode('custom');
                        setTimeout(() => targetCustomRef.current?.focus(), 50);
                      }}
                      className={`px-4 py-2 rounded-bb-xs text-xs font-bold font-mono transition-all duration-150 border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bb-violet cursor-pointer ${
                        targetMode === 'custom'
                          ? 'bg-bb-violet text-bb-violet-fg border-black'
                          : 'bg-bb-surface border-bb-border text-bb-text-secondary hover:border-bb-violet'
                      }`}
                    >
                      Custom
                    </button>
                  </div>

                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-bb-text-muted text-xs font-mono font-bold select-none">{selectedCurrency}</span>
                    <input
                      ref={targetCustomRef}
                      type="number"
                      inputMode="decimal"
                      placeholder="Enter custom target"
                      value={targetAmount}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTargetAmount(val);
                        setTargetMode('custom');
                      }}
                      onKeyDown={(e) => {
                        if (['e', 'E', '+', '-'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      className="w-full pl-8 pr-4 py-2.5 rounded-bb-sm bg-bb-surface border-2 border-bb-border text-xs text-bb-text-primary placeholder-bb-text-muted focus:outline-none focus:border-bb-violet transition-all font-mono"
                      required
                    />
                  </div>

                  {targetAmount !== '' && !isNaN(Number(targetAmount)) && Number(targetAmount) > 0 && (
                    <div className="text-xs text-bb-text-muted font-medium">
                      Target Amount: <span className="text-bb-violet font-bold font-mono">{formatCurrency(Number(targetAmount), selectedCurrency, false)}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 10: Payment Methods */}
            {step === 10 && (
              <motion.div
                key="step-10"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <h2 className="text-lg font-black text-bb-text-primary">How do you usually pay?</h2>
                  <p className="text-xs text-bb-text-muted">Select your primary payment channels.</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map((pm) => {
                    const isSelected = preferredPayments.includes(pm);
                    return (
                      <button
                        key={pm}
                        type="button"
                        onClick={() => handlePaymentToggle(pm)}
                        className={`p-4 rounded-bb-sm border-2 flex items-center justify-between transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bb-violet cursor-pointer ${
                          isSelected
                            ? 'border-bb-violet bg-bb-violet text-bb-violet-fg'
                            : 'border-bb-border bg-bb-surface text-bb-text-primary hover:border-bb-violet'
                        }`}
                      >
                        <span className="text-xs font-semibold">{pm}</span>
                        {isSelected && <Check size={12} className="text-bb-violet-fg" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 11: AI Personality */}
            {step === 11 && (
              <motion.div
                key="step-11"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <h2 className="text-lg font-black text-bb-text-primary">Pick your AI Bro's personality.</h2>
                  <p className="text-xs text-bb-text-muted">Choose the response style that fits your vibe best.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {PERSONALITIES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setAiPersonality(p.id as any)}
                      className={`p-4 rounded-bb-sm border-2 text-left flex flex-col gap-1 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bb-violet cursor-pointer ${
                        aiPersonality === p.id
                          ? 'border-bb-violet bg-bb-violet text-bb-violet-fg'
                          : 'border-bb-border bg-bb-surface text-bb-text-primary hover:border-bb-violet'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{p.emoji}</span>
                        <span className="text-xs font-bold">{p.name}</span>
                      </div>
                      <p className={`text-[10px] leading-normal mt-1 font-semibold ${aiPersonality === p.id ? 'text-bb-violet-fg/70' : 'text-bb-text-muted'}`}>{p.desc}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 12: Summary Breakdown */}
            {step === 12 && (
              <motion.div
                key="step-12"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <div className="text-center space-y-1">
                  <span className="text-4xl block">🥖</span>
                  <h2 className="text-lg font-black text-bb-text-primary">Vibe check passed!</h2>
                  <p className="text-xs text-bb-text-muted">Review your profile breakdown before locking it in.</p>
                </div>

                <div className="p-4 rounded-bb-sm bg-bb-surface border-2 border-bb-border space-y-2.5 text-xs leading-normal select-none max-h-[300px] overflow-y-auto">
                  <div className="flex justify-between border-b-2 border-bb-border pb-1.5">
                    <span className="text-bb-text-muted font-mono">Companion Name</span>
                    <span className="font-bold text-bb-text-primary">{preferredName} {avatar}</span>
                  </div>
                  <div className="flex justify-between border-b-2 border-bb-border pb-1.5">
                    <span className="text-bb-text-muted font-mono">Country</span>
                    <span className="font-bold text-bb-text-primary">{country}</span>
                  </div>
                  <div className="flex justify-between border-b-2 border-bb-border pb-1.5">
                    <span className="text-bb-text-muted font-mono">Birthday</span>
                    <span className="font-bold text-bb-text-primary">{birthday}</span>
                  </div>
                  <div className="flex justify-between border-b-2 border-bb-border pb-1.5">
                    <span className="text-bb-text-muted font-mono">College / School</span>
                    <span className="font-bold text-bb-text-primary truncate max-w-[180px]">{college}</span>
                  </div>
                  {shortBio && (
                    <div className="flex justify-between border-b-2 border-bb-border pb-1.5">
                      <span className="text-bb-text-muted font-mono">Short Bio</span>
                      <span className="font-bold text-bb-text-primary truncate max-w-[180px]">{shortBio}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-b-2 border-bb-border pb-1.5">
                    <span className="text-bb-text-muted font-mono">Currency</span>
                    <span className="font-bold text-bb-text-primary font-mono">{selectedCurrency}</span>
                  </div>
                  <div className="flex justify-between border-b-2 border-bb-border pb-1.5">
                    <span className="text-bb-text-muted font-mono">Monthly Allowance</span>
                    <span className="font-bold text-bb-text-primary font-mono">{selectedCurrency}{Number(monthlyIncome).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b-2 border-bb-border pb-1.5">
                    <span className="text-bb-text-muted font-mono">Primary Goal</span>
                    <span className="font-bold text-bb-text-primary capitalize">{primaryGoal === 'custom' ? customGoalName : primaryGoal}</span>
                  </div>
                  <div className="flex justify-between border-b-2 border-bb-border pb-1.5">
                    <span className="text-bb-text-muted font-mono">Saving Target</span>
                    <span className="font-bold text-bb-text-primary font-mono">{formatCurrency(Number(targetAmount) || 0, selectedCurrency, false)}</span>
                  </div>
                  <div className="flex justify-between border-b-2 border-bb-border pb-1.5">
                    <span className="text-bb-text-muted font-mono">Payment Channels</span>
                    <span className="font-bold text-bb-text-primary text-right max-w-[180px] truncate">{preferredPayments.join(', ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-bb-text-muted font-mono">AI Personality</span>
                    <span className="font-bold text-bb-text-primary capitalize">{aiPersonality}</span>
                  </div>
                </div>

                <p className="text-[10px] text-center text-bb-text-muted max-w-xs mx-auto leading-relaxed font-semibold">
                  You're ready to start building healthier financial habits.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="flex justify-between items-center mt-8 border-t-2 border-bb-border pt-5">
          {step > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 !text-bb-coral !border-bb-coral !shadow-bb-coral hover:!bg-bb-coral hover:!text-bb-coral-fg hover:!border-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bb-coral"
            >
              <ArrowLeft size={14} /> Back
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleNext}
            loading={step === 12 ? isSubmitting : false}
            className="flex items-center gap-1.5 ml-auto"
          >
            {step === 0 ? (
              <>Lock In <Lock size={12} /></>
            ) : step === 12 ? (
              'Enter BreadBuddy →'
            ) : (
              <>Continue <ArrowRight size={14} /></>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
