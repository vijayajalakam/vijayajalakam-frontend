import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Provider } from "react-redux";
import { store } from "./store/store";
import "./index.css";
import App from "./App.jsx";
import { Toaster } from "react-hot-toast";

// Google Translate Crash Fix
// This prevents React from crashing when Google Translate modifies the DOM text nodes
if (typeof Node === "function" && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child.parentNode !== this) {
      if (console) {
        console.warn(
          "Cannot remove a child from a different parent",
          child,
          this,
        );
      }
      return child;
    }
    return originalRemoveChild.apply(this, arguments);
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (console) {
        console.warn(
          "Cannot insert before a reference node from a different parent",
          referenceNode,
          this,
        );
      }
      return newNode;
    }
    return originalInsertBefore.apply(this, arguments);
  };
}


console.log(import.meta.env.VITE_GOOGLE_CLIENT_ID, "this is tghe id")
createRoot(document.getElementById("root")).render(
  <StrictMode>
        <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: '#333',
          color: '#fff',
        },
      }}
    />

    <Provider store={store}>
      <GoogleOAuthProvider 
      clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
      >
        <App />
      </GoogleOAuthProvider>
    </Provider>
  </StrictMode>,
);
