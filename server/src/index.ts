import { loadClientCode } from "./utils";
import { makeHello, ClientArguments } from "@rbxts/shared";

declare const owner: Player;
loadClientCode(owner, {});

print(makeHello("server"));

export {};
