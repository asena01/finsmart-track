// index.js
import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import app from "./server.js"; // note the .js extension

// Optional: limit max instances
setGlobalOptions({ maxInstances: 10 });

// Export HTTP function
export const api = onRequest(app);