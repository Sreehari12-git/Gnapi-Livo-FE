import axios from "axios"
import {EXPO_PUBLIC_BASE_URL} from "../../envdata"

export const api = axios.create({
    baseURL: EXPO_PUBLIC_BASE_URL
})

