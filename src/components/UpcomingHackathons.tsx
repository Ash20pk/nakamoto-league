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
      title: 'NFT Event',
      universities: ['Quantum Academy', 'Digital Nexus', 'Tech Titans'],
      date: '2024-04-22',
      location: 'Virtual Dojo',
      participants: 200,
      image: '/images/hackathon2.jpg',
    },
    {
      id: 3,
      title: 'Blockchain Event',
      universities: ['Blockchain Institute', 'Crypto Academy', 'Genesis Hub'],
      date: '2024-05-01',
      location: 'Cyber Stadium',
      participants: 180,
      image: '/images/hackathon3.jpg',
    },
  ];

  return (
    <div className="bg-slate-900/40 p-8 rounded-lg border border-purple-500/30">
      <h2 className="text-2xl font-bold text-white mb-6">Upcoming Hackathons</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {hackathons.map((hackathon) => (
          <div key={hackathon.id} className="bg-slate-800/50 rounded-lg overflow-hidden border border-purple-500/20">
            <Image
              src={hackathon.image}
              alt={hackathon.title}
              className="w-full h-40 object-cover"
              unoptimized
            />
            <div className="p-4">
              <h3 className="text-xl font-semibold text-white mb-2">{hackathon.title}</h3>
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
                  <span>{hackathon.participants} participants</span>
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
                Join Event
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default UpcomingHackathons;