// Drawing canvas with reactive state
import {dom} from './dom.js'
import { reactive, memo } from './chowk.js'
import { encode } from './tiny_stroke/parser.js'

const scale = window.innerWidth < 500 ? window.innerWidth / 500 : 1

// Reactive state
export let state = {
	red: reactive(255),
	green: reactive(255),
	blue: reactive(0),
	brushSize: reactive(1),
	points: reactive([]),
	undoStack: reactive([])
};

export const setPoints = points => {
	state.points.next(points)
}

export const getTinyStroke = () => {
	let strokes = state.points.value()
	console.log(strokes)
	let encoded = encode(strokes)
	console.log(encoded)
	return encoded.reduce((acc, e, i) => (acc[i] = e, acc), {})
}

// Color slider component
function colorSlider(initialValue, max = 255, label) {
	let value = initialValue
	let updates = []
	return {
		el: memo(() => [
			'div',

			['span', label],
			['input', { 
				type: 'range', 
				max: max, 
				value: value,
				oninput: (e) => {
					value = e.target.value
					updates.forEach(fn => fn(value))
				}
			}],
		], []),
		value: () => value,
		subscribe: (fn) => updates.push(fn)
	}

}

const redSlider = colorSlider(0, 255, 'R')
const greenSlider = colorSlider(55, 255, 'G')
const blueSlider = colorSlider(255, 255, 'B')
const brushSizeSlider = colorSlider(4, 15, 'Brush Size')

// Update color preview
const colorPreview = memo(() => {
	const r = redSlider.value()
	const g = greenSlider.value()
	const b = blueSlider.value()
	return ['div', { style: `
background: rgb(${r}, ${g}, ${b});
width: 100px;
height: 100px;
` }]
}, [redSlider, greenSlider, blueSlider])

const onColorChange = () => {
	redSlider.value()
	greenSlider.value()
	blueSlider.value()
}

redSlider.subscribe(onColorChange)
greenSlider.subscribe(onColorChange)
blueSlider.subscribe(onColorChange)

// Undo/Redo/Save actions
function undo() {
	const pts = state.points.value()
	const last = pts.pop()
	if (last) {
		state.undoStack.value().push(last)
		state.points.next([...pts])
		render_points(state.points.value())
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
		render_points(state.points.value())
	}
}

// Build UI
const controls = ['.controls',
	['#sliders',
		redSlider.el,
		greenSlider.el,
		blueSlider.el,
		brushSizeSlider.el
	],
	colorPreview,
	['#buttons',
		['button', { onclick: undo }, 'undo'],
		['button', { onclick: redo }, 'redo'],
		// ['button', { onclick: save }, 'Save']
	]
]

export const drawCanvas = dom(['canvas#draw', { style: 'border: 1px solid black' } ])

if (window.innerWidth < 500) {
	drawCanvas.style.transformOrigin = "0 0"
	drawCanvas.style.transform = `scale(${scale})`
}

// Canvas setup
let canvas, context, pot
let isIdle = true
let speed = 20

function new_stroke(color, s) {
	return { color: color, points: [], strokeWidth: s }
}

let last_stroke = () => {
	const pts = state.points.value()
	return pts[pts.length - 1]
}

function add_to_stroke(x, y) {
	let added = false
	const pts = state.points.value()
	
	if (pts.length > 0) {
		// get last point
		let last_point_ = last_stroke()
		let l = last_point_.points[last_point_.points.length - 1] 
			last_point_.points.push([x, y])
			state.points.next([...pts])
			added = true

	}

	return added
}

function compress_stroke(stroke, THRESHOLD = 2) {
	let last_point
	let compressed = []
	stroke.forEach(e => {
		if (!last_point 
			|| Math.abs(last_point[0] - e[0]) >  THRESHOLD
			&& Math.abs(last_point[1] - e[1]) > THRESHOLD ){
			last_point = e
			compressed.push(e)
		}
	})

	return compressed
}

function clear() {
	let old = context.fillStyle
	context.fillStyle = 'white'
	context.fillRect(0,0,canvas.width, canvas.height)
	context.fillStyle = old
}

