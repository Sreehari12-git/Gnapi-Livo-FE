import axios from "axios"

export const api = axios.create({
    baseURL: process.env.EXPO_BASE_URL
})

