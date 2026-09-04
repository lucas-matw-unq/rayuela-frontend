<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue3-toastify';
import AuthService from "@/services/AuthService";
import { useI18n } from 'vue-i18n';
import GoogleAuthButton from "@/components/GoogleAuthButton.vue";

const { t } = useI18n();

const router = useRouter();
const username = ref("");
const password = ref("");
const showPassword = ref(false);

onMounted(() => {
  if (localStorage.getItem("token")) {
    router.push({ path: '/dashboard' });
  }
});

async function login() {
  const user = { username: username.value, password: password.value };
  await finishAuthentication(
      AuthService.loginWithPw(user),
      t("login.error_credentials"),
  );
}

async function loginWithGoogle(credential) {
  await finishAuthentication(
      AuthService.loginWithGoogle(credential),
      t("auth.google_error"),
  );
}

async function finishAuthentication(authRequest, fallbackMessage) {
  try {
    await authRequest;
    await AuthService.getUser();
    await router.push("/dashboard");
    window.location.reload();
  } catch (error) {
    AuthService.clearSession();
    const errorMessage = error?.response?.data?.message || fallbackMessage;
    toast.error(errorMessage, { autoClose: 3000 });
  }
}

function handleGoogleRenderError(error) {
  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    return;
  }

  toast.error(error?.message || t("auth.google_error"), { autoClose: 3000 });
}
</script>

<template>
  <v-container class="container">
    <v-card class="login-card" elevation="2">
      <v-card-title class="title">
        {{ $t("login.title") }}
      </v-card-title>
      <v-card-text>
        <v-form @submit.prevent="login">
          <v-text-field
              v-model="username"
              :label="$t('login.username_field')"
              :placeholder="$t('login.username_placeholder')"
              outlined
              dense
              clearable
              required
          />
          <v-text-field
              v-model="password"
              :label="$t('login.password')"
              :placeholder="$t('login.password_placeholder')"
              :type="showPassword ? 'text' : 'password'"
              outlined
              dense
              clearable
              required
              :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
              @click:append-inner="showPassword = !showPassword"
          />
          <v-btn
              color="success"
              type="submit"
              block
              class="login-button"
          >
            {{ $t("login.button_login") }}
          </v-btn>
        </v-form>
        <v-divider class="my-4" />
        <p class="google-copy">{{ $t("auth.or_continue_with_google") }}</p>
        <GoogleAuthButton
            text="signin_with"
            @success="loginWithGoogle"
            @error="handleGoogleRenderError"
        />
      </v-card-text>
      <v-divider></v-divider>
      <v-card-actions class="actions">
        <RouterLink to="/forgot-password" class="forgot-password-link">
          {{ $t("login.forgot_password") }}
        </RouterLink>
        <RouterLink to="/register">
          <v-btn color="primary" outlined>
            {{ $t("login.button_signup") }}
          </v-btn>
        </RouterLink>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<style scoped>
.container {
  max-width: 400px;
  margin: auto;
  padding: 20px;
}

.login-card {
  padding: 20px;
  border-radius: 8px;
}

.title {
  text-align: center;
  font-size: 24px;
  font-weight: bold;
}

.login-button {
  margin-top: 20px;
}

.actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}

.forgot-password-link {
  font-size: 14px;
  text-decoration: none;
}

.google-copy {
  margin-bottom: 16px;
  text-align: center;
  color: rgba(0, 0, 0, 0.6);
}
</style>
