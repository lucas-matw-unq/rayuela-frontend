<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { toast } from "vue3-toastify";
import { useI18n } from "vue-i18n";

import GamificationService from "@/services/GamificationService";
import ProjectsService from "@/services/ProjectsService";
import BreadCrumb from "@/components/utils/BreadCrumb.vue";
import {
  BADGE_STATUS,
  WINDOW_PRESETS,
  effectiveStatus,
  expiryFromNow,
  formatInstant,
  formatRemaining,
  msRemaining,
  pickRandomCandidate,
} from "./badgeFading";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const badges = ref([]);
/**
 * Badge fading is one of the mutually exclusive adaptation strategies, so
 * this panel only means anything while the project is actually running it.
 * Checked here and not only behind the button: the route is guessable, and
 * a stale tab survives the admin switching strategies elsewhere.
 */
const strategyEnabled = ref(false);
const loadFailed = ref(false);
const loading = ref(true);
const working = ref(false);

const selectedBadgeId = ref(null);
const selectedPreset = ref(WINDOW_PRESETS[3].minutes); // 3 días
const fadeReason = ref("");
const confirmFade = ref(false);
const pendingAction = ref(null);

/**
 * Drives the countdowns on screen.
 *
 * The remaining time is recomputed from `expiresAt` against this clock, never
 * stored — a precomputed "3 days left" is a lie by the next morning.
 *
 * Every 15s, not every second: the countdown never shows seconds, so a 1s
 * tick re-evaluated every computed on this page for a display that cannot
 * change more than once a minute. Slow enough to stop burning cycles, quick
 * enough that the last minute of a test window still lands close to right.
 */
const TICK_MS = 15000;
const now = ref(new Date());
let clock = null;

onMounted(async () => {
  clock = setInterval(() => (now.value = new Date()), TICK_MS);
  await load();
});

onUnmounted(() => clearInterval(clock));

async function load() {
  loading.value = true;
  loadFailed.value = false;
  try {
    const [gamification, project] = await Promise.all([
      GamificationService.getGamification(route.params.projectId),
      ProjectsService.getProjectById(route.params.projectId),
    ]);
    badges.value = gamification.badgesRules || [];
    strategyEnabled.value = project?.gamificationStrategy === "DESVANECIMIENTO";
  } catch (error) {
    // Tracked separately from `strategyEnabled`: a failed request leaves that
    // flag false, and without this the admin would be told their project is
    // not running the strategy — a wrong answer to a network problem, and one
    // they might act on by changing config that was fine all along.
    loadFailed.value = true;
    toast.error(
      error?.response?.data?.message || t("admin.fading_load_error")
    );
  } finally {
    loading.value = false;
  }
}

function goToGamification() {
  router.push(`/admin/project/${route.params.projectId}/gamification`);
}

const rows = computed(() =>
  badges.value.map((b) => {
    const status = effectiveStatus(b, now.value);
    return {
      ...b,
      effective: status,
      remaining: msRemaining(b, now.value),
      // A badge whose stored status still says `faded` but whose window has
      // elapsed. Worth calling out: it's what the cron will have to reconcile.
      windowElapsed: status === BADGE_STATUS.EXPIRED && b.status === BADGE_STATUS.FADED,
    };
  })
);

const fadingRows = computed(() =>
  rows.value.filter((r) => r.effective === BADGE_STATUS.FADED)
);

const selectedBadge = computed(
  () => rows.value.find((r) => r._id === selectedBadgeId.value) || null
);

/** Only badges that can still be handed out are worth fading. */
const selectableBadges = computed(() =>
  rows.value.filter((r) => r.effective !== BADGE_STATUS.EXPIRED)
);

const presetOptions = computed(() =>
  WINDOW_PRESETS.map((p) => ({ title: t(`admin.${p.key}`), value: p.minutes }))
);

/**
 * The instant the window would close, spelled out. Guessing what "3 días"
 * turns into is exactly the kind of arithmetic an admin should not have to do
 * before pressing a button that notifies every volunteer.
 */
