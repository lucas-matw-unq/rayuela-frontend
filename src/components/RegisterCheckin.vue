<template>
  <div>
    <!-- Botón para abrir el modal -->
    <v-btn color="blue" variant="elevated" block size='large' @click="openModal">
      <v-icon style="margin-right: 8px" left size="large">mdi-map-marker-plus</v-icon>
      {{ $t('checkin.button_register') }}
    </v-btn>

    <!-- Modal principal para registrar el check-in -->
    <v-dialog v-model="showModal" persistent max-width="600px">
      <v-card>
        <v-card-title>
          <span class="text-h6">{{ $t('checkin.title_register') }}</span>
        </v-card-title>

        <v-card-text>
          <!-- Formulario -->
          <v-form>
            <!-- Sección: Ubicación -->
            <h4>{{ $t('checkin.location') }}</h4>
            <v-row>
              <v-col cols="6">
                <v-text-field
                    :label="$t('checkin.latitude')"
                    v-model="form.latitude"
                    type="number"
                    outlined
                    :disabled="!props.manualLocationEnabled"
                ></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field
                    :label="$t('checkin.longitude')"
                    type="number"
                    v-model="form.longitude"
                    outlined
                    :disabled="!props.manualLocationEnabled"
                ></v-text-field>
              </v-col>
              <v-col cols="12" style="display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap;">
                <v-btn variant="tonal" color="green" @click="setCurrentLocation" :loading="loadingLocation">
                  <v-icon left class="mr-1">mdi-crosshairs-gps</v-icon>
                  {{ $t('checkin.use_current_location') }}
                </v-btn>

                <v-tooltip
                  :text="!props.manualLocationEnabled ? $t('checkin.manual_location_disabled_project') : $t('checkin.pick_from_map')"
                  location="top"
                >
                  <template #activator="{ props: tooltipProps }">
                    <span v-bind="tooltipProps" style="display: inline-block;">
                      <v-btn
                        variant="tonal"
                        color="blue"
                        @click="openMapPicker"
                        :disabled="!props.manualLocationEnabled"
                      >
                        <v-icon left class="mr-1">mdi-map-search</v-icon>
                        {{ $t('checkin.pick_from_map') }}
                      </v-btn>
                    </span>
                  </template>
                </v-tooltip>
              </v-col>
            </v-row>

            <!-- Sección: Fecha y Hora -->
            <h4 class="mt-4">{{ $t('checkin.date_time') }}</h4>
            <v-text-field
                :label="$t('checkin.timestamp')"
                v-model="form.datetime"
                type="datetime-local"
                outlined
            ></v-text-field>

            <!-- Sección: Tipo de Tarea -->
            <h4 class="mt-4">{{ $t('checkin.task_type_label') }}</h4>
            <v-select
                :label="$t('checkin.task_type_label')"
                v-model="form.taskType"
                :items="normalizedTaskTypes"
                item-title="title"
                item-value="value"
                outlined
            ></v-select>
            <div v-if="selectedTaskTypeDescription" class="mt-n2 mb-4 text-caption" style="color: #666; line-height: 1.4;">
              <span v-html="renderDescription(selectedTaskTypeDescription)"></span>
            </div>

            <!-- Sección: Imagen (Opcional) -->
            <h4 class="mt-4">{{ $t('checkin.image_label') || 'Fotos de evidencia (máx. 3)' }}</h4>
            <v-file-input
                :label="$t('checkin.image_placeholder') || 'Selecciona o toma hasta 3 fotos'"
                v-model="imageFiles"
                accept="image/*"
                prepend-icon="mdi-camera"
                multiple
                @update:modelValue="onImagesSelected"
                :error-messages="imageError ? [$t('checkin.max_images_error') || 'Puedes subir un máximo de 3 imágenes'] : []"
                outlined
            ></v-file-input>
            
            <v-row v-if="imagePreviews.length > 0" class="mt-2">
              <v-col v-for="(preview, index) in imagePreviews" :key="index" cols="4">
                <v-img :src="preview" max-height="150" contain></v-img>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>


        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="closeModal" :disabled="loadingCheckin">{{ $t('common.cancel') }}</v-btn>
          <v-btn
              color="primary"
              @click="submitForm"
              :disabled="loadingCheckin || imageError"
          >
            <template v-if="loadingCheckin">
              <v-progress-circular indeterminate color="white" size="20" class="mr-2"></v-progress-circular>
              {{ $t('common.saving') }}
            </template>
            <template v-else>{{ $t('common.save') }}</template>
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal de confirmación -->
    <v-dialog v-model="serviceResponse" persistent max-width="400px">
      <v-card>
        <v-card-text class="text-center">
          <v-icon color="green" size="48">mdi-check-circle-outline</v-icon>
          <h3>{{ $t('checkin.registered_success') }}</h3>
          <div style="border: 2px dashed lightblue; border-radius: 18px"
               v-for="(badge, index) in serviceResponse?._gameStatus?.newBadges" :key="index" class="badge-item">
            <h4>{{ $t('checkin.new_badge') }}</h4>
            <img :src="badge.imageUrl" alt="Imagen de la insignia"/>
            <h6>{{ badge.name }}</h6>
            <small>{{ badge.description }}</small>
          </div>
          <p v-if="serviceResponse?._gameStatus?.newPoints">
            {{ $t('checkin.points_added', { points: serviceResponse._gameStatus.newPoints }) }}
          </p>
          <p v-if="serviceResponse?.contributesTo">{{ $t('checkin.contributed_to', { name: serviceResponse.contributesTo?.name }) }}</p>
          <p v-else>{{ $t('checkin.no_contribution') }}</p>
          <v-alert v-if="serviceResponse?.contributesTo"
                   width="100%"
          >
            <h4>{{ $t('checkin.how_did_you_feel') }}</h4>
            <hr>
            <v-rating v-model="form.rating" background-color="grey lighten-2" color="orange"
                      :item-labels="[$t('checkin.rating_boring'), '', '', '', $t('checkin.rating_fun')]"
                      item-label-position="bottom" large></v-rating>
          </v-alert>

        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="closeConfirmationModal">{{ $t('common.accept') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Map location picker -->
    <LocationPicker
      v-model="showMapPicker"
      :areas="props.areas"
      :initial-latitude="form.latitude"
      :initial-longitude="form.longitude"
      @location-selected="onMapLocationSelected"
    />
  </div>
</template>

<script setup>
import {ref, watch, computed} from 'vue';
import {useRoute} from 'vue-router';
import {toast} from "vue3-toastify";
import { useI18n } from 'vue-i18n';
import GamificationService from "@/services/GamificationService";
import { MAX_IMAGES } from '@/utils/constants';
import LocationPicker from "@/components/LocationPicker.vue";

const { t } = useI18n();


const emit = defineEmits(['modalClosed']);
const route = useRoute();

const showModal = ref(false);
/** @type {import('vue').Ref<any>} */
const serviceResponse = ref(null);
const loadingLocation = ref(false);
const loadingCheckin = ref(false); // Spinner para el registro de check-in

/** @type {import('vue').Ref<File[]>} */
const imageFiles = ref([]);
/** @type {import('vue').Ref<string[]>} */
const imagePreviews = ref([]);

const imageError = computed(() => imageFiles.value.length > MAX_IMAGES);

const props = defineProps({
  taskTypes: Array,
  manualLocationEnabled: { type: Boolean, default: true },
  areas: { type: Object, default: null }
});

const normalizedTaskTypes = computed(() => {
  return (props.taskTypes || []).map((t) => {
    if (typeof t === 'string') {
      return { title: t, value: t, description: '' };
    }
    return { title: t.name, value: t.name, description: t.description || '' };
  });
});

const selectedTaskTypeDescription = computed(() => {
  const selected = normalizedTaskTypes.value.find((t) => t.value === form.value.taskType);
  return selected ? selected.description : '';
});

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

const showMapPicker = ref(false);

const onImagesSelected = (files) => {
  // Clear existing previews
  imagePreviews.value.forEach(url => URL.revokeObjectURL(url));
  imagePreviews.value = [];

  if (files && files.length > 0) {
    const filesToPreview = files.slice(0, MAX_IMAGES); // Preview only up to MAX_IMAGES
    imagePreviews.value = filesToPreview.map(file => URL.createObjectURL(file));
  }
};


const form = ref({
  latitude: '',
  longitude: '',
  datetime: '',
  taskType: '',
  rating: 0,
});

const openModal = () => {
  resetForm();
  showModal.value = true;
};

const openMapPicker = () => {
  showMapPicker.value = true;
};

const onMapLocationSelected = (coords) => {
  form.value.latitude = coords.latitude;
  form.value.longitude = coords.longitude;
};

const setCurrentLocation = () => {
  if (!navigator.geolocation) {
    toast.info(t('checkin.geo_not_supported'));
    return;
  }
  loadingLocation.value = true;
  navigator.geolocation.getCurrentPosition(
      (position) => {
        form.value.latitude = position.coords.latitude.toFixed(6);
        form.value.longitude = position.coords.longitude.toFixed(6);
        loadingLocation.value = false;
      },
      () => {
        toast.info(t('checkin.geo_failed'));
        loadingLocation.value = false;
      },
      { enableHighAccuracy: true }
  );
};

const resetForm = () => {
  form.value = {
    latitude: '',
    longitude: '',
    datetime: new Date().toISOString().slice(0, 16),
    taskType: '',
  };
  imageFiles.value = [];
  imagePreviews.value.forEach(url => URL.revokeObjectURL(url));
  imagePreviews.value = [];
};

const closeModal = () => {
  showModal.value = false;
  loadingCheckin.value = false;
  imageFiles.value = [];
  imagePreviews.value.forEach(url => URL.revokeObjectURL(url));
  imagePreviews.value = [];
};


const closeConfirmationModal = async () => {
  if (serviceResponse.value.contributesTo) {
    await GamificationService.rate(form.value.rating, serviceResponse.value.id);
  }
  serviceResponse.value = null;
  emit('modalClosed');
};

const submitForm = () => {
  if (!form.value.latitude || !form.value.longitude || !form.value.taskType) {
    toast.info(t('common.complete_all_fields'));
    return;
  }

  if (imageError.value) {
    toast.error(t('checkin.max_images_error'));
    return;
  }

  loadingCheckin.value = true; // Inicia el spinner

  const payload = new FormData();
  payload.append('latitude', form.value.latitude);
  payload.append('longitude', form.value.longitude);
  payload.append('datetime', form.value.datetime);
  payload.append('taskType', form.value.taskType);
  payload.append('projectId', route.params.projectId);

  if (imageFiles.value && imageFiles.value.length > 0) {
    imageFiles.value.forEach(file => {
      payload.append('image', file);
    });
  }

  GamificationService.registerCheckin(payload)
      .then((res) => {
        serviceResponse.value = res;
      })
      .catch(() => toast.error(t('checkin.register_error')))
      .finally(() => {
        loadingCheckin.value = false; // Detiene el spinner
        closeModal();
      });
};


watch(showModal, (isVisible) => {
  if (isVisible) {
    const now = new Date();
    const gmtMinus3 = new Date(now.getTime() - 3 * 60 * 60 * 1000); // GMT-3
    form.value.datetime = gmtMinus3.toISOString().slice(0, 16);
  }
});
</script>

<style scoped>
.text-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.mt-4 {
  margin-top: 16px;
}

.mr-2 {
  margin-right: 8px;
}
</style>
