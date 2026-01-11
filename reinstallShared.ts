import { $, CryptoHasher, Glob } from "bun";
import { rename } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import { join, normalize } from "node:path";

const BUILD_DIRECTORY = "build";

try {
	await mkdir(BUILD_DIRECTORY);
} catch (e) {}

try {
	await mkdir(join(BUILD_DIRECTORY, "shared"));
} catch (e) {}

const temporaryTarballName = new CryptoHasher("blake2b256")
	.update(crypto.getRandomValues(new Uint8Array(64)))
	.digest()
	.toHex();
const temporaryTarballPath = join(BUILD_DIRECTORY, "shared", temporaryTarballName + ".tgz");

await $`cd shared && bun pm pack --filename ${temporaryTarballPath}`.quiet();

// file name being hash tarball -> if nothing changes, no extra space is used
const finalTarballPath = join(
	BUILD_DIRECTORY,
	"shared",
	new CryptoHasher("blake2b256")
		.update(await Bun.file(temporaryTarballPath).arrayBuffer())
		.digest()
		.toHex() + ".tgz",
);

await rename(temporaryTarballPath, finalTarballPath);

const reinstallShared = async (realm: "server" | "client") => {
	await $`cd ${realm} && bun rm @rbxts/shared && bun add ../${finalTarballPath}`.quiet();
	console.log(`Reinstalled shared tarball for realm ${realm}`);
};

// await $`bun run --filter "./{server,client}" reinstallShared`;
await Promise.all([reinstallShared("server"), reinstallShared("client")]);

// delete old tarballs after replacing with new tarball
const glob = new Glob(`${BUILD_DIRECTORY}/shared/*.tgz`);
for await (const path of glob.scan()) {
	if (normalize(path) !== normalize(finalTarballPath)) {
		await Bun.file(path).delete();
	}
}

// await $`bun --filter "./{client,server}" build`; /* roblox-ts build */
// await $`bun run build.ts`;
