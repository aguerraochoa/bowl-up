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
 * Validate 10th frame notation for impossible combinations
 * Returns: { valid: boolean; error?: string }
 */
export const validateTenthFrame = (notation: string): { valid: boolean; error?: string } => {
  if (!notation || notation.trim() === '') {
    return { valid: false, error: '10th frame notation is required' };
  }
  
  const normalized = notation.toUpperCase().trim();
  
  // Validate characters
  const validChars = /^[X0-9/-]+$/i;
  if (!validChars.test(normalized)) {
    return { valid: false, error: 'Invalid characters. Use X, 0-9, /, or -' };
  }
  
  // Case 1: First ball is a strike (X)
  if (normalized[0] === 'X') {
    // After a strike, you get 2 more balls
    if (normalized.length === 1) {
      return { valid: true }; // Still typing
    }
    
    const shot2 = normalized[1];
    const shot3 = normalized[2] || '';
    
    // Second shot cannot be a spare (/) because you already got 10 pins
    if (shot2 === '/') {
      return { valid: false, error: 'Cannot have a spare after a strike in the 10th frame' };
    }
    
    // If second shot is a number (0-9), third shot is required
    if (shot2 && shot2 !== 'X' && shot2 !== '-' && !isNaN(parseInt(shot2))) {
      const pins2 = parseInt(shot2);
      if (pins2 < 0 || pins2 > 9) {
        return { valid: false, error: 'Invalid pin count' };
      }
      // Third shot is required
      if (!shot3) {
        return { valid: true }; // Still typing
      }
      // Third shot cannot be a spare if second was a number
      if (shot3 === '/') {
        return { valid: false, error: 'Cannot have a spare on the third ball after a strike' };
      }
      // Third shot cannot be a strike if second was a number (you'd need to knock down remaining pins)
      if (shot3 === 'X' && pins2 < 10) {
        return { valid: false, error: `Cannot have a strike on third ball after ${pins2} pins on second ball` };
      }
      if (shot3 !== 'X' && shot3 !== '-' && !isNaN(parseInt(shot3))) {
        const pins3 = parseInt(shot3);
        if (pins3 < 0 || pins3 > 9) {
          return { valid: false, error: 'Invalid pin count' };
        }
        if (pins2 + pins3 > 10) {
          return { valid: false, error: `Cannot knock down ${pins2 + pins3} pins with 2 balls (max 10)` };
        }
      }
    } else if (shot2 === 'X') {
      // Two strikes, third ball can be anything
      if (shot3 && shot3 !== 'X' && shot3 !== '-' && shot3 !== '/') {
        const pins3 = parseInt(shot3);
        if (isNaN(pins3) || pins3 < 0 || pins3 > 9) {
          return { valid: false, error: 'Invalid pin count' };
        }
      }
    } else if (shot2 === '-') {
      // Second shot is a miss, third shot is required
      if (!shot3) {
        return { valid: true }; // Still typing
      }
      if (shot3 === '/') {
        return { valid: false, error: 'Cannot have a spare on third ball after missing second ball' };
      }
      if (shot3 === 'X') {
        return { valid: false, error: 'Cannot have a strike on third ball after missing second ball' };
      }
      if (shot3 !== '-') {
        const pins3 = parseInt(shot3);
        if (isNaN(pins3) || pins3 < 0 || pins3 > 9) {
          return { valid: false, error: 'Invalid pin count' };
        }
      }
    }
    
    // Valid strike combinations: X-X-X, X-X-9, X-9-1, X-9/, X-9-, X--9, etc.
    return { valid: true };
  }
  
  // Case 2: First ball is NOT a strike
  const shot1 = normalized[0];
  const shot2 = normalized[1] || '';
  const shot3 = normalized[2] || '';
  
  if (shot1 === '-') {
    // First ball is a miss
    if (!shot2) {
      return { valid: true }; // Still typing
    }
    if (shot2 === '/') {
      // Spare on shots 1+2, third ball is required
      if (!shot3) {
        return { valid: true }; // Still typing
      }
      // Third ball can be X, 0-9, or -
      if (shot3 !== 'X' && shot3 !== '-' && !isNaN(parseInt(shot3))) {
        const pins3 = parseInt(shot3);
        if (pins3 < 0 || pins3 > 9) {
          return { valid: false, error: 'Invalid pin count' };
        }
      }
      return { valid: true };
    } else if (shot2 === 'X') {
      // Cannot have a strike on second ball if first was a miss
      return { valid: false, error: 'Cannot have a strike on second ball after missing first ball' };
    } else if (shot2 !== '-') {
      const pins2 = parseInt(shot2);
      if (isNaN(pins2) || pins2 < 0 || pins2 > 9) {
        return { valid: false, error: 'Invalid pin count' };
      }
      // No third ball if first two don't result in spare or strike
      if (shot3) {
        return { valid: false, error: 'No third ball allowed when first two balls don\'t result in a strike or spare' };
      }
      return { valid: true };
    } else {
      // Both first and second are misses, no third ball
      if (shot3) {
        return { valid: false, error: 'No third ball allowed when both first two balls are misses' };
      }
      return { valid: true };
    }
  } else {
    // First ball is a number (0-9)
    const pins1 = parseInt(shot1);
    if (isNaN(pins1) || pins1 < 0 || pins1 > 9) {
      return { valid: false, error: 'Invalid pin count' };
    }
    
    if (!shot2) {
      return { valid: true }; // Still typing
    }
    
    if (shot2 === '/') {
      // Spare on shots 1+2, third ball is required
      if (!shot3) {
        return { valid: true }; // Still typing
      }
      // Third ball can be X, 0-9, or -
      if (shot3 !== 'X' && shot3 !== '-' && !isNaN(parseInt(shot3))) {
        const pins3 = parseInt(shot3);
        if (pins3 < 0 || pins3 > 9) {
          return { valid: false, error: 'Invalid pin count' };
        }
      }
      return { valid: true };
    } else if (shot2 === 'X') {
      // Cannot have a strike on second ball if first was a number
      return { valid: false, error: `Cannot have a strike on second ball after ${pins1} pins on first ball` };
    } else if (shot2 === '-') {
      // Second ball is a miss
      // No third ball allowed
      if (shot3) {
        return { valid: false, error: 'No third ball allowed when second ball is a miss' };
      }
      return { valid: true };
    } else {
      // Second ball is a number
      const pins2 = parseInt(shot2);
      if (isNaN(pins2) || pins2 < 0 || pins2 > 9) {
        return { valid: false, error: 'Invalid pin count' };
      }
      if (pins1 + pins2 > 10) {
        return { valid: false, error: `Cannot knock down ${pins1 + pins2} pins with 2 balls (max 10)` };
      }
      // No third ball if first two don't result in spare
      if (shot3) {
        return { valid: false, error: 'No third ball allowed when first two balls don\'t result in a spare' };
      }
      return { valid: true };
    }
  }
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
  
  // Validate 10th frame with comprehensive rules
  const tenthFrameValidation = validateTenthFrame(game.tenthFrame || '');
  if (!tenthFrameValidation.valid) {
    return tenthFrameValidation;
  }
  
  return { valid: true };
};
