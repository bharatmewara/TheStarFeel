import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import OpenAI from "openai";

dotenv.config();

const app = express();
const port = process.env.PORT || 8787;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS blocked"), false);
    }
  })
);

app.use(express.json({ limit: "1mb" }));

const dataDir = path.join(process.cwd(), "data");
const logFile = path.join(dataDir, "consultations.jsonl");

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function writeConsultation(record) {
  if (process.env.STORE_CONSULTATIONS !== "true") return;
  ensureDataDir();
  fs.appendFileSync(logFile, JSON.stringify(record) + "\n");
}

function sanitizeText(text) {
  if (!text) return "";
  const banned = [
    "god",
    "goddess",
    "deity",
    "religion",
    "religious",
    "astrology",
    "vastu",
    "dosha",
    "horoscope",
    "zodiac"
  ];
  let output = text;
  banned.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    output = output.replace(regex, "");
  });
  return output.replace(/\s{2,}/g, " ").trim();
}

function mapPurposeToPalette(purpose) {
  const map = {
    "Calm & peace": "soft neutrals, misty blues, gentle sand",
    "Abundance & growth": "warm earth tones, muted greens, golden highlights",
    "Focus & clarity": "clean whites, cool grays, crisp graphite",
    "Emotional warmth": "sunlit blush, clay, warm amber",
    "Balance & grounding": "stone, taupe, muted charcoal, grounded browns"
  };
  return map[purpose] || "balanced neutrals with soft accents";
}

function mapEmotionToFlow(currentFeeling, desiredFeeling) {
  const map = {
    "Restless": "calming, elongated flows with gentle arcs",
    "Neutral": "subtle movement with minimal rhythm",
    "Calm but dull": "light energetic lift with soft contrasts",
    "Heavy / cluttered": "open, spacious composition with breathing room",
    "Comfortable": "steady, cohesive flow with soft layering"
  };
  const base = map[currentFeeling] || "balanced flow with soft transitions";
  const desired = desiredFeeling
    ? ` to encourage a ${desiredFeeling.toLowerCase()} atmosphere`
    : "";
  return base + desired;
}

function mapWallSizeToComposition(wallSize) {
  if (wallSize.includes("Small")) return "minimal composition with focused center";
  if (wallSize.includes("Medium")) return "balanced composition with moderate depth";
  return "statement composition with expansive layers and depth";
}

function mapStyle(style) {
  const map = {
    Minimal: "minimal, refined geometry with clean negative space",
    "Abstract & flowing": "abstract, flowing forms with layered motion",
    "Soft & organic": "soft, organic shapes with gentle gradients",
    "Cosmic / atmospheric": "atmospheric abstraction with luminous haze"
  };
  return map[style] || "modern abstract with clean structure";
}

function buildPrompt(answers) {
  const palette = mapPurposeToPalette(answers.purpose);
  const flow = mapEmotionToFlow(answers.currentFeeling, answers.desiredFeeling);
  const composition = mapWallSizeToComposition(answers.wallSize || "");
  const style = mapStyle(answers.style);
  const colorTone = answers.colorTone ? `Color tone: ${answers.colorTone}.` : "";
  const colorPref = answers.colorPreference
    ? `Include hints of ${answers.colorPreference}.`
    : "";
  const symbolism =
    answers.symbolism === "Yes, subtle only"
      ? "Include subtle abstract symbolic balance only; no explicit spiritual or religious motifs."
      : "Purely aesthetic abstraction with no spiritual or religious motifs.";

  const direction =
    answers.wallDirection && answers.wallDirection !== "Not sure"
      ? `Wall direction: ${answers.wallDirection}.`
      : "";

  const prompt =
    "Create a modern abstract artwork designed to support " +
    `${answers.purpose || "calm and balance"}. ` +
    `Use ${palette}. ` +
    `Composition: ${composition}. ` +
    `Shape and flow: ${flow}. ` +
    `Style: ${style}. ` +
    `${colorTone} ${colorPref} ${direction} ` +
    `${symbolism} ` +
    "Calm, premium, contemporary aesthetic. High resolution. " +
    "Suitable for canvas printing. No explicit religious figures. " +
    "No text or typography in the artwork.";

  return sanitizeText(prompt);
}

