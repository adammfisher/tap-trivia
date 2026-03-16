/** Format seconds into human-readable countdown (e.g., "10h 5m", "3m 22s", "15s") */
export function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0s';
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

/** Format large number with commas */
export function formatNumber(n: number): string {
  return n.toLocaleString();
}

/** Category string → emoji icon. Covers all 60 topic_tree categories.
 *  Order matters: specific phrases first, broad keywords last (first match wins). */
export function getCategoryIcon(category: string): string {
  if (!category) return '\u{1F9E0}';
  const c = category.toLowerCase();
  const map: Record<string, string> = {
    // Sport leagues (most specific)
    nhl: '\u{1F3D2}',       // 🏒
    nfl: '\u{1F3C8}',       // 🏈
    nba: '\u{1F3C0}',       // 🏀
    mlb: '\u26BE',           // ⚾
    ncaa: '\u{1F393}',       // 🎓
    nascar: '\u{1F3C1}',    // 🏁
    olympic: '\u{1F3C5}',   // 🏅
    soccer: '\u26BD',        // ⚽
    // Multi-word specifics
    disney: '\u{1F3F0}',    // 🏰
    'pop culture': '\u{1F31F}', // 🌟
    'true crime': '\u{1F50D}',  // 🔍
    'social media': '\u{1F4F1}', // 📱
    'road trip': '\u{1F697}',    // 🚗
    'national park': '\u{1F3D5}\uFE0F', // 🏕️
    'board game': '\u{1F3AE}',  // 🎮
    'video game': '\u{1F3AE}',  // 🎮
    'human body': '\u{1F9EC}',  // 🧬
    'planet earth': '\u{1F30E}', // 🌎
    'world record': '\u{1F92F}', // 🤯
    // Specific categories (prevent wrong broad matches)
    broadway: '\u{1F3AD}',  // 🎭
    theater: '\u{1F3AD}',   // 🎭
    performing: '\u{1F3AD}', // 🎭
    movie: '\u{1F3AC}',     // 🎬
    hollywood: '\u{1F3AC}', // 🎬
    blockbuster: '\u{1F3AC}', // 🎬
    president: '\u{1F3DB}\uFE0F', // 🏛️
    government: '\u2696\uFE0F',   // ⚖️
    constitution: '\u2696\uFE0F', // ⚖️
    beer: '\u{1F37A}',      // 🍺
    wine: '\u{1F37A}',      // 🍺
    cocktail: '\u{1F37A}',  // 🍺
    biology: '\u{1F9EC}',   // 🧬
    chemistry: '\u2697\uFE0F', // ⚗️
    physics: '\u2697\uFE0F',   // ⚗️
    brand: '\u{1F4E2}',     // 📢
    advertising: '\u{1F4E2}', // 📢
    building: '\u{1F3D7}\uFE0F', // 🏗️
    architecture: '\u{1F3D7}\uFE0F', // 🏗️
    fashion: '\u{1F457}',   // 👗
    holiday: '\u{1F384}',   // 🎄
    tradition: '\u{1F384}', // 🎄
    decade: '\u{1F4FB}',    // 📻
    nostalgia: '\u{1F4FB}', // 📻
    medicine: '\u{1FA7A}',  // 🩺
    health: '\u{1FA7A}',    // 🩺
    river: '\u{1F3D4}\uFE0F', // 🏔️
    mountain: '\u{1F3D4}\uFE0F', // 🏔️
    ocean: '\u{1F30A}',     // 🌊
    bible: '\u{1F4D6}',     // 📖
    religion: '\u{1F4D6}',  // 📖
    celebrity: '\u{1F31F}',  // 🌟
    wrestling: '\u{1F94A}',  // 🥊
    combat: '\u{1F94A}',     // 🥊
    crime: '\u{1F50D}',     // 🔍
    infamous: '\u{1F50D}',   // 🔍
    weird: '\u{1F92F}',     // 🤯
    travel: '\u2708\uFE0F', // ✈️
    'famous cities': '\u2708\uFE0F', // ✈️
    business: '\u{1F4BC}',  // 💼
    entrepreneur: '\u{1F4BC}', // 💼
    invention: '\u{1F4A1}', // 💡
    environment: '\u{1F30E}', // 🌎
    weather: '\u{1F326}\uFE0F', // 🌦️
    geology: '\u{1F30B}',   // 🌋
    streaming: '\u{1F4FA}', // 📺
    television: '\u{1F4FA}', // 📺
    song: '\u{1F3B5}',      // 🎵
    lyric: '\u{1F3B5}',     // 🎵
    album: '\u{1F3B5}',     // 🎵
    computer: '\u{1F4BB}',  // 💻
    internet: '\u{1F4BB}',  // 💻
    landmark: '\u{1F4CD}',  // 📍
    flag: '\u{1F5FA}\uFE0F', // 🗺️
    // Broad categories (last — fallback matches)
    science: '\u{1F52C}',   // 🔬
    history: '\u{1F4DC}',   // 📜
    geography: '\u{1F30D}', // 🌍
    sport: '\u26BD',         // ⚽
    entertainment: '\u{1F3AD}', // 🎭
    music: '\u{1F3B5}',     // 🎵
    art: '\u{1F3A8}',       // 🎨
    literature: '\u{1F4DA}', // 📚
    technology: '\u{1F4BB}', // 💻
    tech: '\u{1F4BB}',      // 💻
    nature: '\u{1F333}',    // 🌳
    food: '\u{1F355}',      // 🍕
    dining: '\u{1F355}',    // 🍕
    tv: '\u{1F4FA}',        // 📺
    gaming: '\u{1F3AE}',    // 🎮
    animal: '\u{1F43E}',    // 🐾
    wildlife: '\u{1F43E}',  // 🐾
    math: '\u{1F522}',      // 🔢
    number: '\u{1F522}',    // 🔢
    logic: '\u{1F522}',     // 🔢
    politic: '\u{1F3DB}\uFE0F', // 🏛️
    space: '\u{1F680}',     // 🚀
    astrono: '\u{1F680}',   // 🚀
    myth: '\u26A1',          // ⚡
    folklore: '\u26A1',      // ⚡
    language: '\u{1F4AC}',  // 💬
    word: '\u{1F4AC}',      // 💬
    phrase: '\u{1F4AC}',    // 💬
  };
  for (const [key, emoji] of Object.entries(map)) {
    if (c.includes(key)) return emoji;
  }
  return '\u{1F9E0}';
}
