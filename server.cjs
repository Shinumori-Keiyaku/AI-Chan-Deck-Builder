var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var SHEET_ID = "1TDHBWj79saP6by70vFLPOMoUwoLMxdX19eYfD6eJXSY";
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  app.get("/api/sheet/updated", async (req, res) => {
    try {
      const apiKey = "AIzaSyBasQBsecNqcPTHe3OjmC6QP67EyWtl5Hg";
      if (!apiKey) {
        return res.status(500).json({ error: "GOOGLE_SHEETS_API_KEY is not set" });
      }
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/NewDataBase!P1?key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.error) {
        return res.status(400).json(data);
      }
      res.json({ updatedDate: data.values?.[0]?.[0] || "" });
    } catch (error) {
      console.error("Error fetching sheet date:", error);
      res.status(500).json({ error: "Failed to fetch updated date" });
    }
  });
  app.get("/api/sheet/data", async (req, res) => {
    try {
      const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GOOGLE_SHEETS_API_KEY is not set" });
      }
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/NewDataBase!N:P?key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.error) {
        return res.status(400).json(data);
      }
      res.json({ values: data.values || [] });
    } catch (error) {
      console.error("Error fetching sheet data:", error);
      res.status(500).json({ error: "Failed to fetch sheet data" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
