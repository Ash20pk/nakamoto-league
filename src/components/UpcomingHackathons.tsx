'use client';

import React from 'react';
import { Calendar, MapPin, Users } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const UpcomingHackathons = () => {
  const hackathons = [
    {
      id: 1,
      title: 'Web3 Showdown',
      universities: ['Neo Tokyo Institute', 'Digital Horizon', 'Cyber Elite'],
      date: '2024-04-15',
      location: 'Metaverse Arena',
      participants: 250,
      image: '/images/hackathon1.jpg',
    },
    {
      id: 2,
      title: 'NFT Battle Royale',
      universities: ['Quantum Academy', 'Digital Nexus', 'Tech Titans'],
      date: '2024-04-22',
      location: 'Virtual Dojo',
      participants: 200,
      image: '/images/hackathon2.jpg',
    },
    {
      id: 3,
      title: 'DeFi Warriors Summit',
      universities: ['Blockchain Institute', 'Crypto Academy', 'Genesis Hub'],
      date: '2024-05-01',
      location: 'Cyber Stadium',
      participants: 180,
      image: '/images/hackathon3.jpg',
    },
  ];

  return (
    <div className="cyber-card rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 text-transparent bg-clip-text">
          Upcoming Battles
        </h2>
        <Link href="/tournaments" className="text-purple-400 text-sm hover:text-purple-300">
          View All
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hackathons.map((hackathon) => (
          <div key={hackathon.id} className="rounded-lg overflow-hidden cyber-card border border-purple-500/20">
            <div className="relative h-48 w-full">
              <Image
                src={hackathon.image}
                alt={hackathon.title}
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
            </div>
            <div className="p-4">
              <h3 className="font-bold text-lg mb-2 text-slate-200">{hackathon.title}</h3>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span>{new Date(hackathon.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <MapPin className="w-4 h-4 text-blue-400" />
                  <span>{hackathon.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Users className="w-4 h-4 text-violet-400" />
                  <span>{hackathon.participants} warriors</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {hackathon.universities.map((uni) => (
                  <span
                    key={uni}
                    className="px-2 py-1 bg-purple-900/30 text-purple-400 rounded border border-purple-500/20 text-xs"
                  >
                    {uni}
                  </span>
                ))}
              </div>

              <Link 
                href={`/tournaments/${hackathon.id}`}
                className="w-full cyber-gradient py-2 rounded pixel-corners text-white font-medium hover:opacity-90 transition-opacity block text-center"
              >
                Join Battle
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default UpcomingHackathons;