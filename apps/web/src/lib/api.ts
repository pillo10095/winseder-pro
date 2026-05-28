export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: UserResponse;
}

export interface LoginResponse extends AuthResponse {}
export interface RegisterResponse extends AuthResponse {}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const body = await res.json();

  if (!res.ok) {
    throw new Error(body.message ?? 'Error al iniciar sesión');
  }

  return body.data as LoginResponse;
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<RegisterResponse> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  const body = await res.json();

  if (!res.ok) {
    throw new Error(body.message ?? 'Error al registrarse');
  }

  return body.data as RegisterResponse;
}

export async function refreshToken(refreshTokenValue: string): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshTokenValue }),
  });

  const body = await res.json();

  if (!res.ok) {
    throw new Error(body.message ?? 'Error al refrescar token');
  }

  return body.data as AuthResponse;
}

export async function logout(token: string): Promise<void> {
  const res = await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.message ?? 'Error al cerrar sesión');
  }
}

export async function getMe(token: string): Promise<UserResponse> {
  const res = await fetch(`${API_URL}/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const body = await res.json();

  if (!res.ok) {
    throw new Error(body.message ?? 'Error al obtener perfil');
  }

  return body.data as UserResponse;
}

/** Current auth token in memory (set on login, survives page nav) */
let _token: string | null = null;
let _refreshToken: string | null = null;

export function setAuthToken(token: string | null, refresh?: string | null) {
  _token = token;
  if (refresh !== undefined) _refreshToken = refresh;
}

export function getAuthToken(): string | null {
  return _token;
}

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = _token ?? localStorage.getItem('token');
  const refreshTok = _refreshToken ?? localStorage.getItem('refresh_token');

  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 && refreshTok) {
    try {
      const refreshRes = await refreshToken(refreshTok);
      _token = refreshRes.access_token;
      _refreshToken = refreshRes.refresh_token;
      localStorage.setItem('token', refreshRes.access_token);
      localStorage.setItem('refresh_token', refreshRes.refresh_token);

      headers.set('Authorization', `Bearer ${refreshRes.access_token}`);
      return fetch(url, { ...options, headers });
    } catch {
      _token = null;
      _refreshToken = null;
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      throw new Error('Sesión expirada');
    }
  }

  return res;
}
