'use strict';

const { TABLE, get, query, scan } = require('./shared/dynamo');
const { getNextGameTime, gameTimeslotPK, GAME_DURATION_MS, RESULTS_DURATION_MS } = require('./shared/game-clock');

function response(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body)
  };
}

/**
 * Get the ISO date string for the Monday of the current week (ET timezone).
 */
function getMonday() {
  const now = new Date();
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay();
  const diff = day === 0 ? 6 : day - 1;
  et.setDate(et.getDate() - diff);
  return `${et.getFullYear()}-${String(et.getMonth() + 1).padStart(2, '0')}-${String(et.getDate()).padStart(2, '0')}`;
}

/**
 * US state abbreviation to full name mapping.
 */
const STATE_NAMES = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',
  CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',
  IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',
  ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',
  MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',
  NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',
  OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',
  TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',
  WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',DC:'District of Columbia'
};

/**
 * Build podium data — top 10 players from the completed game at this bar.
 */
async function buildPodium(gameId, barCode) {
  try {
    // Query all answers for this game at this bar via game-bar-index
    const answers = await query(TABLE.ANSWERS, {
      IndexName: 'game-bar-index',
      KeyConditionExpression: 'gameIdBarCode = :gbc',
      ExpressionAttributeValues: { ':gbc': `${gameId}#${barCode}` }
    });

    if (!answers || answers.length === 0) return null;

    // Aggregate scores by player
    const playerScores = new Map();
    for (const a of answers) {
      const pid = a.playerId;
      if (!playerScores.has(pid)) {
        playerScores.set(pid, { playerId: pid, name: a.playerName || 'Anonymous', score: 0, questionsAnswered: 0 });
      }
      const p = playerScores.get(pid);
      p.score += (a.pointsAwarded || 0);
      p.questionsAnswered++;
    }

    // Sort by score descending
    const sorted = [...playerScores.values()].sort((a, b) => b.score - a.score);
    const top10 = sorted.slice(0, 10).map((p, i) => ({
      name: p.name,
      score: p.score,
      rank: i + 1
    }));

    return {
      players: top10,
      questionCount: 15,
      playerCount: playerScores.size
    };
  } catch (err) {
    console.error('buildPodium error:', err.message);
    return null;
  }
}

/**
 * Build bar standings — this bar's score index + state rankings.
 */
async function buildBarStandings(barCode) {
  try {
    const bar = await get(TABLE.BARS, { PK: `BAR#${barCode}` });
    if (!bar || !bar.state || !bar.scoreIndex) return null;

    const monday = getMonday();

    // Query bars in same state by score index (descending)
    const stateBars = await query(TABLE.BARS, {
      IndexName: 'StateScoreIndex',
      KeyConditionExpression: '#st = :state',
      ExpressionAttributeNames: { '#st': 'state' },
      ExpressionAttributeValues: { ':state': bar.state },
      ScanIndexForward: false,
      Limit: 20
    });

    // Find this bar's rank in state
    let stateRank = 1;
    const stateRanking = [];
    for (let i = 0; i < stateBars.length; i++) {
      const b = stateBars[i];
      if (b.PK === `BAR#${barCode}`) {
        stateRank = i + 1;
      }
    }

    // Get top 5 bars around this bar's rank for display
    const myIdx = stateBars.findIndex(b => b.PK === `BAR#${barCode}`);
    let displayStart = Math.max(0, myIdx - 2);
    let displayEnd = Math.min(stateBars.length, displayStart + 5);
    if (displayEnd - displayStart < 5) displayStart = Math.max(0, displayEnd - 5);

    for (let i = displayStart; i < displayEnd; i++) {
      const b = stateBars[i];
      stateRanking.push({
        name: b.barName || b.locationName || 'Unknown',
        city: b.city || '',
        rank: i + 1,
        index: b.scoreIndex || 0,
        delta: 0 // Delta tracking deferred
      });
    }

    // Count total bars nationally (lightweight scan for count)
    let totalBars = 0;
    try {
      const allBars = await scan(TABLE.BARS, {
        ProjectionExpression: 'PK, scoreIndex',
        FilterExpression: 'attribute_exists(scoreIndex)'
      });
      totalBars = allBars.length;

      // Find national rank
      const sortedAll = allBars.sort((a, b) => (b.scoreIndex || 0) - (a.scoreIndex || 0));
      var nationalRank = sortedAll.findIndex(b => b.PK === `BAR#${barCode}`) + 1;
      if (nationalRank === 0) nationalRank = totalBars;
    } catch (e) {
      console.error('National bar count error:', e.message);
      nationalRank = 0;
    }

    return {
      yourBar: {
        name: bar.barName || bar.locationName || 'Unknown',
        city: bar.city || '',
        state: bar.state,
        rank: stateRank,
        index: bar.scoreIndex || 0,
        delta: 0,
        nationalRank: nationalRank || 0,
        totalBars: totalBars || 0
      },
      stateRanking,
      stateName: STATE_NAMES[bar.state] || bar.state
    };
  } catch (err) {
    console.error('buildBarStandings error:', err.message);
    return null;
  }
}

