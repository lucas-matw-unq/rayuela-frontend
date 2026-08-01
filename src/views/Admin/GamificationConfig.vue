<script setup>
import { computed, onMounted, ref } from "vue";
import BadgesService from "@/services/GamificationService";
import { useRoute, useRouter } from "vue-router";
import { toast } from "vue3-toastify";
import { store } from "@/vuex/state";
import GamificationService from "@/services/GamificationService";
import ProjectsService from "@/services/ProjectsService";
import BreadCrumb from "@/components/utils/BreadCrumb.vue";
import BadgeDependencyGraph from "@/components/BadgeDependencyGraph.vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const ADAPTATION_STRATEGIES = {
  NO_ADAPTATION: "NO_ADAPTATION",
  ELASTIC_POINTS: "ELASTIC_POINTS",
  CHALLENGE_RECOMMENDATION: "CHALLENGE_RECOMMENDATION",
};

const badges = ref([]);
const scoreRules = ref([]);
const projectSettings = ref({
  id: null,
  gamificationStrategy: "SIN ADAPTACION",
  leaderboardStrategy: "PUNTOS PRIMERO",
  recommendationStrategy: "SIMPLE",
});
const selectedAdaptationStrategy = ref(ADAPTATION_STRATEGIES.NO_ADAPTATION);
const savingSettings = ref(false);

const badgeHeaders = ref([
  { title: t("admin.badge_name_label"), value: "name", sortable: true },
  { title: t("common.actions"), value: "actions", sortable: false },
]);

const scoreRuleHeaders = ref([
  { title: t("admin.score_label"), value: "label", sortable: true },
  { title: t("common.actions"), value: "actions", sortable: false },
]);

const showBadgeGraph = ref(false);

const selectedBadge = ref(null);
const selectedScoreRule = ref(null);
const dialogDisableBadge = ref(false);
const dialogDisableScoreRule = ref(false);

const router = useRouter();
const route = useRoute();

const adaptationStrategyOptions = computed(() => [
  {
    title: t("admin.adaptation_option_none"),
    value: ADAPTATION_STRATEGIES.NO_ADAPTATION,
    description: t("admin.adaptation_option_none_description"),
  },
  {
    title: t("admin.adaptation_option_elastic"),
    value: ADAPTATION_STRATEGIES.ELASTIC_POINTS,
    description: t("admin.adaptation_option_elastic_description"),
  },
  {
    title: t("admin.adaptation_option_recommendation"),
    value: ADAPTATION_STRATEGIES.CHALLENGE_RECOMMENDATION,
    description: t("admin.adaptation_option_recommendation_description"),
  },
]);

const leaderboardOptions = computed(() => [
  {
    title: t("admin.leaderboard_option_points_first"),
    value: "PUNTOS PRIMERO",
  },
  {
    title: t("admin.leaderboard_option_badges_first"),
    value: "MEDALLAS PRIMERO",
  },
]);

const selectedAdaptationDescription = computed(() => {
  const selectedOption = adaptationStrategyOptions.value.find(
    ({ value }) => value === selectedAdaptationStrategy.value
  );

  return selectedOption?.description || "";
});

const resolveAdaptationStrategy = (project) => {
  if (project.recommendationStrategy === "ADAPTATIVO") {
    return ADAPTATION_STRATEGIES.CHALLENGE_RECOMMENDATION;
  }

  if (project.gamificationStrategy === "ELASTICA") {
    return ADAPTATION_STRATEGIES.ELASTIC_POINTS;
  }

  return ADAPTATION_STRATEGIES.NO_ADAPTATION;
};

const getAdaptationPayload = (adaptationStrategy) => {
  switch (adaptationStrategy) {
    case ADAPTATION_STRATEGIES.ELASTIC_POINTS:
      return {
        gamificationStrategy: "ELASTICA",
        recommendationStrategy: "SIMPLE",
      };
    case ADAPTATION_STRATEGIES.CHALLENGE_RECOMMENDATION:
      return {
        gamificationStrategy: "SIN ADAPTACION",
        recommendationStrategy: "ADAPTATIVO",
      };
    default:
      return {
        gamificationStrategy: "SIN ADAPTACION",
        recommendationStrategy: "SIMPLE",
      };
  }
};

