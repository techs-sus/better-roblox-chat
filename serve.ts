import ora from "ora";

const TARGET_PORT = 3000;

const server = Bun.serve({
	port: TARGET_PORT,

	routes: {
		"/": async () => {
			return new Response(await Bun.file("./build/run.luau").bytes());
		},
	},
});

await Bun.$`devtunnel show -j`.quiet().then(async (initialHit) => {
	const id = initialHit.json().tunnel.tunnelId;

	// ensure TARGET_PORT is created

	const portSpinner = ora(`Ensuring port ${TARGET_PORT} is created...`).start();
	await Bun.$`devtunnel port create ${id} -p ${TARGET_PORT}`.quiet().nothrow();

	portSpinner.stopAndPersist({
		symbol: "✔",
		text: `Port ${TARGET_PORT} exists!`,
	});

	// spawn the host which forwards requests
	const pid = Bun.spawn(["devtunnel", "host", "--allow-anonymous", id]).pid;
	console.log(`Spawned tunnel with pid: ${pid}`);

	const tunnelStartSpinner = ora("Waiting for tunnel to start...").start();
	// look for url in json output
	let url = undefined;
	while (url === undefined) {
		const tunnel = await Bun.$`devtunnel show -j`.quiet().then((v) => v.json().tunnel);
		for (const port of tunnel.ports) {
			if (port.portNumber === TARGET_PORT && port.portUri) {
				url = port.portUri as string;
				break;
			}
		}
	}

	tunnelStartSpinner.stopAndPersist({
		symbol: "✔",
		text: `Got server url: ${url}`,
	});
});
