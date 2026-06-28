// Drawing canvas with reactive state
import {dom} from './dom.js'
import { reactive, memo } from './chowk.js'
import { encode } from './tiny_stroke/parser.js'
import { CONFIG } from './script.js';
import { Keymanager } from './keymanager.js';


// ============== CONSTANTS ==============
const SCALE = window.innerWidth < 500 ? window.innerWidth / 500 : 1
const ANIMATION_SPEED = 20

// ============== STATE MANAGEMENT ==============
export let state = {
	brushSize: reactive(1),
	points: reactive([]),
	undoStack: reactive([])
};

export const setPoints = points => {
	state.points.next(points)
}

// ============== COLOR MANAGEMENT ==============
function createGradientStyle(axis, r, g, b) {
	const colors = {
		r: [`rgb(0, ${g}, ${b})`, `rgb(255, ${g}, ${b})`],
		g: [`rgb(${r}, 0, ${b})`, `rgb(${r}, 255, ${b})`],
		b: [`rgb(${r}, ${g}, 0)`, `rgb(${r}, ${g}, 255)`]
	}
	return `background: linear-gradient(to right, ${colors[axis][0]}, ${colors[axis][1]})`
}

let redSlider = reactive(5)
let greenSlider = reactive(5)
let blueSlider = reactive(5)
let tick = reactive(0)

setTimeout(() => tick.next(e=>e+1), 10)

function colorSlider(initialValue, max = 255, label, axis = null) {
	let value = initialValue
	let updates = []
	return {
		el: memo(() => {
			const r = redSlider.value()
			const g = greenSlider.value()
			const b = blueSlider.value()
			const style = axis ? createGradientStyle(axis, r, g, b) : undefined
			return [
				'div',
				['span.label', label],
				['input', {
					type: 'range',
					max: max,
					value: value,
					style: style,
					oninput: (e) => {
						value = e.target.value
						updates.forEach(fn => fn(value))
					}
				}],
			]
		}, axis ? [redSlider, greenSlider, blueSlider, tick] : []),
		value: () => value,
		subscribe: (fn) => updates.push(fn)
	}
}

 redSlider = colorSlider(0, 255, 'R', 'r')
 greenSlider = colorSlider(55, 255, 'G', 'g')
 blueSlider = colorSlider(255, 255, 'B', 'b')
const brushSizeSlider = colorSlider(8, 155, 'WIDTH')

const colorPreview = memo(() => {
	const r = redSlider.value()
	const g = greenSlider.value()
	const b = blueSlider.value()
	return ['.color-preview', { style: `
background: rgb(${r}, ${g}, ${b});
margin-right: 1em;
` }]
}, [redSlider, greenSlider, blueSlider])

const getCurrentColor = () => `rgb(${redSlider.value()}, ${greenSlider.value()}, ${blueSlider.value()})`

// ============== STROKE DATA LAYER ==============
function new_stroke(color, size) {
	return { color, points: [], strokeWidth: size }
}

function last_stroke() {
	const pts = state.points.value()
	return pts[pts.length - 1]
}

function add_to_stroke(x, y) {
	const pts = state.points.value()
	if (pts.length > 0) {
		const stroke = last_stroke()
		stroke.points.push([x, y])
		state.points.next([...pts])
		return true
	}
	return false
}

function compress_stroke(stroke, threshold = 2) {
	let last_point
	let compressed = []
	stroke.forEach(e => {
		if (!last_point
			|| Math.abs(last_point[0] - e[0]) > threshold
			&& Math.abs(last_point[1] - e[1]) > threshold) {
			last_point = e
			compressed.push(e)
		}
	})
	return compressed
}

export const getTinyStroke = () => {
	let strokes = state.points.value()
	let encoded = encode(strokes)

	encoded.forEach(e => {
		// console.log(e.length)
		if (e.length > CONFIG.MAX_METADATA_CHARS) console.error("BRUh, too big!?", e.length)
	})

	return encoded.reduce((acc, e, i) => (acc[i] = e, acc), {})
}

// ============== DRAWING ENGINE ==============
export const Drawing = {
	canvas: null,
	ctx: null,
	isIdle: true,
	timeouts : [],

	cancelAnimation() {
		Drawing.timeouts.forEach(e => clearTimeout(e))
	},

	init(canvasEl) {
		Drawing.canvas = canvasEl
		Drawing.ctx = canvasEl.getContext('2d')
		Drawing.canvas.width = 320
		Drawing.canvas.height = 320
		Drawing.clear()
	},

	clear() {
		const old = Drawing.ctx.fillStyle
		Drawing.ctx.fillStyle = 'white'
		Drawing.ctx.fillRect(0, 0, Drawing.canvas.width, Drawing.canvas.height)
		Drawing.ctx.fillStyle = old
	},

	draw_stroke(stroke) {
		if (!stroke.points || stroke.points.length <= 0) return
		let first = stroke.points[0]
		// console.log("Drawing?", stroke.color, stroke.strokeWidth)
		Drawing.ctx.beginPath()
		Drawing.ctx.strokeStyle = stroke.color
		Drawing.ctx.moveTo(first[0], first[1])
		Drawing.ctx.lineWidth = stroke.strokeWidth || 1
		stroke.points.forEach(e => {
			let [x, y] = e
			Drawing.ctx.lineTo(x, y)
			Drawing.ctx.stroke()
		})
	},

	draw_animated_stroke(stroke) {
		if (!stroke.points || stroke.points.length <= 0) return
		let first = stroke.points[0]
		Drawing.ctx.beginPath()
		Drawing.ctx.strokeStyle = stroke.color
		Drawing.ctx.lineWidth = stroke.strokeWidth || 1
		Drawing.ctx.moveTo(first[0], first[1])
		stroke.points.forEach((e, i) => {
			let [x, y] = e
			let t = setTimeout(() => {
				Drawing.ctx.lineTo(x, y)
				Drawing.ctx.stroke()
			}, i * ANIMATION_SPEED)

			Drawing.timeouts.push(t)
		})
	},

	render_points(points, slow = false) {
		console.log(points)
		Drawing.cancelAnimation()
		Drawing.clear()
		if (!slow) points.forEach(stroke => Drawing.draw_stroke(stroke))
		else {
			let last = 0
			points.forEach(p => {
				let t = setTimeout(() => Drawing.draw_animated_stroke(p), last + ANIMATION_SPEED)
				Drawing.timeouts.push(t)
				if (!p.points || p.points.length <= 0) return
				last += p.points.length * ANIMATION_SPEED + 5
			})
		}
	}
}

