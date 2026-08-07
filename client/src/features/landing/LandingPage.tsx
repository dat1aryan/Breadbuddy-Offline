import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import landingPageSs from '../../assets/images/landingpage_ss.png';
import { 
  TrendingUp, 
  Sparkles, 
  Target, 
  Brain, 
  Smile, 
  ArrowRight, 
  ChevronDown, 
  Star, 
  Wallet 
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';


interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
}

function FeatureCard({ icon, title, description, badge }: FeatureCardProps) {
  return (
    <div className="p-6 bg-bb-surface border-2 border-bb-border rounded-bb-sm shadow-[4px_4px_0px_#000] flex flex-col gap-3 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#000] transition-all">
      <div className="text-bb-lime flex items-center justify-start text-xl">
        {icon}
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-black text-bb-text-primary">{title}</h3>
          {badge && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 bg-bb-lime text-bb-lime-fg border border-black font-bold uppercase">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-bb-text-secondary leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const features: FeatureCardProps[] = [
    {
      icon: <TrendingUp size={20} />,
      title: 'Expense Tracking',
      description: 'Log your spendings in seconds. Group by coffee, gaming, or study snacks automatically.',
    },
    {
      icon: <Sparkles size={20} />,
      title: 'AI Bro',
      description: 'Your personal financial hype-man. Get roasted for wild spending or toasted for hit savings.',
    },
    {
      icon: <Target size={20} />,
      title: 'Saving Goals',
      description: 'Save up for concerts, road trips, or new tech. Fund your dreams step by step.',
    },
    {
      icon: <Brain size={20} />,
      title: 'Smart Insights',
      description: 'Know exactly where your allowance goes. Clean visuals, zero complex math.',
    },
    {
      icon: <Smile size={20} />,
      title: 'Chill Zone',
      description: 'Budgeting made for actual human students. Take control without the boring spreadsheets.',
    },
    {
      icon: <Wallet size={20} />,
      title: 'Student-First Focus',
      description: 'Crafted around monthly allowances, part-time hustles, and shared bills.',
    }
  ];

  const testimonials = [
    {
      name: 'Rohan, 20',
      role: 'Sophomore',
      text: 'Literally saved me from going broke in the middle of the semester. The AI roast is too real 💀',
      avatar: '🍞'
    },
    {
      name: 'Sneha, 21',
      role: 'Senior',
      text: 'Actually fun to use. Managed to save enough for my Goa trip using the Goal funding feature!',
      avatar: '💅'
    },
    {
      name: 'Aaryan, 19',
      role: 'Freshman',
      text: 'Simple, fast, and does not look like a bank app from 2008. The UI is clean AF.',
      avatar: '🤑'
    }
  ];

  const faqs = [
    {
      q: 'Is BreadBuddy free for students?',
      a: 'Absolutely! BreadBuddy is 100% free and built by students, for students. No subscription fees, ever.'
    },
    {
      q: 'How does the AI Bro work?',
      a: 'Our AI Bro analyzes your spending habits and responds based on your selected vibe (Bestie, Coach, Professional, or Calm).'
    },
    {
      q: 'Can I track goals in different currencies?',
      a: 'Yes! During onboarding, you can select your default currency symbol (₹, $, €, £, etc.) which applies across all features.'
    },
    {
      q: 'Are my financial details safe?',
      a: 'Completely. All data is kept secure, and we never ask for your real bank details or credentials. You only track what you enter.'
    }
  ];

  return (
    <div className="min-h-screen bg-warm-dark text-white overflow-x-hidden selection:bg-lavender/30 select-none">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍞</span>
            <span className="text-xl font-black tracking-tight gradient-text">BreadBuddy</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link to="/login">
              <Button size="sm" variant="secondary">
                sign in
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">
                get started
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 flex flex-col items-center text-center px-6">
        <div className="absolute top-[10%] left-[20%] w-72 h-72 bg-lavender/10 rounded-full blur-3xl animate-pulse-slow pointer-events-none" />
        <div className="absolute top-[15%] right-[20%] w-80 h-80 bg-iridescent-pink/10 rounded-full blur-3xl animate-pulse-slow pointer-events-none" />
        
        <div className="max-w-3xl mx-auto space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/5 text-xs text-lavender font-semibold"
          >
            <Sparkles size={12} className="animate-pulse" />
            <span>your money's new bestie</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1] font-sans"
          >
            Stop spending like you're <br className="hidden sm:inline" />
            <span className="gradient-text">doing side quests.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base sm:text-lg text-white/60 max-w-xl mx-auto font-sans leading-relaxed"
          >
            Track allowance, fund goals, and get roasted by AI. The aesthetic money tracker college students actually look forward to opening.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4"
          >
            <Link to="/signup">
              <Button size="lg" className="px-8 flex items-center gap-2">
                start tracking free <ArrowRight size={16} />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="secondary">
                sign in to account
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Dashboard Preview */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="w-full max-w-5xl mt-16 md:mt-24 px-4 md:px-0"
        >
          <div className="relative rounded-2xl border border-white/10 p-2 bg-warm-dark/50 shadow-2xl backdrop-blur-md">
            <div className="absolute inset-0 bg-gradient-to-tr from-lavender/5 via-transparent to-iridescent-pink/5 rounded-2xl pointer-events-none" />
            <div className="glass-card p-2 rounded-xl border border-white/10 overflow-hidden shadow-2xl relative z-10">
              <img 
                src={landingPageSs || "/images/landingpage_ss.png"} 
                alt="BreadBuddy App Dashboard Preview" 
                className="w-full h-auto rounded-lg object-cover shadow-lg border border-white/5" 
              />
            </div>
          </div>
        </motion.div>
      </section>

      {/* Why Section */}
      <section className="py-20 md:py-28 px-6 max-w-7xl mx-auto border-t border-white/5">
        <div className="text-center max-w-xl mx-auto mb-16 space-y-4">
          <h2 className="text-xs font-mono uppercase tracking-wider text-lavender font-bold">Why BreadBuddy??</h2>
          <h3 className="text-3xl sm:text-4xl font-black tracking-tight">Finances shouldn't make you yawn.</h3>
          <p className="text-sm sm:text-base text-white/60 font-sans leading-relaxed">
            Bank apps are boring and spreadsheets are exhausting. BreadBuddy gives you student-first features with the aesthetic glow you deserve.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feat, idx) => (
            <FeatureCard 
              key={idx}
              icon={feat.icon}
              title={feat.title}
              description={feat.description}
              badge={feat.badge}
            />
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 md:py-28 px-6 max-w-7xl mx-auto border-t border-white/5">
        <div className="text-center max-w-xl mx-auto mb-16 space-y-4">
          <h2 className="text-xs font-mono uppercase tracking-wider text-iridescent-pink font-bold">Loved By Students</h2>
          <h3 className="text-3xl sm:text-4xl font-black tracking-tight">Vibes don't lie.</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((test, idx) => (
            <Card key={idx} className="p-6 border-white/5 flex flex-col justify-between" glowVariant="lavender">
              <p className="text-sm text-white/70 italic mb-6">
                "{test.text}"
              </p>
              <div className="flex items-center gap-3">
                <span className="text-3xl p-1 rounded-xl bg-white/5 border border-white/5">{test.avatar}</span>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1">
                    {test.name}
                    <span className="text-xs font-normal text-white/40">({test.role})</span>
                  </h4>
                  <div className="flex gap-0.5 text-toxic-lime mt-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={10} fill="currentColor" />
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 md:py-28 px-6 max-w-3xl mx-auto border-t-2 border-bb-border">
        <div className="text-center mb-14 space-y-4">
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-bb-violet font-black">FAQ</h2>
          <h3 className="text-3xl font-black tracking-tight text-bb-text-primary">Got Questions?</h3>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div key={idx} className="bg-bb-surface border-2 border-bb-border rounded-bb-sm overflow-hidden hover:border-bb-violet transition-colors">
                <button
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full flex justify-between items-center p-5 text-left text-sm font-bold text-bb-text-primary hover:bg-bb-bg transition-colors"
                >
                  <span>{faq.q}</span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-bb-text-muted"
                  >
                    <ChevronDown size={18} />
                  </motion.div>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-1 text-xs text-bb-text-secondary leading-relaxed font-sans border-t-2 border-bb-border">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 px-6 max-w-5xl mx-auto text-center relative">
        <div className="absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-96 h-96 bg-lavender/5 rounded-full blur-3xl pointer-events-none" />
        <div className="glass-card border-white/5 p-10 md:p-16 rounded-3xl relative z-10 flex flex-col items-center">
          <span className="text-5xl mb-6">🍞</span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">
            Secure the bag. Save your bread.
          </h2>
          <p className="text-sm text-white/60 max-w-md mx-auto mb-8 leading-relaxed">
            Create an account in 30 seconds and start tracking immediately. No spreadsheets, no stress.
          </p>
          <Link to="/signup">
            <Button size="lg" className="px-10">
              get started bestie ✨
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6 bg-surface-dark/50">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 items-center gap-6">
          {/* Left: Logo & version */}
          <div className="flex items-center justify-center md:justify-start gap-2">
            <span className="text-xl">🍞</span>
            <span className="text-sm font-black tracking-tight gradient-text">BreadBuddy</span>
            <span className="text-[10px] font-mono text-white/30">v2.0.26</span>
          </div>

          {/* Middle: Github link (centered under Get Started button) */}
          <div className="flex items-center justify-center text-xs text-white/40 font-semibold font-mono">
            <a
              href="https://github.com/dat1aryan/Breadbuddy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/60 transition-colors cursor-pointer"
            >
              github
            </a>
          </div>

          {/* Right: Copyright */}
          <div className="flex items-center justify-center md:justify-end text-xs text-white/30 font-mono">
            <p>&copy; {new Date().getFullYear()} BreadBuddy</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
