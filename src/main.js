import './assets/css/main.css'
import '@mdi/font/css/materialdesignicons.css'; // Importa Material Design Icons
import 'vue3-toastify/dist/index.css';
import router from './router'
import i18n from './i18n'
import {createApp} from 'vue'
import {createVuetify} from 'vuetify'
import 'vuetify/styles'  // Importar estilos de Vuetify
import {aliases, mdi} from 'vuetify/iconsets/mdi'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@fortawesome/fontawesome-free/css/all.css'
import App from './App.vue'
import {fa} from "vuetify/iconsets/fa";
import {store} from "@/vuex/state";

const vuetify = createVuetify({
    components,
    directives,
    icons: {
        defaultSet: 'mdi',
        aliases,
        sets: {
            mdi,
            fa
        },
    },
})

const app = createApp(App)

app.use(router)
app.use(store)
app.use(i18n)
app.use(vuetify)
app.mount('#app')