onMounted(async () => {
  store.commit("setCurrentBadge", null);
  store.commit("setScoreRule", null);
  const [gamification, project] = await Promise.all([
    BadgesService.getGamification(route.params.projectId),
    ProjectsService.getProjectById(route.params.projectId),
  ]);
  store.commit("setCurrentGamification", gamification);
  store.commit("setProject", project);
  badges.value = gamification.badgesRules;
  scoreRules.value = gamification.pointRules;
  projectSettings.value = {
    id: project.id || project._id,
    gamificationStrategy: project.gamificationStrategy || "SIN ADAPTACION",
    leaderboardStrategy: project.leaderboardStrategy || "PUNTOS PRIMERO",
    recommendationStrategy: project.recommendationStrategy || "SIMPLE",
  };
  selectedAdaptationStrategy.value = resolveAdaptationStrategy(
    projectSettings.value
  );
});

const editBadge = (badge) => {
  store.commit("setCurrentBadge", badge);
  router.push(
    `/admin/project/${route.params.projectId}/gamification/badge/${badge._id}`
  );
};

const addBadge = () => {
  router.push(
    `/admin/project/${route.params.projectId}/gamification/badge/new`
  );
};

const confirmDeleteBadge = (badge) => {
  selectedBadge.value = badge;
  dialogDisableBadge.value = true;
};

const deleteBadge = async () => {
  selectedBadge.value.available = !selectedBadge.value.available;
  await GamificationService.deleteBadge(selectedBadge.value._id).then((res) => {
    toast.success(t("admin.badge_deleted_success"));
    dialogDisableBadge.value = false;
    badges.value = res.badges;
  });
};

const onGraphBadgeClick = (badge) => {
  editBadge(badge);
};

const editScoreRule = (scoreRule) => {
  store.commit("setScoreRule", scoreRule);
  router.push(
    `/admin/project/${route.params.projectId}/gamification/score-rule/${scoreRule._id}`
  );
};

const addScoreRule = () => {
  router.push(
    `/admin/project/${route.params.projectId}/gamification/score-rule/new`
  );
};

const confirmDisableScoreRule = (scoreRule) => {
  selectedScoreRule.value = scoreRule;
  dialogDisableScoreRule.value = true;
};

const deleteScoreRule = async () => {
  await GamificationService.deleteScoreRule(selectedScoreRule.value._id).then(
    (res) => {
      toast.success("Regla de puntaje eliminada :)");
      dialogDisableScoreRule.value = false;
      scoreRules.value = res.pointRules;
    }
  );
};

const saveGamificationSettings = async () => {
  savingSettings.value = true;

  try {
    const adaptationPayload = getAdaptationPayload(
      selectedAdaptationStrategy.value
    );
    await ProjectsService.updateProject({
      id: projectSettings.value.id,
      leaderboardStrategy: projectSettings.value.leaderboardStrategy,
      ...adaptationPayload,
    });

    projectSettings.value = {
      ...projectSettings.value,
      ...adaptationPayload,
    };

    toast.success(t("admin.gamification_settings_updated_success"));
  } finally {
    savingSettings.value = false;
  }
};
</script>

