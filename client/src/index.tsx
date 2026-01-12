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

import { cleanup, destroyInstance } from "@rbxts/shared";
import Vide from "@rbxts/vide";
import { App } from "gui";

if (!game.GetService("RunService").IsClient()) error("Client code should not be required from the server!");
export = undefined; /* can lead to cyclic dependency chains */

declare const owner: Player;

let destroyRoot: (() => void) | undefined = undefined;
let gui: ScreenGui | undefined = undefined;

const recreate = () => {
	destroyRoot?.();

	if (gui) destroyInstance(gui);

	gui = new Instance("ScreenGui");
	gui.DisplayOrder = math.huge;
	gui.ResetOnSpawn = false; /* ensure gui is not destroyed */
	gui.IgnoreGuiInset = true;
	gui.Parent = owner.FindFirstChildOfClass("PlayerGui");

	destroyRoot = Vide.mount(() => {
		cleanup(gui?.Destroying.Connect(recreate));
		cleanup(gui?.AncestryChanged.Connect(recreate));

		return <App />;
	}, gui);
};

recreate();

export {};
