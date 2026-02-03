import { useState } from 'react';
import { Target, Plus, X, Check } from 'lucide-react';

interface ColorPalette {
  id: string;
  name: string;
  description: string;
  colors: {
    background: string;
    primary: string;
    secondary: string;
    success: string;
    danger: string;
    text: string;
    border: string;
  };
}

const palettes: ColorPalette[] = [
  {
    id: 'palette-1',
    name: 'Modern Blue',
    description: 'Clean blue with warm accents',
    colors: {
      background: 'bg-slate-50',
      primary: 'bg-blue-500',
      secondary: 'bg-indigo-400',
      success: 'bg-green-500',
      danger: 'bg-red-500',
      text: 'text-black',
      border: 'border-black',
    },
  },
  {
    id: 'palette-2',
    name: 'Vibrant Teal',
    description: 'Fresh teal with energetic accents',
    colors: {
      background: 'bg-cyan-50',
      primary: 'bg-teal-500',
      secondary: 'bg-cyan-400',
      success: 'bg-emerald-500',
      danger: 'bg-rose-500',
      text: 'text-black',
      border: 'border-black',
    },
  },
  {
    id: 'palette-3',
    name: 'Warm Orange',
    description: 'Energetic orange with cool balance',
    colors: {
      background: 'bg-orange-50',
      primary: 'bg-orange-500',
      secondary: 'bg-amber-400',
      success: 'bg-lime-500',
      danger: 'bg-red-600',
      text: 'text-black',
      border: 'border-black',
    },
  },
  {
    id: 'palette-4',
    name: 'Sophisticated Purple',
    description: 'Rich purple with modern accents',
    colors: {
      background: 'bg-violet-50',
      primary: 'bg-purple-500',
      secondary: 'bg-violet-400',
      success: 'bg-green-500',
      danger: 'bg-pink-500',
      text: 'text-black',
      border: 'border-black',
    },
  },
  {
    id: 'palette-5',
    name: 'Natural Green',
    description: 'Fresh green with earthy tones',
    colors: {
      background: 'bg-green-50',
      primary: 'bg-emerald-500',
      secondary: 'bg-teal-400',
      success: 'bg-lime-500',
      danger: 'bg-red-500',
      text: 'text-black',
      border: 'border-black',
    },
  },
  {
    id: 'palette-6',
    name: 'Minimal Gray',
    description: 'Neutral gray with subtle accents',
    colors: {
      background: 'bg-gray-100',
      primary: 'bg-slate-600',
      secondary: 'bg-gray-400',
      success: 'bg-green-600',
      danger: 'bg-red-600',
      text: 'text-black',
      border: 'border-black',
    },
  },
  {
    id: 'palette-7',
    name: 'Bold Pink',
    description: 'Vibrant pink with playful accents',
    colors: {
      background: 'bg-pink-50',
      primary: 'bg-pink-500',
      secondary: 'bg-rose-400',
      success: 'bg-green-500',
      danger: 'bg-red-600',
      text: 'text-black',
      border: 'border-black',
    },
  },
  {
    id: 'palette-8',
    name: 'Ocean Blue',
    description: 'Calming blue with sea-inspired tones',
    colors: {
      background: 'bg-blue-50',
      primary: 'bg-blue-600',
      secondary: 'bg-sky-400',
      success: 'bg-teal-500',
      danger: 'bg-red-500',
      text: 'text-black',
      border: 'border-black',
    },
  },
];

