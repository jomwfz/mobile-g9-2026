const darkTheme = {
  background: '#151624', // สีกรมท่าเข้มสุด (Deep Navy)
  card: '#222436',       // สีการ์ด
  cardLight: '#2D3047',  // สีช่องค้นหา/ปุ่มรอง
  primary: '#5D6BFA',    // สีฟ้าอมม่วง (ดูดจากเรฟ)
  secondary: '#FFFFFF',  // สีแอคเซนต์รอง (ขาว)
  text: '#FFFFFF',       // ตัวหนังสือสีขาว
  textDim: '#8A8D9F',    // ตัวหนังสือสีเทา
  danger: '#FF4B4B',
  success: '#00E676',
};

const lightTheme = {
  background: '#F4F5F9', // สีพื้นหลังขาวอมฟ้า/เทา ดูสบายตา
  card: '#FFFFFF',       // การ์ดสีขาวล้วนให้ดูลอยเด่น
  cardLight: '#E8EAF6',  // สีฟ้าอ่อนๆ สำหรับช่อง Input / ปุ่มรอง
  primary: '#5D6BFA',    // สีฟ้าอมม่วงตัวเอกของเรา
  secondary: '#151624',  // สีแอคเซนต์รอง (ใช้สีกรมท่าเข้มตัดกับพื้นขาว)
  text: '#151624',       // ตัวหนังสือหลักต้องเป็นสีเข้ม
  textDim: '#70748B',    // ตัวหนังสือสีเทาที่เข้มขึ้นมาหน่อยให้อ่านง่าย
  danger: '#FF3B3B',
  success: '#00C853',
};

// ==========================================
// 💡 สวิตช์สลับธีม
// ==========================================
// -  true - Dark Mode
// -  false - Light Mode
export const isDarkMode = true; 

export const COLORS = isDarkMode ? darkTheme : lightTheme;