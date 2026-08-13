export interface Document {
	id: string;
	title: string;
	content: string;
	version: number;
	created_at: string;
	updated_at: string;
}

export interface Database {
	id: string;
	name: string;
	created_at: string;
}

export interface Template {
	id: string;
	name: string;
	content: string;
	created_at: string;
}

export interface DatabaseRow {
	id: string;
	values: Record<string, any>;
	created_at?: string;
	updated_at?: string;
}
