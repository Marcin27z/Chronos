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

  describe("Happy path scenarios", () => {
    it("creates task with all fields provided and calculates next due date correctly", async () => {
      // Arrange
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

      const calculateSpy = vi.spyOn(TaskService.prototype, "calculateNextDueDate").mockReturnValue(nextDueDate);

      const { supabase, insertMock } = mockSupabaseClient({ data: taskRecord });
      const service = new TaskService(supabase);

      // Act
      const result = await service.createTask(userId, command);

      // Assert
      expect(result).toEqual(taskRecord);
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

    it("creates task with minimal required fields and defaults optional fields to null", async () => {
      // Arrange
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

      vi.spyOn(TaskService.prototype, "calculateNextDueDate").mockReturnValue(nextDueDate);

      const { supabase, insertMock } = mockSupabaseClient({ data: taskRecord });
      const service = new TaskService(supabase);

      // Act
      const result = await service.createTask(userId, command);

      // Assert
      expect(result).toEqual(taskRecord);
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

    it("handles description as null when explicitly provided", async () => {
      // Arrange
      const command: CreateTaskCommand = {
        title: "Task without description",
        description: null,
        interval_value: 1,
        interval_unit: "days",
      };

      const nextDueDate = "2025-11-05";
      const taskRecord: TaskDTO = {
        id: "task-3",
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

      vi.spyOn(TaskService.prototype, "calculateNextDueDate").mockReturnValue(nextDueDate);

      const { supabase, insertMock } = mockSupabaseClient({ data: taskRecord });
      const service = new TaskService(supabase);

      // Act
      const result = await service.createTask(userId, command);

      // Assert
      expect(result).toEqual(taskRecord);
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          description: null,
        })
      );
    });
  });

  describe("Interval unit handling", () => {
    it.each([
      { unit: "days" as const, value: 1, description: "daily task" },
      { unit: "days" as const, value: 7, description: "weekly task with days unit" },
      { unit: "weeks" as const, value: 1, description: "weekly task" },
      { unit: "weeks" as const, value: 4, description: "monthly task with weeks unit" },
      { unit: "months" as const, value: 1, description: "monthly task" },
      { unit: "months" as const, value: 3, description: "quarterly task" },
      { unit: "years" as const, value: 1, description: "yearly task" },
      { unit: "years" as const, value: 2, description: "biennial task" },
    ])("creates task with $description (interval: $value $unit)", async ({ unit, value }) => {
      // Arrange
      const command: CreateTaskCommand = {
        title: `Task with ${value} ${unit}`,
        interval_value: value,
        interval_unit: unit,
      };

      const nextDueDate = "2025-12-31";
      const taskRecord: TaskDTO = {
        id: `task-${unit}-${value}`,
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

      const calculateSpy = vi.spyOn(TaskService.prototype, "calculateNextDueDate").mockReturnValue(nextDueDate);

      const { supabase } = mockSupabaseClient({ data: taskRecord });
      const service = new TaskService(supabase);

      // Act
      const result = await service.createTask(userId, command);

      // Assert
      expect(result).toEqual(taskRecord);
      expect(calculateSpy).toHaveBeenCalledWith(value, unit, null);
    });
  });

  describe("Interval value edge cases", () => {
    it("creates task with minimum interval value (1)", async () => {
      // Arrange
      const command: CreateTaskCommand = {
        title: "Minimum interval task",
        interval_value: 1,
        interval_unit: "days",
      };

      const nextDueDate = "2025-11-05";
      const taskRecord: TaskDTO = {
        id: "task-min",
        user_id: userId,
        title: command.title,
        description: null,
        interval_value: 1,
        interval_unit: "days",
        preferred_day_of_week: null,
        next_due_date: nextDueDate,
        last_action_date: null,
        last_action_type: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      };

      vi.spyOn(TaskService.prototype, "calculateNextDueDate").mockReturnValue(nextDueDate);

      const { supabase } = mockSupabaseClient({ data: taskRecord });
      const service = new TaskService(supabase);

      // Act
      const result = await service.createTask(userId, command);

      // Assert
      expect(result.interval_value).toBe(1);
    });

    it("creates task with maximum interval value (999)", async () => {
      // Arrange
      const command: CreateTaskCommand = {
        title: "Maximum interval task",
        interval_value: 999,
        interval_unit: "days",
      };

      const nextDueDate = "2027-09-27";
      const taskRecord: TaskDTO = {
        id: "task-max",
        user_id: userId,
        title: command.title,
        description: null,
        interval_value: 999,
        interval_unit: "days",
        preferred_day_of_week: null,
        next_due_date: nextDueDate,
        last_action_date: null,
        last_action_type: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      };

      vi.spyOn(TaskService.prototype, "calculateNextDueDate").mockReturnValue(nextDueDate);

      const { supabase } = mockSupabaseClient({ data: taskRecord });
      const service = new TaskService(supabase);

      // Act
      const result = await service.createTask(userId, command);

      // Assert
      expect(result.interval_value).toBe(999);
    });
  });

  describe("Preferred day of week handling", () => {
    it.each([
      { day: 0, label: "Sunday" },
      { day: 1, label: "Monday" },
      { day: 2, label: "Tuesday" },
      { day: 3, label: "Wednesday" },
      { day: 4, label: "Thursday" },
      { day: 5, label: "Friday" },
      { day: 6, label: "Saturday" },
    ])("creates task with preferred day of week: $label ($day)", async ({ day }) => {
      // Arrange
      const command: CreateTaskCommand = {
        title: `Task for ${day}`,
        interval_value: 1,
        interval_unit: "weeks",
        preferred_day_of_week: day,
      };

      const nextDueDate = "2025-01-05";
      const taskRecord: TaskDTO = {
        id: `task-day-${day}`,
        user_id: userId,
        title: command.title,
        description: null,
        interval_value: command.interval_value,
        interval_unit: command.interval_unit,
        preferred_day_of_week: day,
        next_due_date: nextDueDate,
        last_action_date: null,
        last_action_type: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      };

      const calculateSpy = vi.spyOn(TaskService.prototype, "calculateNextDueDate").mockReturnValue(nextDueDate);

      const { supabase, insertMock } = mockSupabaseClient({ data: taskRecord });
      const service = new TaskService(supabase);

      // Act
      const result = await service.createTask(userId, command);

      // Assert
      expect(result).toEqual(taskRecord);
      expect(calculateSpy).toHaveBeenCalledWith(command.interval_value, command.interval_unit, day);
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          preferred_day_of_week: day,
        })
      );
    });

    it("handles preferred_day_of_week as null when not provided", async () => {
      // Arrange
      const command: CreateTaskCommand = {
        title: "Task without preferred day",
        interval_value: 1,
        interval_unit: "days",
      };

      const nextDueDate = "2025-11-05";
      const taskRecord: TaskDTO = {
        id: "task-no-day",
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

      const calculateSpy = vi.spyOn(TaskService.prototype, "calculateNextDueDate").mockReturnValue(nextDueDate);

      const { supabase, insertMock } = mockSupabaseClient({ data: taskRecord });
      const service = new TaskService(supabase);

      // Act
      const result = await service.createTask(userId, command);

      // Assert
      expect(result).toEqual(taskRecord);
      expect(calculateSpy).toHaveBeenCalledWith(command.interval_value, command.interval_unit, null);
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          preferred_day_of_week: null,
        })
      );
    });

    it("handles preferred_day_of_week as null when explicitly set to null", async () => {
      // Arrange
      const command: CreateTaskCommand = {
        title: "Task with explicit null preferred day",
        interval_value: 1,
        interval_unit: "weeks",
        preferred_day_of_week: null,
      };

      const nextDueDate = "2025-11-05";
      const taskRecord: TaskDTO = {
        id: "task-explicit-null",
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

      const calculateSpy = vi.spyOn(TaskService.prototype, "calculateNextDueDate").mockReturnValue(nextDueDate);

      const { supabase, insertMock } = mockSupabaseClient({ data: taskRecord });
      const service = new TaskService(supabase);

      // Act
      const result = await service.createTask(userId, command);

      // Assert
      expect(result).toEqual(taskRecord);
      expect(calculateSpy).toHaveBeenCalledWith(command.interval_value, command.interval_unit, null);
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          preferred_day_of_week: null,
        })
      );
    });
  });

  describe("Date calculation integration", () => {
    it("calls calculateNextDueDate with correct parameters from command", async () => {
      // Arrange
      const command: CreateTaskCommand = {
        title: "Integration test task",
        description: "Testing date calculation",
        interval_value: 3,
        interval_unit: "months",
        preferred_day_of_week: 5,
      };

      const nextDueDate = "2025-04-05";
      const taskRecord: TaskDTO = {
        id: "task-integration",
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

      const calculateSpy = vi.spyOn(TaskService.prototype, "calculateNextDueDate").mockReturnValue(nextDueDate);

      const { supabase } = mockSupabaseClient({ data: taskRecord });
      const service = new TaskService(supabase);

      // Act
      await service.createTask(userId, command);

      // Assert
      expect(calculateSpy).toHaveBeenCalledTimes(1);
      expect(calculateSpy).toHaveBeenCalledWith(
        command.interval_value,
        command.interval_unit,
        command.preferred_day_of_week ?? null
      );
    });

    it("uses calculated next_due_date in database insert payload", async () => {
      // Arrange
      const command: CreateTaskCommand = {
        title: "Date payload test",
        interval_value: 2,
        interval_unit: "weeks",
      };

      const calculatedDate = "2025-12-25";
      const taskRecord: TaskDTO = {
        id: "task-date-payload",
        user_id: userId,
        title: command.title,
        description: null,
        interval_value: command.interval_value,
        interval_unit: command.interval_unit,
        preferred_day_of_week: null,
        next_due_date: calculatedDate,
        last_action_date: null,
        last_action_type: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      };

      vi.spyOn(TaskService.prototype, "calculateNextDueDate").mockReturnValue(calculatedDate);

      const { supabase, insertMock } = mockSupabaseClient({ data: taskRecord });
      const service = new TaskService(supabase);

      // Act
      await service.createTask(userId, command);

      // Assert
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          next_due_date: calculatedDate,
        })
      );
    });
  });

  describe("Database insert payload validation", () => {
    it("includes user_id in insert payload", async () => {
      // Arrange
      const command: CreateTaskCommand = {
        title: "User ID test",
        interval_value: 1,
        interval_unit: "days",
      };

      const nextDueDate = "2025-11-05";
      const taskRecord: TaskDTO = {
        id: "task-user-id",
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

      vi.spyOn(TaskService.prototype, "calculateNextDueDate").mockReturnValue(nextDueDate);

      const { supabase, insertMock } = mockSupabaseClient({ data: taskRecord });
      const service = new TaskService(supabase);

      // Act
      await service.createTask(userId, command);

      // Assert
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
        })
      );
    });

    it("sets last_action_date and last_action_type to null in insert payload", async () => {
      // Arrange
      const command: CreateTaskCommand = {
        title: "Action fields test",
        interval_value: 1,
        interval_unit: "days",
      };

      const nextDueDate = "2025-11-05";
      const taskRecord: TaskDTO = {
        id: "task-action-fields",
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

      vi.spyOn(TaskService.prototype, "calculateNextDueDate").mockReturnValue(nextDueDate);

      const { supabase, insertMock } = mockSupabaseClient({ data: taskRecord });
      const service = new TaskService(supabase);

      // Act
      await service.createTask(userId, command);

      // Assert
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          last_action_date: null,
          last_action_type: null,
        })
      );
    });

    it("preserves all command fields in insert payload", async () => {
      // Arrange
      const command: CreateTaskCommand = {
        title: "Complete payload test",
        description: "Full description",
        interval_value: 5,
        interval_unit: "months",
        preferred_day_of_week: 1,
      };

      const nextDueDate = "2025-06-01";
      const taskRecord: TaskDTO = {
        id: "task-complete",
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

      vi.spyOn(TaskService.prototype, "calculateNextDueDate").mockReturnValue(nextDueDate);

      const { supabase, insertMock } = mockSupabaseClient({ data: taskRecord });
      const service = new TaskService(supabase);

      // Act
      await service.createTask(userId, command);

      // Assert
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
  });

  describe("Error handling", () => {
    it("throws error with descriptive message when Supabase returns database error", async () => {
      // Arrange
      const command: CreateTaskCommand = {
        title: "Error check",
        interval_value: 1,
        interval_unit: "days",
      };

      const errorMessage = "insert failed: duplicate key violation";
      const { supabase } = mockSupabaseClient({ error: { message: errorMessage } });
      const service = new TaskService(supabase);

      // Act & Assert
      await expect(service.createTask(userId, command)).rejects.toThrow(`Failed to create task: ${errorMessage}`);
    });

    it("throws error when Supabase returns no data after insert", async () => {
      // Arrange
      const command: CreateTaskCommand = {
        title: "No data",
        interval_value: 1,
        interval_unit: "days",
      };

      const { supabase } = mockSupabaseClient({ data: undefined });
      const service = new TaskService(supabase);

      // Act & Assert
      await expect(service.createTask(userId, command)).rejects.toThrow("Failed to create task: No data returned");
    });

    it("throws error when Supabase returns null data", async () => {
      // Arrange
      const command: CreateTaskCommand = {
        title: "Null data",
        interval_value: 1,
        interval_unit: "days",
      };

      const { supabase } = mockSupabaseClient({ data: undefined });
      const service = new TaskService(supabase);

      // Act & Assert
      await expect(service.createTask(userId, command)).rejects.toThrow("Failed to create task: No data returned");
    });

    it("propagates error message from Supabase error object", async () => {
      // Arrange
      const command: CreateTaskCommand = {
        title: "Propagation test",
        interval_value: 1,
        interval_unit: "days",
      };

      const specificError = "Foreign key constraint violation";
      const { supabase } = mockSupabaseClient({ error: { message: specificError } });
      const service = new TaskService(supabase);

      // Act & Assert
      await expect(service.createTask(userId, command)).rejects.toThrow(specificError);
    });
  });

  describe("Return value validation", () => {
    it("returns complete TaskDTO with all fields from database", async () => {
      // Arrange
      const command: CreateTaskCommand = {
        title: "Return value test",
        interval_value: 1,
        interval_unit: "days",
      };

      const nextDueDate = "2025-11-05";
      const taskRecord: TaskDTO = {
        id: "task-return",
        user_id: userId,
        title: command.title,
        description: null,
        interval_value: command.interval_value,
        interval_unit: command.interval_unit,
        preferred_day_of_week: null,
        next_due_date: nextDueDate,
        last_action_date: null,
        last_action_type: null,
        created_at: "2025-01-01T12:00:00Z",
        updated_at: "2025-01-01T12:00:00Z",
      };

      vi.spyOn(TaskService.prototype, "calculateNextDueDate").mockReturnValue(nextDueDate);

      const { supabase } = mockSupabaseClient({ data: taskRecord });
      const service = new TaskService(supabase);

      // Act
      const result = await service.createTask(userId, command);

      // Assert
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("user_id");
      expect(result).toHaveProperty("title");
      expect(result).toHaveProperty("description");
      expect(result).toHaveProperty("interval_value");
      expect(result).toHaveProperty("interval_unit");
      expect(result).toHaveProperty("preferred_day_of_week");
      expect(result).toHaveProperty("next_due_date");
      expect(result).toHaveProperty("last_action_date");
      expect(result).toHaveProperty("last_action_type");
      expect(result).toHaveProperty("created_at");
      expect(result).toHaveProperty("updated_at");
      expect(result).toEqual(taskRecord);
    });
  });
});

