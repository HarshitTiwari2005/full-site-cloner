const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const archiver = require("archiver");
const fs = require("fs-extra");
const path = require("path");
const cors = require("cors");
const { URL } = require("url");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use("/cloned", express.static(path.join(__dirname, "cloned")));

const visitedPages = new Set();

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

const sanitizeFileName = (urlPath) => {
  const cleanPath = urlPath.replace(/^\/+/, "").replace(/\/$/, "");
  return cleanPath === "" ? "index.html" : `${cleanPath}.html`;
};

const clonePage = async (pageUrl, baseCloneDir, baseUrl, depth = 0) => {
  if (visitedPages.has(pageUrl) || depth > 2) return;
  visitedPages.add(pageUrl);

  const response = await axios.get(pageUrl);
  const $ = cheerio.load(response.data);

  const pathname = new URL(pageUrl).pathname;
  const relativePath = sanitizeFileName(pathname);
  const pagePath = path.join(baseCloneDir, relativePath);
  await fs.ensureDir(path.dirname(pagePath));

  const assetTasks = [];

  const handleAsset = (tag, attr, folder) => {
    $(tag).each((_, el) => {
      const original = $(el).attr(attr);
      if (original && !original.startsWith("data:") && !original.startsWith("mailto:")) {
        const fileName = path.basename(original.split("?")[0]);
        const localPath = `${folder}/${fileName}`;
        const savePath = path.join(baseCloneDir, localPath);
        assetTasks.push(downloadResource(original, baseUrl, savePath));
        $(el).attr(attr, localPath);
      }
    });
  };

  // Handle CSS, JS, images
  handleAsset("link[rel='stylesheet']", "href", "css");
  handleAsset("script[src]", "src", "js");
  handleAsset("img[src]", "src", "images");
  handleAsset("source[srcset]", "srcset", "images");
  handleAsset("video[src]", "src", "videos");
  handleAsset("audio[src]", "src", "audios");
  handleAsset("iframe[src]", "src", "iframes"); // Optional: if you want to download embedded content

  // Inline styles with background images
  $("[style]").each((_, el) => {
    const style = $(el).attr("style");
    const match = /url\(['"]?(.*?)['"]?\)/.exec(style);
    if (match && match[1]) {
      const imgUrl = match[1];
      const fileName = path.basename(imgUrl.split("?")[0]);
      const localPath = `images/${fileName}`;
      const savePath = path.join(baseCloneDir, localPath);
      assetTasks.push(downloadResource(imgUrl, baseUrl, savePath));
      const newStyle = style.replace(imgUrl, localPath);
      $(el).attr("style", newStyle);
    }
  });

  // Internal links
  const links = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    try {
      const fullLink = new URL(href, baseUrl);
      if (fullLink.origin === baseUrl) {
        const relative = sanitizeFileName(fullLink.pathname);
        $(el).attr("href", relative);
        links.push(fullLink.href);
      }
    } catch (_) {}
  });

  await Promise.all(assetTasks);
  await fs.writeFile(pagePath, $.html(), "utf8");

  // Recursively process internal links
  for (const link of links) {
    await clonePage(link, baseCloneDir, baseUrl, depth + 1);
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
    visitedPages.clear();

    const baseUrl = new URL(url).origin;
    const siteName = new URL(url).hostname.replace(/\W+/g, "_");
    const siteDir = path.join(cloneDir, siteName);

    await fs.ensureDir(siteDir);
    await clonePage(url, siteDir, baseUrl);

    const zipPath = path.join(cloneDir, `${siteName}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      return res.json({ downloadLink: `/cloned/${siteName}.zip` });
    });

    archive.on("error", (err) => {
      console.error("🔥 Archive error:", err.message);
      throw err;
    });

    archive.pipe(output);
    archive.directory(siteDir, false);
    await archive.finalize();

  } catch (error) {
    console.error("🔥 Cloning error:", error.message);
    return res.status(500).json({ error: `Failed to clone website: ${error.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://127.0.0.1:${PORT}`);
});
