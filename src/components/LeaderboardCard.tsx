'use client';

import React from 'react';
import { Sword } from 'lucide-react';
import Link from 'next/link';

interface University {
  name: string;
  rank: number;
  score: number;
  hackathonsWon: number;
}

interface LeaderboardCardProps {
  universities: University[];
}

const LeaderboardCard = ({ universities }: LeaderboardCardProps) => {
  return (
    <div className="cyber-card rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 text-transparent bg-clip-text">
          Dojo Rankings
        </h2>
        <Link href="/dojos" className="text-purple-400 text-sm hover:text-purple-300">
          View All
        </Link>
      </div>
      
      <div className="space-y-4">
        {universities.map((uni, index) => (
          <div key={uni.name} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-purple-500/10 hover:border-purple-500/30 transition-colors">
            <div className="flex items-center gap-4">
              <span className={`text-lg font-bold ${
                index === 0 ? 'text-yellow-400' : 
                index === 1 ? 'text-slate-400' : 
                index === 2 ? 'text-amber-600' : 
                'text-slate-600'
              }`}>
                #{uni.rank}
              </span>
              <div>
                <h3 className="font-semibold text-slate-200">{uni.name}</h3>
                <p className="text-sm text-slate-400">{uni.score} power level</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Sword className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-400">{uni.hackathonsWon}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LeaderboardCard;