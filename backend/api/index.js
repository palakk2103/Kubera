import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createApp } from "../index.js";
import { connectMongoDB } from "../app/core/startup.js";
import { assertAllModelsRegistered } from "../app/core/modelRegistry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Ensure process role defaults to "api" for serverless execution
if (!process.env.PROCESS_ROLE) {
  process.env.PROCESS_ROLE = "api";
}

let appPromise = null;

async function getApp() {
  if (!appPromise) {
    appPromise = (async () => {
      // Connect to MongoDB with connection reuse across warm invocations
      await connectMongoDB();
      
      // Ensure all Mongoose models are registered
      try {
        assertAllModelsRegistered();
      } catch (err) {
        console.warn("[Vercel Serverless] Model registry assertion warning:", err.message);
      }

      return createApp();
    })();
  }
  return appPromise;
}

export default async function handler(req, res) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (error) {
    console.error("[Vercel Serverless Error]", error);
    return res.status(500).json({
      success: false,
      error: true,
      message: "Internal Server Error in Serverless Handler",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}
