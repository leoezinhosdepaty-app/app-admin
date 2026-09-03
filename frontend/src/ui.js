export const NAVY = "#122A5C";
export const LIME = "#F0B429";
export const SAND = "#F4F2EC";
export const CLAY = "#D8683A";

export const API_URL = import.meta.env.VITE_API_URL;

export async function apiPublico(metodo, path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Erro ${res.status}`);
  return json;
}
