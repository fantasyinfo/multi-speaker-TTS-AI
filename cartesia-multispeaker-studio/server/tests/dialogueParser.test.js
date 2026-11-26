import test from 'node:test';
import assert from 'node:assert/strict';
import { extractEmotionFromDialogue } from '../src/utils/dialogueParser.js';

test('extractEmotionFromDialogue separates leading [emotion] from Hindi and English text', () => {
  const res1 = extractEmotionFromDialogue('[excited] लेकिन दादाजी, मेरी सैलरी खत्म हो गई!');
  assert.equal(res1.emotion, 'excited');
  assert.equal(res1.transcript, 'लेकिन दादाजी, मेरी सैलरी खत्म हो गई!');

  const res2 = extractEmotionFromDialogue('   [Calm]   Take a slow breath.');
  assert.equal(res2.emotion, 'calm');
  assert.equal(res2.transcript, 'Take a slow breath.');

  const res3 = extractEmotionFromDialogue('No bracket emotion here.');
  assert.equal(res3.emotion, null);
  assert.equal(res3.transcript, 'No bracket emotion here.');

  const res4 = extractEmotionFromDialogue('[curious]');
  assert.equal(res4.emotion, 'curious');
  assert.equal(res4.transcript, '');
});
