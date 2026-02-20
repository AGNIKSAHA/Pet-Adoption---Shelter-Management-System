import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
export const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});
interface PromiseQueueItem {
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
}
let isRefreshing = false;
let failedQueue: PromiseQueueItem[] = [];
const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        }
        else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};
api.interceptors.response.use((response) => response, async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
            return new Promise(function (resolve, reject) {
                failedQueue.push({ resolve, reject });
            })
                .then(() => {
                return api(originalRequest);
            })
                .catch((err) => {
                return Promise.reject(err);
            });
        }
        originalRequest._retry = true;
        isRefreshing = true;
        try {
            await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
            processQueue(null);
            return api(originalRequest);
        }
        catch (refreshError) {
            processQueue(refreshError, null);
            return Promise.reject(refreshError);
        }
        finally {
            isRefreshing = false;
        }
    }
    return Promise.reject(error);
});
export default api;
