import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'
const client = axios.create({ baseURL: API_URL, headers: { Accept: 'application/json' } })

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('store-token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export async function api(path, options = {}) {
  try {
    const response = await client.request({ url: path, ...options })
    return response.status === 204 ? null : response.data
  } catch (error) {
    if (axios.isAxiosError(error) && !error.response) {
    throw new Error(`Can't reach the store API at ${API_URL}. Make sure the Laravel backend is running.`, { cause: error })
    }
    const payload = error.response?.data || {}
    const message = payload.message || Object.values(payload.errors || {}).flat()[0] || 'Something went wrong.'
    const requestError = new Error(message)
    requestError.status = error.response?.status
    requestError.errors = payload.errors || {}
    throw requestError
  }
}

export const json = (method, data) => ({ method, data })
