import { client as charmSyncClient, SyncPayload } from "@rbxts/charm-sync";
import { ClientArguments, State } from "@rbxts/shared";

declare const clientArguments: ClientArguments;

print(clientArguments);

charmSyncClient.addSignals(State.setters);

const { remote, networkKey } = clientArguments;

remote.OnClientEvent.Connect((k: unknown, payloads: unknown) => {
	if (k !== networkKey) return;

	charmSyncClient.patch(payloads as SyncPayload[]);
});

export const sendMessage = (text: string) => remote.FireServer(text);
