import { Stack } from "expo-router";

export default function GameLayout() {
  return (
    <Stack>
      {/* ต้องใช้ชื่อ [id] ให้ตรงกับชื่อไฟล์ [id].js ที่มีอยู่ในโฟลเดอร์ */}
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
