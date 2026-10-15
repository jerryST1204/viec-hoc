# Việc học của tôi

Ứng dụng quản lý công việc học tập với Next.js, Supabase Auth và PostgreSQL. Mã nguồn được lưu trong Git; dữ liệu công việc được lưu ở Supabase, không nằm trong GitHub.

## Tạo và cấu hình Supabase

1. Tạo một project Supabase từ Dashboard. Khi phát triển hoặc kiểm thử, ưu tiên project thử nghiệm riêng.
2. Mở **SQL Editor**, chạy nội dung tệp [`schema.sql`](./schema.sql). Tệp này tạo bảng `public.tasks`, chỉ mục và chính sách RLS để mỗi người dùng chỉ truy cập công việc của mình.
3. Trong **Project Settings → API Keys**, lấy Project URL và publishable key. Không dùng secret key hoặc `service_role` ở trình duyệt.
4. Trong **Authentication → Providers**, bật Email nếu cần. Tạo/xác nhận tài khoản thử nghiệm A trong Authentication; để chạy kiểm thử phân quyền, tạo thêm tài khoản thử nghiệm B. Không dùng tài khoản hoặc dữ liệu production cho bài kiểm thử.

Nếu `tasks` đã tồn tại, hãy kiểm tra schema và quyền trước khi chạy SQL. Các chính sách trong tệp giới hạn SELECT/INSERT/UPDATE/DELETE cho chủ sở hữu đã xác thực; API cũng xác minh bearer token.

## Cấu hình môi trường local

Sao chép tệp mẫu ở thư mục gốc và điền URL/key của Supabase:

```powershell
Copy-Item .env.example .env.local
```

`NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` là cấu hình public. `.env.local` và các tệp `.env*` khác bị Git bỏ qua; tuyệt đối không commit chúng hoặc đưa giá trị secret, service-role key hay database password vào biến `NEXT_PUBLIC_*`.

Để chạy kiểm thử Playwright có đăng nhập, thêm thông tin tài khoản A của **project thử nghiệm** trực tiếp vào `.env.local`:

```dotenv
TEST_EMAIL_A=
TEST_PASSWORD_A=
```

Các biến này chỉ dành cho máy local. Không thêm chúng vào GitHub, Vercel hay tệp `.env.example`.

Để chạy kiểm thử tích hợp API/RLS hai người dùng, tạo `.env.test.local` local-only:

```dotenv
TEST_USER_A_EMAIL=
TEST_USER_A_PASSWORD=
TEST_USER_B_EMAIL=
TEST_USER_B_PASSWORD=
TEST_BASE_URL=http://localhost:3000
```

Chỉ dùng hai tài khoản của project thử nghiệm. Script không dùng `service_role` và dọn các dòng test mà nó tạo.

## Cài đặt và chạy

Cần cài Node.js tương thích với Next.js hiện tại. Từ thư mục gốc:

```bash
npm ci
npm run dev
```

Mở [http://localhost:3000/login](http://localhost:3000/login) để đăng nhập hoặc đăng ký. Sau khi đăng nhập, trang công việc ở [http://localhost:3000/tasks](http://localhost:3000/tasks).

## Kiểm thử

Chạy kiểm tra kiểu và lint:

```bash
npx tsc --noEmit
npx eslint .
```

Chạy Playwright trên Chromium (dùng `TEST_EMAIL_A` và `TEST_PASSWORD_A` trong `.env.local`; tự khởi động/reuse dev server):

```bash
npx playwright install chromium
npx playwright test --project=chromium
npx playwright show-report
```

Chạy API/RLS integration test với cả A và B:

```bash
npm run test:task-security
```

Các kiểm thử integration ghi dữ liệu thử vào Supabase, nên chỉ chạy trên project thử nghiệm.

## Đưa mã nguồn lên GitHub và Vercel

Commit các tệp nguồn, `public/`, `design/Stitch/`, `package.json`, `package-lock.json`, `schema.sql`, `README.md` và `.env.example`. Không commit `.env.local`, `.env.test.local`, `node_modules/`, `.next/`, `playwright-report/` hoặc `test-results/`; các mục này đã được khai báo trong `.gitignore`.

Trong Vercel, cấu hình riêng `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` cho môi trường ứng dụng. Không cấu hình email/mật khẩu test, `service_role`, secret key hoặc database password ở `NEXT_PUBLIC_*`. GitHub lưu mã nguồn; dữ liệu bảng vẫn ở Supabase.
