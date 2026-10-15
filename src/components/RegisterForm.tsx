"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function RegisterForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setErrorMessage("Mật khẩu xác nhận không khớp.");
      setIsSubmitting(false);
      return;
    }

    try {
      const { data, error } = await createClient().auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
        setErrorMessage("Không thể tạo tài khoản. Vui lòng kiểm tra thông tin và thử lại.");
        return;
      }

      if (data.session) {
        router.replace("/tasks");
        return;
      }

      setSuccessMessage(
        "Đăng ký thành công. Hãy kiểm tra email để xác nhận tài khoản trước khi đăng nhập.",
      );
    } catch {
      setErrorMessage("Không thể kết nối để đăng ký. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="mt-6 space-y-4 rounded-[10px] bg-white p-4 sm:mt-5 sm:p-0"
      onSubmit={handleSubmit}
    >
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
        Mật khẩu
        <input
          type="password"
          name="password"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="Ít nhất 6 ký tự"
          className="h-10 w-full rounded-md border-0 bg-[#f0f3ff] px-3 text-sm font-normal tracking-[0.12em] text-[#1e2430] outline-none transition placeholder:text-[#7d879b] focus:ring-2 focus:ring-[#3a63de]/30 sm:h-11"
        />
      </label>
      <label className="block space-y-1.5 text-xs font-semibold text-[#1e2430]">
        Xác nhận mật khẩu
        <input
          type="password"
          name="confirmPassword"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="Nhập lại mật khẩu"
          className="h-10 w-full rounded-md border-0 bg-[#f0f3ff] px-3 text-sm font-normal tracking-[0.12em] text-[#1e2430] outline-none transition placeholder:text-[#7d879b] focus:ring-2 focus:ring-[#3a63de]/30 sm:h-11"
        />
      </label>
      {errorMessage && (
        <p role="alert" className="text-xs text-red-600">
          {errorMessage}
        </p>
      )}
      {successMessage && (
        <p role="status" className="text-xs text-green-700">
          {successMessage}
        </p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="h-11 w-full rounded-md bg-[#194bc9] px-5 text-sm font-semibold text-white shadow-[0_3px_6px_rgba(23,69,183,0.22)] transition hover:bg-[#143fae] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
      >
        {isSubmitting ? "Đang tạo tài khoản..." : "Đăng ký"}
      </button>
    </form>
  );
}
