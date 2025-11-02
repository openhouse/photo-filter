// backend/server.js

import dotenv from "dotenv";
import app from "./app.js";

dotenv.config({ override: true, quiet: true });

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
