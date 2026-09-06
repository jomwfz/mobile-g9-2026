# 📱 Mobile App Project (GAYM - Group 9)

โปรเจกต์วิชา Mobile Application พัฒนาด้วย **React Native + Expo**  
โครงสร้างโปรเจกต์ถูกดึงมาจาก Snack Expo และนำมาพัฒนาต่อบน VS Code / GitHub

---

## 👥 สมาชิกในกลุ่ม (Team Members)
* **ชื่อโปรเจกต์:** GAYM
* **ผู้จัดทำ:** Jimmy, Copter, Auto, Tatae (และสมาชิกในกลุ่ม 9)

---

## 🛠️ สิ่งที่ต้องติดตั้งล่วงหน้า (Prerequisites)
ก่อนเริ่มรันโปรเจกต์ ให้ทุกคนติดตั้งโปรแกรมเหล่านี้ให้เรียบร้อย:
1. **Node.js** (แนะนำเวอร์ชัน LTS): [ดาวน์โหลดที่นี่](https://nodejs.org/)
2. **Git**: [ดาวน์โหลดที่นี่](https://git-scm.com/)
3. **VS Code**: แนะนำให้เปิดโปรเจกต์และทำงานผ่าน VS Code
4. **Expo Go (บนมือถือ)**:
   * [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   * [Android Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

---

## 🚀 ขั้นตอนการติดตั้งและรันครั้งแรก (สำหรับเพื่อนในกลุ่ม)

### 1. โคลนโปรเจกต์ลงเครื่อง
เปิด Terminal / Command Prompt หรือ Terminal ใน VS Code แล้วพิมพ์:
```bash
git clone https://github.com/jomwfz/mobile-g9-2026.git
cd mobile-g9-2026
```

### 2. ติดตั้ง Dependencies (แพ็กเกจต่างๆ)
> ⚠️ **ข้อสำคัญ:** เนื่องจากใน GitHub จะไม่มีโฟลเดอร์ `node_modules` ทุกคนต้องติดตั้งก่อนเสมอ:
```bash
npm install
```

### 3. รันโปรเจกต์ (Start Expo)
```bash
npx expo start
```
หรือหากต้องการเคลียร์แคช:
```bash
npx expo start -c
```

### 4. เปิดดูแอปพลิเคชัน
* **ผ่านมือถือจริง:** เปิดแอป **Expo Go** บนมือถือ แล้วสแกน QR Code ที่แสดงขึ้นมาใน Terminal (ต้องเชื่อมต่อ Wi-Fi วงเดียวกันกับคอมพิวเตอร์)
* **กด `w`**: เพื่อเปิดพรีวิวบน Web Browser
* **กด `a`**: สำหรับเปิด Android Emulator (หากตั้งค่าไว้)
* **กด `i`**: สำหรับเปิด iOS Simulator (สำหรับเครื่อง Mac)

---

## 🔄 Workflow การทำงานและอัปเดตโค้ดร่วมกัน (Git Guide)

### 📥 1. ดึงโค้ดล่าสุดจากเพื่อนก่อนเริ่มทำงานเสมอ
ทุกครั้งที่จะเริ่มเขียนโค้ดใหม่ ให้ pull เวอร์ชันล่าสุดลงมาก่อน เพื่อป้องกัน code conflict:
```bash
git pull origin master
```

---

### 🌿 2. (แนะนำ) สร้าง Branch ของตัวเองในการทำงาน
เพื่อไม่ให้โค้ดชนกัน แนะนำให้แต่ละคนแยก branch ทำงานของตัวเอง:
```bash
# สร้างและสลับไปยัง branch ของตัวเอง เช่น feature-login
git checkout -b feature/<your-name-or-task>
```

---

### 📤 3. การบันทึกและส่งโค้ดขึ้น GitHub (Push Code)
เมื่อเขียนโค้ดหรือแก้ไขงานเสร็จแล้ว:

```bash
# ตรวจสอบไฟล์ที่มีการแก้ไข
git status

# เพิ่มไฟล์ทั้งหมดเข้า stage
git add .

# บันทึกประวัติการแก้ไข (เขียนอธิบายสั้นๆ ว่าทำอะไรไป)
git commit -m "feat: เพิ่มหน้ารายละเอียดและปรับแต่ง UI"

# ดึงโค้ดล่าสุดมาเช็คอีกรอบกันพลาด
git pull origin master

# อัปโหลดขึ้น GitHub
# หากทำบน master:
git push origin master

# หรือหากทำบน branch ตัวเอง:
git push origin feature/<your-name-or-task>
```
*(ถ้าสร้าง Branch เมื่อ push เสร็จแล้ว ให้ไปกด **Compare & pull request** บนหน้าเว็บ GitHub เพื่อให้เพื่อน/เจ้าของ repo ทำการ Merge เข้า `master`)*

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
mobile-g9-2026/
├── assets/          # ไฟล์รูปภาพ, ไอคอน และ static assets ต่างๆ
├── components/      # ชิ้นส่วน UI ย่อยที่นำมาใช้ซ้ำ (Buttons, Cards, Modals ฯลฯ)
├── screens/         # หน้าจอแต่ละหน้าของแอป (Home, Login, Profile ฯลฯ)
├── src/             # โค้ดหลัก, utilities, หรือ API functions
├── App.js           # Entry point หลักของแอป
├── app.json         # การตั้งค่า configuration ของ Expo
├── index.js         # Entry registration
├── mockData.js      # ข้อมูลจำลองสำหรับทดสอบ UI
├── theme.js         # กำหนดสี (Colors), ฟอนต์ และ Styles หลักของแอป
└── package.json     # รายการ dependencies และ scripts
```

---

## ⚠️ ปัญหาที่พบบ่อย (Troubleshooting)

1. **เปิดแอปแล้วขึ้นจอแดง Error เกี่ยวกับ Module Not Found**
   * แก้โดยลบโฟลเดอร์ `node_modules` และรัน `npm install` ใหม่อีกครั้ง
2. **สแกน QR Code บนมือถือแล้วไม่โหลด / Connection Refused**
   * เช็กว่ามือถือและคอมพิวเตอร์ต่อ Wi-Fi ตัวเดียวกันหรือไม่
   * หรือรันด้วยคำสั่ง Tunnel:
     ```bash
     npx expo start --tunnel
     ```
3. **เจอ Git Conflict (โค้ดชนกันเวลา pull)**
   * เปิด VS Code ไปที่ไฟล์ที่ชนกัน แล้วเลือก Accept Incoming Change หรือ Accept Current Change ตามความถูกต้อง จากนั้น commit และ push ใหม่อีกครั้ง
