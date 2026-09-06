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

    /**
     * Moves a badge through the fading lifecycle.
     *
     *   'faded'   opens the window — `expiresAt` (ISO, must be in the future)
     *             is required, and `fadeReason` is shown to volunteers next
     *             to the countdown.
     *   'expired' closes it immediately.
     *   'active'  is the manual restitution; it wipes the fade record.
     *
     * The backend rejects an unknown status and a window that is missing or
     * already in the past, so the caller can surface those as-is.
     */
    async updateBadgeStatus(projectId, badgeId, status, {expiresAt, fadeReason} = {}) {
        return this.patch(
            `/gamification/${projectId}/badge/${badgeId}/status/${status}`,
            {expiresAt, fadeReason},
        );
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
