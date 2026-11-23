import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true
});

export function getErrorMessage(error) {
  return error?.response?.data?.error?.message
    || error?.response?.data?.message
    || error?.message
    || "Something went wrong. Please try again.";
}
