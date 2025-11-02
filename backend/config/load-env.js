import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envCandidates = [
  path.resolve(__dirname, "..", ".env"),
  path.resolve(__dirname, "..", "..", ".env"),
];

for (const envPath of envCandidates) {
  const result = dotenv.config({
    path: envPath,
    override: true,
    quiet: true,
  });
  if (!result.error) {
    break;
  }
}
