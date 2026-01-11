import { $, Glob } from "bun";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

// MARK: Constants
const ATTRIBUTE = "ClientLoaderSource";
const BUILD_DIRECTORY = "build";
const BUILD_LOCK_PATH = join(BUILD_DIRECTORY, "build.lock");
const CLIENT_PAYLOAD_HEADER =
	'local clientArguments = assert(({...})[1] or owner:FindFirstChild(owner:GetAttribute("getClientArgumentsName")), "failed getting remote function arguments"):InvokeServer()\n';

// See <https://github.com/techs-sus/azalea> for more details.
const AZALEA_FLAGS: string = "--minify --novel --level 22";

try {
	await mkdir(BUILD_DIRECTORY);
} catch (e) {}

// exists() is slow but i don't wanna handle the error
while (await Bun.file(BUILD_LOCK_PATH).exists()) {
	const pid = ~~(await Bun.file(BUILD_LOCK_PATH).text());
	try {
		process.kill(pid, 0);
	} catch (e) {
		await Bun.file(BUILD_LOCK_PATH).delete();
		break;
	}
	console.log(`Waiting for build lock to be released by ${pid}...`);
	await Bun.sleep(1000);
}

// MARK: Create build lock
await Bun.write(Bun.file(BUILD_LOCK_PATH), process.pid.toString());

// cleanup build directory
const glob = new Glob("build/*.{luau,rbxm,json}");
for await (const path of glob.scan()) {
	// do something
	await rm(path);
	console.log("rm", path);
}

const benchmark = async (fn: () => Promise<unknown>) => {
	const start = performance.now();
	await fn();
	return (performance.now() - start).toFixed(0);
};

const compile = async (rbxmPath: string, projectJsonPath: string, payloadOutPath: string) => {
	const rojoTime = await benchmark(async () => await $`rojo build -o ${rbxmPath} ${projectJsonPath}`.quiet());
	console.log(`Rojo took ${rojoTime} ms to process ${projectJsonPath}`);

	const azaleaTime = await benchmark(
		async () =>
			await $`azalea generate-full-script -i ${rbxmPath} -o ${payloadOutPath} ${{ raw: AZALEA_FLAGS }}`.quiet(),
	);
	console.log(`Azalea took ${azaleaTime} ms to generate ${payloadOutPath}`);
};

const mapBuildPathToServer = (p: string) => join("../server/", p);

// MARK: Compile client src
const clientPayloadOut = join(BUILD_DIRECTORY, "client.luau");
await compile(join(BUILD_DIRECTORY, "client.rbxm"), "client/default.project.json", clientPayloadOut);
const fullClientSource = CLIENT_PAYLOAD_HEADER + (await Bun.file(clientPayloadOut).text());

const serverProjectJson = await Bun.file("server/default.project.json").json();
serverProjectJson.globIgnorePaths = serverProjectJson.globIgnorePaths.map(mapBuildPathToServer);

// MARK: Patch paths

const recurseTree = (tree: { $path: string | undefined; [key: string]: unknown }) => {
	if (tree.$path !== undefined) tree.$path = mapBuildPathToServer(tree.$path);

	Object.keys(tree)
		.filter((key) => !key.startsWith("$") && typeof tree[key] === "object")
		.forEach((key) => recurseTree((tree as any)[key]));
};

recurseTree(serverProjectJson.tree);

// ensure that if there are other properties we don't delete them
serverProjectJson.tree.$properties ??= {};
serverProjectJson.tree.$properties.Attributes ??= {};

// MARK: Inject attribute
// inject client source as an attribute
// https://rojo.space/docs/v7/properties/#attributes & https://rojo.space/docs/v7/properties/#string
serverProjectJson.tree.$properties.Attributes[ATTRIBUTE] = {
	String: fullClientSource,
};

const time = await benchmark(async () => {
	// MARK: Compile server src
	const injectedServerProjectJsonPath = join(BUILD_DIRECTORY, "final.project.json");
	// write the modified project.json
	await Bun.write(Bun.file(injectedServerProjectJsonPath), JSON.stringify(serverProjectJson, undefined, 2));
	// then build the final payload
	await compile(join(BUILD_DIRECTORY, "final.rbxm"), injectedServerProjectJsonPath, join(BUILD_DIRECTORY, "run.luau"));
});

console.log(`Took ${time} ms to build ${BUILD_DIRECTORY}/run.luau`);

// MARK: Release build lock
await Bun.file(BUILD_LOCK_PATH).delete();
