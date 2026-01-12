export type Author = {
	userId: number;
};

export type ResolvedAuthor = Author & {
	username: string;
	displayName: string;
};

export type Message = {
	author: Author;
	text: string;
	timestamp: DateTime;
};
