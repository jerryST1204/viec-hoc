import TaskItem from "@/components/TaskItem";

export type Task = {
  id: string;
  title: string;
  createdAt: string;
  completed: boolean;
};

type TaskListProps = {
  tasks: Task[];
  pendingIds: ReadonlySet<string>;
  onToggle: (id: string, completed: boolean) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onEdit: (id: string, title: string) => Promise<boolean>;
};

export default function TaskList({ tasks, pendingIds, onToggle, onDelete, onEdit }: TaskListProps) {
  if (tasks.length === 0) {
    return <p className="rounded-lg bg-[#f8f9fc] px-4 py-10 text-center text-sm text-[#737d91]">Chưa có công việc phù hợp.</p>;
  }

  return (
    <ul className="divide-y divide-[#edf0f5]">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          isPending={pendingIds.has(task.id)}
          onToggle={onToggle}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </ul>
  );
}