/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: "media",
	theme: {
		extend: {
			colors: {
				"deep-night": "#0A1628",
				amber: "#F59E0B",
				success: "#10B981",
				error: "#EF4444",
				warning: "#F59E0B",
			},
			fontFamily: {
				heading: ["Unbounded", "system-ui"],
				body: ["Inter", "system-ui"],
				mono: ["JetBrains Mono", "monospace"],
			},
			spacing: {
				4: "4px",
				8: "8px",
				16: "16px",
				24: "24px",
				32: "32px",
				48: "48px",
				64: "64px",
				96: "96px",
			},
			boxShadow: {
				glass: "0 4px 12px rgba(0,0,0,0.4)",
				modal: "0 8px 24px rgba(0,0,0,0.6)",
			},
		},
	},
	plugins: [],
};
