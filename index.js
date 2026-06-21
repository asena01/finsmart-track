const path = require("node:path");
const { pathToFileURL } = require("node:url");

const backendDir = path.join(__dirname, "finsmart-track");
process.chdir(backendDir);

import(pathToFileURL(path.join(backendDir, "server.js")).href).catch((error) => {
  console.error(error);
  process.exit(1);
});
