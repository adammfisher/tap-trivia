'use strict';

const { TABLE, query, scan } = require('./shared/dynamo');
const { authenticate, unauthorized } = require('./shared/auth');

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

// Period cutoffs in milliseconds
function getPeriodCutoff(period) {
  const now = Date.now();
  switch (period) {
    case 'today': return now - 24 * 3600 * 1000;
    case 'month': return now - 30 * 24 * 3600 * 1000;
    case 'all':   return 0;
    case 'week':
    default:      return now - 7 * 24 * 3600 * 1000;
  }
}

// Get day-of-week label from timestamp
function getDayLabel(ts) {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(ts).getDay()];
}

// Get hour label from timestamp (ET)
function getHourET(ts) {
  const d = new Date(ts);
  const et = new Date(d.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return et.getHours();
}

function formatHour(h) {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

exports.handler = async (event) => {
  try {
    const bar = await authenticate(event);
    if (!bar) return unauthorized();

    const period = event.queryStringParameters?.period || 'week';
    const cutoff = getPeriodCutoff(period);
    const weekCutoff = getPeriodCutoff('week');

    // Query all answers for this bar in the period
    const answers = await query(TABLE.ANSWERS, {
      IndexName: 'barCode-time-index',
      KeyConditionExpression: cutoff > 0
        ? 'barCode = :bc AND serverTimestamp >= :ts'
        : 'barCode = :bc',
      ExpressionAttributeValues: cutoff > 0
        ? { ':bc': bar.barCode, ':ts': cutoff }
        : { ':bc': bar.barCode }
    });

    // Also get this week's answers for summary stats (if period != week)
    let weekAnswers = answers;
    if (period !== 'week' && cutoff !== weekCutoff) {
      weekAnswers = answers.filter(a => a.serverTimestamp >= weekCutoff);
    }

    // --- Summary stats (always from this week) ---
    const weekPlayerIds = new Set();
    const weekGameIds = new Set();
    const weekGamePlayers = {}; // gameId → Set of playerIds
    weekAnswers.forEach(a => {
      weekPlayerIds.add(a.playerId);
      weekGameIds.add(a.gameId);
      if (!weekGamePlayers[a.gameId]) weekGamePlayers[a.gameId] = new Set();
      weekGamePlayers[a.gameId].add(a.playerId);
    });

    const peakPlayers = Object.values(weekGamePlayers).reduce((max, s) => Math.max(max, s.size), 0);
    const weekCorrect = weekAnswers.filter(a => a.isCorrect).length;
    const avgCorrect = weekAnswers.length > 0 ? Math.round((weekCorrect / weekAnswers.length) * 100) : 0;

    // Avg session: average span from first to last answer per player per game
    let totalSessionMs = 0;
    let sessionCount = 0;
    const playerGameAnswers = {};
    weekAnswers.forEach(a => {
      const key = `${a.playerId}#${a.gameId}`;
      if (!playerGameAnswers[key]) playerGameAnswers[key] = [];
      playerGameAnswers[key].push(a.serverTimestamp);
    });
    Object.values(playerGameAnswers).forEach(times => {
      if (times.length >= 2) {
        totalSessionMs += Math.max(...times) - Math.min(...times);
        sessionCount++;
      }
    });
    const avgSessionMin = sessionCount > 0 ? Math.round(totalSessionMs / sessionCount / 60000) : 0;

    // --- Detailed analytics (from selected period) ---

    // Players per day (grouped by day-of-week)
    const dayPlayers = {}; // 'Mon' → Set of playerIds
    const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    dayOrder.forEach(d => { dayPlayers[d] = new Set(); });
    answers.forEach(a => {
      const day = getDayLabel(a.serverTimestamp);
      dayPlayers[day].add(a.playerId);
    });
    const playersPerDay = dayOrder.map(d => ({ day: d, players: dayPlayers[d].size }));

    // Peak hours
    const hourPlayers = {}; // hour → Set of playerIds
    answers.forEach(a => {
      const h = getHourET(a.serverTimestamp);
      if (!hourPlayers[h]) hourPlayers[h] = new Set();
      hourPlayers[h].add(a.playerId);
    });
    const peakHours = Object.entries(hourPlayers)
      .map(([h, s]) => ({ hour: parseInt(h), label: formatHour(parseInt(h)), players: s.size }))
      .sort((a, b) => b.players - a.players)
      .slice(0, 6);
    const maxHourPlayers = peakHours.length > 0 ? peakHours[0].players : 1;
    peakHours.forEach(h => { h.pct = Math.round((h.players / maxHourPlayers) * 100); });

    // Popular categories — cross-reference with Games table
    const gameIds = [...new Set(answers.map(a => a.gameId))];
    const categoryCorrect = {}; // category → { correct, total }

    // Fetch games in batches (Games table has 7-day TTL so only recent ones exist)
    const gameCache = {};
    for (const gid of gameIds) {
      if (gameCache[gid]) continue;
      const games = await query(TABLE.GAMES, {
        IndexName: 'gameId-index',
        KeyConditionExpression: 'gameId = :gid',
        ExpressionAttributeValues: { ':gid': gid }
      });
      if (games.length > 0) gameCache[gid] = games[0];
    }

    answers.forEach(a => {
      const game = gameCache[a.gameId];
      if (!game || !game.questions) return;
      const q = game.questions[a.questionNumber - 1];
      if (!q) return;
      const cat = q.category || 'Unknown';
      if (!categoryCorrect[cat]) categoryCorrect[cat] = { correct: 0, total: 0 };
      categoryCorrect[cat].total++;
      if (a.isCorrect) categoryCorrect[cat].correct++;
    });

    const popularCategories = Object.entries(categoryCorrect)
      .map(([cat, stats]) => ({
        category: cat,
        total: stats.total,
        correctPct: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    // Player retention
    const allPlayerIds = [...new Set(answers.map(a => a.playerId))];
    const playerGames = {}; // playerId → Set of gameIds
    const playerDates = {}; // playerId → Set of date strings
    answers.forEach(a => {
      if (!playerGames[a.playerId]) playerGames[a.playerId] = new Set();
      playerGames[a.playerId].add(a.gameId);
      if (!playerDates[a.playerId]) playerDates[a.playerId] = new Set();
      playerDates[a.playerId].add(new Date(a.serverTimestamp).toISOString().slice(0, 10));
    });

    const totalPlayers = allPlayerIds.length;
    const multiGamePlayers = allPlayerIds.filter(p => playerGames[p].size > 1).length;
    const multiNightPlayers = allPlayerIds.filter(p => playerDates[p].size > 1).length;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        bar: {
          barCode: bar.barCode,
          barName: bar.barName,
          city: bar.city || '',
          state: bar.state || '',
          ownerEmail: bar.ownerEmail || '',
          emailVerified: bar.emailVerified || false,
          logoUrl: bar.logoUrl || null,
          logoHash: bar.logoHash || null,
          signage: bar.signage || { slides: [], rotationSpeed: 60, enabled: true }
        },
        analytics: {
          playersThisWeek: weekPlayerIds.size,
          gamesThisWeek: weekGameIds.size,
          peakPlayers,
          avgCorrect,
          avgSessionMin,
          // Detailed (for analytics screen)
          period,
          totalPlayers,
          totalAnswers: answers.length,
          playersPerDay,
          peakHours,
          popularCategories,
          retention: {
            total: totalPlayers,
            multiGame: multiGamePlayers,
            multiNight: multiNightPlayers
          }
        }
      })
    };
  } catch (err) {
    console.error('get-dashboard error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' })
    };
  }
};
