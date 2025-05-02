import { Sword, Zap } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Import the Lottie player dynamically with SSR disabled
const LottiePlayer = dynamic(
  () => import('@lottiefiles/react-lottie-player').then(mod => mod.Player),
  { ssr: false }
);

const BitcoinLoader = () => (
  <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/90">
    <div className="absolute inset-0 bg-scan-lines opacity-20"></div>
    <div className="relative">
      <div className="absolute -inset-4 border border-red-500/30 rounded-full shadow-neon-red animate-pulse"></div>
      <div className="absolute -inset-8 border border-cyan/20 rounded-full shadow-neon-cyan animate-pulse" style={{ animationDelay: '0.5s' }}></div>
      <Suspense fallback={<div className="h-[140px] w-[140px] rounded-full bg-gray-800/50 animate-pulse"></div>}>
        <LottiePlayer
          autoplay
          loop
          src={require('./bitcoin-loader.json')}
          style={{ height: '140px', width: '140px' }}
          speed={1.2}
        />
      </Suspense>
      <div className="absolute -top-2 -right-2">
        <Zap className="w-6 h-6 text-cyan animate-pulse" />
      </div>
    </div>
    
    <div className="mt-8 flex flex-col items-center">
      <div className="flex items-center gap-2 group mb-2">
        <div className="relative">
          <div className="absolute -inset-1 bg-red/20 rounded-full blur-sm opacity-70"></div>
        </div>
      </div>
    </div>
  </div>
);

export default BitcoinLoader;
