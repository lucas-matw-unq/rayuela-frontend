import RayuelaService from "@/services/RayuelaService";
import {store} from "@/vuex/state";

class GamificationService extends RayuelaService {

    async deleteBadge(id, projectId) {
        const pId = projectId || store.state.project?._id || store.state.project?.id;
        return this.delete(`/gamification/${pId}/badge/${id}`);
    }

    async getGamification(projectId) {
        return this.get('/gamification/' + projectId);
    }

    async update(badge) {
        return this.patch('/gamification/badge/' + badge._id, badge);
    }

    async createBadge(badge, projectId) {
        return this.post('/gamification/badge', {projectId, ...badge});
    }

    async getBadgeById(badgeId) {
        return this.get(`/gamification/${badgeId}`);
    }

    async createScoreRule(body) {
        return this.post('/gamification/score-rule', body);
    }

    async updateScoreRule(body) {
        return this.patch('/gamification/score-rule', body);
    }

    async deleteScoreRule(id, projectId) {
        const pId = projectId || store.state.project?._id || store.state.project?.id;
        return this.delete(`/gamification/${pId}/score-rule/${id}`);
    }

    getLeaderboardFor(projectId) {
        return this.get(`/leaderboard/${projectId}`);
    }

    getCheckins(projectId) {
        return this.get(`/checkin/user/${projectId}`);
    }

    registerCheckin(body) {
        return this.post('/checkin', body);
    }


    rate(rate, checkinId) {
        return this.post('/checkin/rate', {rate, checkinId});
    }
}

export default new GamificationService(); // Sinleton pattern
