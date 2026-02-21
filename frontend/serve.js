const express = require('express');
const path = require('path');
const app = express();

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')));

// For SPA - serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
