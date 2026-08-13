import type React from "react";

export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	return (
		<div className="flex items-center justify-center min-h-screen bg-background">
			{children}
		</div>
	);
};