export default function ColorPalettes() {
  const [selectedPalette, setSelectedPalette] = useState<string | null>(null);

  const renderPreview = (palette: ColorPalette) => {
    const { colors } = palette;
    
    return (
      <div className={`${colors.background} p-6 rounded-none border-4 ${colors.border} min-h-[500px]`}>
        {/* Header */}
        <div className="mb-6">
          <h2 className={`text-2xl font-black ${colors.text} mb-2 uppercase`}>Dashboard Preview</h2>
          <p className={`text-sm ${colors.text} font-bold`}>Team performance overview</p>
        </div>

        {/* KPIs - Using Primary, Secondary, Success, Danger */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className={`${colors.primary} border-4 ${colors.border} rounded-none p-4`}>
            <p className={`text-xs font-black ${colors.text} mb-2 uppercase`}>Team Average</p>
            <p className={`text-3xl font-black ${colors.text}`}>185.5</p>
            <p className={`text-xs mt-2 font-bold ${colors.text}`}>Average score</p>
          </div>
          <div className={`${colors.secondary} border-4 ${colors.border} rounded-none p-4`}>
            <p className={`text-xs font-black ${colors.text} mb-2 uppercase`}>Total Games</p>
            <p className={`text-3xl font-black ${colors.text}`}>42</p>
            <p className={`text-xs mt-2 font-bold ${colors.text}`}>Individual games</p>
          </div>
          <div className={`${colors.success} border-4 ${colors.border} rounded-none p-4`}>
            <p className={`text-xs font-black ${colors.text} mb-2 uppercase`}>Strike %</p>
            <p className={`text-3xl font-black ${colors.text}`}>35.2%</p>
          </div>
          <div className={`${colors.primary} border-4 ${colors.border} rounded-none p-4`}>
            <p className={`text-xs font-black ${colors.text} mb-2 uppercase`}>Spare %</p>
            <p className={`text-3xl font-black ${colors.text}`}>28.5%</p>
          </div>
        </div>

        {/* Leaderboard */}
        <div className={`bg-white border-4 ${colors.border} rounded-none p-4 mb-6`}>
          <h3 className={`text-lg font-black ${colors.text} mb-4 uppercase`}>Top Games</h3>
          <div className="space-y-2">
            {[
              { rank: 1, name: 'Andres', value: 245 },
              { rank: 2, name: 'Santiago', value: 230 },
              { rank: 3, name: 'Diego', value: 225 },
            ].map((item) => (
              <div
                key={item.rank}
                className={`flex items-center justify-between p-3 rounded-none border-4 ${colors.border} ${
                  item.rank === 1 ? colors.secondary : 'bg-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-black ${colors.text} w-6 text-center`}>#{item.rank}</span>
                  <p className={`font-black text-sm ${colors.text}`}>{item.name}</p>
                </div>
                <span className={`text-xl font-black ${colors.text}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Buttons - Using all 4 colors */}
        <div className="flex flex-wrap gap-3 mb-4">
          <button className={`${colors.primary} border-4 ${colors.border} ${colors.text} px-4 py-2 rounded-none font-black flex items-center gap-2`}>
            <Plus className="w-4 h-4" />
            Primary
          </button>
          <button className={`${colors.secondary} border-4 ${colors.border} ${colors.text} px-4 py-2 rounded-none font-black flex items-center gap-2`}>
            <Target className="w-4 h-4" />
            Secondary
          </button>
          <button className={`${colors.success} border-4 ${colors.border} ${colors.text} px-4 py-2 rounded-none font-black flex items-center gap-2`}>
            <Check className="w-4 h-4" />
            Success
          </button>
          <button className={`${colors.danger} border-4 ${colors.border} ${colors.text} px-4 py-2 rounded-none font-black flex items-center gap-2`}>
            <X className="w-4 h-4" />
            Danger
          </button>
        </div>

        {/* Player Card Example - Using all 4 colors */}
        <div className={`bg-white border-4 ${colors.border} rounded-none p-4 mt-6`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-lg font-black ${colors.text}`}>Andres</h3>
            <button className={`${colors.danger} border-4 ${colors.border} ${colors.text} p-2 font-black`}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`${colors.primary} border-2 ${colors.border} px-2 py-1 text-xs ${colors.text} font-black`}>
              5 games
            </span>
            <span className={`${colors.secondary} border-2 ${colors.border} px-2 py-1 text-xs ${colors.text} font-black`}>
              Avg: 185.5
            </span>
            <span className={`${colors.success} border-2 ${colors.border} px-2 py-1 text-xs ${colors.text} font-black`}>
              Strike: 35.2%
            </span>
            <span className={`${colors.primary} border-2 ${colors.border} px-2 py-1 text-xs ${colors.text} font-black`}>
              Spare: 28.5%
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-yellow-100">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-black uppercase mb-2">Color Palette Options</h1>
          <p className="text-base text-black font-bold">Choose your preferred color scheme for the app</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {palettes.map((palette) => (
            <div key={palette.id} className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-black text-black uppercase">{palette.name}</h2>
                  <p className="text-sm text-black font-bold">{palette.description}</p>
                </div>
                <button
                  onClick={() => setSelectedPalette(selectedPalette === palette.id ? null : palette.id)}
                  className={`px-6 py-3 border-4 border-black font-black ${
                    selectedPalette === palette.id
                      ? 'bg-green-400 text-black'
                      : 'bg-blue-400 text-black hover:bg-blue-500'
                  }`}
                >
                  {selectedPalette === palette.id ? 'Selected ✓' : 'Select'}
                </button>
              </div>
              {renderPreview(palette)}
            </div>
          ))}
        </div>

        {/* Selection Summary */}
        {selectedPalette && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-400 border-4 border-black p-4 z-50">
            <p className="font-black text-black text-center">
              {palettes.find(p => p.id === selectedPalette)?.name} Selected! Let me know when you're ready to apply it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
