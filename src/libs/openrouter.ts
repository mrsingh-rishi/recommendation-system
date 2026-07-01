import OpenAI from "openai";

const apiKey = process.env["OPENROUTER_API_KEY"];

if (!apiKey) {
  throw new Error("OPENROUTER_API_KEY is not set in environment variables");
}

export const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey,
});
