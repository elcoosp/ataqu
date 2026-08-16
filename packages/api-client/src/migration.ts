import type { UseMutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "./client";

export interface ParseRequest {
	file: string; // base64-encoded content
	format: "csv" | "json";
}

export interface ParseResponse {
	columns: string[];
	sample: Record<string, string>[];
}

export interface ImportRequest {
	target_app: "cinq" | "vault" | "pause";
	mapping: Record<string, string>; // source_column -> target_field
	data: Record<string, string>[];
}

export interface ImportResult {
	imported: number;
	failed: number;
}

export const parseMigrationFile = (data: ParseRequest) =>
	api.post<ParseResponse>("/migration/parse", data);

export const importMigrationData = (data: ImportRequest) =>
	api.post<ImportResult>("/migration/import", data);

export const useParseMigrationFile = (
	options?: UseMutationOptions<ParseResponse, Error, ParseRequest>,
) => useMutation({ mutationFn: parseMigrationFile, ...options });

export const useImportMigrationData = (
	options?: UseMutationOptions<ImportResult, Error, ImportRequest>,
) => useMutation({ mutationFn: importMigrationData, ...options });
