import Link from "next/link";
import RegisterForm from "@/components/RegisterForm";

export default function RegisterPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f8ff] px-4 py-8 before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(135deg,rgba(52,99,222,0.045),transparent_40%,rgba(63,210,167,0.06))] sm:px-6">
      <section className="relative w-full max-w-[560px] rounded-[10px] border-4 border-[#7867ff] bg-white px-5 py-8 shadow-[0_20px_70px_rgba(43,53,92,0.08)] sm:px-12 sm:py-9">
        <div className="mx-auto max-w-[360px]">
          <div
            aria-hidden="true"
            className="mx-auto mb-3 grid size-12 place-items-center rounded-xl bg-[#edf1ff] text-[#2458df]"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-[#2862ed] text-lg font-bold text-white">
              ▣
            </span>
          </div>
          <h1 className="text-center text-[25px] font-bold leading-tight text-[#1e2430]">
            Tạo tài khoản
          </h1>
          <p className="mx-auto mt-2 max-w-[300px] text-center text-[13px] leading-5 text-[#626b7c]">
            Đăng ký để bắt đầu quản lý công việc học tập
          </p>
          <RegisterForm />
          <p className="mt-5 text-center text-xs text-[#687184]">
            Đã có tài khoản?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#1752d1] hover:underline"
            >
              Đăng nhập
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
