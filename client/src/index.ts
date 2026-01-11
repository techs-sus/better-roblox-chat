/* don't die when the player respawns */
/* must be done before imports or bugs occur */
/* you should keep this */
const thread = coroutine.running();
task.defer(() => {
	getfenv(0).script.Destroy();
	(getfenv(0) as { script: LuaSourceContainer | undefined }).script = undefined;

	coroutine.resume(thread);
});
coroutine.yield();

import { ClientArguments, makeHello } from "@rbxts/shared";

declare const clientArguments: ClientArguments;
print(makeHello("client"));

export {};
