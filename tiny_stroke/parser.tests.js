import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parse, encode } from './parser.js';

describe('parse', () => {
  it('parses a single stroke with one point', () => {
    const result = parse(['25500000005000100000']);
    assert.deepStrictEqual(result, [{
      color: 'rgb(255,0,0)',
      strokeWidth: 5,
      points: [[0, 100]]
    }]);
  });

  it('parses a single stroke with multiple points', () => {
    const result = parse(['25500000005000100200200']);
    assert.deepStrictEqual(result, [{
      color: 'rgb(255,0,0)',
      strokeWidth: 5,
      points: [[0, 100], [200, 200]]
    }]);
  });

  it('parses multiple strokes', () => {
    const result = parse(['25500000005000100000', '00000025504005005000']);
    assert.deepStrictEqual(result, [
      { color: 'rgb(255,0,0)', strokeWidth: 5, points: [[0, 100]] },
      { color: 'rgb(0,0,255)', strokeWidth: 4, points: [[5, 5]] }
    ]);
  });

  it('handles empty array', () => {
    const result = parse([]);
    assert.deepStrictEqual(result, []);
  });
});

describe('encode', () => {
  it('encodes a single stroke with one point', () => {
    const result = encode([{ color: 'rgb(255,0,0)', strokeWidth: 5, points: [[0, 100]] }]);
    assert.deepStrictEqual(result, ['25500000005000100']);
  });

  it('encodes a single stroke with multiple points', () => {
    const result = encode([{ color: 'rgb(255,0,0)', strokeWidth: 5, points: [[0, 100], [200, 200]] }]);
    assert.deepStrictEqual(result, ['25500000005000100200200']);
  });

  it('encodes multiple strokes', () => {
    const result = encode([
      { color: 'rgb(255,0,0)', strokeWidth: 5, points: [[0, 100]] },
      { color: 'rgb(0,0,255)', strokeWidth: 4, points: [[5, 5]] }
    ]);
    assert.deepStrictEqual(result, ['25500000005000100', '00000025504005005']);
  });

  it('handles empty array', () => {
    const result = encode([]);
    assert.deepStrictEqual(result, []);
  });

  it('pads single digit coordinates', () => {
    const result = encode([{ color: 'rgb(0,255,0)', strokeWidth: 1, points: [[1, 2]] }]);
    assert.deepStrictEqual(result, ['00025500001001002']);
  });

  it('pads double digit coordinates', () => {
    const result = encode([{ color: 'rgb(128,128,128)', strokeWidth: 10, points: [[10, 99]] }]);
    assert.deepStrictEqual(result, ['12812812810010099']);
  });

  it('handles maximum values', () => {
    const result = encode([{ color: 'rgb(255,255,255)', strokeWidth: 99, points: [[999, 999]] }]);
    assert.deepStrictEqual(result, ['25525525599999999']);
  });
});

describe('parse and encode roundtrip', () => {
  it('roundtrips a single stroke with one point', () => {
    const original = [{ color: 'rgb(255,0,0)', strokeWidth: 5, points: [[0, 100]] }];
    const encoded = encode(original);
    const decoded = parse(encoded);
    assert.deepStrictEqual(decoded, original);
  });

  it('roundtrips a single stroke with multiple points', () => {
    const original = [{ color: 'rgb(255,0,0)', strokeWidth: 5, points: [[0, 100], [200, 200], [50, 75]] }];
    const encoded = encode(original);
    const decoded = parse(encoded);
    assert.deepStrictEqual(decoded, original);
  });

  it('roundtrips multiple strokes', () => {
    const original = [
      { color: 'rgb(255,0,0)', strokeWidth: 5, points: [[0, 100], [150, 200]] },
      { color: 'rgb(0,0,255)', strokeWidth: 4, points: [[5, 5]] },
      { color: 'rgb(0,255,0)', strokeWidth: 10, points: [[100, 100], [200, 150], [300, 200]] }
    ];
    const encoded = encode(original);
    const decoded = parse(encoded);
    assert.deepStrictEqual(decoded, original);
  });

  it('roundtrips empty array', () => {
    const original = [];
    const encoded = encode(original);
    const decoded = parse(encoded);
    assert.deepStrictEqual(decoded, original);
  });

  it('roundtrips with various color values', () => {
    const original = [
      { color: 'rgb(0,0,0)', strokeWidth: 1, points: [[0, 0]] },
      { color: 'rgb(255,255,255)', strokeWidth: 99, points: [[999, 999]] },
      { color: 'rgb(128,64,192)', strokeWidth: 50, points: [[123, 456]] }
    ];
    const encoded = encode(original);
    const decoded = parse(encoded);
    assert.deepStrictEqual(decoded, original);
  });
});
