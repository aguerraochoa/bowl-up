import { useState } from 'react';
import { Check, Target, Calendar, Trophy, Zap } from 'lucide-react';

type DesignSystem = {
  id: string;
  name: string;
  description: string;
  style: string;
};

const designSystems: DesignSystem[] = [
  {
    id: 'minimal',
    name: 'Minimal Clean',
    description: 'Ultra-clean with lots of whitespace. Subtle borders, soft shadows, refined typography.',
    style: 'minimal',
  },
  {
    id: 'bold',
    name: 'Bold Modern',
    description: 'Strong visual hierarchy. Bold colors, prominent cards, dynamic layouts.',
    style: 'bold',
  },
  {
    id: 'glass',
    name: 'Glassmorphism',
    description: 'Modern glass effect. Frosted backgrounds, subtle blur, layered depth.',
    style: 'glass',
  },
  {
    id: 'sport',
    name: 'Sport Energy',
    description: 'Energetic and dynamic. Vibrant colors, strong contrasts, athletic feel.',
    style: 'sport',
  },
  {
    id: 'neobrutal',
    name: 'Neobrutalism',
    description: 'Bold and unapologetic. Sharp edges, high contrast, raw aesthetic.',
    style: 'neobrutal',
  },
  {
    id: 'elegant',
    name: 'Elegant Premium',
    description: 'Sophisticated and refined. Rich colors, elegant typography, premium feel.',
    style: 'elegant',
  },
];

const mockData = {
  teamGameAverage: 165.3,
  gamesPlayed: 24,
  averageScorePerGame: 168.7,
  strikePercentage: 42.5,
  sparePercentage: 38.2,
  topGames: [
    { name: 'Andres', score: 245, date: '2024-01-15' },
    { name: 'Diego', score: 238, date: '2024-01-20' },
    { name: 'Santiago', score: 232, date: '2024-01-18' },
  ],
  topAverages: [
    { name: 'Andres', avg: 178.5 },
    { name: 'Diego', avg: 172.3 },
    { name: 'Santiago', avg: 168.9 },
  ],
};

