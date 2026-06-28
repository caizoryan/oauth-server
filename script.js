import { reactive, memo } from './chowk.js'
import { getChannelContents } from './arena/channel.js'
import { parse } from './tiny_stroke/parser.js'
import { Drawing, setPoints, getTinyStroke } from './canvas.js'
import { uploadImage } from './arena/uploadImage.js'
import { createBlock } from './arena/createBlock.js'
import { dom } from './dom.js'
import { canvasEl } from './canvas.js'

// ============================================================
// 1. CONFIGURATION
// ============================================================
export const CONFIG = {
  CLIENT_URL: "https://kaleidoscopic-druid-9d3ee7.netlify.app/.netlify/functions/auth",
  API_BASE: "https://api.are.na/v3",
  CHANNEL_ID: "avatar-templates",
  MAX_METADATA_CHARS: 642,
  DRAWING_FILENAME: "drawing.jpeg",
}

if (window.location.href.includes("localhost")) CONFIG.CLIENT_URL+='Local'


// ============================================================
// 2. STATE MANAGEMENT
// ============================================================
let state = {
  isAuthenticated: reactive(false),
  statusType: reactive(""),
  userData: reactive(null),
  isLoading: reactive(false),
	blocks: reactive([]),
	usersBlock: reactive(null),
}

// ============================================================
// 3. AUTH MODULE
// ============================================================

function checkForToken() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  
  if (token) {
    if (token === "DENIED") {
      console.log("denied");
      return null;
    }
    localStorage.setItem("arena_access_token", token);
    window.history.replaceState({}, "", window.location.pathname);
    return token;
  }
  
  return localStorage.getItem("arena_access_token");
}

async function login() {
  try {
    const response = await fetch(`${CONFIG.CLIENT_URL}/?action=auth&scope=write`);
    const data = await response.json();
    
    if (data.authorization_url) {
      window.location.href = data.authorization_url;
    } else {
      throw new Error("No authorization URL received");
    }
  } catch (error) {
    console.error("ERROR:", error);
  }
}

async function fetchUserProfile(token) {
  try {
    const response = await fetch(`${CONFIG.API_BASE}/me`, {
      headers: { "Authorization": `Bearer ${token}` },
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

// ============================================================
// 4. ARENA MODULE
// ============================================================
function findUserChannel(blocks) {
	if (!state.userData.value()) return
  return blocks.find(e => e.user.id === state.userData.value().id);
}

async function loadUserDrawing(userBlock) {
  if (userBlock?.metadata) {
    try {
      const parsed = parse(Object.values(userBlock.metadata));
      setPoints(parsed);
      Drawing.render_points(parsed, true);
    } catch (err) {
      console.error("Parse error:", err);
    }
  }
}

state.blocks.memo(blocks => state.usersBlock.next(findUserChannel(blocks)))
state.usersBlock.memo(block => (block && block.id) ? loadUserDrawing(block) : null)

async function fetchBlocks(token){
  const res = await getChannelContents(CONFIG.CHANNEL_ID, token);
	if (res && res.data) {
		state.blocks.next(res.data)
	}
}

const RSVPBlocks = state.blocks.memo(blocks => 
  blocks.filter(block => 
    block.type === 'Image' 
			&& block.metadata
			&& block.description?.plain.toLowerCase().includes('rsvp')
));

const RSVPBlockLength = memo(() => RSVPBlocks.value().length || 0, [RSVPBlocks])

RSVPBlocks.subscribe(f => {
	console.log(f)
})

async function uploadDrawing() {
  const token = checkForToken();
  if (!token) return;
  
  try {
    const imageUrl = await uploadImage(Drawing.canvas, CONFIG.DRAWING_FILENAME, token);
    const res = await createBlock({
      value: imageUrl,
      title: state.userData.value().name.split(" ")[0],
			description: 'rsvp',
      metadata: getTinyStroke(),
      channel_id: CONFIG.CHANNEL_ID,
    }, token);
    console.log(res);
  } catch (err) {
    console.error("Upload error:", err);
  }
}
// ============================================================
// 5. UI MODULE
// ============================================================

const loginButton = ['button', { onclick: login }, 'Login with Are.na']
const authElement = [
  '.auth',
  memo(() => state.isAuthenticated.value()
    ? ['.login', 'Logged in: ', ['strong', state.userData.memo(e => e?.name || '')]]
    : loginButton,
    [state.isAuthenticated]
  ),
];

const rsvpButton =  ['button.rsvp-btn', { onclick: uploadDrawing }, 'RSVP'];

const root = dom(['div.root',
  // authElement,
	['h1', 'Toronto Are.na Meetup'],
	["h4", 'Hosted by IF Machine Works'],
	['h4', 'July 25, 2026, 7pm-9pm-ish'],
	["h4", 'At BAAA! (Back Alley for Art & Architecture)'],
	["h4", '300 Campbell Ave, Suite 114'],
	['hr'],
	['div', memo(() => 'Going ('+ RSVPBlockLength.value() +')', [RSVPBlockLength])],
	['div', 
		memo(() => 
			['.images', ...RSVPBlocks.value().map(e => 
				['img', {
					src: e.image.src,
					onclick: () => {
							if (e?.metadata) {
								try {
									const parsed = parse(Object.values(e.metadata));
									setPoints(parsed);
									Drawing.render_points(parsed, true);
								} catch (err) {
									console.error("Parse error:", err);
								}
							}
					},
				}])],
		[RSVPBlocks])
	],
	['.rsvp', {
			authenticated: memo(() => state.isAuthenticated.value() 
				? 'true' 
				: 'false',
				[state.isAuthenticated])
	},
		['h2', "Draw Your Avatar"],
		canvasEl,
		rsvpButton,
		['.overlay.centered', 
			['.shield'],
			['.box.centered', loginButton ]],
	],

]);

const mount = () => document.body.appendChild(root);

// ============================================================
// 6. APP MODULE
// ============================================================

function setupAuthSubscriber() {
  state.isAuthenticated.memo(isAuth => {
    if (isAuth) {
			fetchBlocks(checkForToken())
    }
  });
}

async function init() {
  const token = checkForToken();
  
  if (token) {
    await fetchUserProfile(token);
  } else {
    state.isAuthenticated.next(false);
  }
  
  mount();

	fetchBlocks(checkForToken())
  // setupAuthSubscriber();
}

// ============================================================
// 7. ENTRY POINT
// ============================================================

init();
