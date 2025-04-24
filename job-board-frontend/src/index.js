import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import Web3 from "web3";

// Create Web3 context
const Web3Context = React.createContext(null);

// Initialize Web3 (you might want to make this more dynamic based on user connection)
let web3;
if (window.ethereum) {
  web3 = new Web3(window.ethereum);
} else if (window.web3) {
  web3 = new Web3(window.web3.currentProvider);
} else {
  console.warn("No Web3 provider detected. Falling back to localhost.");
  web3 = new Web3("http://localhost:7545"); // or your fallback provider
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root element not found");

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Web3Context.Provider value={web3}>
      <App />
    </Web3Context.Provider>
  </React.StrictMode>
);

// Optional: Export the context for easy import in other files
export { Web3Context };