<template>
    <div>
        <div style="min-height: 5px; margin-bottom: 8px">
            <div v-if="$apollo.loading">
                <md-progress-bar class="md-accent" md-mode="query"></md-progress-bar>
            </div>
        </div>
        <div>
            <h3>
                <router-link :to="`/`">Home</router-link>
                <md-icon style="margin-top: -1px">keyboard_arrow_right</md-icon> {{ me == null ? 'Me' : me.name }}
                <span v-if="me != null" style="margin-left: 22px">
                 ( <span @click="logout()" style="color: #a94442; cursor: pointer">logout</span> )
                </span>

                <div style="float: right; font-size: 14px">
                  <b><img src="../assets/logo.png" width="14"> {{ info.connections }} Peers |  {{ info.sync_index_percent.toFixed(0) }}% Sync | {{ info.timeoffset }} secs</b>
                </div>
            </h3>
        </div>
        <md-divider style="margin-bottom: 20px"></md-divider>
        <div v-if="me == null" class="md-layout md-gutter">
            <div class="md-layout-item">
                <md-card class="md-primary" style="margin: auto; background-color: #101010;">
                    <md-card-header>
                        <md-card-header-text style="font-size: 18px; line-height: 30px">
                            <md-icon>assistant</md-icon>
                            &nbsp;<b>ghostin</b> account is experimental and reserved for now to ghost veterans<br/>
                            <div style="margin-left: 29px">If you are a vet and wants to try address aliasing, notification ... let us now</div>
                        </md-card-header-text>
                    </md-card-header>
                </md-card>
            </div>
        </div>
        <div class="md-layout md-gutter">
            <div v-if="me == null" class="md-layout-item" style="margin: auto">
              <md-card class="md-primary" style="margin: auto; background-color: #101010; padding: 20px">
                <form novalidate class="md-layout" @submit.prevent="validateUser">
                  <div style="min-width: 800px; margin: auto">
                    <div class="md-layout md-gutter">
                      <div class="md-layout-item md-small-size-100">
                        <md-field :class="getValidationClass('email')">
                          <label for="email">Email</label>
                          <md-input type="email" name="email" id="email" autocomplete="email" v-model="form.email" :disabled="sending" />
                          <span class="md-error" v-if="!$v.form.email.required">The email is required</span>
                          <span class="md-error" v-else-if="!$v.form.email.email">Invalid email</span>
                        </md-field>
                      </div>
                      <div class="md-layout-item md-small-size-100">
                        <md-field :class="getValidationClass('password')">
                          <label for="password">Password</label>
                          <md-input type="password" name="password" id="password"  v-model="form.password" :disabled="sending" />
                          <span class="md-error" v-if="!$v.form.password.required">The password is required</span>
                        </md-field>
                      </div>
                    </div>
                  </div>
                  <div style="min-width: 800px; margin: auto; text-align: center">
                    <md-button type="submit" class="md-raised md-primary" :disabled="sending">LOGIN TO GHOSTIN</md-button>
                  </div>
                </form>
              </md-card>
            </div>
            <div v-else class="md-layout-item">
              <md-card class="md-primary" style="margin: auto; background-color: #101010;">
                <md-bottom-bar style="background-color: #101010" md-sync-route>
                  <md-bottom-bar-item :to="`/me`" exact md-label="My profile" md-icon="account_circle"></md-bottom-bar-item>
                  <md-bottom-bar-item :to="`/me/addresses`" md-label="My addresses" md-icon="fingerprint"></md-bottom-bar-item>
                  <md-bottom-bar-item v-if="me.roles.includes('ROOT')" :to="`/me/admin`" md-label="Admin" md-icon="admin_panel_settings"></md-bottom-bar-item>
                </md-bottom-bar>
              </md-card>
              <div style="margin-top: 20px">
                <router-view></router-view>
              </div>
            </div>
        </div>
    </div>
</template>

<script>
import {EVENT_UPDATE_INFO, eventBus, ReadInfo, UpdateInfo} from "@/main";
import { validationMixin } from 'vuelidate'
import {required, email} from 'vuelidate/lib/validators'
import gql from "graphql-tag";
    const ReadMe = gql`query {
        me {
            id
            name
            email
            roles
        }
    }`
    const LoginMutation = gql`
      mutation CreateLoginMutation($email: String!, $password: String!) {
        login(email: $email, password: $password) {
          id
          name
          email
          roles
        }
      }
    `
    const LogoutMutation = gql`
      mutation CreateLogoutMutation {
        logout
      }
    `

    export default {
        name: 'Me',
        mixins: [validationMixin],
        data() {
            return {
                me: null,
                form: {
                  email: null,
                  password: null,
                },
                sending: false,
                info: {
                    height: 0,
                    sync_percent: 0,
                    sync_index_percent: 0
                },
            }
        },
        validations: {
          form: {
            password: {
              required,
            },
            email: {
              required,
              email
            }
          }
        },
        methods: {
          getValidationClass (fieldName) {
            const field = this.$v.form[fieldName]
            if (field) {
              return {
                'md-invalid': field.$invalid && field.$dirty
              }
            }
          },
          clearForm () {
            this.$v.$reset()
            this.form.email = null
            this.form.password = null
          },
          logout() {
            this.$apollo.mutate({
              mutation: LogoutMutation,
              update: (store) => {
                const data = { me: null };
                store.writeQuery({query: ReadMe, data});
              },
            })
          },
          logUser () {
            this.sending = true
            this.$apollo.mutate({
              mutation: LoginMutation,
              variables: {
                email: this.form.email,
                password: this.form.password
              },
              update: (store, { data: { login } }) => {
                this.sending = false;
                this.clearForm();
                const data = { me: login };
                store.writeQuery({query: ReadMe, data});
              },
            })
          },
          validateUser () {
            this.$v.$touch()
            if (!this.$v.$invalid) {
              this.logUser()
            }
          }
        },
        apollo: {
            me: {
              query: ReadMe,
              errorPolicy: 'ignore',
            },
            info: () => ReadInfo,
        },
        mounted() {
          eventBus.$on(EVENT_UPDATE_INFO, UpdateInfo);
        },
        beforeDestroy() {
          eventBus.$off(EVENT_UPDATE_INFO);
        },
    }
</script>

<style>
  /* Change the white to any color ;) */
  input:-webkit-autofill,
  input:-webkit-autofill:hover,
  input:-webkit-autofill:focus,
  input:-webkit-autofill:active  {
    -webkit-box-shadow: 0 0 0 30px #101010 inset !important;
  }
</style>
