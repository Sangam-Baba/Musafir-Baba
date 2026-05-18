import { useAdminAuthStore } from "@/store/useAdminAuthStore";

export async function secureAdminFetch(
  input: RequestInfo,
  init: RequestInit = {},
): Promise<Response> {
  const { accessToken, logout, refreshAccessToken } = useAdminAuthStore.getState();

  let response = await fetch(input, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: "include",
  });

  if (response.status !== 401) {
    return response;
  }

  // 🔁 Try refresh once
  try {
    await refreshAccessToken();
    const newAccessToken = useAdminAuthStore.getState().accessToken;

    response = await fetch(input, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${newAccessToken}`,
      },
      credentials: "include",
    });

    return response;
  } catch (err) {
    if (accessToken) {
      logout(accessToken);
    }
    throw err;
  }
}
