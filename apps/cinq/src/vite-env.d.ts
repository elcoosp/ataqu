/// <reference types="vite/client" />

// Allow importing CSS files as modules
declare module '*.css' {
  const content: string;
  export default content;
}

// Augment ImportMeta to include env (already provided by vite/client)