export default function Designs() {
  const [selectedDesign, setSelectedDesign] = useState<string | null>(null);

  const handleSelectDesign = (designId: string) => {
    setSelectedDesign(designId);
    localStorage.setItem('bowlup_selected_design', designId);
  };

  const renderMinimalDesign = () => (
    <div className="bg-white p-6 rounded-3xl">
      <div className="mb-8">
        <h1 className="text-4xl font-light text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-500 text-sm">Team performance overview</p>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="border border-gray-200 rounded-xl p-6 bg-gray-50/50">
          <p className="text-xs text-gray-500 mb-2 font-medium">Team Game Average</p>
          <p className="text-4xl font-light text-gray-900">{mockData.teamGameAverage}</p>
        </div>
        <div className="border border-gray-200 rounded-xl p-6 bg-gray-50/50">
          <p className="text-xs text-gray-500 mb-2 font-medium">Games Played</p>
          <p className="text-4xl font-light text-gray-900">{mockData.gamesPlayed}</p>
        </div>
        <div className="border border-gray-200 rounded-xl p-6 bg-gray-50/50">
          <p className="text-xs text-gray-500 mb-2 font-medium">Avg Score/Game</p>
          <p className="text-4xl font-light text-gray-900">{mockData.averageScorePerGame}</p>
        </div>
        <div className="border border-gray-200 rounded-xl p-6 bg-gray-50/50">
          <p className="text-xs text-gray-500 mb-2 font-medium">Strike %</p>
          <p className="text-4xl font-light text-gray-900">{mockData.strikePercentage}%</p>
        </div>
      </div>
      <div className="border border-gray-200 rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Top Individual Games</h3>
        <div className="space-y-3">
          {mockData.topGames.map((game, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-900">#{i + 1} {game.name}</p>
                <p className="text-xs text-gray-500">{game.date}</p>
              </div>
              <p className="text-lg font-light text-gray-900">{game.score}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderBoldDesign = () => (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-3xl">
      <div className="mb-8">
        <h1 className="text-5xl font-black text-white mb-2">DASHBOARD</h1>
        <p className="text-gray-400 text-sm font-semibold">TEAM PERFORMANCE OVERVIEW</p>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-blue-600 rounded-2xl p-6 shadow-2xl border-4 border-blue-400">
          <p className="text-xs text-blue-100 mb-2 font-bold uppercase">Team Game Average</p>
          <p className="text-5xl font-black text-white">{mockData.teamGameAverage}</p>
        </div>
        <div className="bg-purple-600 rounded-2xl p-6 shadow-2xl border-4 border-purple-400">
          <p className="text-xs text-purple-100 mb-2 font-bold uppercase">Games Played</p>
          <p className="text-5xl font-black text-white">{mockData.gamesPlayed}</p>
        </div>
        <div className="bg-orange-600 rounded-2xl p-6 shadow-2xl border-4 border-orange-400">
          <p className="text-xs text-orange-100 mb-2 font-bold uppercase">Avg Score/Game</p>
          <p className="text-5xl font-black text-white">{mockData.averageScorePerGame}</p>
        </div>
        <div className="bg-red-600 rounded-2xl p-6 shadow-2xl border-4 border-red-400">
          <p className="text-xs text-red-100 mb-2 font-bold uppercase">Strike %</p>
          <p className="text-5xl font-black text-white">{mockData.strikePercentage}%</p>
        </div>
      </div>
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border-2 border-white/20">
        <h3 className="text-lg font-black text-white mb-4 uppercase">Top Individual Games</h3>
        <div className="space-y-3">
          {mockData.topGames.map((game, i) => (
            <div key={i} className="bg-white/10 rounded-xl p-4 border-2 border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-black text-white">#{i + 1} {game.name}</p>
                  <p className="text-xs text-gray-300">{game.date}</p>
                </div>
                <p className="text-2xl font-black text-white">{game.score}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderGlassDesign = () => (
    <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6 rounded-3xl">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600 text-sm">Team performance overview</p>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/80 shadow-xl">
          <p className="text-xs text-gray-600 mb-2 font-medium">Team Game Average</p>
          <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{mockData.teamGameAverage}</p>
        </div>
        <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/80 shadow-xl">
          <p className="text-xs text-gray-600 mb-2 font-medium">Games Played</p>
          <p className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{mockData.gamesPlayed}</p>
        </div>
        <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/80 shadow-xl">
          <p className="text-xs text-gray-600 mb-2 font-medium">Avg Score/Game</p>
          <p className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-red-600 bg-clip-text text-transparent">{mockData.averageScorePerGame}</p>
        </div>
        <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/80 shadow-xl">
          <p className="text-xs text-gray-600 mb-2 font-medium">Strike %</p>
          <p className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent">{mockData.strikePercentage}%</p>
        </div>
      </div>
      <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/80 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Individual Games</h3>
        <div className="space-y-3">
          {mockData.topGames.map((game, i) => (
            <div key={i} className="bg-white/40 backdrop-blur-md rounded-xl p-4 border border-white/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">#{i + 1} {game.name}</p>
                  <p className="text-xs text-gray-600">{game.date}</p>
                </div>
                <p className="text-xl font-bold text-gray-900">{game.score}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSportDesign = () => (
    <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-3xl">
      <div className="mb-8">
        <h1 className="text-5xl font-extrabold text-gray-900 mb-2 tracking-tight">DASHBOARD</h1>
        <p className="text-orange-600 text-sm font-bold">TEAM PERFORMANCE OVERVIEW</p>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl p-6 border-l-4 border-orange-500 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-6 h-6 text-orange-500" />
          </div>
          <p className="text-xs text-gray-600 mb-1 font-semibold uppercase">Team Game Average</p>
          <p className="text-4xl font-extrabold text-gray-900">{mockData.teamGameAverage}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border-l-4 border-red-500 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-xs text-gray-600 mb-1 font-semibold uppercase">Games Played</p>
          <p className="text-4xl font-extrabold text-gray-900">{mockData.gamesPlayed}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border-l-4 border-yellow-500 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
          </div>
          <p className="text-xs text-gray-600 mb-1 font-semibold uppercase">Avg Score/Game</p>
          <p className="text-4xl font-extrabold text-gray-900">{mockData.averageScorePerGame}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border-l-4 border-orange-500 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Zap className="w-6 h-6 text-orange-500" />
          </div>
          <p className="text-xs text-gray-600 mb-1 font-semibold uppercase">Strike %</p>
          <p className="text-4xl font-extrabold text-gray-900">{mockData.strikePercentage}%</p>
        </div>
      </div>
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-extrabold text-gray-900 mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-orange-500" />
          Top Individual Games
        </h3>
        <div className="space-y-2">
          {mockData.topGames.map((game, i) => (
            <div key={i} className={`flex items-center justify-between p-4 rounded-lg ${
              i === 0 ? 'bg-orange-100 border-2 border-orange-300' : 'bg-gray-50'
            }`}>
              <div className="flex items-center gap-3">
                <span className={`text-xl font-black ${
                  i === 0 ? 'text-orange-600' : 'text-gray-400'
                }`}>#{i + 1}</span>
                <div>
                  <p className="font-bold text-gray-900">{game.name}</p>
                  <p className="text-xs text-gray-600">{game.date}</p>
                </div>
              </div>
              <p className="text-2xl font-extrabold text-gray-900">{game.score}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderNeobrutalDesign = () => (
    <div className="bg-yellow-100 p-6 rounded-none border-4 border-black">
      <div className="mb-8">
        <h1 className="text-5xl font-black text-black mb-2">DASHBOARD</h1>
        <p className="text-black text-sm font-bold">TEAM PERFORMANCE OVERVIEW</p>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-blue-400 rounded-none p-6 border-4 border-black shadow-[8px_8px_0_0_#000]">
          <p className="text-xs text-black mb-2 font-black uppercase">Team Game Average</p>
          <p className="text-5xl font-black text-black">{mockData.teamGameAverage}</p>
        </div>
        <div className="bg-pink-400 rounded-none p-6 border-4 border-black shadow-[8px_8px_0_0_#000]">
          <p className="text-xs text-black mb-2 font-black uppercase">Games Played</p>
          <p className="text-5xl font-black text-black">{mockData.gamesPlayed}</p>
        </div>
        <div className="bg-green-400 rounded-none p-6 border-4 border-black shadow-[8px_8px_0_0_#000]">
          <p className="text-xs text-black mb-2 font-black uppercase">Avg Score/Game</p>
          <p className="text-5xl font-black text-black">{mockData.averageScorePerGame}</p>
        </div>
        <div className="bg-purple-400 rounded-none p-6 border-4 border-black shadow-[8px_8px_0_0_#000]">
          <p className="text-xs text-black mb-2 font-black uppercase">Strike %</p>
          <p className="text-5xl font-black text-black">{mockData.strikePercentage}%</p>
        </div>
      </div>
      <div className="bg-white rounded-none p-6 border-4 border-black shadow-[8px_8px_0_0_#000]">
        <h3 className="text-xl font-black text-black mb-4 uppercase">Top Individual Games</h3>
        <div className="space-y-3">
          {mockData.topGames.map((game, i) => (
            <div key={i} className={`rounded-none p-4 border-4 border-black ${
              i === 0 ? 'bg-yellow-300' : 'bg-white'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl font-black text-black">#{i + 1}</span>
                  <div>
                    <p className="font-black text-black">{game.name}</p>
                    <p className="text-xs text-black">{game.date}</p>
                  </div>
                </div>
                <p className="text-2xl font-black text-black">{game.score}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderElegantDesign = () => (
    <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8 rounded-3xl">
      <div className="mb-10">
        <h1 className="text-5xl font-light text-white mb-3 tracking-wide">Dashboard</h1>
        <div className="w-20 h-1 bg-gradient-to-r from-purple-400 to-pink-400"></div>
        <p className="text-gray-400 text-sm mt-3 font-light">Team performance overview</p>
      </div>
      <div className="grid grid-cols-2 gap-6 mb-10">
        <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30 shadow-2xl">
          <p className="text-xs text-purple-300 mb-3 font-light tracking-wider uppercase">Team Game Average</p>
          <p className="text-5xl font-light text-white">{mockData.teamGameAverage}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/30 shadow-2xl">
          <p className="text-xs text-blue-300 mb-3 font-light tracking-wider uppercase">Games Played</p>
          <p className="text-5xl font-light text-white">{mockData.gamesPlayed}</p>
        </div>
        <div className="bg-gradient-to-br from-pink-900/50 to-rose-900/50 backdrop-blur-sm rounded-2xl p-6 border border-pink-500/30 shadow-2xl">
          <p className="text-xs text-pink-300 mb-3 font-light tracking-wider uppercase">Avg Score/Game</p>
          <p className="text-5xl font-light text-white">{mockData.averageScorePerGame}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm rounded-2xl p-6 border border-amber-500/30 shadow-2xl">
          <p className="text-xs text-amber-300 mb-3 font-light tracking-wider uppercase">Strike %</p>
          <p className="text-5xl font-light text-white">{mockData.strikePercentage}%</p>
        </div>
      </div>
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/20 shadow-2xl">
        <h3 className="text-2xl font-light text-white mb-6 tracking-wide">Top Individual Games</h3>
        <div className="space-y-4">
          {mockData.topGames.map((game, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white font-light text-lg">#{i + 1}</span>
                  </div>
                  <div>
                    <p className="text-white font-light text-base">{game.name}</p>
                    <p className="text-gray-400 text-xs font-light">{game.date}</p>
                  </div>
                </div>
                <p className="text-3xl font-light text-white">{game.score}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderDesignPreview = (designId: string) => {
    switch (designId) {
      case 'minimal':
        return renderMinimalDesign();
      case 'bold':
        return renderBoldDesign();
      case 'glass':
        return renderGlassDesign();
      case 'sport':
        return renderSportDesign();
      case 'neobrutal':
        return renderNeobrutalDesign();
      case 'elegant':
        return renderElegantDesign();
      default:
        return renderMinimalDesign();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-20 safe-top">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Design Systems</h1>
          <p className="text-gray-600">Choose a design system to apply to BowlUp. Each shows how the dashboard would look.</p>
        </div>

        <div className="space-y-12">
          {designSystems.map((design) => (
            <div key={design.id} className="bg-white rounded-3xl p-8 shadow-xl border border-gray-200">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">{design.name}</h2>
                  <p className="text-gray-600">{design.description}</p>
                </div>
                <button
                  onClick={() => handleSelectDesign(design.id)}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                    selectedDesign === design.id
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {selectedDesign === design.id ? (
                    <span className="flex items-center gap-2">
                      <Check className="w-5 h-5" />
                      Selected
                    </span>
                  ) : (
                    'Select This Design'
                  )}
                </button>
              </div>

              {/* Design Preview */}
              <div className="border-2 border-gray-200 rounded-2xl overflow-hidden bg-gray-50">
                <div className="p-4 bg-gray-100 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="ml-4 text-xs text-gray-600 font-mono">Dashboard Preview</span>
                  </div>
                </div>
                <div className="p-6 max-h-[600px] overflow-y-auto">
                  {renderDesignPreview(design.id)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedDesign && (
          <div className="mt-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-2xl">
            <p className="text-blue-900 font-semibold mb-2 text-lg">
              ✓ Design Selected: {designSystems.find(d => d.id === selectedDesign)?.name}
            </p>
            <p className="text-blue-700 text-sm">
              Tell me "apply the selected design" and I'll update the entire app with this design system!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
