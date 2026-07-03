import axios from 'axios'
import { auth } from './firebase'
import { installDemoAdapter } from './demo-api'

const DEMO = import.meta.env.VITE_DEMO_MODE === 'true'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000',
})

if (DEMO) {
  installDemoAdapter(api)
} else {
  api.interceptors.request.use(async (config) => {
    const user = auth.currentUser
    if (user) {
      const token = await user.getIdToken()
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })
}

export default api