<template>
  <main>
    <BreadCrumb items="gamificationPath" />
    <h1 class="mb-6">{{ $t("admin.edit_gamification") }}</h1>

    <v-container class="px-0">
      <v-card class="pa-4 mb-6">
        <h2>{{ $t("admin.gamification_settings_title") }}</h2>
        <p class="text-body-2 mb-4">{{ $t("admin.gamification_info_text") }}</p>
        <v-select
          v-model="selectedAdaptationStrategy"
          :label="$t('admin.adaptation_type_label')"
          :items="adaptationStrategyOptions"
          :hint="selectedAdaptationDescription"
          class="mb-4"
          item-title="title"
          item-value="value"
          persistent-hint
          required
        />
        <v-select
          v-model="projectSettings.leaderboardStrategy"
          :label="$t('admin.leaderboard_type_label')"
          :items="leaderboardOptions"
          item-title="title"
          item-value="value"
          required
        />
        <div style="display: flex; justify-content: flex-end">
          <v-btn
            color="primary"
            :loading="savingSettings"
            @click="saveGamificationSettings"
          >
            {{ $t("common.save") }}
          </v-btn>
        </div>
      </v-card>
    </v-container>

    <!-- Sección de Insignias -->
    <h1>{{ $t("admin.badges") }}</h1>
    <div style="display: flex; justify-content: flex-end">
      <v-btn color="black" @click="addBadge">{{ $t("admin.add_badge") }}</v-btn>
    </div>
    <v-container>
      <v-data-table
        :headers="badgeHeaders"
        :items="badges"
        :no-data-text="'Aún no hay datos para mostrar.'"
        class="elevation-1"
      >
        <template v-slot:item.actions="{ item }">
          <v-menu offset-y>
            <template #activator="{ props }">
              <v-btn variant="flat" v-bind="props" icon>
                <v-icon>mdi-dots-vertical</v-icon>
              </v-btn>
            </template>
            <v-list>
              <v-list-item @click="editBadge(item)">
                <v-list-item-title>{{
                  $t("admin.edit_badge")
                }}</v-list-item-title>
              </v-list-item>
              <v-list-item @click="confirmDeleteBadge(item)">
                <v-list-item-title>{{ $t("common.delete") }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </template>
      </v-data-table>

      <v-dialog v-model="dialogDisableBadge" max-width="400px">
        <v-card>
          <v-card-title class="headline">{{
            $t("admin.confirm_title")
          }}</v-card-title>
          <v-card-text>
            {{
              $t("admin.confirm_message", {
                action: $t("common.delete").toLowerCase(),
                name: selectedBadge?.name,
              })
            }}
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" text @click="dialogDisableBadge = false">{{
              $t("common.cancel")
            }}</v-btn>
            <v-btn color="warning" text @click="deleteBadge">{{
              $t("common.delete")
            }}</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Badge Dependency Graph -->
      <v-btn
        variant="text"
        class="mt-4"
        @click="showBadgeGraph = !showBadgeGraph"
        prepend-icon="mdi-graph-outline"
      >
        {{ $t("project.badge_graph_admin_section") }}
        <v-icon end>{{
          showBadgeGraph ? "mdi-chevron-up" : "mdi-chevron-down"
        }}</v-icon>
      </v-btn>
      <v-expand-transition>
        <div v-show="showBadgeGraph" class="mt-2">
          <BadgeDependencyGraph
            :badges="badges"
            :readonly="false"
            @badge-click="onGraphBadgeClick"
          />
        </div>
      </v-expand-transition>
    </v-container>

    <!-- Sección de Reglas de Puntaje -->
    <h1>{{ $t("admin.score_rules") }}</h1>
    <div style="display: flex; justify-content: flex-end">
      <v-btn color="black" @click="addScoreRule">{{
        $t("admin.add_score_rule")
      }}</v-btn>
    </div>
    <v-container>
      <v-data-table
        :headers="scoreRuleHeaders"
        :items="scoreRules"
        :no-data-text="'Aún no hay datos para mostrar.'"
        class="elevation-1"
      >
        <template v-slot:item.label="{ item }">
          {{
            `[${item.score}pts] Area ${item.areaId}, Intervalo ${item.timeIntervalId}, Tipo ${item.taskType}`
          }}
        </template>
        <template v-slot:item.actions="{ item }">
          <v-menu offset-y>
            <template #activator="{ props }">
              <v-btn variant="flat" v-bind="props" icon>
                <v-icon>mdi-dots-vertical</v-icon>
              </v-btn>
            </template>
            <v-list>
              <v-list-item @click="editScoreRule(item)">
                <v-list-item-title>{{
                  $t("admin.edit_score_rule")
                }}</v-list-item-title>
              </v-list-item>
              <v-list-item @click="confirmDisableScoreRule(item)">
                <v-list-item-title>{{ $t("common.delete") }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </template>
      </v-data-table>

      <v-dialog v-model="dialogDisableScoreRule" max-width="400px">
        <v-card>
          <v-card-title class="headline">{{
            $t("admin.confirm_title")
          }}</v-card-title>
          <v-card-text>
            {{
              $t("admin.confirm_message", {
                action: $t("common.delete").toLowerCase(),
                name: selectedScoreRule?.name,
              })
            }}
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              color="primary"
              text
              @click="dialogDisableScoreRule = false"
              >{{ $t("common.cancel") }}</v-btn
            >
            <v-btn color="warning" text @click="deleteScoreRule">{{
              $t("common.delete")
            }}</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>
  </main>
</template>

<style scoped>
.component-container {
  display: inline-block;
}
</style>
