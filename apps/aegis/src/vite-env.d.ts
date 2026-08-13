/// <reference types="vite/client" />

declare module '*.css' {
  const content: string;
  export default content;
}

declare module 'qrcode.react' {
  const QRCode: any;
  export default QRCode;
}
