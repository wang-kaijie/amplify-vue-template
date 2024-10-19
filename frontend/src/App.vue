<script setup lang="ts">
import Todos from './components/Todos.vue'
import {
  signIn,
  confirmSignIn,
  signInWithRedirect,
  getCurrentUser,
  fetchAuthSession,
  fetchUserAttributes,
  signOut as amplifySignOut,
} from "@aws-amplify/auth";

import { Authenticator } from "@aws-amplify/ui-vue";
import "@aws-amplify/ui-vue/styles.css";
</script>

<template>
  <main>
    <authenticator>
      <template v-slot="{ signOut }">
        <Todos />
        <button @click="signOut">Sign Out</button>
      </template>
    </authenticator>
  </main>
</template>

