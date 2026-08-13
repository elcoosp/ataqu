/// <reference types="vite/client" />
declare module "*.css";
declare module "@xyflow/react/dist/style.css";
interface ImportMetaEnv {
	readonly VITE_API_BASE_URL?: string;
}
interface ImportMeta {
	readonly env: ImportMetaEnv;
}
