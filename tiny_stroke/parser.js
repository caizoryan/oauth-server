/**
 * Parse an array of stroke strings into Stroke[]
 * @param {string[]} strings - Array of stroke strings
 * @returns {Array<{color: string, strokeWidth: number, points: [number, number][]}>}
 */
export function parse(strings) {
  return strings.map(str => {
    // Extract RGB (first 9 chars)
    const r = parseInt(str.slice(0, 3), 10);
    const g = parseInt(str.slice(3, 6), 10);
    const b = parseInt(str.slice(6, 9), 10);
    
    // Extract stroke width (next 2 chars)
    const strokeWidth = parseInt(str.slice(9, 11), 10);
    
    // Extract points (remaining chars, 6 digits per point: 3 for x, 3 for y)
    const pointsStr = str.slice(11);
    const points = [];
    
    for (let i = 0; i < pointsStr.length-5; i += 6) {
      const x = parseInt(pointsStr.slice(i, i + 3));
      const y = parseInt(pointsStr.slice(i + 3, i + 6));

      points.push([x, y]);
    }
    
    return {
      color: `rgb(${r},${g},${b})`,
      strokeWidth,
      points
    };
  });
}

/**
 * Encode Stroke[] into an array of stroke strings and
 * cannot be over 50 strokes.
 * @param {Array<{color: string, strokeWidth: number, points: [number, number][]}>} strokes - Array of strokes
 * @returns {string[]}
 */
export function encode(strokes) {
  return strokes.map(stroke => {
    // Parse RGB from color string "rgb(r,g,b)"
    const rgbMatch = stroke.color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    const r = rgbMatch ? parseInt(rgbMatch[1]) : 255;
    const g = rgbMatch ? parseInt(rgbMatch[2]) : 255;
    const b = rgbMatch ? parseInt(rgbMatch[3]) : 255;
    
    // Build the string
    let str = 
      r.toString().padStart(3, '0') +
      g.toString().padStart(3, '0') +
      b.toString().padStart(3, '0') +
      stroke.strokeWidth.toString().padStart(2, '0');
    
    // Add points
    for (const [x, y] of stroke.points) {
      str += Math.round(x).toString().padStart(3, '0');
      str += Math.round(y).toString().padStart(3, '0');
    }
    
    return str;
  }).slice(0,50);
}