function draw_stroke(stroke) {
	if (!stroke.points || stroke.points.length <= 0) return
	let first = stroke.points[0]
	console.log("Drawing?", stroke.color, stroke.strokeWidth)
	context.beginPath()
	context.strokeStyle = stroke.color
	context.moveTo(first[0], first[1])
	context.lineWidth = stroke.strokeWidth || 1
	stroke.points.forEach(e => {
		let [x, y] = e
		context.lineTo(x, y)
		context.stroke()
	})
}

function draw_animated_stroke(stroke) {
	if (!stroke.points || stroke.points.length <= 0) return
	let first = stroke.points[0]
	context.beginPath()
	context.strokeStyle = stroke.color
	context.lineWidth = stroke.strokeWidth || 1
	context.moveTo(first[0], first[1])
	stroke.points.forEach((e, i) => {
		let [x, y] = e
		setTimeout(() => {
			context.lineTo(x, y)
			context.stroke()
		}, i * speed)
	})
}

export function render_points(points, slow = false) {
	clear()
	if (!slow) points.forEach(draw_stroke)
	else {
		let last = 0
		points.forEach(p => {

			setTimeout(() => draw_animated_stroke(p), last + speed)
			if (!p.points || p.points.length <= 0) return
			last += p.points.length * speed + 5
		})
	}
}

// Drawing handlers
function drawstart(event) {
	context.beginPath()
	const pts = state.points.value()
	if (pts.length <= 0 || !last_stroke()?.points || last_stroke()?.points?.length != 0) {
		pts.push(new_stroke(
			`rgb(${redSlider.value()}, ${greenSlider.value()}, ${blueSlider.value()})`,
			brushSizeSlider.value()))
		state.points.next([...pts])
	}

	context.strokeStyle = last_stroke().color
	context.lineWidth = last_stroke().strokeWidth || 1
	console.log("style",
		context.strokeStyle,
		"lineWidth",
		context.lineWidth 
	)

	let rect = event.target.getBoundingClientRect()
	let x = (event.clientX - rect.left) / scale
	let y = (event.clientY - rect.top) / scale

	add_to_stroke(x, y)
	context.moveTo(x, y)
	isIdle = false
}

function drawmove(event) {
	if (isIdle) return
	let rect = event.target.getBoundingClientRect()
	let x = (event.clientX - rect.left) / scale
	let y = (event.clientY - rect.top) / scale
	context.lineWidth = last_stroke().strokeWidth || 1
	// if ( 
		add_to_stroke(x, y)
	// ) {
		context.lineTo(x, y)
		context.stroke()
	// }
}

function drawend(event) {
	if (isIdle) return
	drawmove(event)
	isIdle = true
	context.lineWidth = 1
	let last = last_stroke()
	let THRESHOLD = 0.05
	while (last.points.length > 100){
		console.log('last points length: ',last.points.length, 'COMPRESSING AT: ', THRESHOLD)
		let compressed = compress_stroke(last.points, THRESHOLD)
		console.log('compressed length: ', compressed.length)
		last.points = compressed
		THRESHOLD += .05
	}
	
	render_points(state.points.value())

}

function touchstart(event) { drawstart(event.touches[0]) }
function touchmove(event) { drawmove(event.touches[0]); event.preventDefault() }
function touchend(event) { drawend(event.changedTouches[0]) }

// Initialize
window.addEventListener('load', async () => {
	canvas = drawCanvas
	context = canvas.getContext('2d')
	context.canvas.width = 500
	context.canvas.height = 500

	clear()

	canvas.addEventListener('touchstart', touchstart, false)
	canvas.addEventListener('touchmove', touchmove, false)
	canvas.addEventListener('touchend', touchend, false)
	canvas.addEventListener('mousedown', drawstart, false)
	canvas.addEventListener('mousemove', drawmove, false)
	canvas.addEventListener('mouseup', drawend, false)
}, false)

export const canvasEl = dom(['.container',
	controls,
	drawCanvas
])
