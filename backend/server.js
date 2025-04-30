const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const archiver = require("archiver");
const fs = require("fs-extra");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 5000; // ⛔ Commented out local port, using hosted endpoint instead

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

    const handleAsset = async (tag, attr, folder) => {
      $(tag).each((_, el) => {
        const original = $(el).attr(attr);
        if (original && !original.startsWith("data:") && !original.startsWith("mailto:")) {
          const fileName = path.basename(original.split("?")[0]);
          const localPath = `${folder}/${fileName}`;
          const savePath = path.join(cloneDir, localPath);
          assetTasks.push(downloadResource(original, baseUrl, savePath));
          $(el).attr(attr, localPath);
        }
      });
    };

    await handleAsset("link[rel='stylesheet']", "href", "css");
    await handleAsset("script[src]", "src", "js");
    await handleAsset("img[src]", "src", "images");

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

    await Promise.all(assetTasks);

    const htmlPath = path.join(cloneDir, "index.html");
    await fs.writeFile(htmlPath, $.html(), "utf8");

    const zipPath = path.join(cloneDir, "cloned.zip");
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      return res.json({
        downloadLink: "/cloned/cloned.zip", // ✅ Updated URL
      });
    });

    archive.on("error", (err) => {
      throw err;
    });

    archive.pipe(output);
    archive.directory(cloneDir, false);
    await archive.finalize();

  } catch (error) {
    console.error("Cloning error:", error.message);
    return res.status(500).json({ error: "Failed to clone website." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://127.0.0.1:${PORT}`);
});
