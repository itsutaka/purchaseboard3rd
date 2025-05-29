# Purchase Board Application

This project is a Purchase Request Board application built with React (using Vite) for the client-side and a Node.js (Express) server for serving the application.

## Project Structure

-   `/client`: Contains the React application source code (components, main entry point, styles).
-   `/server`: Contains the Node.js (Express) server code (`server.js`).
-   `/dist/client`: Default output directory for the React application build (generated after running the build script).
-   `index.html`: Main HTML entry point for the React application (located in project root).
-   `vite.config.js`: Configuration file for Vite.
-   `package.json`: Project metadata, dependencies, and scripts.
-   `README.md`: This file.

## Prerequisites

-   Node.js (version 18.0.0 or higher recommended, as per `package.json` engines)
-   npm (usually comes with Node.js)

## Setup

1.  **Clone the repository (if applicable)**
    ```bash
    # git clone <repository-url>
    # cd <project-directory>
    ```

2.  **Install dependencies:**
    This will install both client-side and server-side dependencies listed in `package.json`.
    ```bash
    npm install
    ```

## Available Scripts

### Development

To run both the React development server (with hot reloading for the client) and the Node.js server (with `nodemon` for automatic restarts) concurrently:

```bash
npm run dev
```

This command starts two servers:

1.  **React (Vite) Development Server:**
    *   Typically runs on `http://localhost:5173` (or the next available port).
    *   **This is the URL you should use in your browser to see the application and benefit from hot reloading during development.**

2.  **Node.js (Express) Server:**
    *   Typically runs on `http://localhost:3001` (or the port specified by `PORT` if set).
    *   This server is responsible for serving the application in production *after* it has been built.
    *   During development (`npm run dev`), if you access `http://localhost:3001/` directly, you might see an error (like "Cannot GET /" or a file not found error for `index.html`). This is because the `dist/client` directory (which this server serves from) is not created until you run `npm run build`.
    *   If your React application needs to make API calls to the Node.js backend (e.g., to `/api/health`), Vite is configured to proxy these requests from `http://localhost:5173` to `http://localhost:3001` (this proxy is currently a placeholder in `vite.config.js` and would need to be fully configured if API routes are added).

You can also run the client and server development processes separately:
-   **Client (React Vite dev server only):**
    ```bash
    npm run dev:client
    ```
    Access at `http://localhost:5173`.

-   **Server (Node.js with nodemon only):**
    ```bash
    npm run dev:server
    ```
    Runs on `http://localhost:3001`.

### Building for Production

To build the React application for production:

```bash
npm run build
```
This will create a `dist/client` directory with the optimized static assets.

### Running in Production Mode

After building the client application, to start the Node.js server to serve the built files:

```bash
npm start
```
The server will serve the application from `http://localhost:3001` (or the port specified by the `PORT` environment variable).

## Deployment

To deploy this application:

1.  Ensure your Node.js environment on the server has the required Node version.
2.  Push your code to the server.
3.  Install dependencies: `npm install --production` (or `npm install` if devDependencies are needed for the build step on the server).
4.  Build the React client: `npm run build`.
5.  Start the server: `npm start`.

You might need to configure a process manager (like PM2 or systemd) to keep the Node.js server running reliably in a production environment. You may also need to configure your server (e.g., Nginx, Apache) to proxy requests to the Node.js application, handle SSL, etc., depending on your setup.

## API Endpoints

-   `GET /api/health`: Returns a JSON object indicating the server's health status.
    Example: `{ "status": "UP", "message": "Server is healthy" }`
