import { motion } from 'framer-motion';

export function LoadingScreen({ message = 'Getting your fresh bread...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-warm-dark text-white">
      <div className="relative flex flex-col items-center">
        {/* Glow behind loader */}
        <div className="absolute w-24 h-24 bg-lavender/10 rounded-full blur-2xl animate-pulse-slow" />
        
        {/* Toast emoji animation */}
        <motion.div
          animate={{
            y: [0, -12, 0],
            rotate: [0, 5, -5, 0],
            scale: [1, 1.05, 0.95, 1],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="text-6xl mb-5 select-none"
        >
          🍞
        </motion.div>
        
        {/* Subtitle */}
        <p className="text-xs font-semibold tracking-wider uppercase text-white/50 font-mono animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
}
