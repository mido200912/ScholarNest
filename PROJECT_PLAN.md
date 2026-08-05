# ScholarNest - Project Plan & Checklist

هذا الملف يحتوي على الخطة الكاملة للمشروع وسيكون المرجع الحي لمتابعة المهام المنجزة.

## 🚀 Phase 1: Project Setup & Foundation
- [ ] إنشاء هيكل المشروع الأساسي.
- [ ] إنشاء وتجهيز `backend` (Node.js, Express, TypeScript).
- [ ] إنشاء وتجهيز `frontend` (React, Vite, TypeScript, Tailwind CSS).
- [ ] تثبيت وتجهيز Shadcn/ui في الواجهة الأمامية.
- [ ] إعداد `i18next` لدعم اللغتين العربية والإنجليزية.
- [ ] إعداد Dark/Light Mode.

## 💾 Phase 2: Backend & Database Integration
- [ ] إعداد اتصال MongoDB Atlas.
- [ ] بناء قاعدة البيانات و Mongoose Models (User, Scholarship).
- [ ] إعداد الحماية الأساسية للباك إند (Helmet, CORS, Rate Limiter).
- [ ] إعداد Zod Schemas للتحقق من البيانات.

## 🔐 Phase 3: Authentication & Security
- [ ] بناء نظام تسجيل الدخول والتسجيل في الباك إند (JWT + bcrypt).
- [ ] بناء صفحات Auth في الفرونت إند بتصميم احترافي.
- [ ] ربط الفرونت إند بنظام المصادقة وحماية الـ Routes.

## 🔎 Phase 4: Core Features (Scholarships & Search)
- [ ] إنشاء سكريبت `seed.ts` لتوليد 50 منحة في ملف `scholarships.json` وحفظها في قاعدة البيانات.
- [ ] بناء APIs الخاصة بجلب والبحث عن المنح (مع فلاتر متعددة).
- [ ] بناء واجهة البحث المتقدمة (Filters, Tags, Text Search).
- [ ] بناء صفحة تفاصيل المنحة الفردية.

## ✨ Phase 5: The "Legendary" Landing Page
- [ ] بناء Hero Section مبهر بتدرجات ألوان فخمة وأنيميشن (Framer Motion).
- [ ] قسم الإحصائيات (Live Stats).
- [ ] قسم "كيف يعمل الموقع" (How it Works).
- [ ] تصميم متجاوب (Mobile Responsive 100%).

## 🤖 Phase 6: AI Assistant & Dashboards
- [x] ربط Groq API في الباك إند مع Function Calling للبحث في المنح.
- [x] بناء واجهة المساعد الذكي العائمة في الفرونت إند.
- [x] بناء لوحة تحكم المستخدم (حفظ المنح والمفضلة).
- [x] بناء لوحة تحكم الأدمن (إضافة/تعديل المنح).

## 🏆 Phase 7: Polish & Production
- [x] تحسين الأداء وإضافة Skeleton Loaders.
- [x] التأكد من نظافة الكود (Clean Code).
- [x] إعداد تعليمات الرفع للإنتاج (Deployment).

---

## 🚀 تعليمات الرفع لبيئة الإنتاج (Deployment Instructions)

المشروع مصمم ليعمل مجاناً بنسبة 100%:

### 1. استضافة قاعدة البيانات (MongoDB Atlas)
- قم بإنشاء حساب في MongoDB Atlas.
- أنشئ Cluster مجاني (M0 Sandbox).
- خذ رابط الاتصال (Connection String) وضعه في `MONGODB_URI` الخاص بالـ Backend.

### 2. استضافة الواجهة الخلفية (Backend) - Render أو Railway
- يمكنك استخدام **Render.com** أو **Railway.app** مجاناً.
- قم بربط مستودع GitHub الخاص بك الذي يحتوي على المجلد `backend`.
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- تأكد من إضافة جميع المتغيرات البيئية (`.env`):
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `GROQ_API_KEY`
  - `OPENROUTER_API_KEY`
  - `PORT=5000`

### 3. استضافة الواجهة الأمامية (Frontend) - Vercel أو Netlify
- قم بربط مجلد `frontend` بـ **Vercel** مجاناً.
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- سيتم الرفع تلقائياً وتوفير رابط دائم (مثال: `scholarnest.vercel.app`).
- تذكر تغيير رابط الـ API في الفرونت إند ليشير إلى رابط سيرفر الـ Render/Railway بدلاً من `localhost`.
