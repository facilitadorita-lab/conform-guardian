import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import { getRouter } from "../src/router";
import "../src/styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("STAGING_ROOT_ELEMENT_NOT_FOUND");
}

const router = getRouter();

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
