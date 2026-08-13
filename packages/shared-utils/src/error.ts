export const handleApiError = (error: unknown): string => {
	console.error("API Error:", error);
	return (error as any)?.message || "An unexpected error occurred.";
};
