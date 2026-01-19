import { Cleanup, effect, effectScope, onCleanup, signal } from "@rbxts/charm";

/**
 * Props values can be Charm getters, or simply plain constant values.
 */
type ApplyProps<T extends Instance> = Partial<{
	[key in Exclude<InstancePropertyNames<T>, "Parent">]: T[key] | (() => T[key]);
}>;

const TweenService = game.GetService("TweenService");
const INFINITE_TWEEN_INFO = new TweenInfo(0, Enum.EasingStyle.Linear, Enum.EasingDirection.In, -1, false);

const apply = <T extends Instance>(instance: T, props: ApplyProps<T>): Cleanup => {
	return effectScope(() => {
		const constants: Partial<ExtractMembers<T, Tweenable>> = {};

		for (const [key, value] of pairs(props)) {
			if (typeIs(value, "function")) {
				effect(() => {
					instance[key as keyof T] = value() as T[keyof T];
				});
			} else {
				if (
					typeIs(value, "number") ||
					typeIs(value, "boolean") ||
					typeIs(value, "CFrame") ||
					typeIs(value, "Rect") ||
					typeIs(value, "Color3") ||
					typeIs(value, "UDim") ||
					typeIs(value, "UDim2") ||
					typeIs(value, "Vector2") ||
					typeIs(value, "Vector2int16") ||
					typeIs(value, "Vector3")
				) {
					(constants as Record<keyof T, unknown>)[key as keyof T] = value as T[keyof T];
				} else {
					instance[key as keyof T] = value as T[keyof T];
				}
			}
		}

		const tween = TweenService.Create(instance, INFINITE_TWEEN_INFO, constants);
		tween.Play();

		onCleanup(() => tween.Destroy());
	}, true);
};

const RunService = game.GetService("RunService");

// The faster the better, Stepped causes flicker but PreRender doesn't
const HYPERNULL_MITIGATION_SIGNAL = RunService.IsClient() ? RunService.PreRender : RunService.Stepped;

/**
 * Creates a protected instance of a Roblox Instance that automatically recreates itself
 * when destroyed, whilst applying the specified properties.
 *
 * @template T - The type of the Roblox instance.
 * @param createTemplate - A function that creates and returns the template instance of type `T`.
 * @param props - A function that returns the properties to apply to the instance. The properties
 * can either be constant values or Charm getters.
 * @returns A function that retrieves the current instance of type `T`.
 *
 * @remarks
 * - The template instance must not have any descendants as Instance.fromExisting is used on it.
 * - The instance is protected by recreating itself when destroyed.
 * - Take special care to use the return value properly as it is a Charm getter.
 */
export const createProtected = <T extends Instance>(createTemplate: () => T, props: () => ApplyProps<T>): (() => T) => {
	const template = createTemplate();

	assert(template.GetDescendants().size() === 0, "template instance should have 0 descendants");

	const [getCurrent, setCurrent] = signal<T>(
		undefined as unknown as T,
	); /* we call recreate so that something exists, this shuts up typechecker */

	let destroying: RBXScriptConnection;
	let mitigationSignal: RBXScriptConnection;
	let destroyEffectScope: Cleanup;

	const cleanup = () => {
		destroyEffectScope?.();
		mitigationSignal?.Disconnect();
		destroying?.Disconnect();

		pcall(() => getCurrent()?.Destroy());
	};

	const recreate = () => {
		cleanup();

		const current = Instance.fromExisting(template);
		destroyEffectScope = apply(current, props());

		/* protect instance */
		destroying = current.Destroying.Once(recreate);
		mitigationSignal = HYPERNULL_MITIGATION_SIGNAL.Connect(() => {
			if (!destroying.Connected) recreate();
		});

		setCurrent(current);
	};

	recreate();

	onCleanup(cleanup);

	return getCurrent;
};

const Workspace = game.GetService("Workspace");

export const experiment = () => {
	effectScope(() => {
		const [getColor, setColor] = signal(new Color3(0, 0, 0));
		const [getPosition, setPosition] = signal(new Vector3(0, 3, 0));

		const root = createProtected(
			() => {
				return new Instance("Part");
			},

			() => {
				return {
					Position: getPosition,
					Anchored: true,
					Color: getColor,
					Material: Enum.Material.Neon,
					Size: Vector3.one.mul(1.5),
				};
			},
		);

		RunService.PreRender.Connect(() => {
			const time = os.clock();
			setColor(Color3.fromHSV((time % 30) / 30, 1, 1));
			setPosition(new Vector3(math.cos(time) * 8, 3, math.sin(time) * 8));
		});

		effect(() => {
			root().Parent = Workspace;
		});
	});
};
