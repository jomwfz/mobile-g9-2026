import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const supabaseUrl = "https://bkflnvkdgmkuljgztwwf.supabase.co"; // ใส่ URL ของคุณ
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZmxudmtkZ21rdWxqZ3p0d3dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMDA5MTcsImV4cCI6MjEwNTU3NjkxN30.J3crgvKusWn1V5AjWPxd9Jfc7eLaazIpT8CxbT-RZc4"; // ใส่ Anon Key ของคุณ

// สร้างตัวจัดเก็บข้อมูลแบบ Custom เพื่อดักจับ Error 'window is not defined' บน Web
const customStorage =
  Platform.OS === "web"
    ? {
        getItem: (key) => {
          if (typeof window !== "undefined") {
            return window.localStorage.getItem(key);
          }
          return null;
        },
        setItem: (key, value) => {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(key, value);
          }
        },
        removeItem: (key) => {
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(key);
          }
        },
      }
    : AsyncStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
