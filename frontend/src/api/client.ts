import type { AuthResponse, RoomBrief, RoomDetail, User } from "../types";

const API_BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("token");
}

function setToken(token: string) {
  localStorage.setItem("token", token);
}

function clearToken() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...(options?.headers || {}) },
  });

  if (res.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || "Request failed");
  }

  return res.json();
}

// Auth
export async function register(
  username: string,
  password: string,
  nickname?: string
): Promise<AuthResponse> {
  const data = await request<AuthResponse>("/register", {
    method: "POST",
    body: JSON.stringify({ username, password, nickname }),
  });
  setToken(data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
  return data;
}

export async function login(
  username: string,
  password: string
): Promise<AuthResponse> {
  const data = await request<AuthResponse>("/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
  return data;
}

export function logout() {
  clearToken();
  window.location.href = "/login";
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

export async function getMe(): Promise<User> {
  return request<User>("/me");
}

// Rooms
export async function listRooms(name?: string): Promise<RoomBrief[]> {
  const params = name ? `?name=${encodeURIComponent(name)}` : "";
  return request<RoomBrief[]>(`/rooms${params}`);
}

export async function getRoom(id: string): Promise<RoomDetail> {
  return request<RoomDetail>(`/rooms/${id}`);
}

export async function createRoom(data: {
  name: string;
  max_players?: number;
  min_players?: number;
  ante?: number;
  allow_bot?: boolean;
  password?: string;
}): Promise<RoomBrief> {
  return request<RoomBrief>("/rooms", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// WebSocket URL
export function getWsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  const token = getToken();
  return `${proto}//${host}/ws?token=${token}`;
}
