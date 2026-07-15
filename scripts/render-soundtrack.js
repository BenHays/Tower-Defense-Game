#!/usr/bin/env node

/*
 * Renders four original Wild Hearth soundtrack cues with a deliberately broad
 * late-1990s fantasy-RPG palette: plucked strings, woodwind-like lead, soft
 * string pads, bells, and restrained frame drums. These are new compositions
 * made for Wild Hearth; no existing game's melody, rhythm, or arrangement is
 * reproduced here.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const SAMPLE_RATE = 22050;
const OUTPUT_DIRECTORY = path.join(__dirname, "..", "assets");

const NOTES = {
  C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00, B2: 123.47,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99,
};

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

function createCanvas(durationSeconds) {
  const samples = new Float64Array(Math.ceil(durationSeconds * SAMPLE_RATE));

  function apply(start, duration, callback) {
    const from = Math.max(0, Math.floor(start * SAMPLE_RATE));
    const to = Math.min(samples.length, Math.ceil((start + duration) * SAMPLE_RATE));
    for (let index = from; index < to; index += 1) callback(index, (index / SAMPLE_RATE) - start);
  }

  function addPluck(start, duration, note, volume) {
    const frequency = NOTES[note];
    apply(start, duration, (index, time) => {
      const attack = clamp(time / 0.016, 0, 1);
      const envelope = attack * Math.exp((-4.1 * time) / duration);
      const phase = 2 * Math.PI * frequency * time;
      const wave = Math.sin(phase)
        + 0.31 * Math.sin(phase * 2)
        + 0.12 * Math.sin(phase * 3.02);
      samples[index] += wave * envelope * volume;
    });
  }

  function addFlute(start, duration, note, volume) {
    const frequency = NOTES[note];
    apply(start, duration, (index, time) => {
      const attack = clamp(time / 0.075, 0, 1);
      const release = clamp((duration - time) / 0.19, 0, 1);
      const wobble = 1 + 0.0022 * Math.sin(2 * Math.PI * 4.4 * time);
      const phase = 2 * Math.PI * frequency * wobble * time;
      const wave = Math.sin(phase) + 0.105 * Math.sin(phase * 2) + 0.03 * Math.sin(phase * 3);
      samples[index] += wave * attack * release * volume;
    });
  }

  function addPad(start, duration, notes, volume) {
    notes.forEach((note, noteIndex) => {
      const frequency = NOTES[note];
      apply(start, duration, (index, time) => {
        const attack = clamp(time / 0.32, 0, 1);
        const release = clamp((duration - time) / 0.43, 0, 1);
        const phase = 2 * Math.PI * frequency * time;
        const detuned = 2 * Math.PI * frequency * (1.0016 + noteIndex * 0.0004) * time;
        const wave = Math.sin(phase) + 0.52 * Math.sin(detuned) + 0.075 * Math.sin(phase * 2);
        samples[index] += wave * attack * release * volume;
      });
    });
  }

  function addBass(start, duration, note, volume) {
    const frequency = NOTES[note];
    apply(start, duration, (index, time) => {
      const attack = clamp(time / 0.028, 0, 1);
      const release = clamp((duration - time) / 0.14, 0, 1);
      const phase = 2 * Math.PI * frequency * time;
      const wave = Math.sin(phase) + 0.16 * Math.sin(phase * 2);
      samples[index] += wave * attack * release * volume;
    });
  }

  function addBell(start, note, volume) {
    const frequency = NOTES[note];
    apply(start, 1.8, (index, time) => {
      const envelope = clamp(time / 0.01, 0, 1) * Math.exp(-2.55 * time);
      const phase = 2 * Math.PI * frequency * time;
      const wave = Math.sin(phase)
        + 0.27 * Math.sin(phase * 2.71)
        + 0.10 * Math.sin(phase * 4.08);
      samples[index] += wave * envelope * volume;
    });
  }

  function addFrameDrum(start, volume) {
    let randomState = Math.floor(start * 100003) + 41;
    const nextNoise = () => {
      randomState = (randomState * 1664525 + 1013904223) >>> 0;
      return (randomState / 0xffffffff) * 2 - 1;
    };
    apply(start, 0.46, (index, time) => {
      const envelope = clamp(time / 0.006, 0, 1) * Math.exp(-8.2 * time);
      const body = Math.sin(2 * Math.PI * (96 - 66 * time) * time);
      samples[index] += (body * 0.80 + nextNoise() * 0.12) * envelope * volume;
    });
  }

  function finalize(outputName) {
    for (let index = 0; index < samples.length; index += 1) {
      const time = index / SAMPLE_RATE;
      const fadeIn = clamp(time / 1.1, 0, 1);
      const fadeOut = clamp((durationSeconds - time) / 1.7, 0, 1);
      samples[index] = Math.tanh(samples[index] * 2.15) * fadeIn * fadeOut;
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

    const outputPath = path.join(OUTPUT_DIRECTORY, outputName);
    fs.writeFileSync(outputPath, output);
    console.log(`Wrote ${outputPath} (${durationSeconds.toFixed(1)} seconds).`);
  }

  return { addPluck, addFlute, addPad, addBass, addBell, addFrameDrum, finalize };
}

function renderHearthMeadow() {
  const tempo = 70;
  const bar = (60 / tempo) * 3;
  const bars = 18;
  const canvas = createCanvas(bars * bar + 1.8);
  const chords = [
    ["G2", "D3", "G3", "B3"], ["G2", "D3", "G3", "B3"], ["F2", "C3", "F3", "A3"], ["C3", "G3", "C4", "E4"],
    ["G2", "D3", "G3", "B3"], ["D2", "A2", "D3", "F3"], ["E2", "B2", "E3", "G3"], ["C3", "G3", "C4", "E4"],
    ["G2", "D3", "G3", "B3"], ["F2", "C3", "F3", "A3"], ["C3", "G3", "C4", "E4"], ["D2", "A2", "D3", "F3"],
    ["G2", "D3", "G3", "B3"], ["E2", "B2", "E3", "G3"], ["C3", "G3", "C4", "E4"], ["D2", "A2", "D3", "F3"],
    ["G2", "D3", "G3", "B3"], ["G2", "D3", "G3", "B3"],
  ];
  const melody = [
    ["B3", "D4", "G4"], ["A4", "G4", "D4"], ["A3", "C4", "F4"], ["E4", "G4", "E4"],
    ["B3", "D4", "G4"], ["F4", "E4", "D4"], ["B3", "E4", "G4"], ["G4", "E4", "D4"],
    ["B3", "D4", "G4"], ["A4", "G4", "F4"], ["E4", "G4", "C5"], ["A4", "F4", "D4"],
    ["G4", "B4", "D5"], ["B4", "G4", "E4"], ["G4", "E4", "C4"], ["A3", "D4", "F4"],
  ];

  chords.forEach((chord, index) => {
    const start = index * bar;
    canvas.addPad(start, bar + 0.20, chord, 0.014);
    ["G3", "D4", "B3", "D4", "G3", "D4"].forEach((note, pulse) => {
      if (index < bars - 1) canvas.addPluck(start + pulse * (bar / 6), bar * 0.74, note, 0.041);
    });
    if (index >= 2 && index <= 17) {
      melody[index - 2].forEach((note, step) => canvas.addFlute(start + (step + 1) * (bar / 4.4), bar / 3.2, note, 0.055));
    }
    if (index === 1 || index === 8 || index === 14) canvas.addBell(start + bar * 0.47, index === 8 ? "D5" : "G4", 0.021);
  });
  canvas.finalize("wild-hearth-hearth-meadow.wav");
}

function renderForestWatch() {
  const tempo = 74;
  const bar = (60 / tempo) * 3;
  const bars = 18;
  const canvas = createCanvas(bars * bar + 1.8);
  const chords = [
    ["D2", "A2", "D3", "F3"], ["D2", "A2", "D3", "F3"], ["B2", "F3", "B3", "D4"], ["C3", "G3", "C4", "E4"],
    ["D2", "A2", "D3", "F3"], ["A2", "E3", "A3", "C4"], ["B2", "F3", "B3", "D4"], ["C3", "G3", "C4", "E4"],
    ["D2", "A2", "D3", "F3"], ["D2", "A2", "D3", "F3"], ["F2", "C3", "F3", "A3"], ["C3", "G3", "C4", "E4"],
    ["D2", "A2", "D3", "F3"], ["A2", "E3", "A3", "C4"], ["B2", "F3", "B3", "D4"], ["C3", "G3", "C4", "E4"],
    ["D2", "A2", "D3", "F3"], ["D2", "A2", "D3", "F3"],
  ];
  const calls = [
    ["A3", "C4"], ["D4", "C4"], ["F4", "E4"], ["A3", "D4"],
    ["C4", "A3"], ["E4", "D4"], ["F4", "A4"], ["E4", "D4"],
    ["A3", "C4"], ["D4", "F4"], ["A4", "F4"], ["E4", "D4"],
  ];

  chords.forEach((chord, index) => {
    const start = index * bar;
    canvas.addPad(start, bar + 0.18, chord, 0.013);
    canvas.addBass(start, bar * 0.72, chord[0], 0.060);
    canvas.addBass(start + bar * 0.5, bar * 0.42, chord[1], 0.037);
    if (index >= 2) {
      canvas.addFrameDrum(start, 0.042);
      canvas.addFrameDrum(start + bar * 0.68, 0.026);
    }
    if (index >= 3 && index < 15) {
      calls[index - 3].forEach((note, step) => canvas.addFlute(start + (0.22 + step * 0.43) * bar, bar * 0.43, note, 0.045));
    }
    if (index === 7 || index === 13) canvas.addBell(start + bar * 0.84, "D4", 0.015);
  });
  canvas.finalize("wild-hearth-forest-watch.wav");
}

function renderBrambleAlarm() {
  const tempo = 94;
  const bar = (60 / tempo) * 4;
  const bars = 12;
  const canvas = createCanvas(bars * bar + 1.6);
  const chords = [
    ["E2", "B2", "E3", "G3"], ["F2", "C3", "F3", "A3"], ["D2", "A2", "D3", "F3"], ["B2", "F3", "B3", "D4"],
    ["E2", "B2", "E3", "G3"], ["F2", "C3", "F3", "A3"], ["D2", "A2", "D3", "F3"], ["B2", "F3", "B3", "D4"],
    ["E2", "B2", "E3", "G3"], ["F2", "C3", "F3", "A3"], ["D2", "A2", "D3", "F3"], ["E2", "B2", "E3", "G3"],
  ];
  const signal = ["B3", "D4", "E4", "D4", "B3", "A3", "G3", "B3"];

  chords.forEach((chord, index) => {
    const start = index * bar;
    canvas.addPad(start, bar + 0.12, chord, 0.015);
    for (let beat = 0; beat < 4; beat += 1) {
      canvas.addBass(start + beat * (bar / 4), bar * 0.30, beat % 2 === 0 ? chord[0] : chord[1], 0.058);
      canvas.addFrameDrum(start + beat * (bar / 4), beat === 0 ? 0.056 : 0.033);
    }
    ["E3", "B3", "G3", "B3", "E3", "B3", "G3", "B3"].forEach((note, pulse) => {
      canvas.addPluck(start + pulse * (bar / 8), bar * 0.28, note, 0.031);
    });
    if (index >= 3 && index <= 10) {
      const first = signal[(index - 3) % signal.length];
      const second = signal[(index - 2) % signal.length];
      canvas.addFlute(start + bar * 0.25, bar * 0.24, first, 0.042);
      canvas.addFlute(start + bar * 0.63, bar * 0.24, second, 0.036);
    }
  });
  canvas.addBell(bar * 3.65, "E4", 0.016);
  canvas.addBell(bar * 7.65, "F4", 0.015);
  canvas.finalize("wild-hearth-bramble-alarm.wav");
}

function renderFirstLight() {
  const tempo = 64;
  const bar = (60 / tempo) * 3;
  const bars = 6;
  const canvas = createCanvas(bars * bar + 1.2);
  const chords = [
    ["C3", "G3", "C4", "E4"], ["F2", "C3", "F3", "A3"], ["G2", "D3", "G3", "B3"],
    ["C3", "G3", "C4", "E4"], ["F2", "C3", "F3", "A3"], ["C3", "G3", "C4", "E4"],
  ];
  const rise = [["E4", "G4"], ["A4", "C5"], ["B4", "D5"], ["G4", "E4"], ["A4", "C5"], ["E5", "C5"]];

  chords.forEach((chord, index) => {
    const start = index * bar;
    canvas.addPad(start, bar + 0.22, chord, 0.016);
    [chord[2], chord[1], chord[3], chord[1], chord[2], chord[3]].forEach((note, pulse) => {
      canvas.addPluck(start + pulse * (bar / 6), bar * 0.68, note, 0.048);
    });
    canvas.addFlute(start + bar * 0.27, bar * 0.30, rise[index][0], 0.060);
    canvas.addFlute(start + bar * 0.60, bar * 0.30, rise[index][1], 0.057);
    canvas.addBell(start + bar * 0.16, index === 5 ? "E5" : "C5", 0.022);
  });
  canvas.finalize("wild-hearth-first-light.wav");
}

fs.mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
renderHearthMeadow();
renderForestWatch();
renderBrambleAlarm();
renderFirstLight();
