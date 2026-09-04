import "dotenv/config";
import { app } from "./app.js";

// Fail loudly and immediately if the session secret is missing, rather
// than starting up "successfully" and only discovering it the first time
// someone tries to sign up (which, worse, would leave a User row created
// with no session ever issued — see auth.js/routes/auth.js).
if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not set — refusing to start. Set it in the environment before running the server.");
  process.exit(1);
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
