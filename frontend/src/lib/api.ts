export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}
let csrf: { token: string; headerName: string } | null = null;
export async function csrfToken() {
  if (!csrf) {
    const response = await fetch("/api/auth/csrf", {
      credentials: "same-origin",
    });
    if (!response.ok)
      throw new ApiError(
        "Não foi possível iniciar uma sessão segura.",
        response.status,
      );
    csrf = await response.json();
  }
  return csrf!;
}
export function resetCsrf() {
  csrf = null;
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const method = options.method ?? "GET";
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const token = await csrfToken();
    headers.set(token.headerName, token.token);
  }
  const response = await fetch(path, {
    ...options,
    headers,
    credentials: "same-origin",
  });
  if (!response.ok) {
    if (response.status === 403) resetCsrf();
    const error = await response
      .json()
      .catch(() => ({ message: "Não foi possível concluir a solicitação." }));
    throw new ApiError(
      error.message ?? "Não foi possível concluir a solicitação.",
      response.status,
      error.fields,
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
export async function uploadFile(
  path: string,
  file: File,
  progress: (value: number) => void,
): Promise<void> {
  const token = await csrfToken();
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", path);
    xhr.withCredentials = true;
    xhr.setRequestHeader(token.headerName, token.token);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        progress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => reject(new Error("Falha de conexão durante o upload."));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else {
        if (xhr.status === 403) resetCsrf();
        let message = "Falha no upload.";
        try {
          message = JSON.parse(xhr.responseText).message ?? message;
        } catch {
          /* response can be an upstream error */
        }
        reject(new ApiError(message, xhr.status));
      }
    };
    const data = new FormData();
    data.append("file", file);
    xhr.send(data);
  });
}
