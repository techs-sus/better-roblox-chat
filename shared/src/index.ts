import Vide from "@rbxts/vide";

export type ClientArguments = {
	remote: RemoteEvent;

	networkKey: string;
};

const Debris = game.GetService("Debris");

export const destroyInstance = (value: Instance) => {
	if (!pcall(() => value.Destroy())[0]) {
		if (!pcall(() => Debris.AddItem(value, 0))[0]) {
			// give up
		}
	}
};

export const cleanup = (value: unknown) => {
	return Vide.cleanup(() => {
		if (typeIs(value, "Instance")) {
			destroyInstance(value);
		} else if (typeIs(value, "RBXScriptConnection")) {
			pcall(() => value.Disconnect());
		} else if (typeIs(value, "thread")) {
			pcall(task.cancel, value);
		} else if (typeIs(value, "function")) {
			value();
		} else {
			error("failed to cleanup object");
		}
	});
};

export * as State from "./state";
export * from "./types";
