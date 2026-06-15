<template>
  <v-container v-if="project.user?.isSubscribed">
    <h1>{{ project.name }} </h1>
    <hr>
    <!-- Áreas del Proyecto -->
    <GeoMap :visualization="true"
            v-if="project.areas && checkins !== null" :checkins="checkins" :tasks="tasks" :area="project.areas"
            @selected-area="updateSelectedArea"
    />
    <small>{{ $t('project.click_areas_hint') }}</small>
    <v-alert v-if="project.gamificationStrategy === 'ELASTICA'" type="info" variant="outlined" class="mt-4">
      <span v-html="$t('project.turbo_mode_alert')"></span>
    </v-alert>
    <!-- Tabla de Tareas -->
    <div class="mt-6">
      <v-data-table
          :items="formattedTasks"
          :no-data-text="$t('leaderboard.no_data')"
          :headers="taskHeaders"
          item-value="formatted"
          dense
          class="elevation-1"
          :search="tableSearch"
      >
        <template v-slot:top>
          <v-toolbar flat>
            <v-toolbar-title style="flex:1">
              <div style="display: flex; justify-content: space-between; margin-right: 8px">
                {{ $t('project.tasks_title') }}
              </div>
            </v-toolbar-title>
            <v-text-field
                v-model="tableSearch"
                :placeholder="$t('project.search_placeholder')"
                clearable
                dense
                hide-details
                style="max-width: 300px"
            />
          </v-toolbar>
        </template>

        <!-- Slot para modificar la visualización de las filas -->
        <template v-slot:item="{ item }">
          <tr :class="{ 'resolved-task': item.solved }" @click.stop="showTaskDetail(item)" style="cursor: pointer">
            <td>
              <span :class="{ 'text-decoration-line-through': item.solved }">
                {{ item.formatted }}
                <v-badge
                    v-if="item.solved"
                    color="green"
                    :content="$t('project.solved_by', { name: item.solvedBy })"
                    inline
                ></v-badge>
                <v-badge
                    v-if="!item.solved"
                    color="blue"
                    :content="$t('project.pending')"
                    inline
                ></v-badge>
              </span>
            </td>
          </tr>
        </template>
      </v-data-table>
    </div>
    <RegisterCheckin @modalClosed="handleModalClosed"
                     :task-types="project.taskTypes"
                     :manual-location-enabled="project.manualLocation"
                     :areas="project.areas"
                     class="floating-button"
    />

    <div class="badges-header">
      <h2>{{ $t('project.badges_title') }}</h2>
      <v-btn-toggle v-model="badgeViewMode" mandatory density="compact" class="ml-4">
        <v-btn value="grid" size="small">
          <v-icon start>mdi-view-grid</v-icon>
          {{ $t('project.badge_grid_toggle') }}
        </v-btn>
        <v-btn value="graph" size="small">
          <v-icon start>mdi-graph-outline</v-icon>
          {{ $t('project.badge_graph_toggle') }}
        </v-btn>
      </v-btn-toggle>
    </div>
    <div class="pa-4 mb-6">
      <!-- Grid view -->
      <div v-if="badgeViewMode === 'grid'" class="badges-container">
        <v-alert :title="$t('project.no_badges_title')"
                 color="gray"
                 variant="tonal"
                 v-if="project.user.badges.length === 0">{{ $t('project.no_badges_message') }}
        </v-alert>
        <div v-for="(badge, index) in project.user.badges" :key="index" class="badge-item">
          <img
              :src="badge.imageUrl"
              :alt="$t('project.image_alt')"
              :class="{ 'grayscale': !badge.active }"
              @click="toggleTooltip(index)"
          />
          <h6>{{ badge.name }}</h6>
        </div>
      </div>
      <!-- Graph view -->
      <BadgeDependencyGraph
          v-if="badgeViewMode === 'graph'"
          :badges="project.user.badges"
          :readonly="true"
          @badge-click="onGraphBadgeClick"
      />
      <v-dialog v-model="taskDetailDialog" max-width="500">
        <v-card v-if="taskDetail">
          <v-card-title class="headline">{{ $t('project.task_detail_title') }}</v-card-title>
          <v-card-text>
            <p>{{
                taskDetail.taskDescription
              }}</p>
            <p><strong>{{ $t('project.time_interval_label') }}</strong> {{
                taskDetail.intervalDescription || taskDetail.timeInterval?.name
              }}</p>
            <p><strong>{{ $t('project.task_type_label') }}</strong> {{ taskDetail.type }}</p>
            <p v-if="taskDetail.timeInterval">
              <strong>{{ $t('project.schedule_label') }}</strong>
              {{ $t('project.time_range', { start: taskDetail.timeInterval?.time?.start, end: taskDetail.timeInterval?.time?.end ?? '', suffix: $t('common.hours_suffix') }) }}
            </p>
            <p v-if="taskDetail.timeInterval?.days">
              <strong>{{ $t('project.days_label') }}</strong>
              <span v-for="(day, idx) in taskDetail.timeInterval.days" :key="day">
          {{ $t(`common.days[${day}]`) }}<span v-if="idx < taskDetail.timeInterval.days.length - 1">, </span>
        </span>
            </p>
          </v-card-text>
          <v-card-actions>
            <v-spacer/>
            <v-btn text @click="taskDetailDialog = false">{{ $t('common.close') }}</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog v-model="showBadgeDialog" max-width="500">
        <v-card v-if="selectedBadge">
          <v-card-title class="headline">{{ selectedBadge.name }}</v-card-title>
          <v-card-text>
            <div style="display:flex; gap:16px; align-items:flex-start">
              <img :src="selectedBadge.imageUrl" alt="" width="90" height="90"/>
              <div>
                <p><strong>{{ $t('project.badge_rules_label') }}</strong></p>
                <ul>
                  <li>{{ $t('project.previous_badges_label') }} {{
                      selectedBadge.previousBadges.length > 0 ? selectedBadge.previousBadges.toString() : $t('common.none')
                    }}
                  </li>
                  <li>{{ $t('project.checkins_amount_label') }} {{ selectedBadge.checkinsAmount }}</li>
                  <li v-if="selectedBadge.mustContribute">{{ $t('project.must_contribute_hint') }}</li>
                  <li>{{ $t('project.area_label') }} {{ selectedBadge.areaId }}</li>
                  <li>{{ $t('project.interval_label') }} {{ selectedBadge.timeIntervalId }}</li>
                  <li>{{ $t('project.type_label') }} {{ selectedBadge.taskType }}</li>
                </ul>
              </div>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-spacer/>
            <v-btn text @click="showBadgeDialog = false">{{ $t('common.close') }}</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>
    <h2>{{ $t('project.points_title') }}</h2>
    <h3>{{ $t('project.user_points', { points: project.user.points }) }}</h3>
    <Leaderboard :leaderboard="leaderboard" :leaderboardStrategy="project.leaderboardStrategy"/>
    <UserCheckins :checkins="checkins"/>
    <h1 class="mb-6">{{ $t('admin.project_detail') }}</h1>

    <!-- Sección de explicación de intervalos de tiempo -->
    <h2>{{ $t('project.intervals_title') }}</h2>
    <v-card class="pa-4 mb-6">
      <p>
        {{ $t('project.intervals_description') }}
      </p>
      <ul>
        <li v-for="interval in project.timeIntervals" :key="interval._id">
          <strong>{{ interval.name }}</strong>:
          <span>
                {{ $t('project.time_range', { start: interval.time.start, end: interval.time.end, suffix: $t('common.hours_suffix') }) }},
                {{ $t('project.days_label').toLowerCase() }}
                <span v-for="(day, idx) in interval.days" :key="day">
                  {{ $t(`common.days[${day}]`) }}<span v-if="idx < interval.days.length - 1">, </span>
                </span>
              </span>
        </li>
      </ul>
    </v-card>

    <h2>{{ $t('project.type_label').replace(':', '') }}</h2>
    <v-card class="pa-4 mb-6">
      <ul>
        <li v-for="(type, idx) in project.taskTypes" :key="idx" class="mb-2">
          <template v-if="typeof type === 'string'">
            <strong>{{ type }}</strong>
          </template>
          <template v-else>
            <strong>{{ type.name }}</strong>
            <div v-if="type.description" class="text-body-2 mt-1" style="color: #666;">
              <span v-html="renderDescription(type.description)"></span>
            </div>
          </template>
        </li>
      </ul>
    </v-card>
  </v-container>
  <v-container v-if="!project.user?.isSubscribed">
    <!-- Información del Proyecto -->
    <v-card class="pa-4 mb-6">
      <v-row>
        <v-col cols="12" md="6">
          <v-img :src="project.image" :alt="$t('project.image_alt')" class="mb-4" contain/>
        </v-col>
        <v-col cols="12" md="6">
          <h2>{{ project.name }}</h2>
          <p class="text-subtitle-1 mb-3" v-html="project.description.replace(/\n/g, '<br>')"></p>
          <v-btn :href="project.web" target="_blank" color="primary" class="mb-2">
            {{ $t('project.visit_website') }}
          </v-btn>
          <v-btn
              color="blue"
              class="mb-2 ml-2"
              @click="shareProject"
          >
            <v-icon left>mdi-share</v-icon>
            {{ $t('common.share') }}
          </v-btn>
        </v-col>
      </v-row>
    </v-card>
    <v-btn color="green" block large @click="subscribe">
      <v-icon left size="large">mdi-account-plus</v-icon>
      {{ $t('project.button_subscribe') }}
    </v-btn>
  </v-container>
  <v-btn
      color="blue"
      class="mb-2 ml-2"
      @click="shareProject"
  >
    <v-icon left>mdi-share</v-icon>
    {{ $t('project.button_share') }}
  </v-btn>
