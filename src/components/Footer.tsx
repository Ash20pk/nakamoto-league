import Link from 'next/link';
import { 
  Sword, Zap
} from 'lucide-react';


const Footer = () => {

  return (

<footer className="bg-black border-t border-gray-900 py-8 relative mt-8">
<div className="absolute inset-0 bg-[url('/images/cyber-grid.png')] opacity-5"></div>
<div className="absolute top-0 left-0 right-0 h-[0.5px] bg-gradient-to-r from-transparent via-red-500/30 to-transparent"></div>

<div className="container mx-auto px-4 relative">
  <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <Sword className="w-5 h-5 text-red-500" />
          <Zap className="w-2.5 h-2.5 text-cyan-500 absolute -top-1 -right-1" />
        </div>
        <span className="text-base font-bold text-white font-serif-jp">
          NAKAMOTO LEAGUE
        </span>
      </div>
      <p className="text-gray-500 text-xs mb-4">
        The ultimate blockchain hackathon platform for the next generation of Web3 developers.
      </p>
      <p className="text-gray-600 text-xs">
        &copy; {new Date().getFullYear()} Nakamoto League. All rights reserved.
      </p>
    </div>

    <div>
      <h4 className="text-white font-medium mb-3 text-sm">Platform</h4>
      <ul className="space-y-2 text-xs">
        <li>
          <Link href="/tournaments" className="text-gray-400 hover:text-cyan-400 transition-colors">
            Tournaments
          </Link>
        </li>
        <li>
          <Link href="/dojos" className="text-gray-400 hover:text-cyan-400 transition-colors">
            Dojos
          </Link>
        </li>
        <li>
          <Link href="/warriors" className="text-gray-400 hover:text-cyan-400 transition-colors">
            Warriors
          </Link>
        </li>
        <li>
          <Link href="/leaderboard" className="text-gray-400 hover:text-cyan-400 transition-colors">
            Leaderboard
          </Link>
        </li>
      </ul>
    </div>

    <div>
      <h4 className="text-white font-medium mb-3 text-sm">Resources</h4>
      <ul className="space-y-2 text-xs">
        <li>
          <Link href="/about" className="text-gray-400 hover:text-cyan-400 transition-colors">
            About Us
          </Link>
        </li>
        <li>
          <Link href="/faq" className="text-gray-400 hover:text-cyan-400 transition-colors">
            FAQ
          </Link>
        </li>
        <li>
          <Link href="/blog" className="text-gray-400 hover:text-cyan-400 transition-colors">
            Blog
          </Link>
        </li>
        <li>
          <Link href="/documentation" className="text-gray-400 hover:text-cyan-400 transition-colors">
            Documentation
          </Link>
        </li>
      </ul>
    </div>

    <div>
      <h4 className="text-white font-medium mb-3 text-sm">Legal</h4>
      <ul className="space-y-2 text-xs">
        <li>
          <Link href="/terms" className="text-gray-400 hover:text-cyan-400 transition-colors">
            Terms
          </Link>
        </li>
        <li>
          <Link href="/privacy" className="text-gray-400 hover:text-cyan-400 transition-colors">
            Privacy
          </Link>
        </li>
        <li>
          <Link href="/cookies" className="text-gray-400 hover:text-cyan-400 transition-colors">
            Cookies
          </Link>
        </li>
        <li>
          <Link href="/contact" className="text-gray-400 hover:text-cyan-400 transition-colors">
            Contact
          </Link>
        </li>
      </ul>
    </div>
  </div>
</div>
</footer>
    );
  };

export default Footer;
