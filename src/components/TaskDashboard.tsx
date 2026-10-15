"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import TaskForm from "@/components/TaskForm";
import TaskList, { type Task } from "@/components/TaskList";
import { createClient } from "@/lib/supabase-browser";

type TaskFilter = "Tất cả" | "Đang làm" | "Hoàn thành";

type ApiTask = {
  id: string;
  title: string;
  is_done: boolean;
  created_at: string;
};

export default function TaskDashboard() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const taskRequestId = useRef(0);
  const pendingTaskIds = useRef(new Set<string>());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());
  const [filter, setFilter] = useState<TaskFilter>("Tất cả");
  const [query, setQuery] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const apiFetch = useCallback(async <T,>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> => {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      throw new Error("Không thể kiểm tra phiên đăng nhập. Vui lòng đăng nhập lại.");
    }

    if (!data.session) {
      taskRequestId.current += 1;
      setTasks([]);
      setSession(null);
      router.replace("/login");
      throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }

    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${data.session.access_token}`);

    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(path, {
      ...options,
      headers,
      cache: "no-store",
    });
    const result: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 401) {
        taskRequestId.current += 1;
        setTasks([]);
        setSession(null);
        router.replace("/login");
      }

      const apiError =
        typeof result === "object" &&
        result !== null &&
        "error" in result &&
        typeof result.error === "string"
          ? result.error
          : "Yêu cầu không thành công. Vui lòng thử lại.";

      throw new Error(apiError);
    }

    return result as T;
  }, [router, supabase]);

  const refreshTasks = useCallback(async () => {
    const requestId = ++taskRequestId.current;
    setIsLoadingTasks(true);
    setErrorMessage(null);

    try {
      const result = await apiFetch<{ data: ApiTask[] }>("/api/tasks");

      if (requestId === taskRequestId.current) {
        setTasks(result.data.map((task) => ({
          id: task.id,
          title: task.title,
          createdAt: task.created_at,
          completed: task.is_done,
        })));
      }
    } catch (error) {
      if (requestId === taskRequestId.current) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Không tải được dữ liệu. Vui lòng thử lại.",
        );
      }
    } finally {
      if (requestId === taskRequestId.current) {
        setIsLoadingTasks(false);
      }
    }
  }, [apiFetch]);

  useEffect(() => {
    let isMounted = true;
    let receivedAuthEvent = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      receivedAuthEvent = true;

      if (!isMounted) {
        return;
      }

      setSession(nextSession);
      setIsCheckingSession(false);

      if (!nextSession) {
        taskRequestId.current += 1;
        setTasks([]);
        router.replace("/login");
      }
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted || receivedAuthEvent) {
        return;
      }

      setIsCheckingSession(false);

      if (error) {
        setErrorMessage("Không thể kiểm tra phiên đăng nhập. Vui lòng tải lại trang.");
        return;
      }

      setSession(data.session);

      if (!data.session) {
        router.replace("/login");
      }
    }).catch(() => {
      if (isMounted && !receivedAuthEvent) {
        setIsCheckingSession(false);
        setErrorMessage("Không thể kiểm tra phiên đăng nhập. Vui lòng tải lại trang.");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  useEffect(() => {
    if (!session) return;

    let isCurrent = true;
    const timeoutId = window.setTimeout(() => {
      if (isCurrent) void refreshTasks();
    }, 0);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeoutId);
      taskRequestId.current += 1;
    };
  }, [refreshTasks, session]);

  async function handleSignOut() {
    setIsSigningOut(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        setErrorMessage("Không thể đăng xuất. Vui lòng thử lại.");
        return;
      }

      taskRequestId.current += 1;
      setTasks([]);
      setFilter("Tất cả");
      setQuery("");
      setSession(null);
      router.replace("/login");
    } catch {
      setErrorMessage("Không thể đăng xuất. Vui lòng thử lại.");
    } finally {
      setIsSigningOut(false);
    }
  }

  async function addTask(title: string): Promise<boolean> {
    if (isAddingTask) return false;

    setIsAddingTask(true);
    setErrorMessage(null);

    try {
      await apiFetch("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ title }),
      });
      await refreshTasks();
      return true;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Không thêm được công việc. Vui lòng thử lại.",
      );
      return false;
    } finally {
      setIsAddingTask(false);
    }
  }

  async function updateTask(
    id: string,
    body: { title: string } | { is_done: boolean },
  ): Promise<boolean> {
    if (pendingTaskIds.current.has(id)) return false;

    pendingTaskIds.current.add(id);
    setPendingIds(new Set(pendingTaskIds.current));
    setErrorMessage(null);

    try {
      await apiFetch(`/api/tasks/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      await refreshTasks();
      return true;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Không cập nhật được công việc. Vui lòng thử lại.",
      );
      return false;
    } finally {
      pendingTaskIds.current.delete(id);
      setPendingIds(new Set(pendingTaskIds.current));
    }
  }

  async function deleteTask(id: string): Promise<boolean> {
    if (pendingTaskIds.current.has(id)) return false;

    pendingTaskIds.current.add(id);
    setPendingIds(new Set(pendingTaskIds.current));
    setErrorMessage(null);

    try {
      await apiFetch(`/api/tasks/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      await refreshTasks();
      return true;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Không xóa được công việc. Vui lòng thử lại.",
      );
      return false;
    } finally {
      pendingTaskIds.current.delete(id);
      setPendingIds(new Set(pendingTaskIds.current));
    }
  }

  const completedCount = tasks.filter((task) => task.completed).length;
  const activeCount = tasks.length - completedCount;
  const completionRate = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  const visibleTasks = useMemo(
    () => tasks.filter((task) => {
      const matchesFilter = filter === "Tất cả" || (filter === "Hoàn thành" ? task.completed : !task.completed);
      return matchesFilter && task.title.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi"));
    }),
    [filter, query, tasks],
  );

  if (isCheckingSession) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f8ff] text-sm text-[#626b7c]">
        Đang kiểm tra phiên đăng nhập...
      </main>
    );
  }

  if (!session) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f8ff] px-4 text-center text-sm text-red-600">
        {errorMessage ?? "Đang chuyển đến trang đăng nhập..."}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8ff] pb-20 text-[#1e2430] sm:pb-0">
      <header className="sticky top-0 z-20 border-b border-[#edf0f5] bg-white">
        <div className="mx-auto flex h-[66px] max-w-[1320px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/tasks" className="flex min-w-0 items-center gap-3 font-semibold">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#2862ed] text-lg text-white">▣</span>
            <span className="min-w-0"><span className="block truncate text-sm">Việc học của tôi</span><span className="block text-[10px] font-normal text-[#737d91] sm:hidden">Danh sách bài tập</span></span>
          </Link>
          <nav aria-label="Điều hướng chính" className="hidden items-center gap-8 text-xs font-medium text-[#4e5665] md:flex">
            <a href="#tasks" className="text-[#2458df]">Bài tập hôm nay</a><a href="#weekly" className="hover:text-[#2458df]">Kế hoạch tuần</a><a href="#subjects" className="hover:text-[#2458df]">Môn học của tôi</a><a href="#notes" className="hover:text-[#2458df]">Ghi chú học tập</a>
          </nav>
          <div className="flex items-center gap-3"><span className="hidden size-8 place-items-center rounded-full bg-[#194bc9] text-sm text-white sm:grid" aria-label="Tài khoản">●</span><button type="button" onClick={handleSignOut} disabled={isSigningOut} className="rounded-md px-2 py-2 text-xs font-medium text-[#4e5665] hover:bg-[#f1f3fa] disabled:cursor-wait disabled:opacity-60 sm:px-3">⇥ <span className="hidden sm:inline">{isSigningOut ? "Đang đăng xuất..." : "Đăng xuất"}</span></button></div>
        </div>
      </header>

      <div className="mx-auto max-w-[1320px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        {errorMessage && (
          <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}
        <section className="mb-5 flex items-center justify-between gap-4 rounded-lg bg-[#edf1ff] px-4 py-3 md:hidden">
          <div><p className="text-sm font-semibold">Chào buổi sáng, Minh!</p><p className="mt-0.5 text-xs text-[#59657b]">Hôm nay hoàn thành {completedCount}/{tasks.length} việc học</p></div>
          <div className="grid size-12 shrink-0 place-items-center rounded-full border-[3px] border-white text-xs font-bold text-[#194bc9]">{completionRate}%</div>
        </section>

        <section className="mb-5 flex flex-col justify-between gap-4 md:mb-6 md:flex-row md:items-center">
          <div><p className="mb-1 text-xs font-semibold text-[#2458df] md:hidden">HÔM NAY</p><h1 className="hidden text-[22px] font-bold leading-tight md:block">Danh sách công việc học tập</h1><h1 className="text-lg font-semibold md:hidden">Bài tập của bạn</h1><p className="mt-1 hidden text-xs text-[#626b7c] md:block">Theo dõi bài tập, bài đọc và hoàn thành mục tiêu học tập hằng ngày một cách ngăn nắp.</p></div>
          <div className="hidden items-center gap-2 rounded-lg bg-[#e8ecfa] p-1 md:flex">{(["Bình thường", "Đang tải", "Trống", "Báo lỗi"] as const).map((status, index) => <span key={status} className={`rounded-md px-2 py-1.5 text-[10px] ${index === 0 ? "bg-white font-semibold text-[#194bc9] shadow-sm" : index === 3 ? "text-[#dd4747]" : "text-[#4e5665]"}`}>{status}</span>)}</div>
        </section>

        <section id="tasks" className="rounded-lg bg-white p-4 shadow-[0_2px_8px_rgba(39,51,94,0.025)] sm:p-5 md:p-6">
          <TaskForm isSubmitting={isAddingTask || isLoadingTasks} onAdd={addTask} />
          <div className="mb-4 mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 rounded-lg bg-[#f0f3ff] p-1">
              {(["Tất cả", "Đang làm", "Hoàn thành"] as const).map((option) => {
                const count = option === "Tất cả" ? tasks.length : option === "Đang làm" ? activeCount : completedCount;
                return <button key={option} onClick={() => setFilter(option)} aria-pressed={filter === option} className={`rounded-md px-3 py-1.5 text-[11px] transition ${filter === option ? "bg-white font-semibold text-[#194bc9] shadow-sm" : "text-[#50596a] hover:text-[#194bc9]"}`}>{option}<span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${option === "Hoàn thành" ? "bg-[#c9f6df] text-[#208256]" : "bg-[#e2e7f6] text-[#536078]"}`}>{count}</span></button>;
              })}
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[#515b6d]">
              <label className="relative hidden sm:block"><span className="sr-only">Tìm công việc</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm công việc..." className="h-8 w-40 rounded-md border border-[#e7eaf1] bg-white px-3 text-[11px] outline-none focus:border-[#5278e5]" /></label>
              <span aria-live="polite">◉ Hoàn thành {completedCount}/{tasks.length} mục tiêu bài học</span>
            </div>
          </div>
          <div className="mb-3 sm:hidden"><label><span className="sr-only">Tìm công việc</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm công việc..." className="h-9 w-full rounded-md border border-[#e7eaf1] bg-white px-3 text-xs outline-none focus:border-[#5278e5]" /></label></div>
          {isLoadingTasks ? (
            <p role="status" className="rounded-lg bg-[#f8f9fc] px-4 py-10 text-center text-sm text-[#737d91]">
              Đang tải công việc...
            </p>
          ) : (
            <TaskList
              tasks={visibleTasks}
              pendingIds={pendingIds}
              onToggle={(id, completed) => updateTask(id, { is_done: completed })}
              onDelete={deleteTask}
              onEdit={(id, title) => updateTask(id, { title })}
            />
          )}
          <div className="mt-5 flex items-center justify-between gap-3 rounded-lg bg-[#f0f3ff] px-3 py-2.5 text-[10px] leading-4 text-[#515b6d] sm:px-4 sm:text-[11px]"><span><span className="mr-2 text-[#2458df]" aria-hidden="true">♧</span>Mẹo nhỏ: Chia nhỏ các bài tập lớn thành nhiều đầu việc 25 phút giúp duy trì sự chú ý bền bỉ.</span><span className="hidden shrink-0 uppercase tracking-wide text-[#778198] sm:block">Tự động lưu trữ</span></div>
        </section>

        <footer className="mt-6 hidden items-center justify-between border-t border-[#e3e7f0] pt-4 text-[11px] text-[#687184] md:flex"><span>© 2025 Việc học của tôi. Không gian học tập tỉnh lặng và hiệu quả.</span><span className="flex gap-5"><a href="#help" className="hover:text-[#194bc9]">Hướng dẫn sử dụng</a><a href="#privacy" className="hover:text-[#194bc9]">Quy định riêng tư</a></span></footer>
      </div>

      <nav aria-label="Điều hướng di động" className="fixed inset-x-0 bottom-0 z-20 grid h-16 grid-cols-5 border-t border-[#e7eaf1] bg-white px-2 text-[9px] text-[#626b7c] md:hidden">
        {[["▦", "Tổng quan"], ["☷", "Bài tập"], ["◫", "Môn học"], ["▤", "Lịch học"], ["●", "Cá nhân"]].map(([icon, label], index) => <a key={label} href={index === 1 ? "#tasks" : `#${label}`} className={`flex flex-col items-center justify-center gap-1 ${index === 1 ? "font-semibold text-[#194bc9]" : ""}`}><span className="text-base leading-none">{icon}</span>{label}</a>)}
      </nav>
    </main>
  );
}