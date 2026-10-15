"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const { error } = await createClient().auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage("Đăng nhập thất bại. Vui lòng kiểm tra email và mật khẩu.");
        return;
      }

      router.replace("/tasks");
    } catch {
      setErrorMessage("Không thể kết nối để đăng nhập. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-6 space-y-4 rounded-[10px] bg-white p-4 sm:mt-5 sm:p-0" onSubmit={handleSubmit}>
      <label className="block space-y-1.5 text-xs font-semibold text-[#1e2430]">
        Email
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="vidu@email.com"
          className="h-10 w-full rounded-md border-0 bg-[#f0f3ff] px-3 text-sm font-normal text-[#1e2430] outline-none transition placeholder:text-[#7d879b] focus:ring-2 focus:ring-[#3a63de]/30 sm:h-11"
        />
      </label>
      <label className="block space-y-1.5 text-xs font-semibold text-[#1e2430]">
        <span className="flex items-center justify-between">
          Mật khẩu
          <a href="#forgot-password" className="font-medium text-[#1752d1] hover:underline">Quên mật khẩu?</a>
        </span>
        <span className="relative block">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="h-10 w-full rounded-md border-0 bg-[#f0f3ff] px-3 pr-11 text-sm font-normal tracking-[0.12em] text-[#1e2430] outline-none transition placeholder:text-[#7d879b] focus:ring-2 focus:ring-[#3a63de]/30 sm:h-11"
          />
          <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} className="absolute inset-y-0 right-2 grid w-8 place-items-center text-sm text-[#707b91]">◉</button>
        </span>
      </label>
      <div className="flex items-center gap-2 text-[11px] text-[#687184]">
        <input id="remember" type="checkbox" className="size-3 accent-[#2458df]" />
        <label htmlFor="remember">Ghi nhớ đăng nhập</label>
      </div>
      {errorMessage && (
        <p role="alert" className="text-xs text-red-600">
          {errorMessage}
        </p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="h-11 w-full rounded-md bg-[#194bc9] px-5 text-sm font-semibold text-white shadow-[0_3px_6px_rgba(23,69,183,0.22)] transition hover:bg-[#143fae] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {isSubmitting ? "Đang đăng nhập..." : <>Đăng nhập <span className="ml-1" aria-hidden="true">→</span></>}
      </button>
    </form>
  );
}