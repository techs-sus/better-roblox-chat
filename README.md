# roblox-ts-with-azalea

roblox-ts template using [azalea](https://github.com/techs-sus/azalea) for script builders

## Workflow

If you use [Visual Studio Code](https://code.visualstudio.com), a `code-workspace` file is provided at [`roblox-ts-with-azalea.code-workspace`](roblox-ts-with-azalea.code-workspace). It is recommended you use it to manage your stress from managing 50+ files at once.

A watcher is available with:

```bash
bun run watchAll
```

A traditional, non-incremental build is available with:

```bash
bun run build
```

Both commands output to the file `build/run.luau`.

You should see the file `build/run.luau` a bit after starting the watcher. By default, Azalea's novel module method is used, so it should run anywhere.

There is nothing theoretically stopping this template from working on Lua Sandbox, Lua Assembling, Void Script Builder, or any other script builder implementation. However, no other implementation runs Luau competently enough for this template to work, so OpenSB is probably your only option.

An [devtunnel](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/get-started?tabs=windows) dependant optional HTTP server is available with `bun run serve`. You should be able to easily swap out [devtunnel](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/get-started?tabs=windows) for {local,hyper}tunnel.

### Client execution

This template requires a client realm to function.

Depending on your target environment, you should modify `AZALEA_FLAGS` in [`buildFullModule.ts`](src/buildFullModule.ts) to tweak Azalea's output for compatability, code size, formatting, etc.

The function `loadClientCode` in [`server/src/utils.ts`](server/src/utils.ts) reveals how client execution is done.
