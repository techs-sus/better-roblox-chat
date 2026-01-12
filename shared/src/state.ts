import { signal } from "@rbxts/charm";
import { Message } from "./types";

const [getMessages, setMessages] = signal<Message[]>([]);

export const getters = {
	messages: getMessages,
};

export const setters = {
	messages: setMessages,
};
