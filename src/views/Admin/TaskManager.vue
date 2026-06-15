<template>
  <v-container>
    <BreadCrumb items="taskManagerPath"/>
    <h1 class="mb-6">{{ $t('admin.task_management') }}</h1>
    <div style="display: flex; margin: 1em 0; justify-content: space-between;">
      <v-btn color="error" @click="deleteAll" variant="text" :disabled="tasks.length === 0" class="mt-4">
        {{ $t('common.delete_all') }}
      </v-btn>
      <v-btn color="secondary" @click="generateTasks" :disabled="tasks.length !== 0" class="mt-4">
        {{ $t('admin.generate_auto_tasks') }}
      </v-btn>
      <v-btn color="primary" @click="addNewTask" class="mt-4">
        {{ $t('admin.new_task') }}
      </v-btn>
    </div>

    <v-data-table
        :headers="headers"
        :no-data-text="$t('leaderboard.no_data')"
        :items="tasks"
        item-value="name"
        class="elevation-1"
    >
      <template #item.index="{ index }">
        {{ index + 1 }}
      </template>

      <template #item.actions="{ item, index }">
        <v-btn icon variant="text" @click="editTask(item)">
          <v-icon>mdi-pencil</v-icon>
        </v-btn>
        <v-btn icon variant="text" @click="duplicateTask(item, index)">
          <v-icon>mdi-content-duplicate</v-icon>
        </v-btn>
        <v-btn icon variant="text" @click="deleteTask(item)">
          <v-icon>mdi-delete</v-icon>
        </v-btn>
        <v-btn icon variant="text" @click="moveItem(item, -1)" :disabled="isFirst(item)">
          <v-icon>mdi-arrow-up</v-icon>
        </v-btn>
        <v-btn icon variant="text" @click="moveItem(item, 1)" :disabled="isLast(item)">
          <v-icon>mdi-arrow-down</v-icon>
        </v-btn>
      </template>
    </v-data-table>

    <v-dialog v-model="taskDialog" max-width="500px">
      <v-card>
        <v-card-title>
          <span class="headline">{{ editingTask ? $t('admin.edit_task') : $t('admin.new_task') }}</span>
        </v-card-title>

        <v-card-text>
          <v-form :ref="taskFormRef">
            <v-text-field
                v-model="taskForm.name"
                :label="$t('admin.task_name_label')"
            />
            <v-text-field
                v-model="taskForm.description"
                :label="$t('admin.task_description_label')"
            />
            <v-select
                v-model="taskForm.type"
                :items="taskTypes"
                :label="$t('admin.task_type_label')"
                :rules="[v => !!v || $t('common.complete_all_fields')]"
                required
            />
            <v-select
                v-model="taskForm.timeIntervalId"
                :items="timeIntervals"
                :label="$t('admin.time_interval')"
                :rules="[v => !!v || $t('common.complete_all_fields')]"
                required
            />
            <v-select
                v-model="taskForm.areaId"
                :items="areas"
                :label="$t('admin.map')"
                :rules="[v => !!v || $t('common.complete_all_fields')]"
                required
            />
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="closeDialog">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="primary" @click="saveTask">{{ $t('common.save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-btn color="success" large block class="mt-6" @click="saveAllTasks">
      {{ $t('admin.save_all_tasks') }}
    </v-btn>
  </v-container>
</template>

<script setup>
import {ref, onMounted} from 'vue';
import {useRoute} from 'vue-router';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const route = useRoute();
const projectId = route.params.projectId;
import {toast} from 'vue3-toastify';
import ProjectsService from "@/services/ProjectsService";
import TaskService from "@/services/TaskService";
import router from "@/router";
import BreadCrumb from "@/components/utils/BreadCrumb.vue";

const tasks = ref([]);
const project = ref(null);
const taskTypes = ref([]);
const timeIntervals = ref([]);
const areas = ref([]);
const editingIndex = ref(null);

onMounted(async () => {
  project.value = await ProjectsService.getProjectById(projectId);
  tasks.value = (await TaskService.getTaskForProject(projectId) || []).map(t => ({
    ...t,
    timeIntervalId: t.timeInterval.name,
    areaId: t.areaGeoJSON?.properties?.id,
  }));
  taskTypes.value = (project.value.taskTypes || []).map(t => typeof t === 'string' ? t : t.name);
  timeIntervals.value = project.value.timeIntervals.map(ti => ti.name);
  areas.value = project.value.areas.features.map(f => f.properties.id);
});

const taskDialog = ref(false);
const taskForm = ref({
  name: '',
  description: '',
  projectId: '',
  timeIntervalId: '',
  areaId: '',
  type: ''
});
const editingTask = ref(false);
const taskFormRef = ref(null);

const headers = [
  {title: t('common.order'), value: 'index'},
  {title: t('common.name'), value: 'name'},
  {title: t('common.type'), value: 'type'},
  {title: t('admin.map'), value: 'areaId'},
  {title: t('admin.time_interval'), value: 'timeIntervalId'},
  {title: t('common.actions'), value: 'actions', sortable: false}
];

const addNewTask = () => {
  taskForm.value = {
    name: '',
    description: '',
    projectId: '',
    timeIntervalId: '',
    areaId: '',
    type: ''
  };
  editingTask.value = false;
  editingIndex.value = null;
  taskDialog.value = true;
};

const editTask = (task) => {
  editingIndex.value = tasks.value.indexOf(task);
  taskForm.value = {...task};
  editingTask.value = true;
  taskDialog.value = true;
};

const isValidForm = () => {
  return taskForm.value.timeIntervalId && taskForm.value.areaId && taskForm.value.type;
}
const saveTask = () => {
  if (isValidForm()) {
    if (editingTask.value) {
      tasks.value.splice(editingIndex.value, 1, {...taskForm.value});
      toast.success(t('admin.task_updated_success'));
    } else {
      tasks.value.push({...taskForm.value});
      toast.success(t('admin.task_added_success'));
    }
    taskDialog.value = false;
    editingIndex.value = null;
  } else {
    toast.error(t('common.complete_all_fields'));
  }
};

const closeDialog = () => {
  taskDialog.value = false;
};

const generateTasks = () => {
  taskTypes.value.forEach(type => {
    timeIntervals.value.forEach(timeInterval => {
      areas.value.forEach(area => {
        const newTask = {
          name: t('admin.task_auto_name', { type: type, timeInterval: timeInterval, area: area }),
          description: t('admin.task_auto_desc', { type: type, timeInterval: timeInterval, area: area }),
          projectId: projectId,
          timeIntervalId: timeInterval,
          areaId: area,
          type: type
        };
        console.log(tasks.value)
        tasks.value = tasks.value.concat([newTask]);
      });
    });
  });
  toast.success(t('admin.tasks_generated_success'));
};

const duplicateTask = (task, i) => {
  const newTask = {...task, name: `${task.name} (${t('common.edit')})`, _id: null};
  tasks.value.splice(i, 0, newTask);
  toast.success(t('admin.task_duplicated_success', { name: newTask.name }));
};

const deleteTask = (task) => {
  const index = tasks.value.indexOf(task);
  if (index > -1) {
    tasks.value.splice(index, 1);
    toast.info(t('admin.task_removed_success'), {autoClose: 200});
  }
};

const deleteAll = async () => {
  if (confirm(t('admin.confirm_delete_all_tasks'))) {
    tasks.value = [];
    await TaskService.bulkSave([], projectId);
    toast.info(t('admin.all_tasks_removed_success'));
  }
};


const saveAllTasks = async () => {
  const projectId = route.params.projectId;
  console.log('projectid:', route)
  try {
    await TaskService.bulkSave(tasks.value.map(t => ({...t, projectId})), projectId);
    toast.success(t('admin.tasks_save_success'));
    setTimeout(() => {
      router.back()
    }, 1500)
  } catch (error) {
    toast.error(t('admin.tasks_save_error'));
  }
};

const moveItem = (item, direction) => {
  const index = tasks.value.indexOf(item);
  const targetIndex = index + direction;

  if (targetIndex >= 0 && targetIndex < tasks.value.length) {
    const movedItem = tasks.value.splice(index, 1)[0];
    tasks.value.splice(targetIndex, 0, movedItem);
  }
};

const isFirst = (item) => {
  return tasks.value.indexOf(item) === 0;
};

const isLast = (item) => {
  return tasks.value.indexOf(item) === tasks.value.length - 1;
};
</script>

<style scoped>
.grayed-row {
  opacity: 0.6;
  background-color: #f5f5f5;
}
</style>
