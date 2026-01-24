// lib/secureFetch.ts
import { useAuthStore } from "@/store/useAuthStore";

export async function secureFetch(
  input: RequestInfo,
  init: RequestInit = {},
): Promise<Response> {
  const { accessToken, logout, refreshAccessToken } = useAuthStore.getState();

  const authHeaders = accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : {};

  let response = await fetch(input, {
    ...init,
    // headers: {
    //   ...init.headers,
    //   ...authHeaders,
    // },
    credentials: "include",
  });

  if (response.status !== 401) {
    return response;
  }

  // 🔁 Try refresh once
  try {
    const newAccessToken = await refreshAccessToken();

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
    logout(accessToken!);
    throw err;
  }
}
