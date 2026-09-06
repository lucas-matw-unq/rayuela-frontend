<template>
  <v-breadcrumbs density="compact" :items="addDisabledToLast(rules[props.items])">
    <template v-slot:divider>
      <v-icon icon="mdi-chevron-right"></v-icon>
    </template>
  </v-breadcrumbs>
</template>

<script setup>
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';

const route = useRoute();
const { t } = useI18n();

function addDisabledToLast(arr) {
  if (Array.isArray(arr) && arr.length > 0) {
    arr[arr.length - 1].disabled = true;
  }
  return arr;
}

const admin = {
  title: 'Administracion',
  href: '/admin',
};

const gamification = {
  title: 'Ludificacion',
  href: `/admin/project/${route.params.projectId}/gamification`,
};

const pointRule = {
  title: 'Regla de puntaje',
};

const badgeRule = {
  title: 'Insignia',
};

const projectDetails = {
  title: 'Datos del proyecto',
  href: `/admin/project/${route.params.projectId}/data`,
};

const taskManager = {
  title: 'Gestión de tareas',
  href: `/admin/project/${route.params.projectId}/data`,
};

const projectCheckins = {
  title: t('admin.checkins_title'),
};

const pointRulesPaths = [
  admin,gamification,pointRule
];

const badgePath = [
    admin, gamification, badgeRule
];

const gamificationPath = [
    admin, gamification
];

const fadingPath = [
    admin, gamification, { title: t('admin.fading_breadcrumb') }
];

const projectDetailsPath = [
    admin, projectDetails,
];

const taskManagerPath = [
    admin, projectDetails, taskManager
];

const checkinsPath = [
    admin, projectCheckins
];

const rules = {
  pointRulesPaths,
  badgePath,
  gamificationPath,
  fadingPath,
  projectDetailsPath,
  taskManagerPath,
  checkinsPath,
}

const props = defineProps({
  items: {
    type: String,
    required: true,
  },
});
</script>