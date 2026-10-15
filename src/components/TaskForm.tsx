"use client";

import { useState, type FormEvent } from "react";

type TaskFormProps = {
  isSubmitting: boolean;
  onAdd: (title: string) => Promise<boolean>;
};

export default function TaskForm({ isSubmitting, onAdd }: TaskFormProps) {
  const [title, setTitle] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle || isSubmitting) return;
    if (await onAdd(cleanTitle)) setTitle("");
  }

  return (
    <section className="rounded-xl border border-[#e7eaf1] bg-white p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">Thêm công việc</h2>
          <p className="mt-1 text-sm text-[#737d91]">Bắt đầu từ một việc cụ thể.</p>
        </div>
        <span className="grid size-9 place-items-center rounded-lg bg-[#edf1ff] text-lg font-medium text-primary" aria-hidden="true">+</span>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-2 text-sm font-medium">
          Tên công việc
          <input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Ôn bài chương 2" className="h-11 w-full rounded-lg border border-[#e1e5ed] px-3 text-sm font-normal outline-none placeholder:text-[#a1a8b5] focus:border-primary focus:ring-4 focus:ring-[#3a63de]/10" />
        </label>
        <button type="submit" disabled={isSubmitting} className="h-11 w-full rounded-lg bg-primary text-sm font-semibold text-white transition hover:bg-[#2f56cd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60">
          {isSubmitting ? "Đang thêm..." : "Thêm vào danh sách"}
        </button>
      </form>
    </section>
  );
}