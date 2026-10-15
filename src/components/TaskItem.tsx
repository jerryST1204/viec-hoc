import { useState } from "react";
import type { Task } from "@/components/TaskList";

type TaskItemProps = {
  task: Task;
  isPending: boolean;
  onToggle: (id: string, completed: boolean) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onEdit: (id: string, title: string) => Promise<boolean>;
};

export default function TaskItem({ task, isPending, onToggle, onDelete, onEdit }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(task.title);

  async function saveTitle() {
    const title = draftTitle.trim();
    if (!title) return;
    if (await onEdit(task.id, title)) setIsEditing(false);
  }

  function cancelEdit() {
    setDraftTitle(task.title);
    setIsEditing(false);
  }

  async function deleteTask() {
    if (!window.confirm(`Bạn có chắc muốn xóa "${task.title}" không?`)) return;
    await onDelete(task.id);
  }

  return (
    <li data-testid="task-item" data-task-id={task.id} className="group flex items-start gap-3 py-4 first:pt-1 last:pb-1">
      <input
        type="checkbox"
        checked={task.completed}
        disabled={isPending}
        onChange={() => onToggle(task.id, !task.completed)}
        aria-label={`Đánh dấu ${task.title} ${task.completed ? "chưa hoàn thành" : "hoàn thành"}`}
        className="mt-1 size-[17px] shrink-0 cursor-pointer accent-primary disabled:cursor-wait"
      />
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <input
            autoFocus
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void saveTitle();
              if (event.key === "Escape") cancelEdit();
            }}
            disabled={isPending}
            aria-label="Tên công việc"
            className="h-8 w-full rounded-md border border-[#c8d2f4] px-2 text-sm outline-none focus:border-primary"
          />
        ) : (
          <p className={`text-sm font-medium leading-5 ${task.completed ? "text-[#a1a8b5] line-through" : "text-[#1e2430]"}`}>{task.title}</p>
        )}
        <p className="mt-2 text-xs text-[#8c95a7]">
          Tạo ngày {new Date(task.createdAt).toLocaleDateString("vi-VN")}
        </p>
      </div>
      {isEditing ? (
        <div className="flex shrink-0 gap-1">
          <button onClick={() => void saveTitle()} disabled={isPending} aria-label="Lưu tên công việc" title="Lưu" className="grid size-8 place-items-center rounded-md text-[#218250] hover:bg-[#eaf7f0] disabled:cursor-wait disabled:opacity-50">✓</button>
          <button onClick={cancelEdit} disabled={isPending} aria-label="Hủy sửa tên" title="Hủy" className="grid size-8 place-items-center rounded-md text-[#737d91] hover:bg-[#f1f3fa] disabled:opacity-50">×</button>
        </div>
      ) : (
        <button onClick={() => { setDraftTitle(task.title); setIsEditing(true); }} disabled={isPending} aria-label={`Sửa ${task.title}`} title="Sửa công việc" className="grid size-8 shrink-0 place-items-center rounded-md text-[#a1a8b5] transition hover:bg-[#edf1ff] hover:text-primary disabled:cursor-wait disabled:opacity-50">✎</button>
      )}
      <button onClick={() => void deleteTask()} disabled={isPending} aria-label={`Xóa ${task.title}`} title="Xóa công việc" className="grid size-8 shrink-0 place-items-center rounded-md text-[#a1a8b5] opacity-100 transition hover:bg-[#fff0ed] hover:text-tertiary disabled:cursor-wait disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">×</button>
    </li>
  );
}