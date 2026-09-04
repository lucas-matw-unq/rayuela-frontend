import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/RayuelaService', () => ({
  default: class RayuelaService {
    get() {
      return Promise.resolve([]);
    }
    post() {
      return Promise.resolve();
    }
    delete() {
      return Promise.resolve();
    }
  },
}));

let TaskService;

describe('TaskService', () => {
  beforeAll(async () => {
    ({ default: TaskService } = await import('../TaskService'));
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls admin task endpoint and filters valid tasks when filterUseless is true', async () => {
    const rawTasks = [
      { id: '1', timeInterval: { name: 'Morning' }, areaGeoJSON: { properties: { id: 'a1' } } },
      { id: '2', timeInterval: { name: 'unavailable' }, areaGeoJSON: { properties: { id: 'a2' } } },
      { id: '3', timeInterval: { name: 'Morning' }, areaGeoJSON: null },
    ];
    const getSpy = vi.spyOn(TaskService, 'get').mockResolvedValue(rawTasks);

    const result = await TaskService.getAdminTasksForProject('p123', true);

    expect(getSpy).toHaveBeenCalledWith('/task/admin/project/p123');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('calls admin task endpoint without filtering when filterUseless is false', async () => {
    const rawTasks = [
      { id: '1', timeInterval: { name: 'unavailable' }, areaGeoJSON: null },
    ];
    const getSpy = vi.spyOn(TaskService, 'get').mockResolvedValue(rawTasks);

    const result = await TaskService.getAdminTasksForProject('p123', false);

    expect(getSpy).toHaveBeenCalledWith('/task/admin/project/p123');
    expect(result).toHaveLength(1);
  });
});
