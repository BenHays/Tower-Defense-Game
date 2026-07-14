#!/usr/bin/env node

/*
 * Renders the original Wild Hearth title-screen music sketch.
 *
 * This is a small, dependency-free reference export: D Dorian, 68 BPM, 3/4,
 * designed around an intimate homestead-at-dusk mood. It does not reproduce
 * any existing game's melody, rhythm, chord sequence, or arrangement.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const SAMPLE_RATE = 22050;
const TEMPO = 68;
const BAR_SECONDS = (60 / TEMPO) * 3;
const BARS = 20;
const DURATION_SECONDS = BARS * BAR_SECONDS + 2.5;
const samples = new Float64Array(Math.ceil(DURATION_SECONDS * SAMPLE_RATE));

const NOTES = {
  D2: 73.42,
  A2: 110.00,
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196.00,
  A3: 220.00,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.00,
  A4: 440.00,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
};

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

function addPluck(start, duration, note, volume) {
  const frequency = NOTES[note];
  const from = Math.max(0, Math.floor(start * SAMPLE_RATE));
  const to = Math.min(samples.length, Math.ceil((start + duration) * SAMPLE_RATE));
  for (let index = from; index < to; index += 1) {
    const time = (index / SAMPLE_RATE) - start;
    const attack = clamp(time / 0.018, 0, 1);
    const envelope = attack * Math.exp((-4.2 * time) / duration);
    const wave = Math.sin(2 * Math.PI * frequency * time)
      + 0.34 * Math.sin(2 * Math.PI * frequency * 2 * time)
      + 0.13 * Math.sin(2 * Math.PI * frequency * 3.01 * time);
    samples[index] += wave * envelope * volume;
  }
}

function addFlute(start, duration, note, volume) {
  const frequency = NOTES[note];
  const from = Math.max(0, Math.floor(start * SAMPLE_RATE));
  const to = Math.min(samples.length, Math.ceil((start + duration) * SAMPLE_RATE));
  for (let index = from; index < to; index += 1) {
    const time = (index / SAMPLE_RATE) - start;
    const attack = clamp(time / 0.09, 0, 1);
    const release = clamp((duration - time) / 0.24, 0, 1);
    const vibrato = 1 + 0.0025 * Math.sin(2 * Math.PI * 4.6 * time);
    const phase = 2 * Math.PI * frequency * vibrato * time;
    const wave = Math.sin(phase) + 0.11 * Math.sin(phase * 2) + 0.035 * Math.sin(phase * 3);
    samples[index] += wave * attack * release * volume;
  }
}

function addStringPad(start, duration, notes, volume) {
  notes.forEach((note, noteIndex) => {
    const frequency = NOTES[note];
    const from = Math.max(0, Math.floor(start * SAMPLE_RATE));
    const to = Math.min(samples.length, Math.ceil((start + duration) * SAMPLE_RATE));
    for (let index = from; index < to; index += 1) {
      const time = (index / SAMPLE_RATE) - start;
      const attack = clamp(time / 0.34, 0, 1);
      const release = clamp((duration - time) / 0.45, 0, 1);
      const phase = 2 * Math.PI * frequency * time;
      const detuned = 2 * Math.PI * frequency * (1.0018 + noteIndex * 0.0004) * time;
      const wave = Math.sin(phase) + 0.56 * Math.sin(detuned) + 0.09 * Math.sin(phase * 2);
      samples[index] += wave * attack * release * volume;
    }
  });
}

function addBell(start, note, volume) {
  const frequency = NOTES[note];
  const duration = 1.6;
  const from = Math.max(0, Math.floor(start * SAMPLE_RATE));
  const to = Math.min(samples.length, Math.ceil((start + duration) * SAMPLE_RATE));
  for (let index = from; index < to; index += 1) {
    const time = (index / SAMPLE_RATE) - start;
    const envelope = clamp(time / 0.012, 0, 1) * Math.exp(-2.7 * time);
    const wave = Math.sin(2 * Math.PI * frequency * time)
      + 0.28 * Math.sin(2 * Math.PI * frequency * 2.71 * time)
      + 0.12 * Math.sin(2 * Math.PI * frequency * 4.08 * time);
    samples[index] += wave * envelope * volume;
  }
}

function addFrameDrum(start, volume) {
  const duration = 0.48;
  const from = Math.max(0, Math.floor(start * SAMPLE_RATE));
  const to = Math.min(samples.length, Math.ceil((start + duration) * SAMPLE_RATE));
  let randomState = Math.floor(start * 100000) + 17;
  const nextNoise = () => {
    randomState = (randomState * 1664525 + 1013904223) >>> 0;
    return (randomState / 0xffffffff) * 2 - 1;
  };
  for (let index = from; index < to; index += 1) {
    const time = (index / SAMPLE_RATE) - start;
    const envelope = clamp(time / 0.006, 0, 1) * Math.exp(-8.5 * time);
    const drum = Math.sin(2 * Math.PI * (102 - 72 * time) * time);
    samples[index] += (drum * 0.78 + nextNoise() * 0.12) * envelope * volume;
  }
}

const chords = [
  ["D2", "A2", "D3", "F3"], ["D2", "A2", "D3", "F3"], ["G3", "D4", "G4"], ["A2", "E3", "A3", "C4"],
  ["D2", "A2", "D3", "F3"], ["C3", "G3", "C4", "E4"], ["G3", "D4", "G4", "B4"], ["D2", "A2", "D3", "F3"],
  ["E3", "B3", "E4", "G4"], ["D2", "A2", "D3", "F3"], ["C3", "G3", "C4", "E4"], ["G3", "D4", "G4", "B4"],
  ["D2", "A2", "D3", "F3"], ["A2", "E3", "A3", "C4"], ["G3", "D4", "G4", "B4"], ["D2", "A2", "D3", "F3"],
  ["C3", "G3", "C4", "E4"], ["G3", "D4", "G4", "B4"], ["D2", "A2", "D3", "F3"], ["D2", "A2", "D3", "F3"],
];

const melody = [
  ["D4", "A3", "D4", "F4", "E4", "D4"], ["F4", "A4", "G4", "F4", "E4", "D4"],
  ["G4", "A4", "B4", "A4", "G4", "E4"], ["E4", "G4", "A4", "C5", "A4", "G4"],
  ["D4", "F4", "A4", "G4", "F4", "E4"], ["C5", "A4", "G4", "E4", "F4", "D4"],
  ["G4", "B4", "A4", "G4", "E4", "D4"], ["F4", "A4", "G4", "F4", "E4", "D4"],
  ["E4", "G4", "B4", "A4", "G4", "E4"], ["D4", "F4", "A4", "C5", "A4", "F4"],
  ["E4", "G4", "A4", "G4", "E4", "D4"], ["G4", "B4", "D5", "B4", "A4", "G4"],
  ["D4", "F4", "A4", "G4", "F4", "E4"], ["E4", "G4", "A4", "C5", "A4", "G4"],
  ["G4", "B4", "A4", "G4", "E4", "D4"], ["F4", "A4", "G4", "F4", "E4", "D4"],
];

const pluckPulse = ["D4", "A3", "F4", "A3", "D4", "A3"];
for (let bar = 0; bar < BARS; bar += 1) {
  const start = bar * BAR_SECONDS;
  const isMiddle = bar >= 8 && bar <= 15;
  const isOutro = bar >= 16;
  addStringPad(start, BAR_SECONDS + 0.22, chords[bar], isOutro ? 0.011 : 0.016);
  if (bar < 18) {
    pluckPulse.forEach((note, pulse) => addPluck(start + pulse * (BAR_SECONDS / 6), BAR_SECONDS * 0.8, note, isOutro ? 0.037 : 0.048));
  }
  if (bar >= 2 && bar < 18) {
    melody[bar - 2].forEach((note, step) => {
      if (step % 2 === 0) addFlute(start + step * (BAR_SECONDS / 6), BAR_SECONDS / 2.7, note, isOutro ? 0.053 : 0.072);
    });
  }
  if (isMiddle) addFrameDrum(start, 0.055);
}

addBell(BAR_SECONDS * 1.5, "A4", 0.025);
addBell(BAR_SECONDS * 8.5, "D5", 0.022);
addBell(BAR_SECONDS * 15.5, "A4", 0.018);
addBell(BAR_SECONDS * 18.2, "D5", 0.022);

for (let index = 0; index < samples.length; index += 1) {
  const time = index / SAMPLE_RATE;
  const fadeIn = clamp(time / 1.5, 0, 1);
  const fadeOut = clamp((DURATION_SECONDS - time) / 2.2, 0, 1);
  // Keep the exported reference comfortably audible as standalone background music.
  samples[index] = Math.tanh(samples[index] * 2.45) * fadeIn * fadeOut;
}

const output = Buffer.alloc(44 + samples.length * 2);
output.write("RIFF", 0);
output.writeUInt32LE(36 + samples.length * 2, 4);
output.write("WAVEfmt ", 8);
output.writeUInt32LE(16, 16);
output.writeUInt16LE(1, 20);
output.writeUInt16LE(1, 22);
output.writeUInt32LE(SAMPLE_RATE, 24);
output.writeUInt32LE(SAMPLE_RATE * 2, 28);
output.writeUInt16LE(2, 32);
output.writeUInt16LE(16, 34);
output.write("data", 36);
output.writeUInt32LE(samples.length * 2, 40);
for (let index = 0; index < samples.length; index += 1) {
  output.writeInt16LE(Math.round(clamp(samples[index], -1, 1) * 32767), 44 + index * 2);
}

const outputPath = path.join(__dirname, "..", "assets", "wild-hearth-title-sketch.wav");
fs.writeFileSync(outputPath, output);
console.log(`Wrote ${outputPath} (${(DURATION_SECONDS).toFixed(1)} seconds, original composition sketch).`);
