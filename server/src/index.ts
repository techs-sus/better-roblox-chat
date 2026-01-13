import { t } from "@rbxts/t";
import { loadClientCode } from "./utils";
import { State as SharedState, Message } from "@rbxts/shared";
import { server as charmSyncServer } from "@rbxts/charm-sync";

// or we cause cyclic dependencies
export = undefined;

const remote = new Instance("RemoteEvent");

const addMessage = (message: Message) => {
	SharedState.setters.messages((state) => {
		state = table.clone(state);

		state.push(message);

		return state;
	});
};

// FIXME: Implement encrypted and secure networking

const onServerEvent = (player: Player, data: unknown) => {
	if (!t.string(data)) return;

	// TODO: Should we do timestamp compensation for high ping users (letting them decide when they sent the message)

	addMessage({
		author: { userId: player.UserId },
		text: data,
		timestamp: DateTime.now(),
	});
};

remote.OnServerEvent.Connect(onServerEvent);

const playerToKey = new Map<Player, string>();

const HttpService = game.GetService("HttpService");
const Players = game.GetService("Players");

const connectPlayer = (player: Player) => {
	const networkKey = HttpService.GenerateGUID();
	playerToKey.set(player, networkKey);

	loadClientCode(player, {
		remote,
		networkKey,
	}).then(() => charmSyncServer.addSignalsToClient(player, SharedState.getters));
};

const disconnectPlayer = (player: Player) => playerToKey.delete(player);

charmSyncServer.connect((player, payloads) => {
	const key = playerToKey.get(player);
	if (key === undefined) return;

	remote.FireClient(player, key, payloads);
});

declare const owner: Player;

// FIXME: Uncomment when this project is stable
// Players.PlayerAdded.Connect(connectPlayer);
Players.PlayerRemoving.Connect(disconnectPlayer);

remote.Parent = game.GetService("ReplicatedStorage");

connectPlayer(owner);

print("done executing");

export {};
