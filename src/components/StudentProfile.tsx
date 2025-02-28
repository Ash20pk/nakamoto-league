'use client';

import React from 'react';
import { Award, Sword, Zap } from 'lucide-react';
import Image from 'next/image';

interface StudentProfileProps {
  student: {
    name: string;
    university: string;
    rank: number;
    hackathonsAttended: number;
    hackathonsWon: number;
    skills: string[];
    avatar: string;
  };
}

const StudentProfile = ({ student }: StudentProfileProps) => {
  return (
    <div className="cyber-card rounded-lg p-6">
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-purple-500/50 mb-4">
            <Image
              src={student.avatar}
              alt={student.name}
              width={96}
              height={96}
              className="object-cover w-full h-full"
              unoptimized
            />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-purple-500 to-blue-500 p-2 rounded">
            <Zap className="w-4 h-4 text-white" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-slate-200">{student.name}</h2>
        <p className="text-purple-400 mb-4">{student.university}</p>
        
        <div className="grid grid-cols-3 gap-4 w-full mb-6">
          <div className="text-center p-2 bg-slate-800/50 rounded-lg border border-purple-500/10">
            <Sword className="w-5 h-5 mx-auto text-purple-400 mb-1" />
            <p className="text-sm text-slate-400">Victories</p>
            <p className="font-bold text-purple-400">{student.hackathonsWon}</p>
          </div>
          <div className="text-center p-2 bg-slate-800/50 rounded-lg border border-purple-500/10">
            <Zap className="w-5 h-5 mx-auto text-blue-400 mb-1" />
            <p className="text-sm text-slate-400">Battles</p>
            <p className="font-bold text-blue-400">{student.hackathonsAttended}</p>
          </div>
          <div className="text-center p-2 bg-slate-800/50 rounded-lg border border-purple-500/10">
            <Award className="w-5 h-5 mx-auto text-violet-400 mb-1" />
            <p className="text-sm text-slate-400">Rank</p>
            <p className="font-bold text-violet-400">#{student.rank}</p>
          </div>
        </div>

        <div className="w-full">
          <h3 className="text-left font-semibold mb-2 text-slate-300">Tech Stack</h3>
          <div className="flex flex-wrap gap-2">
            {student.skills.map((skill) => (
              <span
                key={skill}
                className="px-3 py-1 bg-purple-900/30 text-purple-400 rounded-lg border border-purple-500/20 text-sm"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentProfile;