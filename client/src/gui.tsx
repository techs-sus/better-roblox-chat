import Vide from "@rbxts/vide";
import { signal } from "@rbxts/charm";
import { useSignalState } from "@rbxts/vide-charm";
import { sendMessage } from "communication";
import { Message, State } from "@rbxts/shared";
import { addUsersToStore, getKnownUserStore } from "knownUserStore";

const Colors = {
	Rosewater: Color3.fromRGB(245, 224, 220),
	Flamingo: Color3.fromRGB(242, 205, 205),
	Pink: Color3.fromRGB(245, 194, 231),
	Mauve: Color3.fromRGB(203, 166, 247),
	Red: Color3.fromRGB(243, 139, 168),
	Maroon: Color3.fromRGB(235, 160, 172),
	Peach: Color3.fromRGB(250, 179, 135),
	Yellow: Color3.fromRGB(249, 226, 175),
	Green: Color3.fromRGB(166, 227, 161),
	Teal: Color3.fromRGB(148, 226, 213),
	Sky: Color3.fromRGB(137, 220, 235),
	Sapphire: Color3.fromRGB(116, 199, 236),
	Blue: Color3.fromRGB(137, 180, 250),
	Lavender: Color3.fromRGB(180, 190, 254),

	Text: Color3.fromRGB(205, 214, 244),
	Subtext1: Color3.fromRGB(186, 194, 222),
	Subtext0: Color3.fromRGB(166, 173, 200),

	Overlay2: Color3.fromRGB(108, 112, 134),
	Overlay1: Color3.fromRGB(88, 91, 112),
	Overlay0: Color3.fromRGB(69, 71, 90),

	Surface2: Color3.fromRGB(49, 50, 68),
	Surface1: Color3.fromRGB(30, 30, 46),
	Surface0: Color3.fromRGB(24, 24, 37),

	Base: Color3.fromRGB(17, 17, 27),
	Mantle: Color3.fromRGB(20, 20, 30),
	Crust: Color3.fromRGB(12, 12, 20),
};

// TODO: Implement text wrapping downward
// TODO: Make UICorner's more consistent
// TODO: Roblox does some black magic to get the Click mouse icon on their whole chat ui

const FONT = Font.fromEnum(Enum.Font.BuilderSans);

const UserInputService = game.GetService("UserInputService");

const filterRichText = <T extends (string | number)[]>(...args: T): T => {
	return args.map((value) => {
		if (typeIs(value, "number")) {
			return value; // number is always safe
		} else {
			return value
				.gsub("&", "&amp;")[0]
				.gsub("<", "&lt;")[0]
				.gsub('"', "&quot;")[0]
				.gsub("'", "&apos;")[0]
				.gsub(">", "&gt;")[0];
		}
	}) as T;
};

const NAME_COLORS = [
	new Color3(253 / 255, 41 / 255, 67 / 255), // new BrickColor("Bright red").Color,
	new Color3(1 / 255, 162 / 255, 255 / 255), // new BrickColor("Bright blue").Color,
	new Color3(2 / 255, 184 / 255, 87 / 255), // new BrickColor("Earth green").Color,
	new BrickColor("Bright violet").Color,
	new BrickColor("Bright orange").Color,
	new BrickColor("Bright yellow").Color,
	new BrickColor("Light reddish violet").Color,
	new BrickColor("Brick yellow").Color,
] as const;

function GetNameValue(name: string) {
	let value = 0;
	for (let index = 1; index < name.size(); index++) {
		let cValue = string.byte(name.sub(index, index + 1))[0];
		let reverseIndex = name.size() - index - 1;

		if (name.size() % 2 === 1) {
			reverseIndex -= 1;
		}

		if (reverseIndex % 4 >= 2) {
			cValue = -cValue;
		}

		value += cValue;
	}

	return value;
}

function ComputeNameColor(name: string) {
	return NAME_COLORS[GetNameValue(name) % (NAME_COLORS.size() - 1)];
}

const ConsistentFrameCorner = () => <uicorner />;

const Message = ({ author, text, timestamp }: Message) => {
	const knownUserStoreSource = useSignalState(getKnownUserStore);

	// I am A loser
	addUsersToStore([author.userId]);

	return (
		<textlabel
			BackgroundTransparency={1}
			FontFace={FONT}
			TextColor3={Colors.Text}
			TextXAlignment={Enum.TextXAlignment.Left}
			TextYAlignment={Enum.TextYAlignment.Center}
			TextSize={18}
			AutomaticSize={Enum.AutomaticSize.XY}
			TextWrapped={true}
			BorderSizePixel={0}
			LayoutOrder={timestamp.UnixTimestampMillis}
			RichText={true}
			Text={Vide.derive(() => {
				const resolved = knownUserStoreSource().get(author.userId);
				const color = resolved === undefined ? "d27e00" : ComputeNameColor(resolved.username).ToHex();

				return `<font color='#${color}'>${resolved === undefined ? "@" + author.userId : resolved.displayName}:</font> ${filterRichText(text)[0]}`;
			})}
		/>
	);
};

const [getText, setText] = signal("");

export const App = () => {
	// eslint-disable-next-line prefer-const
	let submit: () => void;

	const textVideSource = useSignalState(getText);

	const textbox = (
		<textbox
			BackgroundColor3={Colors.Surface1}
			// borders don't work???
			// BorderMode={Enum.BorderMode.Outline}
			// BorderSizePixel={1}
			// BorderColor3={Colors.Green}
			TextXAlignment={Enum.TextXAlignment.Left}
			TextColor3={Colors.Text}
			TextSize={18}
			FontFace={FONT}
			ClearTextOnFocus={false}
			Size={UDim2.fromScale(0.95 - 0.05 - 0.0125, 0.1)}
			Position={UDim2.fromScale(0.05 / 2, 0.85 + 0.025)}
			PlaceholderText={"To chat click here or press ] key"}
			PlaceholderColor3={Colors.Subtext0}
			FocusLost={(enterPressed) => {
				// FIXME: If this requires security steal method from lsb v1 source
				if (enterPressed) submit();
			}}
			TextChanged={setText}
		>
			<uipadding PaddingLeft={new UDim(0.05, 0)} />
			<uicorner />
		</textbox>
	) as TextBox;

	submit = () => {
		if (textbox.Text === "") return;

		sendMessage(textbox.Text);
		textbox.Text = "";
	};

	Vide.cleanup(
		UserInputService.InputEnded.Connect((input, gpe) => {
			if (gpe) return;

			if (input.KeyCode === Enum.KeyCode.RightBracket) {
				textbox.CaptureFocus();
			}
		}),
	);

	const absoluteCanvasSize = Vide.source(Vector2.zero);
	const absoluteWindowSize = Vide.source(Vector2.zero);
	const canvasPosition = Vide.source(Vector2.zero);
	const BOTTOM_SCROLL_THRESHOLD = 10;

	const isNearBottom = Vide.derive(() => {
		const maxScroll = absoluteCanvasSize().Y - absoluteWindowSize().Y;

		return maxScroll <= 0 || canvasPosition().Y >= maxScroll - BOTTOM_SCROLL_THRESHOLD;
	});

	const scrollingFrame = (
		<scrollingframe
			BorderSizePixel={0}
			Size={UDim2.fromScale(0.95, 0.85 - 0.05 / 2)}
			Position={UDim2.fromScale(0.05 / 2, 0.05 / 2)}
			// BackgroundTransparency={0.95}
			BackgroundColor3={Colors.Surface1}
			ScrollBarImageColor3={Colors.Overlay1}
			HorizontalScrollBarInset={Enum.ScrollBarInset.Always}
			AutomaticCanvasSize={Enum.AutomaticSize.XY}
			AbsoluteCanvasSizeChanged={absoluteCanvasSize}
			CanvasPositionChanged={canvasPosition}
			AbsoluteWindowSizeChanged={absoluteWindowSize}
		>
			<Vide.For each={useSignalState(State.getters.messages)}>
				{(message: Message) => <Message {...message} />}
			</Vide.For>

			<uilistlayout
				FillDirection={Enum.FillDirection.Vertical}
				HorizontalAlignment={Enum.HorizontalAlignment.Left}
				SortOrder={Enum.SortOrder.LayoutOrder}
			/>
			<ConsistentFrameCorner />
		</scrollingframe>
	) as ScrollingFrame;

	// TODO: Fix autoscroll
	Vide.derive(() => {
		const canvasSize = absoluteCanvasSize();
		const windowSize = absoluteWindowSize();

		if (isNearBottom()) {
			const maxScroll = canvasSize.Y - windowSize.Y;
			scrollingFrame.CanvasPosition = new Vector2(0, math.max(0, maxScroll));
		}
	});

	return (
		<frame
			BorderSizePixel={0}
			BackgroundColor3={Colors.Surface0}
			Size={UDim2.fromScale(0.3, 0.3)}
			Position={UDim2.fromScale(1 - 0.3 - 0.0125, 0.025)}
		>
			{scrollingFrame}

			{textbox}

			<imagebutton
				BorderSizePixel={0}
				BackgroundColor3={Colors.Surface1}
				BackgroundTransparency={1}
				Image="rbxassetid://10734943902"
				ImageColor3={Vide.derive(() => (textVideSource().size() > 0 ? new Color3(1, 1, 1) : Colors.Surface2))}
				Position={UDim2.fromScale(0.95 - 0.025, 0.85 + 0.025)}
				Size={UDim2.fromScale(0.05, 0.1)}
				ScaleType={Enum.ScaleType.Fit}
				MouseButton1Click={submit}
			>
				{/* <uiaspectratioconstraint DominantAxis={Enum.DominantAxis.Height} /> */}
			</imagebutton>

			<ConsistentFrameCorner />
		</frame>
	);
};