</template>

<script setup>
import {ref, computed, onMounted} from 'vue';
import {useRoute} from 'vue-router';
import GeoMap from '@/views/Admin/GeoMap.vue';
import ProjectsService from '@/services/ProjectsService';
import TaskService from '@/services/TaskService';
import Leaderboard from '@/views/Leaderboard.vue';
import RegisterCheckin from '@/components/RegisterCheckin.vue';
import {toast} from "vue3-toastify";
import GamificationService from "@/services/GamificationService";
import CheckinService from "@/services/CheckinService";
import UserCheckins from "@/components/UserCheckins.vue";
import BadgeDependencyGraph from '@/components/BadgeDependencyGraph.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const renderDescription = (text) => {
  if (!text) return '';
  let safeText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
    
  const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  safeText = safeText.replace(mdLinkRegex, (match, linkText, url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #4DBA87; text-decoration: underline;">${linkText}</a>`;
  });

  const rawUrlRegex = /(?<!href=")(https?:\/\/[^\s<]+)/g;
  safeText = safeText.replace(rawUrlRegex, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #4DBA87; text-decoration: underline;">${url}</a>`;
  });

  return safeText;
};

const route = useRoute();
const tasks = ref([]);
const leaderboard = ref([]);
const checkins = ref(null);
const tableSearch = ref('');
const taskDetailDialog = ref(false);
const taskDetail = ref(null);
const badgeTooltip = ref(-1);
const badgeViewMode = ref('grid');

