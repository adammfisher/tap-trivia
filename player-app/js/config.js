// player-app/js/config.js
const CONFIG = {
  API_BASE: (() => {
    const params = new URLSearchParams(window.location.search);
    const apiParam = params.get('api');
    if (apiParam === 'prod') { localStorage.removeItem('taptrivia_api_override'); return 'https://api.taptrivia.tv'; }
    if (apiParam) { localStorage.setItem('taptrivia_api_override', apiParam); return apiParam; }
    return localStorage.getItem('taptrivia_api_override') || 'https://api.taptrivia.tv';
  })(),
  PLAYER_APP_URL: 'https://app.taptrivia.tv',
};
