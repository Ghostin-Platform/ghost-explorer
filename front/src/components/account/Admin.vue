<template>
    <div>
      <div class="md-layout-item" style="margin: auto">
        <div style="width: 100%; margin-bottom: 5px">
          <b>Register a new account.</b>
        </div>
        <md-card class="md-primary" style="margin: auto; background-color: #101010; padding: 0px 20px 20px 20px">
          <form novalidate class="md-layout" @submit.prevent="validateUser">
            <div style="width: 100%; margin: auto; padding-right: 15px">
              <div class="md-layout md-gutter">
                <div class="md-layout-item md-large-size-25">
                  <md-field style="margin: 0" md-inline :class="getValidationClass('email')">
                    <label for="email">Email</label>
                    <md-input name="email" id="email" v-model="form.email" :disabled="sending" />
                    <span class="md-error" v-if="!$v.form.email.required">The email is required</span>
                  </md-field>
                </div>
                <div class="md-layout-item md-large-size-25">
                  <md-field style="margin: 0" md-inline :class="getValidationClass('password')">
                    <label for="password">Password</label>
                    <md-input name="password" id="password" v-model="form.password" :disabled="sending" />
                    <span class="md-error" v-if="!$v.form.password.required">The password is required</span>
                  </md-field>
                </div>
                <div class="md-layout-item md-size-10">
                  <md-button style="margin-top: 14px" type="submit" class="md-raised md-primary" :disabled="sending">CREATE</md-button>
                </div>
              </div>
            </div>
          </form>
        </md-card>
      </div>
      <md-divider style="margin-top: 20px; margin-bottom: 20px"></md-divider>
      <md-list v-if="users.length > 0">
        <md-list-item v-for="user in users" :key="user.id" style="background-color: #101010; margin-bottom: 4px">
          <md-icon class="md-primary">local_fire_department</md-icon>
          <span class="md-list-item-text">
            <span>{{ user.email }}</span>
          </span>
          <md-button v-if="!user.roles.includes('ROOT')" v-on:click.stop.prevent="deleteUser(user.id)" class="md-icon-button md-dense md-accent">
            <md-icon>delete</md-icon>
          </md-button>
        </md-list-item>
      </md-list>
    </div>
</template>

<script>
    import {validationMixin} from "vuelidate";
    import {email, required} from "vuelidate/lib/validators";
    import gql from "graphql-tag";

    const ReadUsers = gql`query {
        users {
            id
            email
            roles
        }
    }`
    const AddUserMutation = gql`
      mutation AddUserMutation($email: String!, $password: String!) {
        addUser(email: $email, password: $password) {
            id
            email
            roles
        }
      }
    `
    const DelUserMutation = gql`
      mutation DelUserMutation($email: String!) {
        deleteUser(email: $email) {
            id
            email
            roles
        }
      }
    `

    export default {
      name: 'Admin',
      mixins: [validationMixin],
      validations: {
          form: {
            email: {
              required,
              email
            },
            password: {
              required,
            },
          }
        },
      data() {
        return {
          form: {
            email: '',
            password: '',
          },
          users: [],
          sending: false,
        }
      },
      methods: {
        clearForm () {
          this.$v.$reset()
          this.form.email = null
          this.form.password = null
        },
        getValidationClass(fieldName) {
          const field = this.$v.form[fieldName]
          if (field) {
            return {
              'md-invalid': field.$invalid && field.$dirty
            }
          }
        },
        deleteUser(id) {
          this.$apollo.mutate({
            mutation: DelUserMutation,
            variables: {
              email: id,
            },
            update: (store, { data: { deleteUser } }) => {
              const data = { users: deleteUser };
              store.writeQuery({query: ReadUsers, data});
            },
          })
        },
        addUser() {
          this.sending = true
          this.$apollo.mutate({
            mutation: AddUserMutation,
            variables: {
              email: this.form.email,
              password: this.form.password
            },
            update: (store, { data: { addUser } }) => {
              this.sending = false;
              this.clearForm();
              const data = { users: addUser };
              store.writeQuery({query: ReadUsers, data});
            },
          })
        },
        validateUser() {
          this.$v.$touch()
          if (!this.$v.$invalid) {
            this.addUser()
          }
        }
      },
      apollo: {
        users: () => ReadUsers
      }
    }
</script>
