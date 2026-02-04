import { useState, useEffect } from 'react';
import { getPlayers, addGame } from '../utils/storage';
import { validateGame, parseTenthFrame } from '../utils/scoring';
import type { Player, Game } from '../types';
import { Check, X, ArrowRight, ArrowLeft, RotateCcw } from 'lucide-react';

export default function AddGame() {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]); // Array of player IDs in order
  const [currentStep, setCurrentStep] = useState(0); // 0 = select players, 1 = enter scores, 2 = review
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [gameData, setGameData] = useState<Partial<Game>[]>([]);
  const [currentGame, setCurrentGame] = useState<Partial<Game>>({
    totalScore: undefined,
    strikesFrames1to9: 0,
    sparesFrames1to9: 0,
    tenthFrame: '',
  });
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadPlayers = async () => {
      const players = await getPlayers();
      setAllPlayers(players);
    };
    loadPlayers();
  }, []);

  const handleAddPlayer = (playerId: string) => {
    if (selectedPlayers.includes(playerId)) {
      // Unselect the player
      setSelectedPlayers(prev => prev.filter(id => id !== playerId));
      setError('');
      return;
    }
    if (selectedPlayers.length >= 4) {
      setError('Maximum 4 players allowed');
      return;
    }
    setSelectedPlayers(prev => [...prev, playerId]);
    setError('');
  };

  const handleClearSelection = () => {
    setSelectedPlayers([]);
    setError('');
  };

  const handleStartGame = () => {
    if (selectedPlayers.length === 0) {
      setError('Please select at least one player');
      return;
    }
    setGameData(selectedPlayers.map(() => ({})));
    setCurrentStep(1);
    setCurrentPlayerIndex(0);
    setError('');
  };

  const getSelectedPlayersList = (): Player[] => {
    return selectedPlayers
      .map(playerId => allPlayers.find(p => p.id === playerId))
      .filter((p): p is Player => p !== undefined);
  };

  const handleNumberInput = (field: 'totalScore' | 'strikesFrames1to9' | 'sparesFrames1to9', value: number) => {
    setCurrentGame(prev => ({
      ...prev,
      [field]: value,
    }));
    setError('');
  };

  const handleTenthFrameChange = (value: string) => {
    setCurrentGame(prev => ({
      ...prev,
      tenthFrame: value.toUpperCase(),
    }));
    setError('');
  };

  const handleNext = () => {
    const playersList = getSelectedPlayersList();
    // Validate current game
    const validation = validateGame({
      ...currentGame,
      playerId: playersList[currentPlayerIndex]?.id || '',
      date: new Date().toISOString().split('T')[0],
    });

    if (!validation.valid) {
      setError(validation.error || 'Invalid game data');
      return;
    }

    // Save current game data
    const updatedGameData = [...gameData];
    updatedGameData[currentPlayerIndex] = currentGame;
    setGameData(updatedGameData);

    // Move to next player or finish
    if (currentPlayerIndex < playersList.length - 1) {
      setCurrentPlayerIndex(prev => prev + 1);
      setCurrentGame({
        totalScore: undefined,
        strikesFrames1to9: 0,
        sparesFrames1to9: 0,
        tenthFrame: '',
      });
    } else {
      // All players done, show review
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    if (currentPlayerIndex > 0) {
      const prevIndex = currentPlayerIndex - 1;
      setCurrentPlayerIndex(prevIndex);
      setCurrentGame(gameData[prevIndex] || {
        totalScore: undefined,
        strikesFrames1to9: 0,
        sparesFrames1to9: 0,
        tenthFrame: '',
      });
    }
  };

  const handleSave = async () => {
    const playersList = getSelectedPlayersList();
    // Save all games
    const date = new Date().toISOString().split('T')[0];
    for (let index = 0; index < gameData.length; index++) {
      const game = gameData[index];
      if (game.totalScore !== undefined && game.tenthFrame) {
        const newGame: Game = {
          id: crypto.randomUUID(),
          playerId: playersList[index].id,
          date,
          totalScore: game.totalScore!,
          strikesFrames1to9: game.strikesFrames1to9 || 0,
          sparesFrames1to9: game.sparesFrames1to9 || 0,
          tenthFrame: game.tenthFrame,
        };
        await addGame(newGame);
      }
    }

    // Reset
    setCurrentStep(0);
    setSelectedPlayers([]);
    setCurrentPlayerIndex(0);
    setGameData([]);
    setCurrentGame({
      totalScore: undefined,
      strikesFrames1to9: 0,
      sparesFrames1to9: 0,
      tenthFrame: '',
    });
    alert('Games saved successfully!');
  };

  const selectedPlayersList = getSelectedPlayersList();
  const currentPlayer = selectedPlayersList[currentPlayerIndex];
  const isLastPlayer = currentPlayerIndex === selectedPlayersList.length - 1;

  if (allPlayers.length === 0) {
    return (
      <div className="min-h-screen bg-orange-50 pb-20 safe-top flex items-center justify-center px-4 relative">
        <div className="text-center">
          <p className="text-black mb-4 font-bold">No players added yet.</p>
          <p className="text-sm text-black font-bold">Add players in the Players tab first.</p>
        </div>
      </div>
    );
  }

  if (currentStep === 0) {
    return (
      <div className="min-h-screen bg-orange-50 pb-20 safe-top relative">
        <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-black mb-2 uppercase">Add New Game</h1>
              <p className="text-sm sm:text-base text-black font-bold">Click players to add them in order</p>
            </div>
            {selectedPlayers.length > 0 && (
              <button
                onClick={handleClearSelection}
                className="bg-amber-400 border-4 border-black text-black px-3 sm:px-4 py-2 sm:py-3 rounded-none font-black  flex items-center gap-2 text-sm sm:text-base"
              >
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-600 border-4 border-black rounded-none text-black text-sm font-black">
              {error}
            </div>
          )}

          {/* Player Selection Grid */}
          <div className="bg-white rounded-none border-4 border-black p-4 sm:p-6 mb-4 sm:mb-6 ">
            <h2 className="text-lg sm:text-xl font-black mb-4 uppercase">Select Players</h2>
            <div className="grid grid-cols-2 gap-3">
              {allPlayers.map(player => {
                const isSelected = selectedPlayers.includes(player.id);
                const position = isSelected ? selectedPlayers.indexOf(player.id) + 1 : null;
                const positionColors = [
                  'bg-orange-500',
                  'bg-amber-500',
                  'bg-lime-500',
                  'bg-orange-600',
                ];
                const selectedColor = position ? positionColors[position - 1] : '';
                return (
                  <button
                    key={player.id}
                    onClick={() => handleAddPlayer(player.id)}
                    disabled={!isSelected && selectedPlayers.length >= 4}
                    className={`p-4 rounded-none border-4 border-black font-black text-base sm:text-lg transition-all  min-h-[80px] sm:min-h-[90px] ${
                      isSelected
                        ? `${selectedColor} text-black cursor-pointer`
                        : selectedPlayers.length >= 4
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-amber-400 text-black hover:bg-amber-500'
                    }`}
                  >
                    <div className="flex items-center justify-between h-full">
                      <span className="flex-1 text-left">{player.name}</span>
                      <span className={`text-2xl sm:text-3xl font-black w-8 sm:w-10 text-right ${position ? '' : 'invisible'}`}>
                        {position || '0'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleStartGame}
            disabled={selectedPlayers.length === 0}
            className="w-full bg-orange-500 border-4 border-black text-black py-4 rounded-none font-black flex items-center justify-center gap-2  disabled:bg-gray-300 disabled:cursor-not-allowed "
          >
            Start Game
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  if (currentStep === 2) {
    // Review step
    return (
      <div className="min-h-screen bg-orange-50 pb-20 safe-top relative">
        <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-black mb-4 sm:mb-6 uppercase">Review Games</h1>
          <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
            {gameData.map((game, index) => {
              const player = selectedPlayersList[index];
              const tenthFrame = parseTenthFrame(game.tenthFrame || '');
              return (
                <div key={index} className="bg-white rounded-none border-4 border-black p-4 sm:p-5 ">
                  <h3 className="font-black text-base sm:text-lg mb-3 text-black truncate">{player.name}</h3>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                    <div>
                      <span className="text-black font-bold">Score:</span>
                      <span className="ml-2 font-black text-base sm:text-lg">{game.totalScore}</span>
                    </div>
                    <div>
                      <span className="text-black font-bold">Strikes:</span>
                      <span className="ml-2 font-black text-base sm:text-lg">{game.strikesFrames1to9}</span>
                    </div>
                    <div>
                      <span className="text-black font-bold">Spares:</span>
                      <span className="ml-2 font-black text-base sm:text-lg">{game.sparesFrames1to9}</span>
                    </div>
                    <div>
                      <span className="text-black font-bold">10th Frame:</span>
                      <span className="ml-2 font-black text-base sm:text-lg break-all">{game.tenthFrame}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={() => setCurrentStep(1)}
              className="flex-1 bg-amber-400 border-4 border-black text-black py-3 sm:py-4 rounded-none font-black flex items-center justify-center gap-2  text-sm sm:text-base"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              Back
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-lime-500 border-4 border-black text-black py-3 sm:py-4 rounded-none font-black flex items-center justify-center gap-2  text-sm sm:text-base"
            >
              Save Games
              <Check className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-yellow-100 pb-20 safe-top">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Progress */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-black uppercase">Add New Game</h1>
            <span className="text-xs sm:text-sm text-black font-black">
              Player {currentPlayerIndex + 1} of {selectedPlayersList.length}
            </span>
          </div>
          <div className="w-full bg-white border-4 border-black h-3 sm:h-4">
            <div
              className="bg-orange-500 h-full transition-all"
              style={{ width: `${((currentPlayerIndex + 1) / selectedPlayersList.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Current Player */}
        <div className="bg-white rounded-none border-4 border-black p-4 sm:p-6 mb-4 sm:mb-6 ">
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-4 sm:mb-6 text-black uppercase break-words">{currentPlayer?.name}</h2>

          {/* Total Score */}
          <div className="mb-6">
            <label className="block text-sm font-black text-black mb-3 uppercase">
              Total Score (Frames 1-9)
            </label>
            
            {/* Score Display - Always visible */}
            <div className="mb-4 flex items-center justify-center relative">
              <div className="inline-block px-4 py-3 border-4 border-black bg-white min-w-[200px] text-center">
                <span className="text-4xl sm:text-5xl font-black text-black">
                  {currentGame.totalScore !== undefined ? currentGame.totalScore : '---'}
                </span>
              </div>
              {currentGame.totalScore !== undefined && currentGame.totalScore > 0 && (
                <button
                  onClick={() => handleNumberInput('totalScore', 0)}
                  className="absolute bg-red-600 border-4 border-black px-3 py-2 text-black font-black hover:bg-red-700"
                  style={{ left: 'calc(50% + 110px)' }}
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              )}
            </div>

            {/* Phone Number Style Number Pad */}
            <div className="space-y-2">
              {/* Row 1: 1, 2, 3 */}
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map(num => (
                  <button
                    key={num}
                    onClick={() => {
                      const current = currentGame.totalScore?.toString() || '';
                      const newValue = current.length < 3 ? current + num : num.toString();
                      handleNumberInput('totalScore', parseInt(newValue) || 0);
                    }}
                    className="bg-amber-400 hover:bg-amber-500 border-4 border-black text-black py-4 sm:py-5 rounded-none font-black text-xl sm:text-2xl transition-all "
                  >
                    {num}
                  </button>
                ))}
              </div>
              {/* Row 2: 4, 5, 6 */}
              <div className="grid grid-cols-3 gap-2">
                {[4, 5, 6].map(num => (
                  <button
                    key={num}
                    onClick={() => {
                      const current = currentGame.totalScore?.toString() || '';
                      const newValue = current.length < 3 ? current + num : num.toString();
                      handleNumberInput('totalScore', parseInt(newValue) || 0);
                    }}
                    className="bg-amber-400 hover:bg-amber-500 border-4 border-black text-black py-4 sm:py-5 rounded-none font-black text-xl sm:text-2xl transition-all "
                  >
                    {num}
                  </button>
                ))}
              </div>
              {/* Row 3: 7, 8, 9 */}
              <div className="grid grid-cols-3 gap-2">
                {[7, 8, 9].map(num => (
                  <button
                    key={num}
                    onClick={() => {
                      const current = currentGame.totalScore?.toString() || '';
                      const newValue = current.length < 3 ? current + num : num.toString();
                      handleNumberInput('totalScore', parseInt(newValue) || 0);
                    }}
                    className="bg-amber-400 hover:bg-amber-500 border-4 border-black text-black py-4 sm:py-5 rounded-none font-black text-xl sm:text-2xl transition-all "
                  >
                    {num}
                  </button>
                ))}
              </div>
              {/* Row 4: 0 (centered) */}
              <div className="grid grid-cols-3 gap-2">
                <div></div>
                <button
                  onClick={() => {
                    const current = currentGame.totalScore?.toString() || '';
                    const newValue = current.length < 3 ? current + '0' : '0';
                    handleNumberInput('totalScore', parseInt(newValue) || 0);
                  }}
                  className="bg-amber-400 hover:bg-amber-500 border-4 border-black text-black py-4 sm:py-5 rounded-none font-black text-xl sm:text-2xl transition-all "
                >
                  0
                </button>
                <div></div>
              </div>
            </div>
          </div>

          {/* Strikes */}
          <div className="mb-6">
            <label className="block text-sm font-black text-black mb-3 uppercase">
              Strikes (Frames 1-9)
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  onClick={() => handleNumberInput('strikesFrames1to9', num)}
                  className={`py-2 sm:py-3 rounded-none border-4 border-black font-black transition-all  text-sm sm:text-base ${
                    currentGame.strikesFrames1to9 === num
                      ? 'bg-orange-500 text-black'
                      : 'bg-amber-400 hover:bg-amber-500 text-black'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Spares */}
          <div className="mb-6">
            <label className="block text-sm font-black text-black mb-3 uppercase">
              Spares (Frames 1-9)
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  onClick={() => handleNumberInput('sparesFrames1to9', num)}
                  className={`py-2 sm:py-3 rounded-none border-4 border-black font-black transition-all  text-sm sm:text-base ${
                    currentGame.sparesFrames1to9 === num
                      ? 'bg-orange-500 text-black'
                      : 'bg-amber-400 hover:bg-amber-500 text-black'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* 10th Frame */}
          <div className="mb-6">
            <label className="block text-sm font-black text-black mb-3 uppercase">
              10th Frame Notation
            </label>
            
            {/* Current Notation Display */}
            <div className="mb-4 flex items-center justify-center relative">
              <div className="inline-block px-4 py-3 border-4 border-black bg-white min-w-[200px] text-center">
                <span className="text-2xl sm:text-3xl font-mono font-black text-black">
                  {currentGame.tenthFrame || '---'}
                </span>
              </div>
              {currentGame.tenthFrame && currentGame.tenthFrame.length > 0 && (
                <button
                  onClick={() => handleTenthFrameChange('')}
                  className="absolute bg-red-600 border-4 border-black px-3 py-2 text-black font-black hover:bg-red-700"
                  style={{ left: 'calc(50% + 110px)' }}
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              )}
            </div>

            {/* Notation Pad */}
            <div className="space-y-2">
              {/* Row 1: 1, 2, 3 */}
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map(num => (
                  <button
                    key={num}
                    onClick={() => {
                      const current = currentGame.tenthFrame || '';
                      handleTenthFrameChange(current + num.toString());
                    }}
                    className="bg-amber-400 hover:bg-amber-500 border-4 border-black text-black py-3 sm:py-4 rounded-none font-black text-lg sm:text-xl transition-all "
                  >
                    {num}
                  </button>
                ))}
              </div>
              {/* Row 2: 4, 5, 6 */}
              <div className="grid grid-cols-3 gap-2">
                {[4, 5, 6].map(num => (
                  <button
                    key={num}
                    onClick={() => {
                      const current = currentGame.tenthFrame || '';
                      handleTenthFrameChange(current + num.toString());
                    }}
                    className="bg-amber-400 hover:bg-amber-500 border-4 border-black text-black py-3 sm:py-4 rounded-none font-black text-lg sm:text-xl transition-all "
                  >
                    {num}
                  </button>
                ))}
              </div>
              {/* Row 3: 7, 8, 9 */}
              <div className="grid grid-cols-3 gap-2">
                {[7, 8, 9].map(num => (
                  <button
                    key={num}
                    onClick={() => {
                      const current = currentGame.tenthFrame || '';
                      handleTenthFrameChange(current + num.toString());
                    }}
                    className="bg-amber-400 hover:bg-amber-500 border-4 border-black text-black py-3 sm:py-4 rounded-none font-black text-lg sm:text-xl transition-all "
                  >
                    {num}
                  </button>
                ))}
              </div>
              {/* Row 4: /, -, X */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    const current = currentGame.tenthFrame || '';
                    handleTenthFrameChange(current + '/');
                  }}
                  className="bg-amber-400 hover:bg-amber-500 border-4 border-black text-black py-3 sm:py-4 rounded-none font-black text-lg sm:text-xl transition-all "
                >
                  /
                </button>
                <button
                  onClick={() => {
                    const current = currentGame.tenthFrame || '';
                    handleTenthFrameChange(current + '-');
                  }}
                  className="bg-amber-400 hover:bg-amber-500 border-4 border-black text-black py-3 sm:py-4 rounded-none font-black text-lg sm:text-xl transition-all "
                >
                  -
                </button>
                <button
                  onClick={() => {
                    const current = currentGame.tenthFrame || '';
                    handleTenthFrameChange(current + 'X');
                  }}
                  className="bg-amber-400 hover:bg-amber-500 border-4 border-black text-black py-3 sm:py-4 rounded-none font-black text-lg sm:text-xl transition-all "
                >
                  X
                </button>
              </div>
            </div>
            
            <p className="text-xs text-black mt-3 text-center font-bold">
              Examples: X9/ (strike + spare), 9/8 (spare), 72 (open), X-X (two strikes)
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-600 border-4 border-black rounded-none text-black text-sm font-black">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-2 sm:gap-3">
            {currentPlayerIndex > 0 && (
              <button
                onClick={handleBack}
                className="flex-1 bg-amber-400 border-4 border-black text-black py-3 sm:py-4 rounded-none font-black flex items-center justify-center gap-2  text-sm sm:text-base"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                Previous
              </button>
            )}
            <button
              onClick={handleNext}
                className="flex-1 bg-orange-500 border-4 border-black text-black py-3 sm:py-4 rounded-none font-black flex items-center justify-center gap-2  text-sm sm:text-base"
            >
              {isLastPlayer ? 'Review' : 'Next'}
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
