import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { configureAmplify } from "./lib/auth";

configureAmplify();

createRoot(document.getElementById("root")).render(<App />);
