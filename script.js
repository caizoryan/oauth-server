// Are.na OAuth client-side logic

const CLIENT_URL = "https://pop-os.tail0ff7f6.ts.net";
const API_BASE = "https://api.are.na/v3";

// DOM elements
const statusEl = document.getElementById("status");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userInfo = document.getElementById("userInfo");
const userDetails = document.getElementById("userDetails");

// Check for token in URL (callback from OAuth)
function checkForToken() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  
  if (token) {
    localStorage.setItem("arena_access_token", token);
    window.history.replaceState({}, "", window.location.pathname);
    return token;
  }
  
  return localStorage.getItem("arena_access_token");
}

// Update UI based on auth state
function updateUI(isAuthenticated) {
  if (isAuthenticated) {
    statusEl.textContent = "Authenticated";
    statusEl.className = "success";
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
  } else {
    statusEl.textContent = "Not authenticated";
    statusEl.className = "";
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    userInfo.classList.add("hidden");
  }
}

// Initiate OAuth login
async function login() {
  try {
    statusEl.textContent = "Redirecting to Are.na...";
    
    const response = await fetch(`${CLIENT_URL}/?action=auth&scope=read`);
    const data = await response.json();
    
    if (data.authorization_url) {
      window.location.href = data.authorization_url;
    } else {
      throw new Error("No authorization URL received");
    }
  } catch (error) {
    statusEl.textContent = `Error: ${error.message}`;
    statusEl.className = "error";
  }
}

// Logout
function logout() {
  localStorage.removeItem("arena_access_token");
  updateUI(false);
}

// Fetch user profile from Are.na API
async function fetchUserProfile(token) {
  try {
    statusEl.textContent = "Loading profile...";
    
    const response = await fetch(`${API_BASE}/me`, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch profile: ${response.status}`);
    }
    
    const userData = await response.json();
    
    userInfo.classList.remove("hidden");
    userDetails.textContent = JSON.stringify(userData, null, 2);
    statusEl.textContent = "Profile loaded";
    statusEl.className = "success";
  } catch (error) {
    statusEl.textContent = `Error loading profile: ${error.message}`;
    statusEl.className = "error";
    localStorage.removeItem("arena_access_token");
    updateUI(false);
  }
}

// Initialize
function init() {
  const token = checkForToken();
  
  if (token) {
    updateUI(true);
    fetchUserProfile(token);
  } else {
    updateUI(false);
    statusEl.textContent = "Ready to authenticate";
  }
  
  // Event listeners
  loginBtn.addEventListener("click", login);
  logoutBtn.addEventListener("click", logout);
}

// Run on page load
init();
