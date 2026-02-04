import { useState, useEffect } from 'react';
import { getPlayers, getDebts, getDebtTags } from '../utils/storage';
import { ChevronDown, ChevronUp, Plus, Tag } from 'lucide-react';
import type { Debt, DebtTag, Player } from '../types';

export default function DebtsDesigns() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [tags, setTags] = useState<DebtTag[]>([]);
  const [selectedDesign, setSelectedDesign] = useState<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const [loadedPlayers, loadedDebts, loadedTags] = await Promise.all([
        getPlayers(),
        getDebts(),
        getDebtTags(),
      ]);
      setPlayers(loadedPlayers);
      setDebts(loadedDebts);
      setTags(loadedTags);
    };
    loadData();
  }, []);

  // Mock balances calculation
  const calculateBalances = () => {
    const balances: Record<string, number> = {};
    players.forEach((player: Player) => {
      balances[player.id] = 0;
    });

    debts.forEach((debt: Debt) => {
      balances[debt.paidBy] = (balances[debt.paidBy] || 0) + debt.amount;
      if (debt.splitMethod === 'equal') {
        const perPerson = debt.amount / debt.splitBetween.length;
        debt.splitBetween.forEach((playerId: string) => {
          balances[playerId] = (balances[playerId] || 0) - perPerson;
        });
      }
    });

    return balances;
  };

  const balances = calculateBalances();
  const getPlayerName = (playerId: string) => players.find((p: Player) => p.id === playerId)?.name || 'Unknown';
  const getTagName = (tagId: string | undefined) => {
    if (!tagId) return 'Custom Expense';
    return tags.find((t: DebtTag) => t.id === tagId)?.name || tagId;
  };

  // Design 1: Collapsible Sections
  const Design1 = () => {
    const [balancesExpanded, setBalancesExpanded] = useState(false);
    const [tagsExpanded, setTagsExpanded] = useState(false);

    return (
      <div className="bg-yellow-100 min-h-screen pb-20">
        <div className="px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-black text-black uppercase">Debts Tracker</h1>
              <p className="text-sm text-black font-bold">Track payments and expenses</p>
            </div>
            <div className="flex gap-2">
              <button className="bg-pink-400 border-4 border-black text-black px-3 py-2 rounded-none hover:bg-pink-500  font-black">
                <Tag className="w-4 h-4" />
              </button>
              <button className="bg-blue-400 border-4 border-black text-black p-2 rounded-none hover:bg-blue-500  font-black">
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Balances - Collapsible */}
          <div className="bg-white border-4 border-black mb-4 ">
            <button
              onClick={() => setBalancesExpanded(!balancesExpanded)}
              className="w-full flex items-center justify-between p-4 bg-yellow-300 border-b-4 border-black"
            >
              <h2 className="text-lg font-black text-black uppercase">Balances</h2>
              {balancesExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            {balancesExpanded && (
              <div className="p-4 space-y-2">
                {players.map(player => {
                  const balance = balances[player.id] || 0;
                  return (
                    <div key={player.id} className={`flex items-center justify-between p-3 border-4 border-black ${
                      balance > 0 ? 'bg-green-300' : balance < 0 ? 'bg-red-300' : 'bg-yellow-300'
                    }`}>
                      <span className="font-black text-black">{player.name}</span>
                      <span className="font-black text-black">
                        {balance > 0 ? '+' : ''}${balance.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            {!balancesExpanded && (
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-black text-sm">Quick View:</span>
                  <span className="font-black text-black">
                    {players.filter(p => (balances[p.id] || 0) !== 0).length} players with balances
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Tags - Collapsible */}
          <div className="bg-white border-4 border-black mb-4 ">
            <button
              onClick={() => setTagsExpanded(!tagsExpanded)}
              className="w-full flex items-center justify-between p-4 bg-yellow-300 border-b-4 border-black"
            >
              <h2 className="text-lg font-black text-black uppercase">Tags</h2>
              {tagsExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            {tagsExpanded && (
              <div className="p-4 grid grid-cols-2 gap-3">
                {tags.map(tag => (
                  <div key={tag.id} className="p-3 bg-yellow-300 border-4 border-black">
                    <p className="font-black text-black">{tag.name}</p>
                    <p className="text-sm text-black font-bold">${tag.defaultAmount.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
            {!tagsExpanded && (
              <div className="p-4">
                <div className="flex gap-2 overflow-x-auto">
                  {tags.slice(0, 3).map(tag => (
                    <div key={tag.id} className="px-3 py-2 bg-yellow-300 border-4 border-black flex-shrink-0">
                      <span className="font-black text-black text-sm">{tag.name}</span>
                    </div>
                  ))}
                  {tags.length > 3 && (
                    <div className="px-3 py-2 bg-gray-300 border-4 border-black flex-shrink-0">
                      <span className="font-black text-black text-sm">+{tags.length - 3} more</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Expenses - Always Visible */}
          <div className="space-y-3">
            <h2 className="text-lg font-black text-black uppercase mb-2">Expenses</h2>
            {debts.slice(0, 3).map(debt => (
              <div key={debt.id} className="bg-white border-4 border-black p-4 ">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-black text-black">{getTagName(debt.tag)}</h3>
                    <p className="text-xs text-black font-bold">{new Date(debt.date).toLocaleDateString()}</p>
                  </div>
                  <span className="text-xl font-black text-black">${debt.amount.toFixed(2)}</span>
                </div>
                <p className="text-xs text-black font-bold">Paid by: {getPlayerName(debt.paidBy)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Design 2: Horizontal Scroll
  const Design2 = () => {
    return (
      <div className="bg-yellow-100 min-h-screen pb-20">
        <div className="px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-black text-black uppercase">Debts Tracker</h1>
              <p className="text-sm text-black font-bold">Track payments and expenses</p>
            </div>
            <div className="flex gap-2">
              <button className="bg-pink-400 border-4 border-black text-black px-3 py-2 rounded-none hover:bg-pink-500  font-black">
                <Tag className="w-4 h-4" />
              </button>
              <button className="bg-blue-400 border-4 border-black text-black p-2 rounded-none hover:bg-blue-500  font-black">
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Balances - Horizontal Scroll */}
          <div className="mb-4">
            <h2 className="text-lg font-black text-black uppercase mb-3">Balances</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {players.map(player => {
                const balance = balances[player.id] || 0;
                return (
                  <div key={player.id} className={`flex-shrink-0 w-32 p-3 border-4 border-black ${
                    balance > 0 ? 'bg-green-300' : balance < 0 ? 'bg-red-300' : 'bg-yellow-300'
                  }`}>
                    <p className="font-black text-black text-sm truncate">{player.name}</p>
                    <p className="font-black text-black text-base mt-1">
                      {balance > 0 ? '+' : ''}${balance.toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tags - Horizontal Scroll */}
          <div className="mb-4">
            <h2 className="text-lg font-black text-black uppercase mb-3">Tags</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {tags.map(tag => (
                <div key={tag.id} className="flex-shrink-0 px-4 py-3 bg-yellow-300 border-4 border-black">
                  <p className="font-black text-black text-sm whitespace-nowrap">{tag.name}</p>
                  <p className="text-xs text-black font-bold mt-1">${tag.defaultAmount.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Expenses - Vertical Scroll */}
          <div>
            <h2 className="text-lg font-black text-black uppercase mb-3">Expenses</h2>
            <div className="space-y-3">
              {debts.slice(0, 3).map(debt => (
                <div key={debt.id} className="bg-white border-4 border-black p-4 ">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-black text-black">{getTagName(debt.tag)}</h3>
                      <p className="text-xs text-black font-bold">{new Date(debt.date).toLocaleDateString()}</p>
                    </div>
                    <span className="text-xl font-black text-black">${debt.amount.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-black font-bold">Paid by: {getPlayerName(debt.paidBy)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Design 3: Tab Navigation
  const Design3 = () => {
    const [activeTab, setActiveTab] = useState<'balances' | 'expenses' | 'tags'>('expenses');

    return (
      <div className="bg-yellow-100 min-h-screen pb-20">
        <div className="px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-black text-black uppercase">Debts Tracker</h1>
              <p className="text-sm text-black font-bold">Track payments and expenses</p>
            </div>
            <div className="flex gap-2">
              <button className="bg-pink-400 border-4 border-black text-black px-3 py-2 rounded-none hover:bg-pink-500  font-black">
                <Tag className="w-4 h-4" />
              </button>
              <button className="bg-blue-400 border-4 border-black text-black p-2 rounded-none hover:bg-blue-500  font-black">
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-4 border-b-4 border-black">
            <button
              onClick={() => setActiveTab('balances')}
              className={`flex-1 py-3 font-black uppercase border-b-4 transition-all ${
                activeTab === 'balances'
                  ? 'bg-blue-400 border-black text-black'
                  : 'bg-yellow-300 border-transparent text-black'
              }`}
            >
              Balances
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex-1 py-3 font-black uppercase border-b-4 transition-all ${
                activeTab === 'expenses'
                  ? 'bg-blue-400 border-black text-black'
                  : 'bg-yellow-300 border-transparent text-black'
              }`}
            >
              Expenses
            </button>
            <button
              onClick={() => setActiveTab('tags')}
              className={`flex-1 py-3 font-black uppercase border-b-4 transition-all ${
                activeTab === 'tags'
                  ? 'bg-blue-400 border-black text-black'
                  : 'bg-yellow-300 border-transparent text-black'
              }`}
            >
              Tags
            </button>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'balances' && (
              <div className="space-y-2">
                {players.map(player => {
                  const balance = balances[player.id] || 0;
                  return (
                    <div key={player.id} className={`flex items-center justify-between p-4 border-4 border-black ${
                      balance > 0 ? 'bg-green-300' : balance < 0 ? 'bg-red-300' : 'bg-yellow-300'
                    }`}>
                      <span className="font-black text-black">{player.name}</span>
                      <span className="font-black text-black text-lg">
                        {balance > 0 ? '+' : ''}${balance.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'expenses' && (
              <div className="space-y-3">
                {debts.slice(0, 5).map(debt => (
                  <div key={debt.id} className="bg-white border-4 border-black p-4 ">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-black text-black">{getTagName(debt.tag)}</h3>
                        <p className="text-xs text-black font-bold">{new Date(debt.date).toLocaleDateString()}</p>
                      </div>
                      <span className="text-xl font-black text-black">${debt.amount.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-black font-bold">Paid by: {getPlayerName(debt.paidBy)}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'tags' && (
              <div className="grid grid-cols-2 gap-3">
                {tags.map(tag => (
                  <div key={tag.id} className="p-4 bg-yellow-300 border-4 border-black">
                    <p className="font-black text-black">{tag.name}</p>
                    <p className="text-sm text-black font-bold mt-1">${tag.defaultAmount.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-yellow-100">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-black uppercase mb-2">Mobile Layout Options</h1>
          <p className="text-base text-black font-bold">Choose your preferred mobile design for the Debts Tracker</p>
        </div>

        {/* Design 1: Collapsible Sections */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-black text-black uppercase">Option 1: Collapsible Sections</h2>
              <p className="text-sm text-black font-bold">Balances and Tags can be expanded/collapsed to save space</p>
            </div>
            <button
              onClick={() => setSelectedDesign(selectedDesign === 1 ? null : 1)}
              className={`px-6 py-3 border-4 border-black font-black ${
                selectedDesign === 1
                  ? 'bg-green-400 text-black'
                  : 'bg-blue-400 text-black hover:bg-blue-500'
              }`}
            >
              {selectedDesign === 1 ? 'Selected ✓' : 'Select'}
            </button>
          </div>
          <div className="border-4 border-black bg-white p-2">
            <div className="w-full max-w-sm mx-auto bg-yellow-100 relative" style={{ height: '600px', overflow: 'auto' }}>
              <Design1 />
            </div>
          </div>
        </div>

        {/* Design 2: Horizontal Scroll */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-black text-black uppercase">Option 2: Horizontal Scroll</h2>
              <p className="text-sm text-black font-bold">Balances and Tags scroll horizontally, Expenses scroll vertically</p>
            </div>
            <button
              onClick={() => setSelectedDesign(selectedDesign === 2 ? null : 2)}
              className={`px-6 py-3 border-4 border-black font-black ${
                selectedDesign === 2
                  ? 'bg-green-400 text-black'
                  : 'bg-blue-400 text-black hover:bg-blue-500'
              }`}
            >
              {selectedDesign === 2 ? 'Selected ✓' : 'Select'}
            </button>
          </div>
          <div className="border-4 border-black bg-white p-2">
            <div className="w-full max-w-sm mx-auto bg-yellow-100 relative" style={{ height: '600px', overflow: 'auto' }}>
              <Design2 />
            </div>
          </div>
        </div>

        {/* Design 3: Tab Navigation */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-black text-black uppercase">Option 3: Tab Navigation</h2>
              <p className="text-sm text-black font-bold">Switch between Balances, Expenses, and Tags using tabs</p>
            </div>
            <button
              onClick={() => setSelectedDesign(selectedDesign === 3 ? null : 3)}
              className={`px-6 py-3 border-4 border-black font-black ${
                selectedDesign === 3
                  ? 'bg-green-400 text-black'
                  : 'bg-blue-400 text-black hover:bg-blue-500'
              }`}
            >
              {selectedDesign === 3 ? 'Selected ✓' : 'Select'}
            </button>
          </div>
          <div className="border-4 border-black bg-white p-2">
            <div className="w-full max-w-sm mx-auto bg-yellow-100 relative" style={{ height: '600px', overflow: 'auto' }}>
              <Design3 />
            </div>
          </div>
        </div>

        {/* Selection Summary */}
        {selectedDesign && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-400 border-4 border-black p-4  z-50">
            <p className="font-black text-black text-center">
              Option {selectedDesign} Selected! Let me know when you're ready to apply it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
