// API Client with automatic token header and error handling

const API_BASE = '/api';

export function getStoredToken() {
  return localStorage.getItem('auth_token');
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

async function request(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && !endpoint.includes('/auth/login')) {
    setStoredToken(null);
    window.dispatchEvent(new CustomEvent('auth:expired'));
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMsg = data?.detail || data?.message || response.statusText || 'Request failed';
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  get: (endpoint, params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, val);
      }
    });
    const query = searchParams.toString();
    return request(`${endpoint}${query ? `?${query}` : ''}`, { method: 'GET' });
  },
  post: (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  del: (endpoint) => request(endpoint, { method: 'DELETE' }),
};

// Domain APIs
export const authApi = {
  login: (creds) => api.post('/auth/login', creds),
  logout: () => api.post('/auth/logout', {}),
  me: () => api.get('/auth/me'),
};

export const dashboardApi = {
  get: () => api.get('/dashboard'),
};

export const labsApi = {
  list: (params) => api.get('/labs', params),
  get: (id) => api.get(`/labs/${id}`),
  create: (data) => api.post('/labs', data),
  update: (id, data) => api.put(`/labs/${id}`, data),
  delete: (id) => api.del(`/labs/${id}`),
};

export const projectsApi = {
  list: (params) => api.get('/projects', params),
  get: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.del(`/projects/${id}`),
};

export const researchersApi = {
  list: (params) => api.get('/researchers', params),
  get: (id) => api.get(`/researchers/${id}`),
  create: (data) => api.post('/researchers', data),
  update: (id, data) => api.put(`/researchers/${id}`, data),
  delete: (id) => api.del(`/researchers/${id}`),
};

export const teamsApi = {
  list: (params) => api.get('/teams', params),
  get: (id) => api.get(`/teams/${id}`),
  create: (data) => api.post('/teams', data),
  update: (id, data) => api.put(`/teams/${id}`, data),
  delete: (id) => api.del(`/teams/${id}`),
};

export const fundingApi = {
  list: (params) => api.get('/funding', params),
  get: (id) => api.get(`/funding/${id}`),
  create: (data) => api.post('/funding', data),
  update: (id, data) => api.put(`/funding/${id}`, data),
  delete: (id) => api.del(`/funding/${id}`),
};

export const grantsApi = {
  list: (params) => api.get('/grants', params),
  get: (id) => api.get(`/grants/${id}`),
  create: (data) => api.post('/grants', data),
  update: (id, data) => api.put(`/grants/${id}`, data),
  delete: (id) => api.del(`/grants/${id}`),
};

export const equipmentApi = {
  list: (params) => api.get('/equipment', params),
  get: (id) => api.get(`/equipment/${id}`),
  create: (data) => api.post('/equipment', data),
  update: (id, data) => api.put(`/equipment/${id}`, data),
  delete: (id) => api.del(`/equipment/${id}`),
};

export const milestonesApi = {
  list: (params) => api.get('/milestones', params),
  get: (id) => api.get(`/milestones/${id}`),
  create: (data) => api.post('/milestones', data),
  update: (id, data) => api.put(`/milestones/${id}`, data),
  delete: (id) => api.del(`/milestones/${id}`),
};

export const usersApi = {
  list: (params) => api.get('/users', params),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.del(`/users/${id}`),
};