function fallbackGuidance(answers) {
  const line1 = `This artwork is designed to support ${answers.purpose || "your intention"} with a calm, premium aesthetic.`;
  const line2 = `The palette and flow encourage a ${answers.desiredFeeling || "balanced"} feeling while staying contemporary.`;
  const line3 = "Many people find these compositions help a space feel more centered and open.";
  return {
    text: sanitizeText([line1, line2, line3].join(" ")),
    placement: {
      wall: `A central wall in your ${answers.spaceType || "space"}`,
      height: "Center at eye level (about 57–60 in / 145–152 cm)",
      lighting: "Soft ambient or indirect light for a gentle glow"
    }
  };
}

async function generateGuidance(answers) {
  const system =
    "You are an interior art consultant. " +
    "Write neutral guidance without religious, astrological, or supernatural claims. " +
    "Do not guarantee outcomes. Avoid fear-based language. " +
    "Output JSON only.";

  const user = {
    purpose: answers.purpose,
    spaceType: answers.spaceType,
    wallSize: answers.wallSize,
    currentFeeling: answers.currentFeeling,
    desiredFeeling: answers.desiredFeeling,
    style: answers.style,
    colorTone: answers.colorTone,
    colorPreference: answers.colorPreference,
    symbolism: answers.symbolism
  };

  const prompt =
    "Create JSON with keys: guidance_text, placement_wall, placement_height, placement_lighting. " +
    "guidance_text: 3-5 short sentences explaining fit and support. " +
    "Use neutral language such as 'Designed to support' or 'Encourages a sense of'. " +
    "No deity names, no religion, no astrology, no vastu, no dosha. " +
    "User answers: " +
    JSON.stringify(user);

  const response = await openai.responses.create({
    model: process.env.TEXT_MODEL || "gpt-4.1-mini",
    input: [
      { role: "system", content: system },
      { role: "user", content: prompt }
    ]
  });

  const raw = response.output_text || "";
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return fallbackGuidance(answers);
  }

  return {
    text: sanitizeText(parsed.guidance_text || ""),
    placement: {
      wall: sanitizeText(parsed.placement_wall || ""),
      height: sanitizeText(parsed.placement_height || ""),
      lighting: sanitizeText(parsed.placement_lighting || "")
    }
  };
}

async function generateImages(prompt) {
  const response = await openai.images.generate({
    model: process.env.IMAGE_MODEL || "gpt-image-1",
    prompt,
    size: process.env.IMAGE_SIZE || "1024x1024",
    quality: process.env.IMAGE_QUALITY || "high",
    n: 3
  });

  return response.data.map((item, index) => ({
    id: index === 0 ? "primary" : `alt-${index}`,
    url: item.b64_json
      ? `data:image/png;base64,${item.b64_json}`
      : item.url,
    title: index === 0 ? "Primary artwork" : `Alternate ${index}`
  }));
}

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/ai-consultation", async (req, res) => {
  try {
    const answers = req.body.answers || {};
    const prompt = buildPrompt(answers);

    const [guidance, artworks] = await Promise.all([
      generateGuidance(answers),
      generateImages(prompt)
    ]);

    const result = {
      id: `consult-${Date.now()}`,
      guidance,
      prompt,
      artworks
    };

    writeConsultation({
      ...result,
      createdAt: new Date().toISOString(),
      meta: req.body.meta || {}
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: "Failed to generate consultation",
      details: err.message
    });
  }
});

app.listen(port, () => {
  console.log(`AI consultation server running on port ${port}`);
});