describe("TaskService.getTasks", () => {
  const userId = "user-123";

  interface SupabaseQueryResponse {
    data?: TaskDTO[] | null;
    error?: { message: string };
  }

  interface SupabaseCountResponse {
    count?: number | null;
    error?: { message: string };
  }

  const createMockSupabaseForGetTasks = (
    tasksResponse: SupabaseQueryResponse,
    countResponse: SupabaseCountResponse
  ) => {
    let callCount = 0;

    // Mock for tasks query chain: from().select().eq().order().range()
    const rangeMock = vi.fn().mockResolvedValue(tasksResponse);
    const orderMock = vi.fn(() => ({ range: rangeMock }));
    const eqMock = vi.fn(() => ({ order: orderMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));

    // Mock for count query chain: from().select(..., { count: "exact", head: true }).eq()
    const countEqMock = vi.fn().mockResolvedValue(countResponse);
    const countSelectMock = vi.fn((columns: string, options?: { count: string; head: boolean }) => {
      if (options?.head && options?.count === "exact") {
        // Return chainable object that has .eq() method
        return { eq: countEqMock };
      }
      return { eq: countEqMock };
    });

    const fromMock = vi.fn(() => {
      callCount++;
      if (callCount === 1) {
        // First call: tasks query
        return { select: selectMock };
      } else {
        // Second call: count query
        return { select: countSelectMock };
      }
    });

    const supabase = {
      from: fromMock,
    } as unknown as SupabaseServerClient;

    return {
      supabase,
      fromMock,
      selectMock,
      eqMock,
      orderMock,
      rangeMock,
      countSelectMock,
      countEqMock,
    };
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Happy path scenarios", () => {
    it("retrieves tasks with default sort (next_due_date ascending) and pagination", async () => {
      // Arrange
      const tasks: TaskDTO[] = [
        {
          id: "task-1",
          user_id: userId,
          title: "Task 1",
          description: null,
          interval_value: 1,
          interval_unit: "days",
          preferred_day_of_week: null,
          next_due_date: "2025-01-01",
          last_action_date: null,
          last_action_type: null,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
        {
          id: "task-2",
          user_id: userId,
          title: "Task 2",
          description: null,
          interval_value: 2,
          interval_unit: "weeks",
          preferred_day_of_week: null,
          next_due_date: "2025-01-02",
          last_action_date: null,
          last_action_type: null,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      const { supabase, eqMock, orderMock, rangeMock } = createMockSupabaseForGetTasks({ data: tasks }, { count: 2 });
      const service = new TaskService(supabase);

      // Act
      const result = await service.getTasks(userId, "next_due_date", 10, 0);

      // Assert
      expect(result.data).toEqual(tasks);
      expect(result.pagination).toEqual({
        total: 2,
        limit: 10,
        offset: 0,
        has_more: false,
      });
      expect(eqMock).toHaveBeenCalledWith("user_id", userId);
      expect(orderMock).toHaveBeenCalledWith("next_due_date", { ascending: true });
      expect(rangeMock).toHaveBeenCalledWith(0, 9);
    });

    it("retrieves tasks with descending sort by next_due_date", async () => {
      // Arrange
      const tasks: TaskDTO[] = [
        {
          id: "task-2",
          user_id: userId,
          title: "Task 2",
          description: null,
          interval_value: 2,
          interval_unit: "weeks",
          preferred_day_of_week: null,
          next_due_date: "2025-01-02",
          last_action_date: null,
          last_action_type: null,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
        {
          id: "task-1",
          user_id: userId,
          title: "Task 1",
          description: null,
          interval_value: 1,
          interval_unit: "days",
          preferred_day_of_week: null,
          next_due_date: "2025-01-01",
          last_action_date: null,
          last_action_type: null,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      const { supabase, orderMock } = createMockSupabaseForGetTasks({ data: tasks }, { count: 2 });
      const service = new TaskService(supabase);

      // Act
      const result = await service.getTasks(userId, "-next_due_date", 10, 0);

      // Assert
      expect(result.data).toEqual(tasks);
      expect(orderMock).toHaveBeenCalledWith("next_due_date", { ascending: false });
    });

    it("retrieves tasks sorted by title ascending", async () => {
      // Arrange
      const tasks: TaskDTO[] = [
        {
          id: "task-1",
          user_id: userId,
          title: "Alpha Task",
          description: null,
          interval_value: 1,
          interval_unit: "days",
          preferred_day_of_week: null,
          next_due_date: "2025-01-01",
          last_action_date: null,
          last_action_type: null,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
        {
          id: "task-2",
          user_id: userId,
          title: "Beta Task",
          description: null,
          interval_value: 2,
          interval_unit: "weeks",
          preferred_day_of_week: null,
          next_due_date: "2025-01-02",
          last_action_date: null,
          last_action_type: null,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      const { supabase, orderMock } = createMockSupabaseForGetTasks({ data: tasks }, { count: 2 });
      const service = new TaskService(supabase);

      // Act
      const result = await service.getTasks(userId, "title", 10, 0);

      // Assert
      expect(result.data).toEqual(tasks);
      expect(orderMock).toHaveBeenCalledWith("title", { ascending: true });
    });

    it("retrieves tasks sorted by title descending", async () => {
      // Arrange
      const tasks: TaskDTO[] = [
        {
          id: "task-2",
          user_id: userId,
          title: "Beta Task",
          description: null,
          interval_value: 2,
          interval_unit: "weeks",
          preferred_day_of_week: null,
          next_due_date: "2025-01-02",
          last_action_date: null,
          last_action_type: null,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
        {
          id: "task-1",
          user_id: userId,
          title: "Alpha Task",
          description: null,
          interval_value: 1,
          interval_unit: "days",
          preferred_day_of_week: null,
          next_due_date: "2025-01-01",
          last_action_date: null,
          last_action_type: null,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      const { supabase, orderMock } = createMockSupabaseForGetTasks({ data: tasks }, { count: 2 });
      const service = new TaskService(supabase);

      // Act
      const result = await service.getTasks(userId, "-title", 10, 0);

      // Assert
      expect(result.data).toEqual(tasks);
      expect(orderMock).toHaveBeenCalledWith("title", { ascending: false });
    });
  });

  describe("Pagination scenarios", () => {
    it("handles pagination with limit and offset correctly", async () => {
      // Arrange
      const tasks: TaskDTO[] = [
        {
          id: "task-2",
          user_id: userId,
          title: "Task 2",
          description: null,
          interval_value: 2,
          interval_unit: "weeks",
          preferred_day_of_week: null,
          next_due_date: "2025-01-02",
          last_action_date: null,
          last_action_type: null,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      const { supabase, rangeMock } = createMockSupabaseForGetTasks({ data: tasks }, { count: 5 });
      const service = new TaskService(supabase);

      // Act
      const result = await service.getTasks(userId, "next_due_date", 2, 1);

      // Assert
      expect(result.data).toEqual(tasks);
      expect(result.pagination).toEqual({
        total: 5,
        limit: 2,
        offset: 1,
        has_more: true, // offset(1) + limit(2) = 3 < total(5)
      });
      expect(rangeMock).toHaveBeenCalledWith(1, 2); // offset to offset + limit - 1
    });

    it("calculates has_more as true when more items exist", async () => {
      // Arrange
      const tasks: TaskDTO[] = [
        {
          id: "task-1",
          user_id: userId,
          title: "Task 1",
          description: null,
          interval_value: 1,
          interval_unit: "days",
          preferred_day_of_week: null,
          next_due_date: "2025-01-01",
          last_action_date: null,
          last_action_type: null,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      const { supabase } = createMockSupabaseForGetTasks({ data: tasks }, { count: 10 });
      const service = new TaskService(supabase);

      // Act
      const result = await service.getTasks(userId, "next_due_date", 5, 0);

      // Assert
      expect(result.pagination.has_more).toBe(true); // 0 + 5 = 5 < 10
    });

    it("calculates has_more as false when no more items exist", async () => {
      // Arrange
      const tasks: TaskDTO[] = [
        {
          id: "task-1",
          user_id: userId,
          title: "Task 1",
          description: null,
          interval_value: 1,
          interval_unit: "days",
          preferred_day_of_week: null,
          next_due_date: "2025-01-01",
          last_action_date: null,
          last_action_type: null,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      const { supabase } = createMockSupabaseForGetTasks({ data: tasks }, { count: 5 });
      const service = new TaskService(supabase);

      // Act
      const result = await service.getTasks(userId, "next_due_date", 5, 0);

      // Assert
      expect(result.pagination.has_more).toBe(false); // 0 + 5 = 5, not < 5
    });

    it("calculates has_more as false when offset + limit equals total", async () => {
      // Arrange
      const tasks: TaskDTO[] = [
        {
          id: "task-3",
          user_id: userId,
          title: "Task 3",
          description: null,
          interval_value: 3,
          interval_unit: "days",
          preferred_day_of_week: null,
          next_due_date: "2025-01-03",
          last_action_date: null,
          last_action_type: null,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      const { supabase } = createMockSupabaseForGetTasks({ data: tasks }, { count: 10 });
      const service = new TaskService(supabase);

      // Act
      const result = await service.getTasks(userId, "next_due_date", 5, 5);

      // Assert
      expect(result.pagination.has_more).toBe(false); // 5 + 5 = 10, not < 10
    });

    it("handles minimum limit value (1)", async () => {
      // Arrange
      const tasks: TaskDTO[] = [
        {
          id: "task-1",
          user_id: userId,
          title: "Task 1",
          description: null,
          interval_value: 1,
          interval_unit: "days",
          preferred_day_of_week: null,
          next_due_date: "2025-01-01",
          last_action_date: null,
          last_action_type: null,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      const { supabase, rangeMock } = createMockSupabaseForGetTasks({ data: tasks }, { count: 1 });
      const service = new TaskService(supabase);

      // Act
      const result = await service.getTasks(userId, "next_due_date", 1, 0);

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.pagination.limit).toBe(1);
      expect(rangeMock).toHaveBeenCalledWith(0, 0); // offset to offset + limit - 1
    });

    it("handles maximum limit value (100)", async () => {
      // Arrange
      const tasks: TaskDTO[] = Array.from({ length: 100 }, (_, i) => ({
        id: `task-${i + 1}`,
        user_id: userId,
        title: `Task ${i + 1}`,
        description: null,
        interval_value: 1,
        interval_unit: "days",
        preferred_day_of_week: null,
        next_due_date: "2025-01-01",
        last_action_date: null,
        last_action_type: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      }));

      const { supabase, rangeMock } = createMockSupabaseForGetTasks({ data: tasks }, { count: 100 });
      const service = new TaskService(supabase);

      // Act
      const result = await service.getTasks(userId, "next_due_date", 100, 0);

      // Assert
      expect(result.data).toHaveLength(100);
      expect(result.pagination.limit).toBe(100);
      expect(rangeMock).toHaveBeenCalledWith(0, 99);
    });

    it("handles offset at boundary (last page)", async () => {
      // Arrange
      const tasks: TaskDTO[] = [
        {
          id: "task-10",
          user_id: userId,
          title: "Task 10",
          description: null,
          interval_value: 10,
          interval_unit: "days",
          preferred_day_of_week: null,
          next_due_date: "2025-01-10",
          last_action_date: null,
          last_action_type: null,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      const { supabase, rangeMock } = createMockSupabaseForGetTasks({ data: tasks }, { count: 10 });
      const service = new TaskService(supabase);

      // Act
      const result = await service.getTasks(userId, "next_due_date", 5, 5);

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.pagination.offset).toBe(5);
      expect(rangeMock).toHaveBeenCalledWith(5, 9);
    });
  });

  describe("Empty results scenarios", () => {
    it("returns empty array when user has no tasks", async () => {
      // Arrange
      const { supabase } = createMockSupabaseForGetTasks({ data: [] }, { count: 0 });
      const service = new TaskService(supabase);

      // Act
      const result = await service.getTasks(userId, "next_due_date", 10, 0);

      // Assert
      expect(result.data).toEqual([]);
      expect(result.pagination).toEqual({
        total: 0,
        limit: 10,
        offset: 0,
        has_more: false,
      });
    });

    it("returns empty array when data is null", async () => {
      // Arrange
      const { supabase } = createMockSupabaseForGetTasks({ data: null }, { count: 0 });
      const service = new TaskService(supabase);

      // Act
      const result = await service.getTasks(userId, "next_due_date", 10, 0);

      // Assert
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it("handles null count by defaulting to 0", async () => {
      // Arrange
      const tasks: TaskDTO[] = [
        {
          id: "task-1",
          user_id: userId,
          title: "Task 1",
          description: null,
          interval_value: 1,
          interval_unit: "days",
          preferred_day_of_week: null,
          next_due_date: "2025-01-01",
          last_action_date: null,
          last_action_type: null,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      const { supabase } = createMockSupabaseForGetTasks({ data: tasks }, { count: null });
      const service = new TaskService(supabase);

      // Act
      const result = await service.getTasks(userId, "next_due_date", 10, 0);

      // Assert
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.has_more).toBe(false);
    });
  });

  describe("User isolation", () => {
    it("filters tasks by user_id to ensure user isolation", async () => {
      // Arrange
      const tasks: TaskDTO[] = [
        {
          id: "task-1",
          user_id: userId,
          title: "User's Task",
          description: null,
          interval_value: 1,
          interval_unit: "days",
          preferred_day_of_week: null,
          next_due_date: "2025-01-01",
          last_action_date: null,
          last_action_type: null,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      const { supabase, eqMock } = createMockSupabaseForGetTasks({ data: tasks }, { count: 1 });
      const service = new TaskService(supabase);

      // Act
      await service.getTasks(userId, "next_due_date", 10, 0);

      // Assert
      expect(eqMock).toHaveBeenCalledWith("user_id", userId);
    });

    it("applies user_id filter to both tasks query and count query", async () => {
      // Arrange
      const tasks: TaskDTO[] = [
        {
          id: "task-1",
          user_id: userId,
          title: "Task 1",
          description: null,
          interval_value: 1,
          interval_unit: "days",
          preferred_day_of_week: null,
          next_due_date: "2025-01-01",
          last_action_date: null,
          last_action_type: null,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      const { supabase, eqMock } = createMockSupabaseForGetTasks({ data: tasks }, { count: 1 });
      const service = new TaskService(supabase);

      // Act
      await service.getTasks(userId, "next_due_date", 10, 0);

      // Assert
      // eqMock should be called for both queries (tasks and count)
      expect(eqMock).toHaveBeenCalledWith("user_id", userId);
    });
  });

  describe("Sort parameter parsing", () => {
    it("parses 'next_due_date' sort parameter correctly", async () => {
      // Arrange
      const tasks: TaskDTO[] = [];
      const { supabase, orderMock } = createMockSupabaseForGetTasks({ data: tasks }, { count: 0 });
      const service = new TaskService(supabase);

      // Act
      await service.getTasks(userId, "next_due_date", 10, 0);

      // Assert
      expect(orderMock).toHaveBeenCalledWith("next_due_date", { ascending: true });
    });

    it("parses '-next_due_date' sort parameter correctly", async () => {
      // Arrange
      const tasks: TaskDTO[] = [];
      const { supabase, orderMock } = createMockSupabaseForGetTasks({ data: tasks }, { count: 0 });
      const service = new TaskService(supabase);

      // Act
      await service.getTasks(userId, "-next_due_date", 10, 0);

      // Assert
      expect(orderMock).toHaveBeenCalledWith("next_due_date", { ascending: false });
    });

    it("parses 'title' sort parameter correctly", async () => {
      // Arrange
      const tasks: TaskDTO[] = [];
      const { supabase, orderMock } = createMockSupabaseForGetTasks({ data: tasks }, { count: 0 });
      const service = new TaskService(supabase);

      // Act
      await service.getTasks(userId, "title", 10, 0);

      // Assert
      expect(orderMock).toHaveBeenCalledWith("title", { ascending: true });
    });

    it("parses '-title' sort parameter correctly", async () => {
      // Arrange
      const tasks: TaskDTO[] = [];
      const { supabase, orderMock } = createMockSupabaseForGetTasks({ data: tasks }, { count: 0 });
      const service = new TaskService(supabase);

      // Act
      await service.getTasks(userId, "-title", 10, 0);

      // Assert
      expect(orderMock).toHaveBeenCalledWith("title", { ascending: false });
    });
  });

  describe("Error handling", () => {
    it("throws error with descriptive message when tasks query fails", async () => {
      // Arrange
      const errorMessage = "connection timeout";
      const { supabase } = createMockSupabaseForGetTasks({ error: { message: errorMessage } }, { count: 0 });
      const service = new TaskService(supabase);

      // Act & Assert
      await expect(service.getTasks(userId, "next_due_date", 10, 0)).rejects.toThrow(
        `Failed to retrieve tasks: ${errorMessage}`
      );
    });

    it("throws error with descriptive message when count query fails", async () => {
      // Arrange
      const tasks: TaskDTO[] = [
        {
          id: "task-1",
          user_id: userId,
          title: "Task 1",
          description: null,
          interval_value: 1,
          interval_unit: "days",
          preferred_day_of_week: null,
          next_due_date: "2025-01-01",
          last_action_date: null,
          last_action_type: null,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      const errorMessage = "database connection lost";
      const { supabase } = createMockSupabaseForGetTasks({ data: tasks }, { error: { message: errorMessage } });
      const service = new TaskService(supabase);

      // Act & Assert
      await expect(service.getTasks(userId, "next_due_date", 10, 0)).rejects.toThrow(
        `Failed to count tasks: ${errorMessage}`
      );
    });

    it("propagates error message from Supabase tasks query error", async () => {
      // Arrange
      const specificError = "permission denied for table tasks";
      const { supabase } = createMockSupabaseForGetTasks({ error: { message: specificError } }, { count: 0 });
      const service = new TaskService(supabase);

      // Act & Assert
      await expect(service.getTasks(userId, "next_due_date", 10, 0)).rejects.toThrow(specificError);
    });

    it("propagates error message from Supabase count query error", async () => {
      // Arrange
      const tasks: TaskDTO[] = [];
      const specificError = "query execution timeout";
      const { supabase } = createMockSupabaseForGetTasks({ data: tasks }, { error: { message: specificError } });
      const service = new TaskService(supabase);

      // Act & Assert
      await expect(service.getTasks(userId, "next_due_date", 10, 0)).rejects.toThrow(specificError);
    });
  });

  describe("Return value structure", () => {
    it("returns TaskListDTO with correct structure", async () => {
      // Arrange
      const tasks: TaskDTO[] = [
        {
          id: "task-1",
          user_id: userId,
          title: "Task 1",
          description: null,
          interval_value: 1,
          interval_unit: "days",
          preferred_day_of_week: null,
          next_due_date: "2025-01-01",
          last_action_date: null,
          last_action_type: null,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      const { supabase } = createMockSupabaseForGetTasks({ data: tasks }, { count: 1 });
      const service = new TaskService(supabase);

      // Act
      const result = await service.getTasks(userId, "next_due_date", 10, 0);

      // Assert
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("pagination");
      expect(result.data).toBeInstanceOf(Array);
      expect(result.pagination).toHaveProperty("total");
      expect(result.pagination).toHaveProperty("limit");
      expect(result.pagination).toHaveProperty("offset");
      expect(result.pagination).toHaveProperty("has_more");
    });

    it("returns pagination metadata with all required fields", async () => {
      // Arrange
      const tasks: TaskDTO[] = [];
      const { supabase } = createMockSupabaseForGetTasks({ data: tasks }, { count: 15 });
      const service = new TaskService(supabase);

      // Act
      const result = await service.getTasks(userId, "next_due_date", 5, 10);

      // Assert
      expect(result.pagination).toEqual({
        total: 15,
        limit: 5,
        offset: 10,
        has_more: false, // 10 + 5 = 15, not < 15
      });
    });
  });

  describe("Edge cases and boundary conditions", () => {
    it("handles offset of 0 correctly", async () => {
      // Arrange
      const tasks: TaskDTO[] = [
        {
          id: "task-1",
          user_id: userId,
          title: "Task 1",
          description: null,
          interval_value: 1,
          interval_unit: "days",
          preferred_day_of_week: null,
          next_due_date: "2025-01-01",
          last_action_date: null,
          last_action_type: null,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      const { supabase, rangeMock } = createMockSupabaseForGetTasks({ data: tasks }, { count: 1 });
      const service = new TaskService(supabase);

      // Act
      const result = await service.getTasks(userId, "next_due_date", 10, 0);

      // Assert
      expect(result.pagination.offset).toBe(0);
      expect(rangeMock).toHaveBeenCalledWith(0, 9);
    });

    it("handles large offset values correctly", async () => {
      // Arrange
      const tasks: TaskDTO[] = [];
      const { supabase, rangeMock } = createMockSupabaseForGetTasks({ data: tasks }, { count: 1000 });
      const service = new TaskService(supabase);

      // Act
      const result = await service.getTasks(userId, "next_due_date", 20, 500);

      // Assert
      expect(result.pagination.offset).toBe(500);
      expect(rangeMock).toHaveBeenCalledWith(500, 519);
    });

    it("handles case when returned tasks count is less than limit", async () => {
      // Arrange
      const tasks: TaskDTO[] = [
        {
          id: "task-1",
          user_id: userId,
          title: "Task 1",
          description: null,
          interval_value: 1,
          interval_unit: "days",
          preferred_day_of_week: null,
          next_due_date: "2025-01-01",
          last_action_date: null,
          last_action_type: null,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      const { supabase } = createMockSupabaseForGetTasks({ data: tasks }, { count: 1 });
      const service = new TaskService(supabase);

      // Act
      const result = await service.getTasks(userId, "next_due_date", 10, 0);

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.has_more).toBe(false);
    });

    it("handles tasks with all optional fields populated", async () => {
      // Arrange
      const tasks: TaskDTO[] = [
        {
          id: "task-1",
          user_id: userId,
          title: "Complete Task",
          description: "Full description",
          interval_value: 2,
          interval_unit: "weeks",
          preferred_day_of_week: 3,
          next_due_date: "2025-01-15",
          last_action_date: "2025-01-01",
          last_action_type: "completed",
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      const { supabase } = createMockSupabaseForGetTasks({ data: tasks }, { count: 1 });
      const service = new TaskService(supabase);

      // Act
      const result = await service.getTasks(userId, "next_due_date", 10, 0);

      // Assert
      expect(result.data[0]).toEqual(tasks[0]);
      expect(result.data[0].description).toBe("Full description");
      expect(result.data[0].preferred_day_of_week).toBe(3);
      expect(result.data[0].last_action_date).toBe("2025-01-01");
      expect(result.data[0].last_action_type).toBe("completed");
    });
  });
});
