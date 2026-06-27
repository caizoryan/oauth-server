// Are.na OAuth client-side logic
import {dom} from './dom.js'
import { reactive, memo } from './chowk.js'
import { canvasEl, drawCanvas, getTinyStroke, render_points, setPoints } from './canvas.js';
import { uploadImage } from './arena/uploadImage.js';
import { createBlock } from './arena/createBlock.js';
import { getChannel, getChannelContents } from './arena/channel.js';
import { parse } from './tiny_stroke/parser.js';

const CLIENT_URL = "https://kaleidoscopic-druid-9d3ee7.netlify.app/.netlify/functions/auth";
const API_BASE = "https://api.are.na/v3";

// for 50 kv pairs on are.na metadata, can't have each string longer than 642 chars
export const MAX_METADATA_CHARS = 642

// Reactive state
let state = {
  isAuthenticated: reactive(false),
  statusType: reactive(""), // "", "success", "error"
  userData: reactive(null),
  isLoading: reactive(false)
};

const auth = ['.auth',
	memo(() => state.isAuthenticated.value() 
		? ['span', 'Logged in as: ', ['strong',state.userData.memo(e => e ? e.name : '')]]
		: ['button', { onclick: login }, 'Login'],
		[state.isAuthenticated]),
]


const root = dom(['div.root', 
	auth ,
	canvasEl,
	['button', {
		onclick: () => {
			uploadImage(drawCanvas, 'drawig.jpeg', checkForToken())
				.then(res => {
					createBlock({
						value: res, 
						title: "TESTING",
						metadata: getTinyStroke(),
						channel_id: 'rsvp-test-d9r1hsyg5ie'
					}, checkForToken())
					.then(res => console.log(res))
				})
		} 
	}, 'upload']
]);

document.body.appendChild(root);

// Check for token in URL (callback from OAuth)
function checkForToken() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  
  if (token) {
		if (token=='DENIED') {
			console.log('denied')
		} else {
			localStorage.setItem("arena_access_token", token);
			window.history.replaceState({}, "", window.location.pathname);
			return token;
		}
  }
  
  return localStorage.getItem("arena_access_token");
}

// Initiate OAuth login
async function login() {
  
  try {
    const response = await fetch(`${CLIENT_URL}/?action=auth&scope=write`);
    const data = await response.json();
    
    if (data.authorization_url) {
      window.location.href = data.authorization_url;
    } else {
      throw new Error("No authorization URL received");
    }
  } catch (error) {
		console.error("ERROR: ", error)
  }
}

// Fetch user profile from Are.na API
async function fetchUserProfile(token) {
  try {
    const response = await fetch(`${API_BASE}/me`, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch profile: ${response.status}`);
    }
    const userData = await response.json();
    state.userData.next(userData);
    state.isAuthenticated.next(true);
  } catch (error) {
    state.statusType.next("error");
    localStorage.removeItem("arena_access_token");
    state.isAuthenticated.next(false);
  }

	
}

state.isAuthenticated.memo(e => {
	if (e){
		getChannelContents('rsvp-test-d9r1hsyg5ie', checkForToken())
			.then(res => {
				let userBlock = findUserChannel(res.data)
				if (userBlock){
					// try parse metadata
					if(userBlock.metadata ){
						try {
							let parsed = parse(Object.values(userBlock.metadata))
							setPoints(parsed)
							render_points(parsed, true)
						}
						catch(err){
							console.log("RERRO", err)
						}
					}
				}
			})
	}
})

function findUserChannel(blocks){
	let found = blocks.find(e => e.user.id == state.userData.value().id)
	return found
}

// Initialize
function init() {
  const token = checkForToken();
  if (token) {
    fetchUserProfile(token);
  } else {
    state.isAuthenticated.next(false);
  }
}

// Run on page load
init();
