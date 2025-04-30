const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const archiver = require("archiver");
const fs = require("fs-extra");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 5000;

// Enable CORS
app.use(cors());

// Parse incoming JSON 
app.use(express.json());

// Serve static files from the "cloned" folder
app.use("/cloned", express.static(path.join(__dirname, "cloned")));

app.post("/clone", async (req, res) => {
  const { url } = req.body;

  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: "Valid URL is required." });
  }

  try {
    // Create fresh directory
    const cloneDir = path.join(__dirname, "cloned");
    await fs.emptyDir(cloneDir); // Clears the folder before every request

    // Fetch HTML from target URL
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Save HTML content to index.html
    const htmlFilePath = path.join(cloneDir, "index.html");
    await fs.writeFile(htmlFilePath, $.html(), "utf8");

    // Create ZIP
    const zipPath = path.join(cloneDir, "cloned.zip");
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      return res.json({ downloadLink: "http://localhost:5000/cloned/cloned.zip" });
    });

    archive.on("error", (err) => {
      throw err;
    });

    archive.pipe(output);
    archive.file(htmlFilePath, { name: "index.html" });
    await archive.finalize();

  } catch (error) {
    console.error("Cloning error:", error.message);
    return res.status(500).json({ error: "Failed to clone website." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://127.0.0.1:${PORT}`);
});
