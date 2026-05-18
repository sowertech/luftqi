import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import './assets/scss/main.scss';
import 'sweetalert2/dist/sweetalert2.min.css';
import '@fortawesome/fontawesome-free/css/all.css';

const pinia = createPinia();
const app = createApp(App);
app.use(pinia);
app.mount('#app');
