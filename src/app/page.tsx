'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowRight, Calendar, Users, MapPin, Trophy, 
  Sword, Shield, Zap, Code, GitBranch, 
  ChevronRight, Clock, BarChart, Filter, Search,
  Bell, User, ExternalLink, Award, Bookmark 
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function Home() {
  const [loaded, setLoaded] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [glitchEffect, setGlitchEffect] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [searchQuery, setSearchQuery] = useState('');

  // Sample data
  const upcomingTournaments = [
    {
      id: 1,
      title: 'Blockchain Battle Royale',
      date: 'March 15-20, 2025',
      location: 'Virtual Dojo',
      participants: 128,
      image: '/images/tournament-1.jpg',
      prize: '$10,000',
      registrationEnds: '2025-03-10',
      status: 'Registration Open',
      tags: ['Blockchain', 'Web3', 'DeFi'],
      dojoHost: 'Tokyo Blockchain Dojo'
    },
    {
      id: 2,
      title: 'Smart Contract Showdown',
      date: 'April 5-10, 2025',
      location: 'Kyoto Tech Hub',
      participants: 96,
      image: '/images/tournament-2.jpg',
      prize: '$8,500',
      registrationEnds: '2025-03-30',
      status: 'Registration Open',
      tags: ['Smart Contracts', 'Ethereum', 'Solidity'],
      dojoHost: 'Kyoto Code Masters'
    },
    {
      id: 3,
      title: 'Web3 Warriors Challenge',
      date: 'April 25-30, 2025',
      location: 'Tokyo Digital Arena',
      participants: 144,
      image: '/images/tournament-3.jpg',
      prize: '$12,000',
      registrationEnds: '2025-04-15',
      status: 'Registration Open',
      tags: ['Web3', 'NFTs', 'Gaming'],
      dojoHost: 'Osaka Dev Warriors'
    }
  ];

  const ongoingTournaments = [
    {
      id: 4,
      title: 'Zero Knowledge Hackathon',
      date: 'Feb 25-Mar 3, 2025',
      location: 'Virtual',
      participants: 210,
      image: '/images/tournament-4.jpg',
      prize: '$15,000',
      progress: 65,
      daysLeft: 3,
      tags: ['ZK Proofs', 'Privacy', 'Cryptography'],
      dojoHost: 'Sapporo Crypto Academy'
    },
    {
      id: 5,
      title: 'DeFi Development Summit',
      date: 'Feb 20-Mar 5, 2025',
      location: 'Hybrid - Tokyo & Virtual',
      participants: 175,
      image: '/images/tournament-5.jpg',
      prize: '$11,000',
      progress: 80,
      daysLeft: 5,
      tags: ['DeFi', 'Finance', 'Yield'],
      dojoHost: 'Tokyo Blockchain Dojo'
    }
  ];

  const topDojos = [
    {
      id: 1,
      name: 'Tokyo Blockchain Dojo',
      members: 240,
      victories: 12,
      image: '/images/dojo-1.jpg',
      activeTournaments: 2
    },
    {
      id: 2,
      name: 'Kyoto Code Masters',
      members: 185,
      victories: 9,
      image: '/images/dojo-2.jpg',
      activeTournaments: 1
    },
    {
      id: 3,
      name: 'Osaka Dev Warriors',
      members: 210,
      victories: 8,
      image: '/images/dojo-3.jpg',
      activeTournaments: 1
    },
    {
      id: 4,
      name: 'Sapporo Crypto Academy',
      members: 160,
      victories: 7,
      image: '/images/dojo-4.jpg',
      activeTournaments: 1
    }
  ];

  const recentActivities = [
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
  ];

  const topWarriors = [
    {
      id: 1,
      name: "Satoshi Nakamoto",
      rank: 1,
      dojo: "Tokyo Blockchain Dojo",
      victories: 8,
      avatar: "/images/warrior-1.jpg",
      specialty: "Smart Contracts"
    },
    {
      id: 2,
      name: "Vitalik Chen",
      rank: 2,
      dojo: "Kyoto Code Masters",
      victories: 7,
      avatar: "/images/warrior-2.jpg",
      specialty: "DeFi Architecture"
    },
    {
      id: 3,
      name: "Ada Yamaguchi",
      rank: 3,
      dojo: "Osaka Dev Warriors",
      victories: 6,
      avatar: "/images/warrior-3.jpg",
      specialty: "Zero Knowledge"
    },
    {
      id: 4,
      name: "Taro Tanaka",
      rank: 4,
      dojo: "Sapporo Crypto Academy",
      victories: 5,
      avatar: "/images/warrior-4.jpg",
      specialty: "Blockchain Security"
    }
  ];

  useEffect(() => {
    const glitchInterval = setInterval(() => {
      setGlitchEffect(true);
      setTimeout(() => setGlitchEffect(false), 150);
    }, 8000);

    return () => clearInterval(glitchInterval);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);

      const sections = document.querySelectorAll('section[id]');
      sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        if (scrollY >= sectionTop) {
          setActiveSection(section.getAttribute('id'));
        }
      });
    };

    window.addEventListener('scroll', handleScroll);

    setTimeout(() => setLoaded(true), 300);

    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrollY]);

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
                    <Shield className="w-4 h-4 mr-1" />
                    <span>{topDojos.length} Dojos</span>
                  </div>
                </div>
              </div>
              
              <div className={`lg:w-1/2 lg:pl-8 transform transition-all duration-700 ${loaded ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`} style={{ transitionDelay: '0.2s' }}>
                <div className="bg-gray-900/60 backdrop-blur-sm rounded-lg p-4 border border-gray-800">
                  <h3 className="text-lg font-medium mb-3 text-white">Your Warrior Status</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-800/50 backdrop-blur-sm p-3 rounded-md">
                      <p className="text-gray-400 text-xs mb-1">Rank</p>
                      <p className="text-2xl font-bold text-cyan-400">#42</p>
                    </div>
                    <div className="bg-gray-800/50 backdrop-blur-sm p-3 rounded-md">
                      <p className="text-gray-400 text-xs mb-1">Victories</p>
                      <p className="text-2xl font-bold text-red-400">3</p>
                    </div>
                    <div className="bg-gray-800/50 backdrop-blur-sm p-3 rounded-md">
                      <p className="text-gray-400 text-xs mb-1">Active Battles</p>
                      <p className="text-2xl font-bold text-purple-400">1</p>
                    </div>
                    <div className="bg-gray-800/50 backdrop-blur-sm p-3 rounded-md">
                      <p className="text-gray-400 text-xs mb-1">Dojo</p>
                      <p className="text-sm font-bold text-white truncate">Tokyo Blockchain</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/profile" className="neon-button-red-sm px-3 py-1.5 text-white text-sm font-medium flex items-center">
                      <User className="w-3.5 h-3.5 mr-1" />
                      Profile
                    </Link>
                    <Link href="/tournaments/browse" className="neon-button-cyan-sm px-3 py-1.5 text-white text-sm font-medium flex items-center">
                      <Trophy className="w-3.5 h-3.5 mr-1" />
                      Join Tournament
                    </Link>
                  </div>
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
                      {topWarriors.map((warrior) => (
                        <div key={warrior.id} className="flex items-center justify-between bg-gray-800/30 border border-gray-800 rounded-md p-3 hover:bg-gray-800/50 transition-colors">
                          <div className="flex items-center">
                            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-cyan-500/30 mr-3">
                              <Image 
                                src={warrior.avatar}
                                alt={warrior.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div>
                              <div className="flex items-center">
                                <p className="font-medium text-white">{warrior.name}</p>
                                <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
                                  #{warrior.rank}
                                </span>
                              </div>
                              <p className="text-sm text-gray-400">{warrior.specialty}</p>
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
                
                {/* Activity Feed */}
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
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}