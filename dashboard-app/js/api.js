'use strict';

function getToken() {
  return localStorage.getItem('taptrivia_dashboard_token')
    || sessionStorage.getItem('taptrivia_dashboard_token')
    || null;
}

function setToken(token, persist) {
  if (persist) {
    localStorage.setItem('taptrivia_dashboard_token', token);
  } else {
    sessionStorage.setItem('taptrivia_dashboard_token', token);
  }
}

function clearToken() {
  localStorage.removeItem('taptrivia_dashboard_token');
  sessionStorage.removeItem('taptrivia_dashboard_token');
}

async function apiCall(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, opts);

  if (res.status === 401) {
    clearToken();
    showScreen('login');
    throw new Error('Session expired');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
  return data;
}
