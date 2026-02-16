'use strict';

// Dashboard auth state
let currentBar = null;
let dashboardData = null;

function getAuthState() {
  return { bar: currentBar, data: dashboardData };
}

function setAuthState(bar, data) {
  currentBar = bar;
  dashboardData = data;
}

function clearAuthState() {
  currentBar = null;
  dashboardData = null;
  clearToken();
}

// Check if we have a valid session on load
async function checkSession() {
  const token = getToken();
  if (!token) return false;

  try {
    const data = await apiCall('GET', '/dashboard/data');
    setAuthState(data.bar, data);
    return true;
  } catch (err) {
    clearAuthState();
    return false;
  }
}
