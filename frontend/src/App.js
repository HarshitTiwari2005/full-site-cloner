import React, { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import "./App.css"; // Import your custom CSS

const App = () => {
  const [url, setUrl] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  const handleInputChange = (e) => {
    setUrl(e.target.value);
  };

  const handleClone = async () => {
    // Validate URL
    if (!url.trim() || !/^https?:\/\//i.test(url)) {
      setError("Please enter a valid URL starting with http:// or https://");
      return;
    }

    try {
      setIsDownloading(true);
      setError("");
      setProgress(0);

      const response = await axios.post("http://localhost:5000/clone", { url });
      
      // Simulate progress animation
      for (let i = 1; i <= 100; i += 10) {
        setProgress(i);
        await new Promise((r) => setTimeout(r, 30));
      }

      // Trigger file download
      const downloadLink = response.data.downloadLink;
      const a = document.createElement("a");
      a.href = downloadLink;
      a.download = "cloned.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      setError("Failed to clone the website. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="app-container">
      <motion.div
        className="container"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="title">Website Cloner</h2>

        <input
          type="text"
          value={url}
          onChange={handleInputChange}
          placeholder="Enter Website URL (e.g. https://example.com)"
          className="input-field"
        />

        <button onClick={handleClone} className="clone-button" disabled={isDownloading}>
          {isDownloading ? "Cloning..." : "Clone Website"}
        </button>

        {error && <div className="error">{error}</div>}

        {isDownloading && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
            <span className="progress-text">{progress}%</span>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default App;
