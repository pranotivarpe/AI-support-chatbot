// Loads .env.local for standalone scripts (Next.js does this automatically for the app).
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ quiet: true });
