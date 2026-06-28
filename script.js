import { reactive, memo } from './chowk.js'
import { getChannelContents } from './arena/channel.js'
import { parse } from './tiny_stroke/parser.js'
import { Drawing, setPoints, getTinyStroke } from './canvas.js'
import { uploadImage } from './arena/uploadImage.js'
import { createBlock } from './arena/createBlock.js'
import { dom } from './dom.js'
import { canvasEl } from './canvas.js'

// xxx---------xxx----------xxx
// +; CONFIGURATION
// xxx---------xxx----------xxx
export const CONFIG = {
  CLIENT_URL: "https://kaleidoscopic-druid-9d3ee7.netlify.app/.netlify/functions/auth",
  API_BASE: "https://api.are.na/v3",
  CHANNEL_ID: "avatar-templates",
  MAX_METADATA_CHARS: 642,
  DRAWING_FILENAME: "drawing.jpeg",
}

if (window.location.href.includes("localhost")) CONFIG.CLIENT_URL+='Local'


// xxx---------xxx----------xxx
// +; STATE MANAGEMENT
// xxx---------xxx----------xxx
let state = {
  isAuthenticated: reactive(false),
  statusType: reactive(""),
  userData: reactive(null),
	uploadingInProgress: reactive(false),
  isLoading: reactive(false),
	blocks: reactive([]),
	usersBlock: reactive(null),
}

// xxx---------xxx----------xxx
// +; AUTH MODULE
// xxx---------xxx----------xxx

function checkForToken() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  
  if (token) {
    if (token === "DENIED") {
			notificationpopup("Login Failed", true)
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

// xxx---------xxx----------xxx
// +; ARENA MODULE
// xxx---------xxx----------xxx
function findUserChannel(blocks) {
	if (!state.userData.value()) return
  return blocks.find(e => e.user.id === state.userData.value().id);
}

async function loadUserDrawing(userBlock) {
  if (userBlock?.metadata) {
		parseAndLoadDrawing(userBlock)
  }
}

function parseAndLoadDrawing(block){
	try {
		const parsed = parse(Object.values(block.metadata));
		setPoints(parsed);
		Drawing.render_points(parsed, true);
	} catch (err) {
		console.error("Parse error:", err);
	}
}

state.blocks.memo(blocks => state.usersBlock.next(findUserChannel(blocks)))
state.usersBlock.memo(block => (block && block.id) ? loadUserDrawing(block) : null)
state.isAuthenticated.memo(is => is ? notificationpopup("Authenticated"):null)

async function fetchBlocks(token){
  const res = await getChannelContents(CONFIG.CHANNEL_ID, token);
	if (res && res.data) {
		console.log(res.data)
		state.blocks.next(res.data)
	}
}

const RSVPBlocks = state.blocks.memo(blocks => {
  return blocks.filter(block => 
    block.type === 'Image' 
			&& block.metadata
			&& block.description?.plain.toLowerCase().includes('rsvp')
)});

const RSVPBlockLength = memo(() => RSVPBlocks.value().length || 0, [RSVPBlocks])


async function uploadDrawing() {
  const token = checkForToken();
  if (!token) return;
  
  try {
		state.uploadingInProgress.next(true)
    const imageUrl = await uploadImage(Drawing.canvas, CONFIG.DRAWING_FILENAME, token);
    const res = await createBlock({
      value: imageUrl,
      title: state.userData.value().name.split(" ")[0],
			description: 'rsvp',
      metadata: getTinyStroke(),
      channel_id: CONFIG.CHANNEL_ID,
    }, token);

    console.log(res);
		state.uploadingInProgress.next(false)
		setTimeout(() => {
			fetchBlocks(token)
		}, 2500)
  } catch (err) {
    console.error("Upload error:", err);
  }
}
// xxx---------xxx----------xxx
// +; UI MODULE
// xxx---------xxx----------xxx

let notificationpopup = (msg, error = false) => {
	msg = error ? '🚫 ' +msg : msg
	let tag = '.notification' + (error ? '.error' : '')
	let style = `
	position: fixed;
	right: -50vw;
	opacity: 0;
	bottom: 1em;
	transition: 200ms;
`

	let d = dom(tag, {style}, msg)

	document.querySelectorAll('.notification')
		.forEach((e) => {
			let b = parseFloat(e.style.bottom)
			e.style.bottom = (b + 5) + 'em'
		})

	document.body.appendChild(d)

	setTimeout(() => { d.style.right = '1em'; d.style.opacity = 1 }, 5)
	setTimeout(() => { d.style.opacity = 0 }, error ? 6000 : 4500)
	setTimeout(() => { d.remove() }, error ? 9500 : 8000)
}
const loginButton = ['button', { onclick: login }, 'Login with Are.na']
const authElement = [
  '.auth',
  memo(() => state.isAuthenticated.value()
    ? ['.login', 'Logged in: ', ['strong', state.userData.memo(e => e?.name || '')]]
    : loginButton,
    [state.isAuthenticated]
  ),
];

const rsvpButton =  [
	'button.rsvp-btn', 
	{ 
		loading: state.uploadingInProgress,
		onclick: uploadDrawing },
	'RSVP'];

const root = dom(['div.root',
  // authElement,
	['h1', 'Toronto Are.na Meetup'],
	["h4", 'Hosted by IF Machine Works'],
	['.info',
		['h4', 'July 25, 2026, 7pm-9pm-ish'],
		["h4", 'At BAAA! (Back Alley for Art & Architecture)'],
		["h4", '300 Campbell Ave, Suite 114']],
	['hr'],
	['.message', 
		['p', 'Hey there Toronto!'],
		['p', 'We are hosting an Are.na Meetup this summer. You can RSVP below by ', ['button.chill', 'Logging in to Are.na'], ' and drawing an Avatar!'],
		['p', "On the day we'll have some channel walkthroughs, presentations and some time to chat and hangout! We'll have some snacks and refreshment but feel free to bring more too!"],

		['hr'],
		['p', "If you are interested in either →"],
		['ul', 
			['li', 'Doing a channel walkthrough'],
			['li', 'Presenting things you made with Are.na API '],
			['li', 'Or anything are.na related']
		],
		['p', "Add a block to  ", ['a', {href: 'https://www.are.na/toronto/rsvp-2026'}, 'this channel'],", mentioning that interested in presenting, or feel free to ", ['a', {href: 'mailto:info@if-m.works'}, 'reach out']," to us!"]
	],
	['hr'],
	['h5', memo(() => 'Going ('+ RSVPBlockLength.value() +')', [RSVPBlockLength])],
	['div', 
		memo(() => 
			['.images', ...RSVPBlocks.value().map(e => 
				['img', {
					src: e.image.src,
					onclick: () => e?.metadata ? parseAndLoadDrawing(e) : null,
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

// xxx---------xxx----------xxx
// +; APP MODULE
// xxx---------xxx----------xxx

async function init() {
  const token = checkForToken();
  
  if (token) {
    await fetchUserProfile(token);
  } else {
    state.isAuthenticated.next(false);
  }
  
	fetchBlocks(checkForToken())
  mount();
}

// xxx---------xxx----------xxx
// 7. ENTRY POINT
// xxx---------xxx----------xxx

init();
