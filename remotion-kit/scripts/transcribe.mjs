/**
 * Word-level timestamps for a VO track, entirely local and free.
 *
 *   node scripts/transcribe.mjs <path-to-audio> <out-name>
 *
 * whisper.cpp needs 16kHz mono wav, so the input is converted first.
 * Output lands in src/timing/<out-name>.json and is what every caption and
 * scene cut in the reel is keyed off — nothing is hand-timed.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  downloadWhisperModel,
  installWhisperCpp,
  transcribe,
  toCaptions,
} from "@remotion/install-whisper-cpp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const WHISPER_DIR = path.join(ROOT, ".whisper");
const MODEL = "medium.en";

const [input, outName = "vo"] = process.argv.slice(2);
if (!input) {
  console.error("usage: node scripts/transcribe.mjs <audio> [out-name]");
  process.exit(1);
}

await installWhisperCpp({ to: WHISPER_DIR, version: "1.5.5" });
await downloadWhisperModel({ folder: WHISPER_DIR, model: MODEL });

const wav = path.join(ROOT, ".whisper", `${outName}-16k.wav`);
execSync(`ffmpeg -v error -y -i ${JSON.stringify(input)} -ar 16000 -ac 1 -c:a pcm_s16le ${JSON.stringify(wav)}`);

const { transcription } = await transcribe({
  inputPath: wav,
  whisperPath: WHISPER_DIR,
  whisperCppVersion: "1.5.5",
  model: MODEL,
  tokenLevelTimestamps: true,
});

const { captions } = toCaptions({ whisperCppOutput: { transcription } });

const outDir = path.join(ROOT, "src", "timing");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, `${outName}.json`), JSON.stringify(captions, null, 2));

console.log(`\n${captions.length} words -> src/timing/${outName}.json`);
console.log(captions.map((c) => c.text).join(" ").trim().slice(0, 400));