const previewExpiry = computed(() =>
  new Date(now.value.getTime() + selectedPreset.value * 60000)
);

/**
 * Re-fading a badge that is already fading moves its deadline, and the mobile
 * app treats a moved deadline as news — every volunteer gets notified again.
 * Say so before they press the button, not after.
 */
const willRenotify = computed(
  () => selectedBadge.value?.effective === BADGE_STATUS.FADED
);

function statusColor(status) {
  if (status === BADGE_STATUS.FADED) return "warning";
  if (status === BADGE_STATUS.EXPIRED) return "grey";
  return "success";
}

function statusLabel(status) {
  if (status === BADGE_STATUS.FADED) return t("admin.fading_status_fading");
  if (status === BADGE_STATUS.EXPIRED) return t("admin.fading_status_expired");
  return t("admin.fading_status_active");
}

function countdown(ms) {
  return formatRemaining(ms, t);
}

function formatDate(value) {
  return formatInstant(value);
}

function pickRandom() {
  const badge = pickRandomCandidate(badges.value, now.value);
  if (!badge) {
    toast.info(t("admin.fading_no_candidates"));
    return;
  }
  selectedBadgeId.value = badge._id;
  toast.success(t("admin.fading_random_picked", { name: badge.name }));
}

function askFade() {
  if (!selectedBadgeId.value) return;
  // Pin the deadline now. `previewExpiry` rides the ticking clock, so an
  // admin who pauses on the dialog would read one date and commit another —
  // the payload used to be recomputed at confirm time.
  pendingAction.value = {
    type: BADGE_STATUS.FADED,
    expiresAt: expiryFromNow(selectedPreset.value, now.value),
  };
  confirmFade.value = true;
}

function askRestore(badge) {
  pendingAction.value = { type: BADGE_STATUS.ACTIVE, badge };
  confirmFade.value = true;
}

function askExpireNow(badge) {
  pendingAction.value = { type: BADGE_STATUS.EXPIRED, badge };
  confirmFade.value = true;
}

const confirmText = computed(() => {
  const action = pendingAction.value;
  if (!action) return "";
  const name = (action.badge || selectedBadge.value)?.name;
  if (action.type === BADGE_STATUS.ACTIVE) {
    return t("admin.fading_confirm_restore", { name });
  }
  if (action.type === BADGE_STATUS.EXPIRED) {
    return t("admin.fading_confirm_expire", { name });
  }
  return t("admin.fading_confirm_fade", {
    name,
    // The instant frozen by askFade, not a live one.
    date: formatInstant(action.expiresAt),
  });
});

async function runPendingAction() {
  const action = pendingAction.value;
  if (!action) return;
  const badge = action.badge || selectedBadge.value;
  if (!badge) return;

  working.value = true;
  try {
    await GamificationService.updateBadgeStatus(
      route.params.projectId,
      badge._id,
      action.type,
      action.type === BADGE_STATUS.FADED
        ? {
            expiresAt: action.expiresAt,
            fadeReason: fadeReason.value.trim() || undefined,
          }
        : {}
    );
    toast.success(t("admin.fading_action_success"));
    confirmFade.value = false;
    pendingAction.value = null;
    if (action.type === BADGE_STATUS.FADED) {
      // Clear the selection too. The badge is `faded` now, so leaving it
      // selected makes `willRenotify` fire and greets the admin with a
      // warning about the fade they just successfully started.
      selectedBadgeId.value = null;
      fadeReason.value = "";
    }
    await load();
  } catch (error) {
    // The backend rejects an unknown status and a window that is missing or
    // already past; its message is more useful than anything generic.
    toast.error(
      error?.response?.data?.message || t("admin.fading_action_error")
    );
  } finally {
    working.value = false;
  }
}
</script>

