export type ApiSuccess<T> = { status: "ok"; data: T };
export type ApiError = {
  status: "error";
  error: { code: string; message: string };
};

async function parse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    // Try to extract the error message from the backend
    const text = await response.text().catch(() => "");
    try {
      const payload = JSON.parse(text) as ApiSuccess<T> | ApiError;
      const message = payload.status === "error" ? payload.error.message : `Request failed (${response.status}).`;
      throw new Error(message);
    } catch (err) {
      if (err instanceof Error && err.message !== `Request failed (${response.status}).`) throw err;
      throw new Error(
        text || `Server returned ${response.status} ${response.statusText || "Error"}.`,
      );
    }
  }

  const text = await response.text().catch(() => "");
  if (!text) {
    throw new Error("Server returned an empty response.");
  }

  const payload = JSON.parse(text) as ApiSuccess<T> | ApiError;
  if (payload.status !== "ok") {
    throw new Error(payload.status === "error" ? payload.error.message : "Request failed.");
  }
  return payload.data;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(path, {
    credentials: "include",
    ...init,
    headers,
  });
  return parse<T>(response);
}

export const api = {
  get: <T,>(path: string) => request<T>(path),
  post: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) }),
  delete: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: "DELETE", body: body === undefined ? undefined : JSON.stringify(body) }),
  upload: <T,>(path: string, file: File) => {
    const body = new FormData();
    body.append("file", file);
    return request<T>(path, { method: "POST", body });
  },
};
