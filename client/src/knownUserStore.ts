import { signal } from "@rbxts/charm";
import { ResolvedAuthor } from "@rbxts/shared";

const [getKnownUserStore, setKnownUserStore] = signal(new Map<number, Omit<ResolvedAuthor, "userId">>());
export { getKnownUserStore };

const UserService = game.GetService("UserService");

// FIXME: Add a expiration cache. After 5 minutes, then call it again.
export const addUsersToStore = (ids: number[]) => {
	pcall(() => {
		const results = UserService.GetUserInfosByUserIdsAsync(ids);

		setKnownUserStore((state) => {
			state = table.clone(state);

			for (const info of results) {
				state.set(info.Id, {
					displayName: info.DisplayName,
					username: info.Username,
				});
			}

			return state;
		});
	});
};
