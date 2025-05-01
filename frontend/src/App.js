import React, { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import "./App.css";

const App = () => {
  const [url, setUrl] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  const handleInputChange = (e) => {
    setUrl(e.target.value);
  };

  const handleClone = async () => {
    if (!url.trim() || !/^https?:\/\//i.test(url)) {
      setError("Please enter a valid URL starting with http:// or https://");
      return;
    }

    try {
      setIsDownloading(true);
      setError("");
      setProgress(0);

      const response = await axios.post("https://full-site-cloner.onrender.com/clone", { url });

      // Simulate progress
      for (let i = 1; i <= 100; i += 10) {
        setProgress(i);
        await new Promise((r) => setTimeout(r, 30));
      }

      const downloadLink = "https://full-site-cloner.onrender.com" + response.data.downloadLink;
      const a = document.createElement("a");
      a.href = downloadLink;
      a.download = "cloned.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Optional success message
      setTimeout(() => alert("✅ Website cloned successfully and download started!"), 500);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to clone the website. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="app-container">
      <motion.div
        className="card"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        <header className="card-header">
          <motion.img
            src="" // Replace with your logo/image
            alt="Logo"
            className="logo"
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5 }}
          />
          <h2>Website Cloner</h2>
          <p>Clone any website by simply entering its URL. Download the entire site as a ZIP file.</p>
        </header>

        <motion.input
          type="text"
          value={url}
          onChange={handleInputChange}
          placeholder="Enter Website URL"
          className="input-field"
          whileHover={{ scale: 1.05 }}
        />

        <motion.button
          onClick={handleClone}
          className="clone-button"
          disabled={isDownloading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isDownloading ? "Cloning..." : "Clone Website"}
        </motion.button>

        {error && <div className="error">{error}</div>}

        {isDownloading && (
          <motion.div
            className="progress-bar"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
          >
            <span className="progress-text">{progress}%</span>
          </motion.div>
        )}

        <footer className="card-footer">
          <div className="footer-item">
            <h3>HTML</h3>
            <img src="/html.png" alt="HTML" />
          </div>
          <div className="footer-item">
            <h3>CSS</h3>
            <img src="/cssjavascript.png" alt="CSS/JavaScript" />
          </div>
          <div className="footer-item">
            <h3>JS</h3>
            <img src="/js.png" alt="Fonts" />
          </div>
          <div className="footer-item">
            <h3>Images</h3>
            <img src="/images.png" alt="Images" />
          </div>
        </footer>

        <div className="education-note">
          <p>This project is for educational purposes only.</p>
        </div>
      </motion.div>
    </div>
  );
};

export default App;
