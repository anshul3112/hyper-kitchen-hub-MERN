# Hyper Kitchen Hub

Hyper Kitchen Hub is a MERN (MongoDB, Express, React, Node.js) stack application designed to manage kitchen operations efficiently. This project is divided into two main parts:

- **Client**: The frontend built with React and TypeScript.
- **Server**: The backend built with Node.js and Express.

## Prerequisites

Before starting, ensure you have the following installed on your system:

- Node.js (v16 or higher)
- npm (Node Package Manager)
- MongoDB (running locally or a connection URI)

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd Hyper-Kitchen-Hub-mern
   ```

2. Install dependencies for both the client and server:
   ```bash
   cd client
   npm install
   cd ../server
   npm install
   ```

## Environment Setup

1. Create environment files for the server and client:
   - **Server**: Create a `.env` file in the `server` directory with the following variables:
     ```env
     MONGO_URI=<your-mongodb-uri>
     PORT=8000
     ACCESS_TOKEN_SECRET=<your-token-secret>
     ACCESS_TOKEN_EXPIRY=1d
     KIOSK_TOKEN_SECRET=<your-kiosk-secret>
     KIOSK_TOKEN_EXPIRY=30d
     ```

- **Client**: Create a `.env` file in the `client` directory with the following variables:
  ```env
  VITE_API_BASE_URL=http://localhost:8000
  ```

## Running the Application

1. Start the server:

   ```bash
   cd server
   npm start
   ```

2. Start the client:

   ```bash
   cd client
   npm run dev
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

## Project Structure

### Client

- **src**: Contains the React application code.
  - `features`: Feature-specific modules (e.g., auth, kiosk, outlet).
  - `common`: Shared components, utilities, and types.

### Server

- **src**: Contains the backend application code.
  - `users`, `items`, `outlet`, `tenant`: Feature-specific modules.
  - `utils`: Shared utilities.

## Scripts

### Client

- `npm run dev`: Start the development server.
- `npm run build`: Build the application for production.

### Server

- `npm start`: Start the server.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

---

Happy coding!
