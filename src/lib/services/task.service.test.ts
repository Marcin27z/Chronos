import { afterEach, describe, expect, it, vi } from "vitest";

import { TaskService } from "./task.service";
import type { CreateTaskCommand, TaskDTO } from "../../types";
import type { SupabaseServerClient } from "../../db/supabase.client";

interface SupabaseInsertResponse {
  data?: TaskDTO;
  error?: { message: string };
}

const mockSupabaseClient = (response: SupabaseInsertResponse) => {
  const singleMock = vi.fn().mockResolvedValue(response);
  const selectMock = vi.fn(() => ({ single: singleMock }));
  const insertMock = vi.fn(() => ({ select: selectMock }));
  const fromMock = vi.fn(() => ({ insert: insertMock }));

  const supabase = {
    from: fromMock,
  } as unknown as SupabaseServerClient;

  return {
    supabase,
    fromMock,
    insertMock,
    selectMock,
    singleMock,
  };
};

const createTaskServiceWithFakeClient = () => {
  const supabaseStub = {
    from: vi.fn(),
  } as unknown as SupabaseServerClient;

  const service = new TaskService(supabaseStub);
  return service as unknown as {
    calculateNextDueDate: TaskService["calculateNextDueDate"];
  };
};

describe("TaskService.calculateNextDueDate", () => {
  const getCalculator = () => {
    const serviceWithPrivate = createTaskServiceWithFakeClient();
    return serviceWithPrivate.calculateNextDueDate.bind(serviceWithPrivate);
  };

  afterEach(() => {
    vi.useRealTimers();
  });

  it("handles month overflow (Jan 31 + 1 month -> Feb 28)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-31T00:00:00Z"));

    const calculateNextDueDate = getCalculator();

    expect(calculateNextDueDate(1, "months", null)).toBe("2025-02-28");
  });

  it("moves to next preferred weekday when interval lands on different day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z")); // Wednesday

    const calculateNextDueDate = getCalculator();

    expect(calculateNextDueDate(1, "weeks", 2)).toBe("2025-01-14"); // next Tuesday
  });
});

describe("TaskService.createTask", () => {
  const userId = "user-123";

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calculates next due date, persists metadata, and returns created task", async () => {
    const command: CreateTaskCommand = {
      title: "Weekly sync",
      description: "Quarterly review",
      interval_value: 2,
      interval_unit: "weeks",
      preferred_day_of_week: 3,
    };

    const nextDueDate = "2025-12-10";
    const taskRecord: TaskDTO = {
      id: "task-1",
      user_id: userId,
      title: command.title,
      description: command.description ?? null,
      interval_value: command.interval_value,
      interval_unit: command.interval_unit,
      preferred_day_of_week: command.preferred_day_of_week ?? null,
      next_due_date: nextDueDate,
      last_action_date: null,
      last_action_type: null,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    };

    // @ts-expect-error - Spying on private method for testing
    const calculateSpy = vi.spyOn(TaskService.prototype, "calculateNextDueDate").mockReturnValue(nextDueDate);

    const { supabase, insertMock } = mockSupabaseClient({ data: taskRecord });
    const service = new TaskService(supabase);

    await expect(service.createTask(userId, command)).resolves.toEqual(taskRecord);

    expect(calculateSpy).toHaveBeenCalledWith(
      command.interval_value,
      command.interval_unit,
      command.preferred_day_of_week ?? null
    );

    expect(insertMock).toHaveBeenCalledWith({
      user_id: userId,
      title: command.title,
      description: command.description ?? null,
      interval_value: command.interval_value,
      interval_unit: command.interval_unit,
      preferred_day_of_week: command.preferred_day_of_week ?? null,
      next_due_date: nextDueDate,
      last_action_date: null,
      last_action_type: null,
    });
  });

  it("defaults optional fields to null when not provided", async () => {
    const command: CreateTaskCommand = {
      title: "Daily check-in",
      interval_value: 1,
      interval_unit: "days",
    };

    const nextDueDate = "2025-11-05";
    const taskRecord: TaskDTO = {
      id: "task-2",
      user_id: userId,
      title: command.title,
      description: null,
      interval_value: command.interval_value,
      interval_unit: command.interval_unit,
      preferred_day_of_week: null,
      next_due_date: nextDueDate,
      last_action_date: null,
      last_action_type: null,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    };

    // @ts-expect-error - Spying on private method for testing
    vi.spyOn(TaskService.prototype, "calculateNextDueDate").mockReturnValue(nextDueDate);

    const { supabase, insertMock } = mockSupabaseClient({ data: taskRecord });
    const service = new TaskService(supabase);

    await expect(service.createTask(userId, command)).resolves.toEqual(taskRecord);

    expect(insertMock).toHaveBeenCalledWith({
      user_id: userId,
      title: command.title,
      description: null,
      interval_value: command.interval_value,
      interval_unit: command.interval_unit,
      preferred_day_of_week: null,
      next_due_date: nextDueDate,
      last_action_date: null,
      last_action_type: null,
    });
  });

  it("throws when Supabase returns an error", async () => {
    const command: CreateTaskCommand = {
      title: "Error check",
      interval_value: 1,
      interval_unit: "days",
    };

    const errorMessage = "insert failed";
    const { supabase } = mockSupabaseClient({ error: { message: errorMessage } });
    const service = new TaskService(supabase);

    await expect(service.createTask(userId, command)).rejects.toThrow(`Failed to create task: ${errorMessage}`);
  });

  it("throws when Supabase returns no data", async () => {
    const command: CreateTaskCommand = {
      title: "No data",
      interval_value: 1,
      interval_unit: "days",
    };

    const { supabase } = mockSupabaseClient({ data: undefined });
    const service = new TaskService(supabase);

    await expect(service.createTask(userId, command)).rejects.toThrow("Failed to create task: No data returned");
  });
});
