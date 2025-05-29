import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Recreate __dirname behavior for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001; // Use environment variable for port or default to 3001

// Path to the directory containing client-side build artifacts
// Adjust if your build output directory is different.
// We configured Vite to output to 'dist/client', so server is two levels up from 'dist/client'.
const clientBuildPath = path.join(__dirname, '..', 'dist', 'client');

// Serve static files from the React build directory
app.use(express.static(clientBuildPath));

// API endpoint for health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'UP', message: 'Server is healthy' });
});

// The "catchall" handler: for any request that doesn't match one above,
// send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Serving static files from: ${clientBuildPath}`);
  console.log(`Access the app at http://localhost:${PORT}`);
});
