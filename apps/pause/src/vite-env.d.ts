/// <reference types="vite/client" />

declare module '*.css';
declare module './routeTree.gen' {
  // biome-ignore lint/suspicious/noExplicitAny: route tree is generated
  export const routeTree: any;
}
