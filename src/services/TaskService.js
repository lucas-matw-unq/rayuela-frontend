import RayuelaService from "@/services/RayuelaService";

class TaskService extends RayuelaService {
    getAdminTasksForProject(projectId, filterUseless = false) {
        return this.get(`/task/admin/project/${projectId}`)
            .then(r => (r || []).filter(t => (t.timeInterval?.name !== 'unavailable' && t.areaGeoJSON) || !filterUseless));
    }

    getTaskForProject(projectId, filterUseless = false) {
        return this.get(`/task/project/${projectId}`)
            .then(r => (r || []).filter(t => (t.timeInterval?.name !== 'unavailable' && t.areaGeoJSON) || !filterUseless));
    }

    async bulkSave(tasks, projectId) {
        return this.post(`/task/project/${projectId}/bulk`, tasks);
    }

    removeUselessTasks(projectId) {
        return this.delete(`/task/project/${projectId}/useless`);
    }
}

export default new TaskService(); // Sinleton pattern
