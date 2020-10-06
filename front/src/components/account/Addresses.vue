<template>
  <div>
    <div class="md-layout-item" style="margin: auto">
      <div style="width: 100%; margin-bottom: 5px">
        <b>Register your ghost addresses.</b> You need to sign the message with text "register".
      </div>
      <md-card class="md-primary" style="margin: auto; background-color: #101010; padding: 0px 20px 20px 20px">
        <form novalidate class="md-layout" @submit.prevent="validateAddress">
          <div style="width: 100%; margin: auto; padding-right: 15px">
            <div class="md-layout md-gutter">
              <div class="md-layout-item md-large-size-25">
                <md-field style="margin: 0" md-inline :class="getValidationClass('address')">
                  <label for="address">Address</label>
                  <md-input name="address" id="address" v-model="form.address" :disabled="sending" />
                  <span class="md-error" v-if="!$v.form.address.required">The address is required</span>
                </md-field>
              </div>
              <div class="md-layout-item md-large-size-25">
                <md-field style="margin: 0" md-inline :class="getValidationClass('signature')">
                  <label for="address">Signature</label>
                  <md-input name="signature" id="signature" v-model="form.signature" :disabled="sending" />
                  <span class="md-error" v-if="!$v.form.signature.required">The signature is required</span>
                </md-field>
              </div>
              <div class="md-layout-item md-size-10">
                <md-button style="margin-top: 14px" type="submit" class="md-raised md-primary" :disabled="sending">REGISTER</md-button>
              </div>
            </div>
          </div>
        </form>
      </md-card>
    </div>
    <md-divider style="margin-top: 20px; margin-bottom: 20px"></md-divider>
    <div class="md-layout md-gutter">
      <div class="md-layout-item">
        <!--
        <md-field>
          <label for="movie">Principal address (use to group your other ghost addresses)</label>
          <md-select v-model="me.principalAddress" name="addresses" id="addresses">
            <md-option v-for="addr in me.addresses" :key="'test-' + addr.id" :value="addr.id">{{ addr.id }}</md-option>
          </md-select>
        </md-field>
        -->
        <md-list v-if="me.addresses.length > 0">
          <md-list-item style="background-color: #448aff; margin-bottom: 4px">
            <md-icon class="md-primary" style="color: #ffffff; opacity: 1;">account_circle</md-icon>
            <span class="md-list-item-text">
              All addresses
            </span>
            <span class="md-raised md-primary"  style="margin-right: 64px">
              <span style="margin-left: 25px; font-family: 'Sen', sans-serif" class="md-list-item-text">
                <b>{{ format(me.balance) }} Ghost</b>
              </span>
            </span>
          </md-list-item>
          <md-list-item v-for="addr in me.addresses" :key="addr.id" style="background-color: #101010; margin-bottom: 4px" :to="`/address/${addr.id}`">
            <md-icon v-if="isColdStakingAddr(addr.id)" class="md-primary">ac_unit</md-icon>
            <md-icon v-if="!isColdStakingAddr(addr.id)" class="md-primary">local_fire_department</md-icon>
            <span class="md-list-item-text">
              <span>{{ addr.id }}</span>
              <span v-if="addr.alias && addr.alias != addr.id" style="font-size: 12px; color: #448aff">{{ addr.alias }}</span>
            </span>
            <span class="md-raised md-primary" style="margin-right: 20px">
              <span style="margin-left: 25px; font-family: 'Sen', sans-serif" class="md-list-item-text">
                {{ format(addr.balance) }} Ghost
              </span>
            </span>
            <md-button v-on:click.stop.prevent="deleteAddr(addr.id)" class="md-icon-button md-dense md-accent">
              <md-icon>delete</md-icon>
            </md-button>
          </md-list-item>
        </md-list>
        <div v-else style="text-align: center">
          We dont have any addresses registered yet
        </div>
      </div>
    </div>
  </div>
</template>

<script>
    import {validationMixin} from "vuelidate";
    import {required} from 'vuelidate/lib/validators'
    import gql from "graphql-tag";

    const ReadMeAddresses = gql`query {
        me {
          id
          balance
          addresses {
            id
            alias
            balance
          }
        }
    }`
    const AddAddressMutation = gql`
      mutation AddAddressMutation($address: String!, $signature: String!) {
        registerAddress(address: $address, signature: $signature) {
          id
          balance
          addresses {
            id
            alias
            balance
          }
        }
      }
    `
    const DelAddressMutation = gql`
      mutation DelAddressMutation($address: String!) {
        unregisterAddress(address: $address) {
          id
          balance
          addresses {
            id
            alias
            balance
          }
        }
      }
    `
    const updateUser = gql`
      mutation updateUserMutation($principalAddress: String!) {
        updateUser(principalAddress: $principalAddress) {
          id
          principalAddress
        }
      }
    `

    export default {
      name: 'Addresses',
      mixins: [validationMixin],
      validations: {
          form: {
            address: {
              required,
            },
            signature: {
              required,
            },
          }
        },
      data() {
        return {
          form: {
            address: null,
            signature: null,
          },
          me: {
            addresses: [],
          },
          sending: false,
        }
      },
      watch: {
        "me.principalAddress": function(val, oldVal) {
          if (oldVal) {
            this.$apollo.mutate({
              mutation: updateUser,
              variables: {
                principalAddress: val,
              },
              update: (store, { data: { updateUser } }) => {
                this.sending = false;
                const data = { me: updateUser };
                store.writeQuery({query: ReadMeAddresses, data});
              },
            })
          }
        }
      },
      methods: {
        deleteAddr(id) {
          this.$apollo.mutate({
            mutation: DelAddressMutation,
            variables: {
              address: id,
            },
            update: (store, { data: { unregisterAddress } }) => {
              const data = { me: unregisterAddress };
              store.writeQuery({query: ReadMeAddresses, data});
            },
          })
        },
        format(number) {
          const formatter = new Intl.NumberFormat('en-US');
          return formatter.format(Math.abs(number / 1e8))
        },
        isColdStakingAddr(id) {
          return id.startsWith('2');
        },
        getValidationClass(fieldName) {
          const field = this.$v.form[fieldName]
          if (field) {
            return {
              'md-invalid': field.$invalid && field.$dirty
            }
          }
        },
        clearForm () {
          this.$v.$reset()
          this.form.address = null
          this.form.signature = null
        },
        addAddress () {
          this.sending = true
          this.$apollo.mutate({
            mutation: AddAddressMutation,
            variables: {
              address: this.form.address,
              signature: this.form.signature
            },
            update: (store, { data: { registerAddress } }) => {
              this.sending = false;
              this.clearForm();
              const data = { me: registerAddress };
              console.log(data);
              store.writeQuery({query: ReadMeAddresses, data});
            },
          })
        },
        validateAddress () {
          this.$v.$touch()
          if (!this.$v.$invalid) {
            this.addAddress()
          }
        }
      },
      apollo: {
          me: () => ReadMeAddresses
      }
    }
</script>

<style>
  .md-menu-content.md-select-menu {
    width: auto;
    max-width: none;
  }
</style>