// ============== UNDO/REDO ACTIONS ==============
function undo() {
	const pts = state.points.value()
	const last = pts.pop()
	if (last) {
		state.undoStack.value().push(last)
		state.points.next([...pts])
		// side effect
		Drawing.render_points(state.points.value())
	}
}

function redo() {
	const stack = state.undoStack.value()
	const pts = state.points.value()
	const r = stack.pop()
	if (r) {
		pts.push(r)
		state.points.next([...pts])
		state.undoStack.next([...stack])
		//
		// side effect
		Drawing.render_points(state.points.value())
	}
}

const play = () => Drawing.render_points(state.points.value(), true)

// ============== EVENT HANDLERS ==============
const Input = {
	getCanvasCoords(event) {
		const rect = event.target.getBoundingClientRect()
		return {
			x: (event.clientX - rect.left) / SCALE,
			y: (event.clientY - rect.top) / SCALE
		}
	},

	startDrawing(event) {
		if (state.points.value().length > 49) return
		Drawing.render_points(state.points.value())

		const pts = state.points.value()
		const shouldCreateNew = pts.length === 0 || last_stroke()?.points?.length !== 0

		if (shouldCreateNew) {
			pts.push(new_stroke(getCurrentColor(), brushSizeSlider.value()))
			state.points.next([...pts])
		}

		const { x, y } = this.getCanvasCoords(event)
		add_to_stroke(x, y)

		Drawing.ctx.beginPath()
		Drawing.ctx.strokeStyle = getCurrentColor()
		Drawing.ctx.lineWidth = last_stroke().strokeWidth || 1
		Drawing.ctx.moveTo(x, y)
		Drawing.isIdle = false
	},

	moveDrawing(event) {
		if (state.points.value().length > 49) return
		if (Drawing.isIdle) return

		const { x, y } = this.getCanvasCoords(event)
		Drawing.ctx.lineWidth = last_stroke().strokeWidth || 1

		add_to_stroke(x, y)
		Drawing.ctx.lineTo(x, y)
		Drawing.ctx.stroke()
	},

	endDrawing(event) {
		if (state.points.value().length > 49) return
		if (Drawing.isIdle) return

		Input.moveDrawing(event)
		Drawing.isIdle = true
		Drawing.ctx.lineWidth = 1
		let last = last_stroke()

		let threshold = 0.05
		console.log(last.points.length)
		while (last.points.length > 98) {
			console.log('last points length: ', last.points.length, 'COMPRESSING AT: ', threshold)
			let compressed = compress_stroke(last.points, threshold)
			console.log('compressed length: ', compressed.length)
			last.points = compressed
			threshold += 0.05
		}

		Drawing.render_points(state.points.value())
		console.log(getTinyStroke())
	},

	bindEvents(canvas) {
		canvas.addEventListener('touchstart', e => Input.startDrawing(e.touches[0]), false)
		canvas.addEventListener('touchmove', e => { Input.moveDrawing(e.touches[0]); e.preventDefault() }, false)
		canvas.addEventListener('touchend', e => Input.endDrawing(e.changedTouches[0]), false)
		canvas.addEventListener('mousedown', e => Input.startDrawing(e), false)
		canvas.addEventListener('mousemove', e => Input.moveDrawing(e), false)
		canvas.addEventListener('mouseup', e => Input.endDrawing(e), false)
	}
}

let keys = new Keymanager()

keys.on("cmd + z", undo, {preventDefault: true})
keys.on("ctrl + z", undo, {preventDefault: true})
keys.on("cmd + shift + z", redo, {preventDefault: true})
keys.on("ctrl + shift + z", redo, {preventDefault: true})

window.addEventListener('keydown', (e) => keys.event(e))

// ============== UI BUILDING ==============
const controls = ['.controls',
	colorPreview,
	['#sliders',
		redSlider.el,
		greenSlider.el,
		blueSlider.el,
		brushSizeSlider.el
	],

	// ['.color-preview', 
]

let actionbuttons = ['#buttons',
	['button', { onclick: undo }, '↺'],
	['button', { onclick: redo }, '↻'],
	['button', { onclick: play }, '▶︎']
]

const strokeCount = memo(()=> ['span.strokes', state.points.value().length+"", " / 50 strokes"], [state.points])

export const drawCanvas = dom(['canvas#draw', { style: 'border: 1px solid black' }])

if (window.innerWidth < 500) {
	drawCanvas.style.transformOrigin = "0 0"
	drawCanvas.style.transform = `scale(${SCALE})`
}

export const canvasEl = dom(['.container',
	['.woof', strokeCount,],
	drawCanvas,
	['.bar', actionbuttons, ],
	controls,
])

// ============== INITIALIZATION ==============
window.addEventListener('load', async () => {
	Drawing.init(drawCanvas)
	Input.bindEvents(drawCanvas)
}, false)
