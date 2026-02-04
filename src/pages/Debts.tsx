import { useState, useEffect } from 'react';
import { getDebts, getDebtTags, getPlayers, addDebt, updateDebt, removeDebt, addDebtTag, updateDebtTag, removeDebtTag } from '../utils/storage';
import type { Debt, DebtTag, Player } from '../types';
import { Plus, DollarSign, Users, Tag, X, Edit2, Trash2, Check } from 'lucide-react';

export default function Debts() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [tags, setTags] = useState<DebtTag[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [isClosingDebt, setIsClosingDebt] = useState(false);
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const [showAddTag, setShowAddTag] = useState(false);
  const [isClosingTag, setIsClosingTag] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [newTagAmount, setNewTagAmount] = useState(0);
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'tags'>('expenses');
  const [expenseType, setExpenseType] = useState<'tag' | 'custom'>('tag');
  const [customExpenseName, setCustomExpenseName] = useState('');
  const [newDebt, setNewDebt] = useState<Partial<Debt>>({
    tag: '',
    amount: 0,
    paidBy: '',
    splitBetween: [],
    splitMethod: 'equal',
  });

  useEffect(() => {
    const loadData = async () => {
      const [loadedDebts, loadedTags, loadedPlayers] = await Promise.all([
        getDebts(),
        getDebtTags(),
        getPlayers(),
      ]);
      setDebts(loadedDebts);
      setTags(loadedTags);
      setPlayers(loadedPlayers);
    };
    loadData();
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if ((showAddDebt || showAddTag) && !isClosingDebt && !isClosingTag) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showAddDebt, showAddTag, isClosingDebt, isClosingTag]);

  const calculateBalances = () => {
    const balances: Record<string, number> = {};
    players.forEach(player => {
      balances[player.id] = 0;
    });

    debts.forEach(debt => {
      // Person who paid gets credited
      balances[debt.paidBy] = (balances[debt.paidBy] || 0) + debt.amount;

      // Calculate what each person owes
      if (debt.splitMethod === 'equal') {
        const perPerson = debt.amount / debt.splitBetween.length;
        debt.splitBetween.forEach(playerId => {
          balances[playerId] = (balances[playerId] || 0) - perPerson;
        });
      } else if (debt.splitMethod === 'games' && debt.gameCounts) {
        const totalGames = Object.values(debt.gameCounts).reduce((sum, count) => sum + count, 0);
        Object.entries(debt.gameCounts).forEach(([playerId, count]) => {
          const share = (count / totalGames) * debt.amount;
          balances[playerId] = (balances[playerId] || 0) - share;
        });
      } else if (debt.splitMethod === 'custom' && debt.customAmounts) {
        Object.entries(debt.customAmounts).forEach(([playerId, amount]) => {
          balances[playerId] = (balances[playerId] || 0) - amount;
        });
      }
    });

    return balances;
  };

  const balances = calculateBalances();

  const calculateSettlements = () => {
    // Get players with positive balances (owed money) and negative balances (owe money)
    const creditors: Array<{ playerId: string; amount: number }> = [];
    const debtors: Array<{ playerId: string; amount: number }> = [];

    players.forEach(player => {
      const balance = balances[player.id] || 0;
      if (balance > 0.01) { // Only include if more than 1 cent
        creditors.push({ playerId: player.id, amount: balance });
      } else if (balance < -0.01) { // Only include if more than 1 cent
        debtors.push({ playerId: player.id, amount: Math.abs(balance) });
      }
    });

    // Sort by amount (largest first)
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const settlements: Array<{ from: string; to: string; amount: number }> = [];
    let creditorIndex = 0;
    let debtorIndex = 0;

    while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
      const creditor = creditors[creditorIndex];
      const debtor = debtors[debtorIndex];

      const settlementAmount = Math.min(creditor.amount, debtor.amount);

      settlements.push({
        from: debtor.playerId,
        to: creditor.playerId,
        amount: settlementAmount,
      });

      creditor.amount -= settlementAmount;
      debtor.amount -= settlementAmount;

      if (creditor.amount < 0.01) {
        creditorIndex++;
      }
      if (debtor.amount < 0.01) {
        debtorIndex++;
      }
    }

    return settlements;
  };

  const settlements = calculateSettlements();

  const handleSettlePayment = (from: string, to: string, amount: number) => {
    // Pre-fill the expense modal with settlement details using custom name
    setExpenseType('custom');
    setCustomExpenseName('Settlement Payment');
    setNewDebt({
      amount: amount,
      paidBy: from, // Payer pays
      splitBetween: [to], // Receiver receives - only the one person
      splitMethod: 'equal', // Equal split (which means the receiver gets the full amount)
    });
    setEditingDebtId(null);
    setIsClosingDebt(false);
    setShowAddDebt(true);
  };

  const handleEditDebt = (debt: Debt) => {
    setEditingDebtId(debt.id);
    setExpenseType(debt.tag ? 'tag' : 'custom');
    setCustomExpenseName(debt.customName || '');
    setNewDebt({
      tag: debt.tag || '',
      amount: debt.amount,
      paidBy: debt.paidBy,
      splitBetween: debt.splitBetween,
      splitMethod: debt.splitMethod,
      gameCounts: debt.gameCounts,
      customAmounts: debt.customAmounts,
    });
    setIsClosingDebt(false);
    setShowAddDebt(true);
  };

  const handleDeleteDebt = (debtId: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      removeDebt(debtId);
      setDebts(getDebts());
    }
  };

  const handleSaveDebt = async () => {
    // Validate required fields
    if (expenseType === 'tag' && !newDebt.tag) {
      alert('Please select a tag or switch to custom expense');
      return;
    }
    if (expenseType === 'custom' && !customExpenseName.trim()) {
      alert('Please enter an expense name');
      return;
    }
    if (!newDebt.paidBy || !newDebt.splitBetween || newDebt.splitBetween.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    const debt: Debt = {
      id: editingDebtId || crypto.randomUUID(),
      tag: expenseType === 'tag' ? newDebt.tag : undefined,
      customName: expenseType === 'custom' ? customExpenseName.trim() : undefined,
      amount: newDebt.amount || 0,
      paidBy: newDebt.paidBy!,
      splitBetween: newDebt.splitBetween!,
      splitMethod: newDebt.splitMethod || 'equal',
      gameCounts: newDebt.splitMethod === 'games' ? newDebt.gameCounts : undefined,
      customAmounts: newDebt.splitMethod === 'custom' ? newDebt.customAmounts : undefined,
      date: editingDebtId 
        ? debts.find(d => d.id === editingDebtId)?.date || new Date().toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
    };

    if (editingDebtId) {
      await updateDebt(editingDebtId, debt);
    } else {
      await addDebt(debt);
    }
    
    const loadedDebts = await getDebts();
    setDebts(loadedDebts);
    setIsClosingDebt(true);
    setTimeout(() => {
      setShowAddDebt(false);
      setEditingDebtId(null);
      setNewDebt({
        tag: '',
        amount: 0,
        paidBy: '',
        splitBetween: [],
        splitMethod: 'equal',
      });
      setExpenseType('tag');
      setCustomExpenseName('');
      setIsClosingDebt(false);
    }, 300);
  };

  const handleCancelDebt = () => {
    setIsClosingDebt(true);
    setTimeout(() => {
      setShowAddDebt(false);
      setEditingDebtId(null);
      setNewDebt({
        tag: '',
        amount: 0,
        paidBy: '',
        splitBetween: [],
        splitMethod: 'equal',
      });
      setExpenseType('tag');
      setCustomExpenseName('');
      setIsClosingDebt(false);
    }, 300);
  };

  const getPlayerName = (playerId: string) => {
    return players.find(p => p.id === playerId)?.name || 'Unknown';
  };

  const getTagName = (debt: Debt) => {
    if (debt.tag) {
      return tags.find(t => t.id === debt.tag)?.name || debt.tag;
    }
    return debt.customName || 'Unnamed Expense';
  };

  const handleEditTag = (tag: DebtTag) => {
    setEditingTagId(tag.id);
    setNewTagName(tag.name);
    setNewTagAmount(tag.defaultAmount);
    setIsClosingTag(false);
    setShowAddTag(true);
  };

  const handleSaveTag = async () => {
    if (!newTagName.trim() || newTagAmount <= 0) {
      alert('Please enter a tag name and a valid amount');
      return;
    }

    if (editingTagId) {
      // Update existing tag
      const tagToUpdate = tags.find(t => t.id === editingTagId);
      if (tagToUpdate) {
        await updateDebtTag(editingTagId, {
          ...tagToUpdate,
          name: newTagName.trim(),
          defaultAmount: newTagAmount,
        });
      }
    } else {
      // Create new tag
      const newTag: DebtTag = {
        id: crypto.randomUUID(),
        name: newTagName.trim(),
        defaultAmount: newTagAmount,
      };
      await addDebtTag(newTag);
    }
    
    const loadedTags = await getDebtTags();
    setTags(loadedTags);
    setNewTagName('');
    setNewTagAmount(0);
    setEditingTagId(null);
    setIsClosingTag(true);
    setTimeout(() => {
      setShowAddTag(false);
      setIsClosingTag(false);
    }, 300);
  };

  const handleCancelTag = () => {
    setIsClosingTag(true);
    setTimeout(() => {
      setShowAddTag(false);
      setEditingTagId(null);
      setNewTagName('');
      setNewTagAmount(0);
      setIsClosingTag(false);
    }, 300);
  };

  const handleDeleteTag = async (tagId: string) => {
    if (confirm('Are you sure you want to delete this tag? This will not delete expenses using this tag.')) {
      await removeDebtTag(tagId);
      const loadedTags = await getDebtTags();
      setTags(loadedTags);
    }
  };

  const selectedTag = tags.find(t => t.id === newDebt.tag);

  return (
    <div className="min-h-screen bg-orange-50 pb-20 safe-top relative">
      {/* Mobile Layout */}
      <div className="md:hidden">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="mb-4">
            <h1 className="text-3xl font-black text-black uppercase mb-2">Debts Tracker</h1>
            <p className="text-sm text-black font-bold">Track payments and expenses</p>
          </div>

          {/* Add Expense Button - Full Width */}
          <button
            onClick={() => {
              setIsClosingDebt(false);
              setShowAddDebt(true);
            }}
            className="w-full bg-orange-500 border-4 border-black text-black py-4 rounded-none hover:bg-orange-600  font-black flex items-center justify-center gap-2 mb-6"
          >
            <Plus className="w-6 h-6" />
            <span className="text-lg uppercase">Add New Expense</span>
          </button>

          {/* Tab Navigation - Mobile */}
          <div className="flex border-4 border-black overflow-hidden mb-4">
            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex-1 py-3 font-black uppercase border-r-4 border-black transition-all ${
                activeTab === 'expenses'
                  ? 'bg-orange-500 text-black'
                  : 'bg-amber-400 text-black hover:bg-amber-500'
              }`}
            >
              Expenses
            </button>
            <button
              onClick={() => setActiveTab('balances')}
              className={`flex-1 py-3 font-black uppercase border-r-4 border-black transition-all ${
                activeTab === 'balances'
                  ? 'bg-orange-500 text-black'
                  : 'bg-amber-400 text-black hover:bg-amber-500'
              }`}
            >
              Balances
            </button>
            <button
              onClick={() => setActiveTab('tags')}
              className={`flex-1 py-3 font-black uppercase transition-all ${
                activeTab === 'tags'
                  ? 'bg-orange-500 text-black'
                  : 'bg-amber-400 text-black hover:bg-amber-500'
              }`}
            >
              Tags
            </button>
          </div>

          {/* Tab Content - Mobile */}
          <div>
            {/* Expenses Tab */}
            {activeTab === 'expenses' && (
              <div className="space-y-3">
                {debts.length === 0 ? (
                  <div className="bg-white rounded-none border-4 border-black p-12 text-center ">
                    <p className="text-black font-bold">No expenses recorded yet.</p>
                  </div>
                ) : (
                  debts
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(debt => (
                      <div key={debt.id} className="bg-white rounded-none border-4 border-black p-4 hover:bg-amber-400 transition-all ">
                        <div className="flex items-start justify-between mb-3 gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-black text-lg text-black truncate">{getTagName(debt)}</h3>
                            <p className="text-xs text-black font-bold">{new Date(debt.date).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                            <span className="text-xl font-black text-black">${debt.amount.toFixed(2)}</span>
                            <button
                              onClick={() => handleEditDebt(debt)}
                              className="p-1.5 bg-orange-500 border-4 border-black text-black hover:bg-orange-600 rounded-none font-black"
                              aria-label="Edit expense"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteDebt(debt.id)}
                              className="p-1.5 bg-red-600 border-4 border-black text-black hover:bg-red-700 rounded-none font-black"
                              aria-label="Delete expense"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="text-xs text-black">
                          <p className="font-bold">Paid by: <span className="font-black">{getPlayerName(debt.paidBy)}</span></p>
                          <p className="mt-1 font-bold break-words">Split between: {debt.splitBetween.map(id => getPlayerName(id)).join(', ')}</p>
                          <p className="mt-1 text-xs font-bold">Method: {debt.splitMethod}</p>
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}

            {/* Balances Tab */}
            {activeTab === 'balances' && (
              <div className="space-y-4">
                <div className="bg-white rounded-none border-4 border-black p-4 ">
                  <h2 className="text-lg font-black text-black mb-4 uppercase">Current Balances</h2>
                  <div className="space-y-2">
                    {players.map(player => {
                      const balance = balances[player.id] || 0;
                      return (
                        <div key={player.id} className={`flex items-center justify-between p-3 rounded-none border-4 border-black ${
                          balance > 0 ? 'bg-lime-400' : balance < 0 ? 'bg-red-400' : 'bg-amber-400'
                        }`}>
                          <span className="font-black text-black text-sm truncate flex-1">{player.name}</span>
                          <span className="font-black text-black text-base flex-shrink-0 ml-2">
                            {balance > 0 ? '+' : ''}${balance.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Settle Balances */}
                {settlements.length > 0 && (
                  <div className="bg-white rounded-none border-4 border-black p-4 ">
                    <h2 className="text-lg font-black text-black mb-4 uppercase">Settle Balances</h2>
                    <p className="text-xs text-black font-bold mb-4">Suggested payments to balance everything:</p>
                    <div className="space-y-3">
                      {settlements.map((settlement, index) => (
                        <div key={index} className="bg-amber-400 rounded-none border-4 border-black p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-black text-sm">
                                <span className="text-red-600">{getPlayerName(settlement.from)}</span>
                                {' → '}
                                <span className="text-green-600">{getPlayerName(settlement.to)}</span>
                              </p>
                            </div>
                            <span className="font-black text-black text-base flex-shrink-0">
                              ${settlement.amount.toFixed(2)}
                            </span>
                            <button
                              onClick={() => handleSettlePayment(settlement.from, settlement.to, settlement.amount)}
                              className="bg-lime-500 border-4 border-black text-black px-3 py-2 rounded-none hover:bg-lime-600 font-black flex-shrink-0 flex items-center gap-1 "
                              aria-label="Mark as paid"
                            >
                              <Check className="w-4 h-4" />
                              <span className="text-xs">Settle</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tags Tab */}
            {activeTab === 'tags' && (
              <div className="bg-white rounded-none border-4 border-black p-4 ">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-black text-black uppercase">Expense Tags</h2>
                  <button
                    onClick={() => {
                      setIsClosingTag(false);
                      setShowAddTag(true);
                    }}
                    className="bg-amber-400 border-4 border-black text-black px-3 py-2 rounded-none hover:bg-amber-500  flex items-center gap-2 font-black text-sm"
                  >
                    <Tag className="w-4 h-4" />
                    <span>New Tag</span>
                  </button>
                </div>
                {tags.length === 0 ? (
                  <p className="text-black text-center py-4 font-bold">No tags created yet. Click "New Tag" to create one.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {tags.map(tag => (
                      <div key={tag.id} className="flex items-center justify-between p-3 rounded-none bg-amber-400 border-4 border-black hover:bg-amber-500 transition-all">
                        <div className="flex-1">
                          <p className="font-black text-black">{tag.name}</p>
                          <p className="text-sm text-black font-bold">${tag.defaultAmount.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditTag(tag)}
                            className="p-2 bg-orange-500 border-2 border-black text-black hover:bg-orange-600 rounded-none font-black"
                            aria-label="Edit tag"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTag(tag.id)}
                            className="p-2 bg-red-600 border-2 border-black text-black hover:bg-red-700 rounded-none font-black"
                            aria-label="Delete tag"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Layout - Tab Navigation */}
      <div className="hidden md:block">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="mb-6">
            <h1 className="text-4xl md:text-5xl font-black text-black uppercase mb-2">Debts Tracker</h1>
            <p className="text-base text-black font-bold">Track payments and expenses</p>
          </div>

          {/* Add Expense Button - Full Width */}
          <button
            onClick={() => {
              setIsClosingDebt(false);
              setShowAddDebt(true);
            }}
            className="w-full bg-orange-500 border-4 border-black text-black py-4 rounded-none hover:bg-orange-600  font-black flex items-center justify-center gap-2 mb-6"
          >
            <Plus className="w-6 h-6" />
            <span className="text-lg uppercase">Add New Expense</span>
          </button>

          {/* Tab Navigation - Desktop */}
          <div className="flex border-4 border-black overflow-hidden mb-6">
            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex-1 py-4 px-6 font-black uppercase text-lg border-r-4 border-black transition-all ${
                activeTab === 'expenses'
                  ? 'bg-orange-500 text-black'
                  : 'bg-amber-400 text-black hover:bg-amber-500'
              }`}
            >
              Expenses
            </button>
            <button
              onClick={() => setActiveTab('balances')}
              className={`flex-1 py-4 px-6 font-black uppercase text-lg border-r-4 border-black transition-all ${
                activeTab === 'balances'
                  ? 'bg-orange-500 text-black'
                  : 'bg-amber-400 text-black hover:bg-amber-500'
              }`}
            >
              Balances
            </button>
            <button
              onClick={() => setActiveTab('tags')}
              className={`flex-1 py-4 px-6 font-black uppercase text-lg transition-all ${
                activeTab === 'tags'
                  ? 'bg-orange-500 text-black'
                  : 'bg-amber-400 text-black hover:bg-amber-500'
              }`}
            >
              Tags
            </button>
          </div>

          {/* Tab Content - Desktop */}
          <div>
            {/* Expenses Tab */}
            {activeTab === 'expenses' && (
              <div className="space-y-4">
                {debts.length === 0 ? (
                  <div className="bg-white rounded-none border-4 border-black p-12 text-center">
                    <p className="text-black font-bold text-lg">No expenses recorded yet.</p>
                  </div>
                ) : (
                  debts
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(debt => (
                      <div key={debt.id} className="bg-white rounded-none border-4 border-black p-5 hover:bg-amber-400 transition-all">
                        <div className="flex items-start justify-between mb-3 gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-black text-xl text-black truncate">{getTagName(debt)}</h3>
                            <p className="text-sm text-black font-bold mt-1">{new Date(debt.date).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                            <span className="text-2xl font-black text-black">${debt.amount.toFixed(2)}</span>
                            <button
                              onClick={() => handleEditDebt(debt)}
                              className="p-2 bg-orange-500 border-4 border-black text-black hover:bg-orange-600 rounded-none font-black"
                              aria-label="Edit expense"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDebt(debt.id)}
                              className="p-2 bg-red-600 border-4 border-black text-black hover:bg-red-700 rounded-none font-black"
                              aria-label="Delete expense"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="text-sm text-black">
                          <p className="font-bold">Paid by: <span className="font-black">{getPlayerName(debt.paidBy)}</span></p>
                          <p className="mt-1 font-bold break-words">Split between: {debt.splitBetween.map(id => getPlayerName(id)).join(', ')}</p>
                          <p className="mt-1 text-xs font-bold">Method: {debt.splitMethod}</p>
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}

            {/* Balances Tab */}
            {activeTab === 'balances' && (
              <div className="space-y-6">
                {/* Current Balances */}
                <div className="bg-white rounded-none border-4 border-black p-6">
                  <h2 className="text-xl font-black text-black mb-4 uppercase">Current Balances</h2>
                  <div className="space-y-3">
                    {players.map(player => {
                      const balance = balances[player.id] || 0;
                      return (
                        <div key={player.id} className={`flex items-center justify-between p-4 rounded-none border-4 border-black ${
                          balance > 0 ? 'bg-lime-400' : balance < 0 ? 'bg-red-400' : 'bg-amber-400'
                        }`}>
                          <span className="font-black text-black truncate flex-1 text-lg">{player.name}</span>
                          <span className="font-black text-black text-xl flex-shrink-0 ml-2">
                            {balance > 0 ? '+' : ''}${balance.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Settle Balances */}
                {settlements.length > 0 && (
                  <div className="bg-white rounded-none border-4 border-black p-6">
                    <h2 className="text-xl font-black text-black mb-4 uppercase">Settle Balances</h2>
                    <p className="text-sm text-black font-bold mb-4">Suggested payments to balance everything:</p>
                    <div className="space-y-3">
                      {settlements.map((settlement, index) => (
                        <div key={index} className="bg-amber-400 rounded-none border-4 border-black p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-black text-lg">
                                <span className="text-red-600">{getPlayerName(settlement.from)}</span>
                                {' → '}
                                <span className="text-green-600">{getPlayerName(settlement.to)}</span>
                              </p>
                            </div>
                            <span className="font-black text-black text-xl flex-shrink-0">
                              ${settlement.amount.toFixed(2)}
                            </span>
                            <button
                              onClick={() => handleSettlePayment(settlement.from, settlement.to, settlement.amount)}
                              className="bg-lime-500 border-4 border-black text-black px-5 py-3 rounded-none hover:bg-lime-600 font-black flex-shrink-0 flex items-center gap-2"
                              aria-label="Mark as paid"
                            >
                              <Check className="w-5 h-5" />
                              <span>Settle</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tags Tab */}
            {activeTab === 'tags' && (
              <div className="bg-white rounded-none border-4 border-black p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black text-black uppercase">Expense Tags</h2>
                  <button
                    onClick={() => {
                      setIsClosingTag(false);
                      setShowAddTag(true);
                    }}
                    className="bg-amber-400 border-4 border-black text-black px-5 py-3 rounded-none hover:bg-amber-500  flex items-center gap-2 font-black text-base"
                  >
                    <Tag className="w-5 h-5" />
                    <span>New Tag</span>
                  </button>
                </div>
                {tags.length === 0 ? (
                  <p className="text-black text-center py-8 font-bold text-lg">No tags created yet. Click "New Tag" to create one.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {tags.map(tag => (
                      <div key={tag.id} className="flex items-center justify-between p-4 rounded-none bg-amber-400 border-4 border-black hover:bg-amber-500 transition-all">
                        <div className="flex-1">
                          <p className="font-black text-black text-lg">{tag.name}</p>
                          <p className="text-sm text-black font-bold mt-1">${tag.defaultAmount.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-3 ml-6">
                          <button
                            onClick={() => handleEditTag(tag)}
                            className="p-2 bg-orange-500 border-2 border-black text-black hover:bg-orange-600 rounded-none font-black"
                            aria-label="Edit tag"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTag(tag.id)}
                            className="p-2 bg-red-600 border-2 border-black text-black hover:bg-red-700 rounded-none font-black"
                            aria-label="Delete tag"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Tag Form Modal */}
      {showAddTag && (
          <div 
            className="fixed inset-0 z-[100] flex items-end justify-center safe-top"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCancelTag();
              }
            }}
          >
            {/* Neobrutal backdrop */}
            <div className="absolute inset-0 bg-orange-50/90" />
            
            {/* Modal Content */}
            <div 
              className={`relative bg-white rounded-none border-4 border-black border-b-0 w-full sm:max-w-md sm:mx-4 sm:rounded-none sm:border-b-4 max-h-[100vh] sm:max-h-[90vh] flex flex-col ${
                isClosingTag ? 'animate-slide-down' : 'animate-slide-up'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b-4 border-black bg-amber-400 flex-shrink-0">
                <h2 className="text-lg sm:text-xl md:text-2xl font-black text-black uppercase break-words flex-1">
                  {editingTagId ? 'Edit Tag' : 'Create New Tag'}
                </h2>
                <button
                  onClick={handleCancelTag}
                  className="p-2 bg-red-600 border-4 border-black text-black hover:bg-red-700 font-black flex-shrink-0 ml-2"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 bg-white min-h-0">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-black text-black mb-2 uppercase">Tag Name</label>
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="e.g., Weekly Payment"
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-none border-4 border-black focus:outline-none font-bold bg-white text-sm sm:text-base"
                      onKeyPress={(e) => e.key === 'Enter' && handleSaveTag()}
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-black text-black mb-2 uppercase">Default Amount</label>
                    <input
                      type="number"
                      value={newTagAmount || ''}
                      onChange={(e) => setNewTagAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-none border-4 border-black focus:outline-none font-bold bg-white text-sm sm:text-base"
                      onKeyPress={(e) => e.key === 'Enter' && handleSaveTag()}
                    />
                  </div>
                </div>
              </div>
              
              {/* Footer with buttons - Always visible */}
              <div className="border-t-4 border-black px-4 sm:px-6 py-3 sm:py-4 bg-amber-400 flex-shrink-0">
                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={handleCancelTag}
                    className="flex-1 bg-white border-4 border-black text-black py-3 sm:py-4 rounded-none font-black  text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveTag}
                    className="flex-1 bg-lime-500 border-4 border-black text-black py-3 sm:py-4 rounded-none font-black  text-sm sm:text-base"
                  >
                    {editingTagId ? 'Save Changes' : 'Create Tag'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Add Debt Form Modal */}
      {showAddDebt && (
          <div 
            className="fixed inset-0 z-[100] flex items-end justify-center safe-top"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCancelDebt();
              }
            }}
          >
            {/* Neobrutal backdrop */}
            <div className="absolute inset-0 bg-orange-50/90" />
            
            {/* Modal Content */}
            <div 
              className={`relative bg-white rounded-none border-4 border-black border-b-0 w-full sm:max-w-2xl sm:mx-4 sm:rounded-none sm:border-b-4 max-h-[100vh] sm:max-h-[90vh] flex flex-col ${
                isClosingDebt ? 'animate-slide-down' : 'animate-slide-up'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b-4 border-black bg-amber-400">
                <h2 className="text-lg sm:text-xl md:text-2xl font-black text-black uppercase break-words flex-1">
                  {editingDebtId ? 'Edit Expense' : 'Add New Expense'}
                </h2>
                <button
                  onClick={handleCancelDebt}
                  className="p-2 bg-red-600 border-4 border-black text-black hover:bg-red-700 font-black flex-shrink-0 ml-2"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 bg-white">
            
            {/* Expense Type Toggle */}
            <div className="mb-6">
              <label className="block text-sm font-black text-black mb-3 uppercase">Expense Type</label>
              <div className="flex border-4 border-black overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    setExpenseType('tag');
                    setCustomExpenseName('');
                    setNewDebt({ ...newDebt, tag: '', customName: undefined });
                  }}
                  className={`flex-1 py-3 px-4 font-black uppercase border-r-4 border-black transition-all ${
                    expenseType === 'tag'
                      ? 'bg-orange-500 text-black'
                      : 'bg-amber-400 text-black hover:bg-amber-500'
                  }`}
                >
                  <Tag className="w-4 h-4 inline-block mr-2" />
                  Use Tag
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExpenseType('custom');
                    setNewDebt({ ...newDebt, tag: '', customName: undefined });
                  }}
                  className={`flex-1 py-3 px-4 font-black uppercase transition-all ${
                    expenseType === 'custom'
                      ? 'bg-orange-500 text-black'
                      : 'bg-amber-400 text-black hover:bg-amber-500'
                  }`}
                >
                  <Plus className="w-4 h-4 inline-block mr-2" />
                  Custom
                </button>
              </div>
            </div>

            {/* Tag Selection - Only show when tag type is selected */}
            {expenseType === 'tag' && (
              <div className="mb-4">
                <label className="block text-sm font-black text-black mb-2 uppercase">Select Tag</label>
                <select
                  value={newDebt.tag || ''}
                  onChange={(e) => {
                    const tag = tags.find(t => t.id === e.target.value);
                    setNewDebt({
                      ...newDebt,
                      tag: e.target.value,
                      amount: tag?.defaultAmount || newDebt.amount || 0,
                    });
                  }}
                  className="w-full px-4 py-3 h-[56px] rounded-none border-4 border-black focus:outline-none font-bold bg-white"
                >
                  <option value="">Select a tag</option>
                  {tags.map(tag => (
                    <option key={tag.id} value={tag.id}>{tag.name} (${tag.defaultAmount})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Custom Expense Name - Only show when custom type is selected */}
            {expenseType === 'custom' && (
              <div className="mb-4">
                <label className="block text-sm font-black text-black mb-2 uppercase">Expense Name</label>
                <input
                  type="text"
                  value={customExpenseName}
                  onChange={(e) => setCustomExpenseName(e.target.value)}
                  placeholder="e.g., Dinner at Restaurant, Gas Money, etc."
                  className="w-full px-4 py-3 h-[56px] rounded-none border-4 border-black focus:outline-none font-bold bg-white"
                />
              </div>
            )}

            {/* Amount */}
            <div className="mb-4">
              <label className="block text-sm font-black text-black mb-2 uppercase">Amount</label>
              <input
                type="number"
                value={newDebt.amount || ''}
                onChange={(e) => setNewDebt({ ...newDebt, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 h-[56px] rounded-none border-4 border-black focus:outline-none font-bold bg-white"
                placeholder="0.00"
              />
            </div>

            {/* Paid By */}
            <div className="mb-4">
              <label className="block text-sm font-black text-black mb-2 uppercase">Paid By</label>
              <select
                value={newDebt.paidBy}
                onChange={(e) => setNewDebt({ ...newDebt, paidBy: e.target.value })}
                className="w-full px-4 py-3 h-[56px] rounded-none border-4 border-black focus:outline-none font-bold bg-white"
              >
                <option value="">Select player</option>
                {players.map(player => (
                  <option key={player.id} value={player.id}>{player.name}</option>
                ))}
              </select>
            </div>

            {/* Split Method */}
            <div className="mb-4">
              <label className="block text-sm font-black text-black mb-2 uppercase">Split Method</label>
              <select
                value={newDebt.splitMethod}
                onChange={(e) => setNewDebt({ ...newDebt, splitMethod: e.target.value as 'equal' | 'games' | 'custom' })}
                className="w-full px-4 py-3 h-[56px] rounded-none border-4 border-black focus:outline-none font-bold bg-white"
              >
                <option value="equal">Equal</option>
                <option value="games">By Games Played</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {/* Split Between */}
            <div className="mb-4">
              <label className="block text-sm font-black text-black mb-2 uppercase">Split Between</label>
              <div className="space-y-2">
                {players.map(player => (
                  <label key={player.id} className={`flex items-center gap-3 p-3 rounded-none border-4 border-black cursor-pointer ${
                    newDebt.splitBetween?.includes(player.id) ? 'bg-blue-300' : 'bg-amber-400'
                  }`}>
                    <input
                      type="checkbox"
                      checked={newDebt.splitBetween?.includes(player.id)}
                      onChange={(e) => {
                        const splitBetween = newDebt.splitBetween || [];
                        if (e.target.checked) {
                          setNewDebt({ ...newDebt, splitBetween: [...splitBetween, player.id] });
                        } else {
                          // Remove from splitBetween
                          const updatedSplitBetween = splitBetween.filter(id => id !== player.id);
                          
                          // Also remove game counts and custom amounts for this player
                          const gameCounts = { ...newDebt.gameCounts };
                          delete gameCounts[player.id];
                          
                          const customAmounts = { ...newDebt.customAmounts };
                          delete customAmounts[player.id];
                          
                          setNewDebt({ 
                            ...newDebt, 
                            splitBetween: updatedSplitBetween,
                            gameCounts: Object.keys(gameCounts).length > 0 ? gameCounts : undefined,
                            customAmounts: Object.keys(customAmounts).length > 0 ? customAmounts : undefined,
                          });
                        }
                      }}
                      className="w-5 h-5 border-4 border-black"
                    />
                    <span className="font-black text-black">{player.name}</span>
                    {newDebt.splitMethod === 'games' && newDebt.splitBetween?.includes(player.id) && (
                      <input
                        type="number"
                        min="0"
                        value={newDebt.gameCounts?.[player.id] ?? ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          const gameCounts = { ...newDebt.gameCounts };
                          if (value === '') {
                            delete gameCounts[player.id];
                          } else {
                            gameCounts[player.id] = parseInt(value) || 0;
                          }
                          setNewDebt({ ...newDebt, gameCounts });
                        }}
                        className="ml-auto w-20 px-2 py-1 rounded-none border-4 border-black font-bold bg-white"
                        placeholder="Games"
                      />
                    )}
                    {newDebt.splitMethod === 'custom' && newDebt.splitBetween?.includes(player.id) && (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newDebt.customAmounts?.[player.id] ?? ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          const customAmounts = { ...newDebt.customAmounts };
                          if (value === '') {
                            delete customAmounts[player.id];
                          } else {
                            customAmounts[player.id] = parseFloat(value) || 0;
                          }
                          setNewDebt({ ...newDebt, customAmounts });
                        }}
                        className="ml-auto w-24 px-2 py-1 rounded-none border-4 border-black font-bold bg-white"
                        placeholder="$0.00"
                      />
                    )}
                  </label>
                ))}
              </div>
            </div>

              </div>
              
              {/* Footer with buttons */}
              <div className="border-t-4 border-black px-4 sm:px-6 py-3 sm:py-4 bg-amber-400">
                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={handleCancelDebt}
                    className="flex-1 bg-white border-4 border-black text-black py-2 sm:py-3 rounded-none font-black  text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDebt}
                    className="flex-1 bg-lime-500 border-4 border-black text-black py-2 sm:py-3 rounded-none font-black  text-sm sm:text-base"
                  >
                    {editingDebtId ? 'Save Changes' : 'Add Expense'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
