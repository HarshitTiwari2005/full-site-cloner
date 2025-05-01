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

// Enable CORS for all domains or restrict to specific ones for production
app.use(cors({
  origin: "*", // Change this to specific frontend URL(s) in production
}));
app.use(express.json());
app.use("/cloned", express.static(path.join(__dirname, "cloned")));

const visitedPages = new Set();

// Download assets (CSS, JS, images, etc.)
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

// Recursive function to clone the webpage and its resources
const clonePage = async (pageUrl, baseCloneDir, baseUrl, depth = 0) => {
  if (visitedPages.has(pageUrl) || depth > 2) return; // Prevent infinite recursion and limit depth
  visitedPages.add(pageUrl);

  const response = await axios.get(pageUrl);
  const $ = cheerio.load(response.data);
  const relativePath = new URL(pageUrl).pathname === "/" ? "index.html" : `${new URL(pageUrl).pathname.replace(/^\/+/, "").replace(/\/$/, "") || "index"}.html`;
  const pagePath = path.join(baseCloneDir, relativePath);
  await fs.ensureDir(path.dirname(pagePath));

  const assetTasks = [];

  // Function to handle assets like CSS, JS, and images
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

  // Handle styles, scripts, and images
  await handleAsset("link[rel='stylesheet']", "href", "css");
  await handleAsset("script[src]", "src", "js");
  await handleAsset("img[src]", "src", "images");

  // Handling inline background images in CSS
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

  // Handle internal links and recurse
  const links = [];
  $("a[href]").each((_, el) => {
    const link = $(el).attr("href");
    try {
      const fullLink = new URL(link, baseUrl);
      if (fullLink.origin === baseUrl) {
        const pathname = fullLink.pathname.replace(/\/$/, "");
        const filename = pathname === "" || pathname === "/" ? "index.html" : `${pathname.replace(/^\/+/, "")}.html`;
        $(el).attr("href", filename);
        links.push(fullLink.href);
      }
    } catch (_) {}
  });

  await Promise.all(assetTasks);
  await fs.writeFile(pagePath, $.html(), "utf8");

  // Recurse for internal links
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
    await fs.emptyDir(cloneDir); // Clear the cloned folder before cloning new site
    visitedPages.clear();

    const baseUrl = new URL(url).origin;
    const siteName = new URL(url).hostname.split('.')[0]; // Extract site name from the URL
    const siteDir = path.join(cloneDir, siteName);

    await fs.ensureDir(siteDir);

    await clonePage(url, siteDir, baseUrl);

    // Create the zip archive
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
    console.error("Error stack:", error.stack);
    return res.status(500).json({ error: `Failed to clone website: ${error.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://127.0.0.1:${PORT}`);
});
