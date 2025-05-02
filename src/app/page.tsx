'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ChevronRight, 
  Trophy, 
  Users, 
  Calendar, 
  Zap,
  Bell,
  Award,
  Building,
  Search,
  Clock,
  MapPin,
  Shield,
  ArrowRight,
  BarChart,
  User
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BitcoinLoader from '@/components/BitcoinLoader';
import { useTournament, type Tournament } from '@/hooks/useTournament';
import { useDojo, type Dojo } from '@/hooks/useDojo';
import { useWarrior } from '@/hooks/useWarrior';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';

// Define interfaces for the UI components that match the expected format
interface UITournament {
  id: string;
  title: string;
  date: string;
  location: string;
  participants: number;
  image: string;
  prize: string;
  registrationEnds: string;
  status: string;
  tags: string[];
  dojoHost: string;
  progress?: number;
  daysLeft?: number;
}

interface UIDojo {
  id: string;
  name: string;
  members: number;
  victories: number;
  image: string;
  activeTournaments: number;
}

interface UIWarrior {
  id: string;
  name: string;
  rank: number | string;
  dojo: string;
  victories: number;
  avatar: string;
}

interface Activity {
  id: number;
  time: string;
  content: React.ReactNode;
  type: string;
}

export default function Home() {
  const [loaded, setLoaded] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [glitchEffect, setGlitchEffect] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const { authState } = useAuth();

  // Use hooks to fetch data
  const { tournaments: apiTournaments, loadingTournaments, fetchTournaments } = useTournament();
  const { dojos: apiDojos, loadingDojos, fetchDojos } = useDojo();
  const { warriors: apiWarriors, loadingWarriors, fetchWarriors } = useWarrior();
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  // Transform API data to UI format
  const transformTournament = (tournament: Tournament): UITournament => {
    return {
      id: tournament.id,
      title: tournament.title,
      date: `${new Date(tournament.startDate).toLocaleDateString()} - ${new Date(tournament.endDate).toLocaleDateString()}`,
      location: tournament.organizer?.name || 'Virtual',
      participants: tournament.currentParticipants,
      image: tournament.banner || '/images/default-tournament.jpg',
      prize: typeof tournament.prize === 'object' && tournament.prize ? 
        `$${tournament.prize.amount} ${tournament.prize.currency}` : 
        '$10,000', // Default prize if not available
      registrationEnds: tournament.registrationDeadline,
      status: tournament.status === 'UPCOMING' ? 'Registration Open' : tournament.status,
      tags: ['Blockchain', 'Web3', 'DeFi'], // Default tags if not available
      dojoHost: tournament.organizer?.name || 'Unknown Host',
      // For ongoing tournaments
      progress: Math.floor(Math.random() * 100),
      daysLeft: Math.floor(Math.random() * 10)
    };
  };

  const transformDojo = (dojo: Dojo): UIDojo => {
    // Count active tournaments for this dojo by checking if the dojo is the organizer
    // This is a simple approach using available data without complex calculations
    const activeTournaments = apiTournaments
      .filter(tournament => 
        (tournament.status === 'ONGOING' || tournament.status === 'UPCOMING') && 
        tournament.organizer?.name === dojo.name
      )
      .length;

    return {
      id: dojo.id,
      name: dojo.name,
      members: dojo.totalWarriors || 0,
      // Use actual win rate data
      victories: Math.round((dojo.winRate || 0) * 10),
      image: dojo.banner || '/images/default-dojo.jpg',
      // Use direct data: count tournaments where this dojo is the organizer
      activeTournaments: activeTournaments
    };
  };

  const transformWarrior = (warrior: {
    id: string;
    name: string;
    rank?: number | string;
    win_rate?: number;
    avatar_url?: string | null;
    dojo_id?: string | null;
    dojos?: {
      id: string;
      name: string;
    } | null;
  }): UIWarrior => {
    // Use actual data from the warrior object
    return {
      id: warrior.id,
      name: warrior.name,
      // Show "Unranked" for rank 0
      rank: typeof warrior.rank === 'number' ? 
        (warrior.rank === 0 ? 'Unranked' : warrior.rank) : 
        'Unranked',
      // The API returns dojos (not dojo) as the joined table name
      dojo: warrior.dojos?.name || 'Independent',
      // Use actual win rate data
      victories: Math.round((warrior.win_rate || 0) * 10),
      avatar: warrior.avatar_url || '/images/default-avatar.jpg',
    };
  };

  // Transform API data to UI format
  const upcomingTournaments: UITournament[] = apiTournaments
    .filter(tournament => tournament.status === 'UPCOMING')
    .map(transformTournament);

  const ongoingTournaments: UITournament[] = apiTournaments
    .filter(tournament => tournament.status === 'ONGOING')
    .map(transformTournament);

  // Use memoization to prevent recalculation on every render
  const topDojos: UIDojo[] = useMemo(() => {
    return apiDojos
      .sort((a, b) => (a.rank || 999) - (b.rank || 999))
      .slice(0, 4)
      .map(transformDojo);
  }, [apiDojos]);

  const topWarriors: UIWarrior[] = useMemo(() => {
    return apiWarriors
      .sort((a, b) => (a.rank || 999) - (b.rank || 999))
      .slice(0, 4)
      .map(transformWarrior);
  }, [apiWarriors]);

  // Fetch tournaments, dojos, warriors and activities on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch tournaments with appropriate filters
        await fetchTournaments({
          sortBy: 'startDate',
          sortOrder: 'desc',
          limit: 10,
          page: 1
        });

        // Fetch top dojos
        await fetchDojos({
          sortBy: 'rank',
          sortOrder: 'asc',
          limit: 4,
          page: 1
        });

        // Fetch top warriors
        await fetchWarriors({
          sortBy: 'rank',
          sortOrder: 'asc',
          limit: 4,
          page: 1
        });

        // Fetch recent activities
        fetchRecentActivities();
      } catch (err) {
        console.error("Error fetching data for homepage:", err);
        setError("Failed to load homepage data");
      }
    };

    fetchData();
  }, [fetchTournaments, fetchDojos, fetchWarriors]);

  // Function to fetch recent activities
  const fetchRecentActivities = async () => {
    setLoadingActivities(true);
    try {
      // Since the activities API doesn't exist yet, we'll use sample data
      // When the API is created, uncomment this code:
      /*
      const response = await fetch('/api/activities');
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }
      const data = await response.json();
      setRecentActivities(data.activities);
      */
      
      // Use sample data for now
      setRecentActivities([
        {
          id: 1,
          time: "3 hours ago",
          content: <>
            <span className="font-medium text-cyan-400">Tokyo Blockchain Dojo</span> won the 
            <span className="font-medium text-red-400"> Smart Contract Showdown</span> tournament!
          </>,
          type: "trophy"
        },
        {
          id: 2,
          time: "Yesterday",
          content: <>
            <span className="font-medium text-red-400">Blockchain Battle Royale</span> registrations are now open. 
            128 spots available!
          </>,
          type: "notification"
        },
        {
          id: 3,
          time: "2 days ago",
          content: <>
            <span className="font-medium text-cyan-400">Satoshi Nakamoto</span> achieved the 
            highest rank in <span className="font-medium text-red-400">Web3 Warriors Leaderboard</span>!
          </>,
          type: "achievement"
        },
        {
          id: 4,
          time: "1 week ago",
          content: <>
            New dojo <span className="font-medium text-cyan-400">Fukuoka Blockchain Society</span> has 
            joined the league.
          </>,
          type: "dojo"
        }
      ]);
    } catch (err) {
      console.error("Error fetching activities:", err);
      setError("Failed to load activities");
    } finally {
      setLoadingActivities(false);
    }
  };

  useEffect(() => {
    const glitchInterval = setInterval(() => {
      setGlitchEffect(true);
      setTimeout(() => {
        setGlitchEffect(false);
      }, 200);
    }, 5000);

    return () => clearInterval(glitchInterval);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    setLoaded(true);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const filteredTournaments = activeTab === 'upcoming' 
    ? upcomingTournaments.filter(t => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        t.dojoHost.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : ongoingTournaments.filter(t => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        t.dojoHost.toLowerCase().includes(searchQuery.toLowerCase())
      );

  if (loadingTournaments || loadingDojos || loadingWarriors || loadingActivities) {
    return <BitcoinLoader />;
  }

  return (
    <div className={`bg-gray-950 text-white min-h-screen ${loaded ? 'fade-in' : 'opacity-0'} transition-opacity duration-700`}>
      <Navbar activeSection={activeSection} />

      {/* Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[url('/images/cyber-grid.png')] opacity-5"></div>
        <div className="absolute inset-0 bg-[url('/images/japanese-pattern-neon.png')] opacity-3"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-950 to-black"></div>
      </div>

      <main className="relative z-10 pt-20">
        {/* Hero Banner Section - Smaller & More Functional */}
        <section id="hero" className="relative py-12 md:py-16 overflow-hidden border-b border-gray-800">
          <div className="container mx-auto px-4 relative z-10">
            <div className="flex flex-col lg:flex-row items-center">
              <div className={`lg:w-1/2 mb-6 lg:mb-0 transform transition-all duration-700 ${loaded ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
                <div className="mb-4">
                  <span className="text-sm font-serif-jp text-cyan-500 mb-1 inline-block tracking-wider">ナカモト・リーグ</span>
                  <h1 className={`text-3xl md:text-4xl font-bold font-serif-jp leading-tight ${glitchEffect ? 'glitch-text' : ''}`}>
                    <span className="text-gradient-red-purple">NAKAMOTO LEAGUE</span>
                  </h1>
                </div>
                <p className="text-gray-400 text-base mb-4">
                  Track hackathons, join elite tech dojos, and compete with fellow warriors in the Nakamoto League.
                </p>
                <div className="flex flex-wrap gap-3">
                  <div className="cyber-badge-red">
                    <Trophy className="w-4 h-4 mr-1" />
                    <span>{ongoingTournaments.length} Active Hackathons</span>
                  </div>
                  <div className="cyber-badge-cyan">
                    <Users className="w-4 h-4 mr-1" />
                    <span>500+ Active Warriors</span>
                  </div>
                  <div className="cyber-badge-purple">
                    <Building className="w-4 h-4 mr-1" />
                    <span>{topDojos.length} Dojos</span>
                  </div>
                </div>
              </div>
              
              <div className={`lg:w-1/2 lg:pl-8 transform transition-all duration-700 ${loaded ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`} style={{ transitionDelay: '0.2s' }}>
                <div className="bg-gray-900/60 backdrop-blur-sm rounded-lg p-4 border border-gray-800">
                  <h3 className="text-lg font-medium mb-3 text-white">Your Warrior Status</h3>
                  
                  {authState.isAuthenticated && authState.warrior ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Rank</p>
                          <p className="text-2xl font-bold text-cyan-400">#{authState.warrior.rank || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Power Level</p>
                          <p className="text-2xl font-bold text-red-400">{authState.warrior.power_level}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Win Rate</p>
                          <p className="text-2xl font-bold text-purple-400">{authState.warrior.win_rate}%</p>
                        </div>
                        <div className="sm:col-span-3">
                          <p className="text-gray-400 text-xs mb-1">Dojo</p>
                          <p className="text-sm text-white truncate">
                            {authState.warrior.dojo_id ? 'Member of a Dojo' : 'Independent Warrior'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/warriors/${authState.warrior.id}`} className="neon-button-red-sm py-1.5 text-white text-sm font-medium flex items-center">
                          <User className="w-3.5 h-3.5 mr-1" />
                          My Profile
                        </Link>
                        <Link href="/dashboard" className="neon-button-cyan-sm px-3 py-1.5 text-white text-sm font-medium flex items-center">
                          <BarChart className="w-3.5 h-3.5 mr-1" />
                          Dashboard
                        </Link>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-400 mb-4">Join the Nakamoto League to track your progress, compete in tournaments, and join elite tech dojos.</p>
                      <div className="flex flex-wrap gap-2">
                        <Link href="/login" className="neon-button-red-sm px-3 py-1.5 text-white text-sm font-medium flex items-center">
                          <User className="w-3.5 h-3.5 mr-1" />
                          Sign In
                        </Link>
                        <Link href="/register" className="neon-button-cyan-sm px-3 py-1.5 text-white text-sm font-medium flex items-center">
                          <ArrowRight className="w-3.5 h-3.5 mr-1" />
                          Register
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Dashboard Content */}
        <section id="dashboard" className="relative py-8">
          <div className="container mx-auto px-4 relative">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Main Content - Tournaments */}
              <div className="lg:col-span-2 order-2 lg:order-1">
                <div className="bg-gray-900/40 backdrop-blur-sm rounded-lg border border-gray-800 overflow-hidden">
                  {/* Tabs and Search Bar */}
                  <div className="border-b border-gray-800 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex space-x-1">
                      <button 
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'upcoming' ? 'bg-red-500/20 text-red-400' : 'text-gray-400 hover:text-white'}`}
                        onClick={() => setActiveTab('upcoming')}
                      >
                        Upcoming Tournaments
                      </button>
                      <button 
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'ongoing' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white'}`}
                        onClick={() => setActiveTab('ongoing')}
                      >
                        Ongoing Battles
                      </button>
                    </div>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                      <input 
                        type="text" 
                        placeholder="Search tournaments..." 
                        className="w-full py-2 pl-9 pr-4 bg-gray-800/50 border border-gray-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  {/* Tournament Cards */}
                  <div className="p-4">
                    {filteredTournaments.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        No tournaments found matching your search.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filteredTournaments.map((tournament) => (
                          <Link
                            key={tournament.id}
                            href={`/tournaments/${tournament.id}`}
                            className="block bg-gray-800/30 hover:bg-gray-800/50 border border-gray-800 rounded-md overflow-hidden transition-colors group"
                          >
                            <div className="flex flex-col md:flex-row">
                              <div className="md:w-1/4 h-32 md:h-auto relative">
                                <Image
                                  src={tournament.image}
                                  alt={tournament.title}
                                  fill
                                  className="object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-br from-gray-900/70 to-gray-900/30 mix-blend-overlay"></div>
                                {tournament.prize && (
                                  <div className="absolute top-2 left-2 cyber-badge-red text-xs py-1">
                                    {tournament.prize}
                                  </div>
                                )}
                              </div>
                              <div className="p-4 md:w-3/4 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-start justify-between">
                                    <h3 className="text-lg font-bold mb-2 text-white group-hover:text-cyan-400 transition-colors">
                                      {tournament.title}
                                    </h3>
                                    {activeTab === 'ongoing' && (
                                      <div className="flex items-center gap-1 bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-xs">
                                        <Clock className="w-3 h-3" />
                                        {tournament.daysLeft} days left
                                      </div>
                                    )}
                                    {activeTab === 'upcoming' && (
                                      <div className={`text-xs px-2 py-1 rounded ${tournament.status === 'Registration Open' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                        {tournament.status}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-2 mb-3">
                                    {tournament.tags.map((tag, idx) => (
                                      <span key={idx} className="text-xs bg-gray-700/50 text-gray-300 px-2 py-0.5 rounded">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-2 text-sm text-gray-400">
                                    <div className="flex items-center">
                                      <Calendar className="w-4 h-4 mr-1.5 text-red-400" />
                                      {tournament.date}
                                    </div>
                                    <div className="flex items-center">
                                      <MapPin className="w-4 h-4 mr-1.5 text-red-400" />
                                      {tournament.location}
                                    </div>
                                    <div className="flex items-center">
                                      <Users className="w-4 h-4 mr-1.5 text-red-400" />
                                      {tournament.participants} participants
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex justify-between items-center mt-3">
                                  <div className="flex items-center text-sm">
                                    <Shield className="w-4 h-4 mr-1.5 text-cyan-400" />
                                    <span className="text-gray-300">Hosted by:</span>
                                    <span className="ml-1 text-cyan-400">{tournament.dojoHost}</span>
                                  </div>
                                  
                                  {activeTab === 'ongoing' && (
                                    <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-gradient-to-r from-cyan-500 to-purple-500" 
                                        style={{ width: `${tournament.progress}%` }}
                                      ></div>
                                    </div>
                                  )}
                                  
                                  {activeTab === 'upcoming' && (
                                    <div className="text-sm text-gray-400">
                                      Registration ends: {new Date(tournament.registrationEnds).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                    
                    <div className="mt-6 text-center">
                      <Link href="/tournaments" className="neon-button-cyan-sm px-4 py-2 text-white text-sm font-medium inline-flex items-center">
                        View All Tournaments
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Link>
                    </div>
                  </div>
                </div>
                
                {/* Top Warriors */}
                <div className="mt-6 bg-gray-900/40 backdrop-blur-sm rounded-lg border border-gray-800 overflow-hidden">
                  <div className="border-b border-gray-800 p-4 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-white font-serif-jp flex items-center">
                      <Award className="w-5 h-5 mr-2 text-red-400" />
                      Top Warriors
                    </h2>
                    <Link href="/leaderboard" className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center">
                      View Leaderboard
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                  
                  <div className="p-4">
                    <div className="space-y-4">
                      {/* Top Warriors */}
                      {topWarriors.map((warrior) => (
                        <div 
                          key={warrior.id} 
                          onClick={() => router.push(`/warriors/${warrior.id}`)}
                          className="flex items-center justify-between bg-gray-800/30 border border-gray-800 rounded-md p-3 hover:bg-gray-800/50 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center">
                            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-cyan-500/30 mr-3">
                              <Image 
                                src={warrior.avatar}
                                alt={warrior.name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                            <div>
                              <div className="flex items-center">
                                <p className="font-medium text-white">{warrior.name}</p>
                                <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
                                  #{warrior.rank}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-cyan-400">{warrior.dojo}</p>
                            <p className="text-xs text-gray-400">
                              <Trophy className="w-3 h-3 inline mr-1 text-red-400" />
                              {warrior.victories} victories
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Sidebar Content */}
              <div className="order-1 lg:order-2">
                {/* User Quick Stats */}
                <div className="bg-gray-900/40 backdrop-blur-sm rounded-lg border border-gray-800 p-4 mb-6">
                  <h2 className="text-lg font-bold text-white font-serif-jp mb-4 flex items-center">
                    <BarChart className="w-5 h-5 mr-2 text-cyan-400" />
                    Your Tournament Stats
                  </h2>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Total Tournaments</span>
                      <span className="text-white font-medium">7</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Victories</span>
                      <span className="text-red-400 font-medium">3</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Top Placement</span>
                      <span className="text-cyan-400 font-medium">2nd Place</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Current Streak</span>
                      <span className="text-purple-400 font-medium">2 tournaments</span>
                    </div>
                    
                    <div className="pt-2 border-t border-gray-800">
                      <Link href="/profile/tournaments" className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center justify-end">
                        View Tournament History
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Link>
                    </div>
                  </div>
                </div>
                
                {/* Top Dojos */}
                <div className="bg-gray-900/40 backdrop-blur-sm rounded-lg border border-gray-800 overflow-hidden mb-6">
                  <div className="border-b border-gray-800 p-4 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-white font-serif-jp flex items-center">
                      <Shield className="w-5 h-5 mr-2 text-red-400" />
                      Top Dojos
                    </h2>
                    <Link href="/dojos" className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center">
                      View All
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                  
                  <div className="p-4">
                    <div className="space-y-3">
                      {topDojos.slice(0, 3).map((dojo) => (
                        <Link
                          key={dojo.id}
                          href={`/dojos/${dojo.id}`}
                          className="flex items-center p-2 hover:bg-gray-800/50 rounded-md transition-colors group"
                        >
                          <div className="relative w-10 h-10 rounded overflow-hidden mr-3 border border-gray-700">
                            <Image 
                              src={dojo.image}
                              alt={dojo.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-white group-hover:text-cyan-400 transition-colors">{dojo.name}</p>
                            <div className="flex text-xs text-gray-400">
                              <span className="flex items-center mr-3">
                                <Users className="w-3 h-3 mr-1" />
                                {dojo.members}
                              </span>
                              <span className="flex items-center">
                                <Trophy className="w-3 h-3 mr-1 text-red-400" />
                                {dojo.victories} wins
                              </span>
                            </div>
                          </div>
                          <div className="cyber-badge-cyan text-xs py-1">
                            {dojo.activeTournaments} active
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Activity Feed
                <div className="bg-gray-900/40 backdrop-blur-sm rounded-lg border border-gray-800 overflow-hidden">
                  <div className="border-b border-gray-800 p-4 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-white font-serif-jp flex items-center">
                      <Bell className="w-5 h-5 mr-2 text-purple-400" />
                      Recent Activity
                    </h2>
                    <Link href="/activity" className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center">
                      View All
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                  
                  <div className="p-4">
                    <div className="space-y-4">
                      {recentActivities.map((activity) => (
                        <div key={activity.id} className="p-3 bg-gray-800/30 border border-gray-800 rounded-md">
                          <div className="flex items-start">
                            <div className="mr-3 mt-1">
                              {activity.type === 'trophy' && <Trophy className="w-5 h-5 text-red-400" />}
                              {activity.type === 'notification' && <Bell className="w-5 h-5 text-cyan-400" />}
                              {activity.type === 'achievement' && <Award className="w-5 h-5 text-purple-400" />}
                              {activity.type === 'dojo' && <Shield className="w-5 h-5 text-cyan-400" />}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-gray-300">{activity.content}</p>
                              <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div> */}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}