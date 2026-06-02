import OpenAI from "openai";
import fs from "fs";
import path from "path";

// Manually parse .env file
const envPath = path.resolve("C:/Users/DELL/Downloads/Side Project/banana-sheet-web-app/.env");
const envContent = fs.readFileSync(envPath, "utf-8");
let apiKey = "";

for (const line of envContent.split("\n")) {
  if (line.startsWith("OPENAI_API_KEY=")) {
    apiKey = line.split("OPENAI_API_KEY=")[1].trim();
    break;
  }
}

console.log("Using API Key:", apiKey ? `${apiKey.substring(0, 15)}...` : "None");

const openai = new OpenAI({ apiKey });

try {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: "Hi" }],
  });
  console.log("Success! Response:", response.choices[0].message.content);
} catch (error) {
  console.error("OpenAI call failed:", error.message);
}
