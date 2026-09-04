import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import ProjectDetails from '../ProjectDetails.vue';
import { toast } from 'vue3-toastify';
import es from '@/locales/es.json';

// Mock child components
vi.mock('@/components/utils/BreadCrumb.vue', () => ({
  default: { name: 'BreadCrumb', template: '<div></div>' }
}));
vi.mock('@/components/utils/CollapsableSection.vue', () => ({
  default: { name: 'CollapsableSection', template: '<div><slot></slot></div>' }
}));
vi.mock('@/views/Admin/GeoMap.vue', () => ({
  default: { name: 'GeoMap', template: '<div></div>' }
}));

// Mock services
vi.mock('@/services/ProjectsService', () => ({
  default: {
    getProjectById: vi.fn().mockResolvedValue({
      _id: 'proj-1',
      name: 'Test Project',
      description: 'Desc',
      taskTypes: [{ name: 'Observation', description: '' }],
      timeIntervals: [],
      areas: { type: 'FeatureCollection', features: [] },
    }),
    createProject: vi.fn().mockResolvedValue({ _id: 'proj-1' }),
    updateProject: vi.fn().mockResolvedValue({ _id: 'proj-1' }),
  }
}));

// Mock router
vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router');
  return {
    ...actual,
    useRoute: () => ({ params: { projectId: 'proj-1' } }),
    useRouter: () => ({ push: vi.fn() }),
  };
});

// Mock vue3-toastify
vi.mock('vue3-toastify', () => ({
  toast: {
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  }
}));

const i18n = createI18n({
  legacy: false,
  locale: 'es',
  messages: {
    es,
  }
});

describe('ProjectDetails.vue - Task Types Validation', () => {
  let wrapper;

  beforeEach(async () => {
    vi.clearAllMocks();
    wrapper = mount(ProjectDetails, {
      global: {
        plugins: [i18n],
        stubs: {
          'v-container': { template: '<div><slot /></div>' },
          'v-form': { template: '<form><slot /></form>' },
          'v-card': { template: '<div><slot /></div>' },
          'v-text-field': true,
          'v-textarea': true,
          'v-switch': true,
          'v-row': { template: '<div><slot /></div>' },
          'v-col': { template: '<div><slot /></div>' },
          'v-btn': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
          'v-table': { template: '<table><slot /></table>' },
          'v-icon': true,
          'v-select': true,
        }
      }
    });
    // Wait for onMounted to finish fetching project
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  it('shows error toast when attempting to add empty task type name', async () => {
    wrapper.vm.newTaskType = '   ';
    wrapper.vm.addNewTaskType();

    expect(toast.error).toHaveBeenCalledWith('El nombre del tipo de tarea es requerido');
  });

  it('shows error toast when attempting to add an existing task type', async () => {
    wrapper.vm.newTaskType = 'Observation';
    wrapper.vm.addNewTaskType();

    expect(toast.error).toHaveBeenCalledWith('El tipo de tarea ya existe');
  });

  it('successfully adds new task type and displays success toast', async () => {
    wrapper.vm.newTaskType = 'Survey';
    wrapper.vm.newTaskTypeDescription = 'Survey description';
    wrapper.vm.addNewTaskType();

    expect(toast.success).toHaveBeenCalledWith('Tarea "Survey" añadida');
    expect(wrapper.vm.project.taskTypes).toContainEqual({
      name: 'Survey',
      description: 'Survey description'
    });
    expect(wrapper.vm.newTaskType).toBe('');
    expect(wrapper.vm.newTaskTypeDescription).toBe('');
  });
});
