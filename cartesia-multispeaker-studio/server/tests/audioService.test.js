import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWavBuffer,
  createSilencePcm,
  mergeWavBuffers,
  normalizePcm16,
  parseWavBuffer,
  sanitizeFilename,
} from '../src/services/audioService.js';

function createToneWav({ sampleRate = 44100, numChannels = 1, bitsPerSample = 16, samples = [1000, -1000, 2000, -2000] } = {}) {
  const bytesPerSample = bitsPerSample / 8;
  const pcm = Buffer.alloc(samples.length * bytesPerSample);
  samples.forEach((val, idx) => {
    pcm.writeInt16LE(val, idx * 2);
  });
  return buildWavBuffer(pcm, { sampleRate, numChannels, bitsPerSample });
}

test('parseWavBuffer extracts valid format and PCM data', () => {
  const wav = createToneWav({ sampleRate: 44100, samples: [500, -500, 1500] });
  const parsed = parseWavBuffer(wav);

  assert.equal(parsed.audioFormat, 1);
  assert.equal(parsed.sampleRate, 44100);
  assert.equal(parsed.numChannels, 1);
  assert.equal(parsed.bitsPerSample, 16);
  assert.equal(parsed.pcmData.length, 6);
  assert.equal(parsed.pcmData.readInt16LE(0), 500);
});

test('mergeWavBuffers combines multiple WAV clips with silence gap and single header', () => {
  const clip1 = createToneWav({ sampleRate: 44100, samples: [1000, 2000] });
  const clip2 = createToneWav({ sampleRate: 44100, samples: [3000, 4000] });

  const merged = mergeWavBuffers([clip1, clip2], { pauseMs: 100, normalize: false });
  const parsedMerged = parseWavBuffer(merged.buffer);

  // 100ms at 44100Hz = 4410 frames * 2 bytes = 8820 bytes silence + 4 bytes clip1 + 4 bytes clip2
  assert.equal(parsedMerged.pcmData.length, 8820 + 4 + 4);
  assert.equal(parsedMerged.pcmData.readInt16LE(0), 1000);
  assert.equal(parsedMerged.pcmData.readInt16LE(8824), 3000);
  assert.equal(merged.sampleRate, 44100);
  assert.ok(merged.durationSeconds > 0);
});

test('mergeWavBuffers rejects mismatched sample rates', () => {
  const clip1 = createToneWav({ sampleRate: 44100 });
  const clip2 = createToneWav({ sampleRate: 24000 });

  assert.throws(
    () => mergeWavBuffers([clip1, clip2], { pauseMs: 100 }),
    /Incompatible WAV format/
  );
});

test('createSilencePcm aligns bytes to blockAlign', () => {
  const silence = createSilencePcm(250, { sampleRate: 44100, blockAlign: 2, bitsPerSample: 16 });
  assert.equal(silence.length % 2, 0);
  assert.equal(silence.length, Math.round((44100 * 250) / 1000) * 2);
});

test('normalizePcm16 scales quiet audio safely without clipping', () => {
  const pcm = Buffer.alloc(4);
  pcm.writeInt16LE(2000, 0);
  pcm.writeInt16LE(-4000, 2);

  const normalized = normalizePcm16(pcm, 0.92);
  assert.ok(Math.abs(normalized.readInt16LE(2)) > 4000);
  assert.ok(Math.abs(normalized.readInt16LE(2)) <= 32767);
});

test('sanitizeFilename prevents path traversal and produces clean slug', () => {
  assert.equal(sanitizeFilename('../../Mohan Ki Samajh – Saving Story!'), 'mohan-ki-samajh-saving-story');
  assert.equal(sanitizeFilename('   '), 'cartesia-story');
});
