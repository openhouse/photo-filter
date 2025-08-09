import { execFileSync } from "child_process";
import path from "path";

describe("build_filename_index Python helpers", () => {
  test("render_key fallback and quality tiebreaker", () => {
    const script = path.join(process.cwd(), "scripts", "tests", "build_filename_index_test.py");
    execFileSync("python3", [script], { stdio: "inherit" });
  });
});
