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
    if (!url.trim() || !/^https?:\/\//i.test(url)) {
      setError("Please enter a valid URL starting with http:// or https://");
      return;
    }

    try {
      setIsDownloading(true);
      setError("");
      setProgress(0);

      // Directly using the backend URL in the axios call
      const response = await axios.post("https://full-site-cloner.onrender.com/clone", { url });
      
      // Simulate progress animation
      for (let i = 1; i <= 100; i += 10) {
        setProgress(i);
        await new Promise((r) => setTimeout(r, 30));
      }

      // Trigger file download
      const downloadLink = 'https://full-site-cloner.onrender.com'+response.data.downloadLink;
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
        transition={{ duration: 0.6 }}
      >
        <h2 className="title">Website Cloner</h2>

        <motion.input
          type="text"
          value={url}
          onChange={handleInputChange}
          placeholder="Enter Website URL (e.g. https://example.com)"
          className="input-field"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4 }}
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
          <motion.div className="progress-bar" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }}>
            <div className="progress-fill" style={{ width: `${progress}%` }} />
            <span className="progress-text">{progress}%</span>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default App;
