import type { Game } from '../types';

/**
 * Parse 10th frame notation (e.g., "X9/", "9/8", "72", "X-X")
 * Returns: { strikes, spares, totalPins }
 */
export const parseTenthFrame = (notation: string): { strikes: number; spares: number; totalPins: number } => {
  let strikes = 0;
  let spares = 0;
  let totalPins = 0;
  
  const normalized = notation.toUpperCase().trim();
  
  // Check if first shot is a strike
  if (normalized[0] === 'X') {
    strikes = 1;
    totalPins += 10;
    
    // Parse remaining shots
    if (normalized.length > 1) {
      const shot2 = normalized[1];
      const shot3 = normalized[2] || '';
      
      if (shot2 === 'X') {
        // Second shot is also a strike
        totalPins += 10;
        if (shot3 === 'X') {
          totalPins += 10;
        } else if (shot3 === '-') {
          totalPins += 0;
        } else if (shot3 === '/') {
          // This shouldn't happen, but handle it
          totalPins += 10;
          spares = 1;
        } else {
          const pins = parseInt(shot3) || 0;
          totalPins += pins;
        }
      } else if (shot2 === '/') {
        // Spare on shots 2+3
        totalPins += 10;
        spares = 1;
      } else if (shot2 === '-') {
        totalPins += 0;
        if (shot3 && shot3 !== '-') {
          const pins = parseInt(shot3) || 0;
          totalPins += pins;
        }
      } else {
        const pins = parseInt(shot2) || 0;
        totalPins += pins;
        if (shot3 === '/') {
          // Spare on shots 2+3
          totalPins += (10 - pins);
          spares = 1;
        } else if (shot3 && shot3 !== '-') {
          const pins3 = parseInt(shot3) || 0;
          totalPins += pins3;
        }
      }
    }
  } else {
    // First shot is not a strike
    const shot1 = normalized[0];
    const shot2 = normalized[1] || '';
    
    if (shot1 === '-') {
      totalPins += 0;
    } else {
      const pins1 = parseInt(shot1) || 0;
      totalPins += pins1;
    }
    
    if (shot2 === '/') {
      // Spare on shots 1+2
      totalPins = 10; // Reset to 10 for spare
      spares = 1;
      // Check for third shot (bonus after spare)
      if (normalized.length > 2) {
        const shot3 = normalized[2];
        if (shot3 === 'X') {
          totalPins += 10;
        } else if (shot3 === '-') {
          totalPins += 0;
        } else {
          const pins3 = parseInt(shot3) || 0;
          totalPins += pins3;
        }
      }
    } else if (shot2 === '-') {
      totalPins += 0;
    } else if (shot2) {
      const pins2 = parseInt(shot2) || 0;
      totalPins += pins2;
    }
  }
  
  return { strikes, spares, totalPins };
};

/**
 * Calculate strike percentage for a game
 */
export const calculateStrikePercentage = (game: Game): number => {
  const tenthFrame = parseTenthFrame(game.tenthFrame);
  const totalStrikes = game.strikesFrames1to9 + tenthFrame.strikes;
  return (totalStrikes / 10) * 100;
};

/**
 * Calculate spare percentage for a game
 */
export const calculateSparePercentage = (game: Game): number => {
  const tenthFrame = parseTenthFrame(game.tenthFrame);
  const totalSpares = game.sparesFrames1to9 + tenthFrame.spares;
  
  // Calculate spare opportunities
  // Frames 1-9: opportunities = 9 - strikes in frames 1-9
  const spareOpportunities1to9 = 9 - game.strikesFrames1to9;
  
  // 10th frame: always 1 opportunity (either shots 1+2 or shots 2+3)
  const totalSpareOpportunities = spareOpportunities1to9 + 1;
  
  return totalSpareOpportunities > 0 ? (totalSpares / totalSpareOpportunities) * 100 : 0;
};

/**
 * Validate game data
 */
export const validateGame = (game: Partial<Game>): { valid: boolean; error?: string } => {
  if (!game.totalScore || game.totalScore < 0 || game.totalScore > 300) {
    return { valid: false, error: 'Total score must be between 0 and 300' };
  }
  
  if (game.strikesFrames1to9 === undefined || game.strikesFrames1to9 < 0 || game.strikesFrames1to9 > 9) {
    return { valid: false, error: 'Strikes in frames 1-9 must be between 0 and 9' };
  }
  
  if (game.sparesFrames1to9 === undefined || game.sparesFrames1to9 < 0 || game.sparesFrames1to9 > 9) {
    return { valid: false, error: 'Spares in frames 1-9 must be between 0 and 9' };
  }
  
  // Validate that strikes + spares + opens = 9
  const opens = 9 - game.strikesFrames1to9! - game.sparesFrames1to9!;
  if (opens < 0) {
    return { valid: false, error: 'Strikes + spares cannot exceed 9 frames' };
  }
  
  if (!game.tenthFrame || game.tenthFrame.trim() === '') {
    return { valid: false, error: '10th frame notation is required' };
  }
  
  // Validate 10th frame notation format
  const validChars = /^[X0-9\/\-]+$/i;
  if (!validChars.test(game.tenthFrame)) {
    return { valid: false, error: 'Invalid 10th frame notation' };
  }
  
  return { valid: true };
};
