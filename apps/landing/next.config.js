/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	experimental: {
		serverActions: {
			bodySizeLimit: "2mb",
		},
		swcPlugins: [["@lingui/swc-plugin", {}]],
		useTypeScriptCli: true,
	},
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "**",
			},
		],
	},
};

module.exports = nextConfig;
