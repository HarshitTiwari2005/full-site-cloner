const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const archiver = require("archiver");
const fs = require("fs-extra");
const path = require("path");
const cors = require("cors");
const { URL } = require("url");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use("/cloned", express.static(path.join(__dirname, "cloned")));

const downloadResource = async (resourceUrl, baseUrl, savePath) => {
  try {
    const fullUrl = new URL(resourceUrl, baseUrl).href;
    const response = await axios.get(fullUrl, { responseType: "arraybuffer" });
    await fs.outputFile(savePath, response.data);
    return true;
  } catch (error) {
    console.error(`❌ Failed to download ${resourceUrl}: ${error.message}`);
    return false;
  }
};

app.post("/clone", async (req, res) => {
  const { url } = req.body;

  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: "Valid URL is required." });
  }

  try {
    const cloneDir = path.join(__dirname, "cloned");
    await fs.emptyDir(cloneDir);

    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const baseUrl = new URL(url).origin;

    const assetTasks = [];

    // Helper to handle attributes like src or href
    const handleAsset = async (tag, attr, folder) => {
      $(tag).each((_, el) => {
        const original = $(el).attr(attr);
        if (original && !original.startsWith("data:") && !original.startsWith("mailto:")) {
          const fileName = path.basename(original.split("?")[0]); // Remove query string
          const localPath = `${folder}/${fileName}`;
          const savePath = path.join(cloneDir, localPath);
          assetTasks.push(downloadResource(original, baseUrl, savePath));
          $(el).attr(attr, localPath);
        }
      });
    };

    // Download and rewrite asset references
    await handleAsset("link[rel='stylesheet']", "href", "css");
    await handleAsset("script[src]", "src", "js");
    await handleAsset("img[src]", "src", "images");

    // Inline style background images
    $("[style]").each((_, el) => {
      const style = $(el).attr("style");
      const match = /url\(['"]?(.*?)['"]?\)/.exec(style);
      if (match && match[1]) {
        const imgUrl = match[1];
        const fileName = path.basename(imgUrl.split("?")[0]);
        const localPath = `images/${fileName}`;
        const savePath = path.join(cloneDir, localPath);
        assetTasks.push(downloadResource(imgUrl, baseUrl, savePath));
        const newStyle = style.replace(imgUrl, localPath);
        $(el).attr("style", newStyle);
      }
    });

    // Wait for all assets to be downloaded
    await Promise.all(assetTasks);

    // Save updated HTML
    const htmlPath = path.join(cloneDir, "index.html");
    await fs.writeFile(htmlPath, $.html(), "utf8");

    // Create ZIP archive
    const zipPath = path.join(cloneDir, "cloned.zip");
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      return res.json({ downloadLink: "http://localhost:5000/cloned/cloned.zip" });
    });

    archive.on("error", (err) => { throw err; });
    archive.pipe(output);
    archive.directory(cloneDir, false); // Add everything in cloned/
    await archive.finalize();

  } catch (error) {
    console.error("🔥 Cloning error:", error.message);
    return res.status(500).json({ error: "Failed to clone website." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://127.0.0.1:${PORT}`);
});