<template>
  <main>
    <BreadCrumb items="fadingPath" />
    <h1 class="mb-2">{{ $t("admin.fading_title") }}</h1>
    <p class="text-body-2 mb-6" style="max-width: 70ch">
      {{ $t("admin.fading_intro") }}
    </p>

    <!-- The load failed: say so and offer a retry. Falling through to the
         "not the chosen strategy" message would blame the project's config
         for what is a network problem. -->
    <v-alert
      v-if="!loading && loadFailed"
      type="error"
      variant="tonal"
      density="comfortable"
      class="mb-6"
    >
      <div class="mb-3">{{ $t("admin.fading_load_error") }}</div>
      <v-btn size="small" variant="tonal" @click="load">
        {{ $t("admin.fading_retry") }}
      </v-btn>
    </v-alert>

    <!-- Not the chosen adaptation: nothing below applies. Show the way back
         rather than a panel whose buttons would fight the project's config. -->
    <v-alert
      v-if="!loading && !loadFailed && !strategyEnabled"
      type="warning"
      variant="tonal"
      density="comfortable"
      class="mb-6"
    >
      <div class="mb-3">{{ $t("admin.fading_strategy_required") }}</div>
      <v-btn size="small" variant="tonal" @click="goToGamification">
        {{ $t("admin.fading_go_to_settings") }}
      </v-btn>
    </v-alert>

    <template v-if="strategyEnabled">
    <v-alert
      type="info"
      variant="tonal"
      density="comfortable"
      class="mb-6"
      :text="$t('admin.fading_manual_notice')"
    />

    <!-- What is happening right now -->
    <v-card class="pa-4 mb-6" v-if="fadingRows.length">
      <h2 class="mb-3">{{ $t("admin.fading_active_windows") }}</h2>
      <v-list density="compact">
        <v-list-item v-for="row in fadingRows" :key="row._id">
          <template #prepend>
            <v-icon color="warning">mdi-timer-sand</v-icon>
          </template>
          <v-list-item-title>{{ row.name }}</v-list-item-title>
          <v-list-item-subtitle>
            <template v-if="countdown(row.remaining)">
              {{ countdown(row.remaining) }} ·
            </template>
            {{ formatDate(row.expiresAt) }}
          </v-list-item-subtitle>
          <template #append>
            <v-btn
              size="small"
              variant="text"
              color="grey-darken-1"
              @click="askExpireNow(row)"
            >
              {{ $t("admin.fading_expire_now") }}
            </v-btn>
            <v-btn size="small" variant="text" @click="askRestore(row)">
              {{ $t("admin.fading_restore") }}
            </v-btn>
          </template>
        </v-list-item>
      </v-list>
    </v-card>

    <!-- Start a fade -->
    <v-card class="pa-4 mb-6">
      <h2 class="mb-1">{{ $t("admin.fading_start_title") }}</h2>
      <p class="text-body-2 mb-4">{{ $t("admin.fading_start_hint") }}</p>

      <v-row>
        <v-col cols="12" md="7">
          <v-select
            v-model="selectedBadgeId"
            :items="selectableBadges"
            :label="$t('admin.fading_badge_label')"
            :no-data-text="$t('admin.fading_no_candidates')"
            item-title="name"
            item-value="_id"
            :loading="loading"
          />
        </v-col>
        <v-col cols="12" md="5" class="d-flex align-center">
          <v-btn
            variant="tonal"
            prepend-icon="mdi-dice-5-outline"
            :disabled="loading"
            @click="pickRandom"
          >
            {{ $t("admin.fading_pick_random") }}
          </v-btn>
        </v-col>
      </v-row>

      <v-select
        v-model="selectedPreset"
        :items="presetOptions"
        :label="$t('admin.fading_window_label')"
        :hint="$t('admin.fading_window_hint', { date: previewExpiry.toLocaleString() })"
        item-title="title"
        item-value="value"
        persistent-hint
        class="mb-4"
      />

      <v-text-field
        v-model="fadeReason"
        :label="$t('admin.fading_reason_label')"
        :hint="$t('admin.fading_reason_hint')"
        persistent-hint
        counter="120"
        maxlength="120"
        class="mb-4"
      />

      <!-- What the volunteer will actually see. The whole strategy rests on
           this copy landing well, so the admin should read it before sending. -->
      <v-card
        v-if="selectedBadge"
        variant="tonal"
        color="warning"
        class="pa-3 mb-4"
      >
        <div class="text-caption text-uppercase mb-1">
          {{ $t("admin.fading_preview_title") }}
        </div>
        <div class="text-subtitle-2">
          {{ $t("admin.fading_preview_headline", { name: selectedBadge.name }) }}
        </div>
        <div class="text-body-2">
          {{ countdown(selectedPreset * 60000) }}
        </div>
        <div v-if="fadeReason.trim()" class="text-body-2 font-italic mt-1">
          {{ fadeReason }}
        </div>
      </v-card>

      <v-alert
        v-if="willRenotify"
        type="warning"
        variant="tonal"
        density="compact"
        class="mb-4"
        :text="$t('admin.fading_renotify_warning')"
      />

      <div class="d-flex justify-end">
        <v-btn
          color="warning"
          :disabled="!selectedBadgeId || working"
          @click="askFade"
        >
          {{ $t("admin.fading_start_action") }}
        </v-btn>
      </div>
    </v-card>

    <!-- Full catalog state -->
    <h2 class="mb-2">{{ $t("admin.fading_catalog_title") }}</h2>
    <v-card class="mb-8">
      <v-table density="comfortable">
        <thead>
          <tr>
            <th>{{ $t("admin.badge_name_label") }}</th>
            <th>{{ $t("admin.fading_column_status") }}</th>
            <th>{{ $t("admin.fading_column_window") }}</th>
            <th>{{ $t("admin.fading_column_reason") }}</th>
            <th class="text-right">{{ $t("common.actions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!rows.length">
            <td colspan="5" class="text-center py-6 text-medium-emphasis">
              {{ $t("admin.fading_empty_catalog") }}
            </td>
          </tr>
          <tr v-for="row in rows" :key="row._id">
            <td>{{ row.name }}</td>
            <td>
              <v-chip :color="statusColor(row.effective)" size="small" label>
                {{ statusLabel(row.effective) }}
              </v-chip>
              <v-tooltip
                v-if="row.windowElapsed"
                :text="$t('admin.fading_elapsed_tooltip')"
              >
                <template #activator="{ props }">
                  <v-icon v-bind="props" size="small" class="ml-2"
                    >mdi-information-outline</v-icon
                  >
                </template>
              </v-tooltip>
            </td>
            <td>
              <template v-if="row.effective === BADGE_STATUS.FADED">
                <strong v-if="countdown(row.remaining)">{{
                  countdown(row.remaining)
                }}</strong>
                <div class="text-caption">{{ formatDate(row.expiresAt) }}</div>
              </template>
              <template v-else-if="row.expiresAt">
                <span class="text-caption">{{ formatDate(row.expiresAt) }}</span>
              </template>
              <template v-else>—</template>
            </td>
            <td class="text-caption">{{ row.fadeReason || "—" }}</td>
            <td class="text-right">
              <v-btn
                v-if="row.effective !== BADGE_STATUS.ACTIVE"
                size="small"
                variant="text"
                @click="askRestore(row)"
              >
                {{ $t("admin.fading_restore") }}
              </v-btn>
              <v-btn
                v-if="row.effective === BADGE_STATUS.FADED"
                size="small"
                variant="text"
                color="grey-darken-1"
                @click="askExpireNow(row)"
              >
                {{ $t("admin.fading_expire_now") }}
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    </template>

    <v-dialog v-model="confirmFade" max-width="480px">
      <v-card>
        <v-card-title class="headline">{{
          $t("admin.confirm_title")
        }}</v-card-title>
        <v-card-text>{{ confirmText }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="confirmFade = false">{{
            $t("common.cancel")
          }}</v-btn>
          <v-btn color="warning" :loading="working" @click="runPendingAction">
            {{ $t("common.confirm") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </main>
</template>
