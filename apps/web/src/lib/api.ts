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

  return body;
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

  return body;
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

  return body;
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

  return body;
}

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = localStorage.getItem('token');

  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    const refreshTokenValue = localStorage.getItem('refresh_token');
    if (refreshTokenValue) {
      try {
        const refreshRes = await refreshToken(refreshTokenValue);
        localStorage.setItem('token', refreshRes.access_token);
        localStorage.setItem('refresh_token', refreshRes.refresh_token);

        headers.set('Authorization', `Bearer ${refreshRes.access_token}`);
        return fetch(url, { ...options, headers });
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Sesión expirada');
      }
    }
  }

  return res;
}
