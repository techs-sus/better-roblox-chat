import { ClientArguments } from "@rbxts/shared";

declare const NLS: (source: string, parent: Instance | undefined, ...arguments: unknown[]) => LuaSourceContainer;

const CLIENT_SOURCE = script.Parent!.GetAttribute("ClientLoaderSource") as string;
script.SetAttribute("ClientLoaderSource", undefined);

const HttpService = game.GetService("HttpService");

/**
 Running code on the client is possible, but please note:
 - script = ModuleScript and the hierarchy looks like this: nil -> Model [name = "DataModel"] -> ModuleScript
 - Functions from your environment that create scripts will not work (NewScript, NewLocalScript, NewModuleScript)
 - Network serializable arguments can be passed in the form of an environment variable.
**/
export const loadClientCode = (player: Player, clientArguments: ClientArguments) => {
	return new Promise<LuaSourceContainer>((resolve) => {
		const name = HttpService.GenerateGUID(true);

		const fn: RemoteFunction<() => ClientArguments> = new Instance("RemoteFunction");
		fn.Name = name;
		let localScript: LuaSourceContainer;
		fn.OnServerInvoke = (invoker) => {
			if (invoker !== player) return undefined;

			fn.OnServerInvoke = () => {};
			player.SetAttribute("getClientArgumentsName", undefined);

			task.delay(0.25, () => fn.Destroy());
			task.defer(resolve, localScript);

			return clientArguments;
		};

		fn.Parent = player;

		player.SetAttribute("getClientArgumentsName", name);
		localScript = NLS(
			CLIENT_SOURCE,
			player.FindFirstChildOfClass("PlayerGui") ?? player.FindFirstChildOfClass("Backpack"),
			fn,
		);
	});
};