const toggleTooltip = (index) => {
  badgeTooltip.value = index;
};

const showBadgeDialog = computed({
  get: () => badgeTooltip.value !== -1,
  set: (val) => {
    if (!val) badgeTooltip.value = -1;
  }
});

function showTaskDetail(item) {
  taskDetail.value = item;
  taskDetailDialog.value = true;
}

const selectedBadge = computed(() => {
  return badgeTooltip.value === -1 ? null : project.value.user?.badges?.[badgeTooltip.value] ?? null;
});

const onGraphBadgeClick = (badge) => {
  const index = project.value.user?.badges?.findIndex(b => b._id === badge._id) ?? -1;
  if (index !== -1) toggleTooltip(index);
};

const project = ref({
  name: '',
  description: '',
  image: '',
  web: '',
  available: false,
  taskTypes: [],
  areas: null
});

const subscribe = () => {
  ProjectsService.toggleSubscription(route.params.projectId)
      .then(async () => {
        toast.success(t("project.subscribe_success"));
        project.value = await ProjectsService.getProjectById(route.params.projectId);
      });
}

const taskHeaders = computed(() => [
  {title: t('project.task_detail_title'), value: 'formatted'},
]);

const handleModalClosed = async () => {
  project.value = await ProjectsService.getProjectById(route.params.projectId);
  leaderboard.value = (await GamificationService.getLeaderboardFor(route.params.projectId))?.users;
  checkins.value = await CheckinService.getByProject(route.params.projectId);
  tasks.value = await TaskService.getTaskForProject(route.params.projectId, true);
};

const updateSelectedArea = (areaId) => {
  tableSearch.value = areaId;
};

const shareProject = () => {
  const text = t("project.share_text", { name: project.value.name });
  if (navigator.share) {
    navigator.share({
      title: project.value.name,
      text,
      url: `https://rayuela-frontend.vercel.app/public/project/${project.value.id}/view`,
    });
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }
};

const formattedTasks = computed(() => {
  return tasks.value.map(task => ({
    formatted: `[${task.areaGeoJSON.properties.id}] ${task.points}pts - ${task.timeInterval.name} - ${task.type}`,
    solved: task.solved,
    solvedBy: task.solvedBy || '',
    intervalDescription: task.timeInterval?.description || '',
    taskDescription: task.description || '',
    type: task.type,
    timeInterval: task.timeInterval
  }));
});

onMounted(async () => {
  project.value = await ProjectsService.getProjectById(route.params.projectId);
  tasks.value = await TaskService.getTaskForProject(route.params.projectId, true);
  checkins.value = await CheckinService.getByProject(route.params.projectId);
  leaderboard.value = (await GamificationService.getLeaderboardFor(route.params.projectId))?.users;
});
</script>

<style scoped>
.mb-6 {
  margin-bottom: 24px;
}

.mb-4 {
  margin-bottom: 16px;
}

.mt-6 {
  margin-top: 24px;
}

.text-subtitle-1 {
  font-size: 16px;
  color: #555;
}

.badges-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.badges-container {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
}

.badge-item {
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
}

.badge-item img {
  cursor: pointer;
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.floating-button {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
}

.resolved-task {
  background-color: #e0e0e0 !important;
}

.text-decoration-line-through {
  text-decoration: line-through;
  color: #757575;
}

.grayscale {
  filter: grayscale(70%) brightness(85%);
  opacity: 0.2;
}
</style>
