<template>
    <div>
      <div class="md-layout-item" style="margin: auto">
        <div style="width: 100%; margin-bottom: 5px">
          <b>Ghost profile information</b>
        </div>
        <md-card class="md-primary" style="background-color: #101010; padding: 0px 20px 20px 20px">
          <form novalidate class="md-layout" @submit.prevent="validateInfo">
            <div style="width: 100%; margin: auto; padding-right: 15px">
              <div class="md-layout md-gutter">
                <div class="md-layout-item md-size-15" style="padding-top: 24px">
                  Email
                </div>
                <div class="md-layout-item md-size-15" style="padding-top: 24px">
                  {{ me.email }}
                </div>
              </div>
            </div>
            <div style="width: 100%; padding-right: 15px; margin-top: 20px">
              <div class="md-layout md-gutter">
                <div class="md-layout-item md-size-15" style="padding-top: 24px">
                  Public profile name
                </div>
                <div class="md-layout-item md-large-size-25">
                  <md-field style="margin: 0" md-inline :class="getValidationClass('name')">
                    <label for="name">Public profile name</label>
                    <md-input name="name" id="name" v-model="me.name" :disabled="sending" />
                    <span class="md-error" v-if="!$v.form.name.required">The field is required</span>
                    <span class="md-error" v-if="!$v.form.name.minLength">Your name needs a least 3 chars</span>
                    <span class="md-error" v-if="!$v.form.name.maxLength">Your name is limited to 20 chars</span>
                  </md-field>
                </div>
              </div>
            </div>
            <div style="width: 100%; padding-right: 15px; margin-top: 20px">
              <div class="md-layout md-gutter">
                <div class="md-layout-item md-size-15" style="padding-top: 24px">
                  Addresses alias
                </div>
                <div class="md-layout-item md-large-size-25">
                  <md-field style="margin: 0" md-inline :class="getValidationClass('alias')">
                    <label for="alias">Alias for all your addresses</label>
                    <md-input name="alias" id="alias" v-model="me.addressesAlias" :disabled="sending" />
                    <span class="md-error" v-if="!$v.form.alias.mustNotTooLong">Your alias is limited to 20 chars</span>
                  </md-field>
                </div>
              </div>
            </div>
            <div class="md-layout-item md-size-10" style="margin-top: 20px;">
              <md-button style="margin-left: 0" type="submit" class="md-raised md-primary" :disabled="sending">
                SAVE CHANGES
              </md-button>
            </div>
          </form>
        </md-card>
      </div>
    </div>
</template>

<script>
    import {validationMixin} from "vuelidate";
    import {required, minLength, maxLength, helpers} from "vuelidate/lib/validators";
    import gql from "graphql-tag";

    const ReadMe = gql`query {
        me {
            id
            name
            email
            addressesAlias
        }
    }`
    const updateUser = gql`
      mutation updateUserMutation($name: String!, $addressesAlias: String) {
        updateUser(name: $name, addressesAlias: $addressesAlias) {
          id
          name
          addressesAlias
        }
      }
    `
    const mustNotTooLong = (value) => !helpers.req(value) || value.length <= 20;
    export default {
      name: 'Profile',
      mixins: [validationMixin],
      validations: {
        form: {
          name: {
            required,
            minLength: minLength(3),
            maxLength: maxLength(20)
          },
          alias: {
            mustNotTooLong
          },
        }
      },
      data() {
        return {
          me: { name: '', addressesAlias: ''},
          form: {
            name: '',
            alias: '',
          },
          sending: false,
        }
      },
      methods: {
        getValidationClass(fieldName) {
          const field = this.$v.form[fieldName]
          if (field) {
            return {
              'md-invalid': field.$invalid && field.$dirty
            }
          }
        },
        updateUser() {
          this.sending = true
          this.$apollo.mutate({
            mutation: updateUser,
            variables: {
              name: this.form.name,
              addressesAlias: this.form.alias,
            },
            update: (store, { data: { updateUser } }) => {
              this.sending = false;
              const data = { me: updateUser };
              store.writeQuery({query: ReadMe, data});
            },
          })
        },
        validateInfo () {
          this.form.name = this.me.name;
          this.form.alias = this.me.addressesAlias;
          this.$v.$touch()
          if (!this.$v.$invalid) {
            this.updateUser()
          }
        }
      },
      apollo: {
        me: {
          query: ReadMe,
        },
      },
    }
</script>
