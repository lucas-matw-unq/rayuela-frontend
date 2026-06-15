<template>
  <v-container>
    <BreadCrumb :items="'pointRulesPaths'"/>
    <h1 class="mb-6">{{ isNew ? $t('admin.create_point_rule') : $t('admin.edit_point_rule') }}</h1>

    <v-form @submit.prevent="saveScoreRule">
      <!-- Información de la Regla de Puntaje -->
      <v-card class="pa-4 mb-6">
        <h2>{{ $t('admin.rule_info') }}</h2>
        <v-text-field :label="$t('admin.score_label')" v-model.number="scoreRule.score" type="number" required/>

        <v-select
            :label="$t('admin.task_type')"
            v-model="scoreRule.taskType"
            :items="taskTypeOptions"
            required
        />

        <v-select
            :label="$t('admin.map')"
            v-model="scoreRule.areaId"
            :items="areaOptions"
            required
        />

        <v-select
            :label="$t('admin.interval_name_label')"
            v-model="scoreRule.timeIntervalId"
            :items="intervalOptions"
            required
        />

        <v-checkbox
            :label="$t('admin.must_contribute_label')"
            v-model="scoreRule.mustContribute"
        />
      </v-card>

      <!-- Botón de guardar -->
      <v-btn type="submit" variant="elevated" color="primary" width="100%">
        {{ isNew ? $t('admin.create_rule') : $t('admin.update_rule') }}
      </v-btn>
    </v-form>
  </v-container>
</template>

<script setup>
import {ref, onMounted} from 'vue';
import {toast} from 'vue3-toastify';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
import GamificationService from "@/services/GamificationService";
import {useRoute, useRouter} from "vue-router";
import {store} from "@/vuex/state";
import BreadCrumb from "@/components/utils/BreadCrumb.vue";

const route = useRoute();
const router = useRouter();
const isNew = ref(false);

const defaultScoreRule = {
  projectId: route.params.projectId,
  score: 0,
  taskType: t('common.any'),
  areaId: t('common.any'),
  timeIntervalId: t('common.any'),
  mustContribute: false,
};

const scoreRule = ref({...defaultScoreRule});

const taskTypeOptions = ref([]);
const areaOptions = ref([]);
const intervalOptions = ref([]);

const saveScoreRule = async () => {
  try {
    if (isNew.value) {
      await GamificationService.createScoreRule(scoreRule.value);
      toast.success(t('admin.rule_created_success'));
    } else {
      await GamificationService.updateScoreRule(scoreRule.value);
      toast.success(t('admin.rule_updated_success'));
    }
    router.push(`/admin/project/${route.params.projectId}/gamification`);
  } catch (error) {
    console.error("Error al guardar la regla de puntaje:", error);
    toast.error(t('admin.rule_save_error'));
  }
};

onMounted(async () => {
  try {
    const project = store.state.project;
    const ruleId = route.params.id;
    const names = (project.taskTypes || []).map(t => typeof t === 'string' ? t : t.name);
    taskTypeOptions.value = names.concat([t("common.any")]);
    areaOptions.value = project.areas.features.map(feature => feature.properties.id).concat([t("common.any")]);
    intervalOptions.value = project.timeIntervals.map(ti => ti.name).concat([t("common.any")]);

    if (ruleId === 'new') {
      isNew.value = true;
      scoreRule.value = {...defaultScoreRule};
    } else {
      isNew.value = false;
      const stateRule = store.state.currentScoreRule;
      scoreRule.value = {...defaultScoreRule, ...stateRule};
    }
  } catch (error) {
    router.push(`/admin`);
  }
});
</script>