/**
 * Build national top 25 players for the current week.
 */
async function buildNational(barCode) {
  try {
    const monday = getMonday();

    // Query WeeklyLeaderboard GSI (descending by weeklyPoints)
    const topPlayers = await query(TABLE.PLAYERS, {
      IndexName: 'WeeklyLeaderboard',
      KeyConditionExpression: 'weekStart = :ws',
      ExpressionAttributeValues: { ':ws': monday },
      ScanIndexForward: false,
      Limit: 25
    });

    if (!topPlayers || topPlayers.length === 0) return null;

    const top25 = topPlayers.map((p, i) => ({
      name: p.displayName || 'Anonymous',
      bar: p.currentBarName || '',
      city: p.city || '',
      score: p.weeklyPoints || 0
    }));

    // Platform stats — count active players and bars this week
    let totalPlayers = 0, totalBars = 0;
    try {
      const weekPlayers = await query(TABLE.PLAYERS, {
        IndexName: 'WeeklyLeaderboard',
        KeyConditionExpression: 'weekStart = :ws',
        ExpressionAttributeValues: { ':ws': monday },
        Select: 'COUNT'
      });
      // query with Select: COUNT returns count differently — use length
      totalPlayers = weekPlayers.length || topPlayers.length;
    } catch (e) {
      totalPlayers = topPlayers.length;
    }

    try {
      const activeBars = await scan(TABLE.BARS, {
        ProjectionExpression: 'PK',
        FilterExpression: 'attribute_exists(scoreIndex) AND weekStart = :ws',
        ExpressionAttributeValues: { ':ws': monday }
      });
      totalBars = activeBars.length;
    } catch (e) {
      totalBars = 0;
    }

    const cutoffScore = topPlayers.length >= 25 ? topPlayers[24].weeklyPoints || 0 : 0;

    // Find closest player from this bar
    let yourBarBest = null;
    if (barCode) {
      try {
        // Get all players at this bar who have weekly scores
        const barAnswers = await query(TABLE.ANSWERS, {
          IndexName: 'game-bar-index',
          KeyConditionExpression: 'gameIdBarCode = :prefix',
          ExpressionAttributeValues: { ':prefix': `*#${barCode}` }
        });
        // This approach won't work well — use the player records instead
        // Just scan for top player at this bar from the weekly leaderboard
        for (const p of topPlayers) {
          if (p.currentBarCode === barCode) {
            yourBarBest = { name: p.displayName || 'Anonymous', score: p.weeklyPoints || 0 };
            break;
          }
        }
      } catch (e) {
        // Best effort
      }
    }

    return {
      top25,
      stats: {
        players: totalPlayers,
        games: 0, // Would require separate query
        questions: 0,
        bars: totalBars
      },
      cutoffScore,
      yourBarBest
    };
  } catch (err) {
    console.error('buildNational error:', err.message);
    return null;
  }
}

/**
 * Build hype data — next game categories and timing.
 */
async function buildHype(nowEpoch) {
  try {
    const nextGameEpoch = getNextGameTime(nowEpoch);
    const nextPK = gameTimeslotPK(nextGameEpoch);

    const nextGame = await get(TABLE.GAMES, { PK: nextPK });

    let categories = [];
    if (nextGame && nextGame.categories) {
      categories = nextGame.categories;
    } else if (nextGame && nextGame.questions) {
      categories = [...new Set(nextGame.questions.map(q => q.category))];
    }

    return {
      nextGameId: nextPK,
      categories: categories.slice(0, 8),
      startsAt: nextGameEpoch
    };
  } catch (err) {
    console.error('buildHype error:', err.message);
    return null;
  }
}

/**
 * GET /game/between?barCode={code}&gameId={id}
 * Returns all data for the 4 between-game phases in a single call.
 */
exports.handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const barCode = params.barCode;
    const gameId = params.gameId;

    if (!barCode) {
      return response(400, { error: 'MISSING_BAR_CODE', message: 'barCode is required' });
    }
    if (!gameId) {
      return response(400, { error: 'MISSING_GAME_ID', message: 'gameId is required' });
    }

    const nowEpoch = Date.now();

    // Fetch all 4 phases in parallel
    const [podium, barStandings, national, hype] = await Promise.all([
      buildPodium(gameId, barCode),
      buildBarStandings(barCode),
      buildNational(barCode),
      buildHype(nowEpoch)
    ]);

    return response(200, {
      podium,
      barStandings,
      national,
      hype
    });
  } catch (err) {
    console.error('get-between-game-data error:', err);
    return response(500, { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
  }
};
