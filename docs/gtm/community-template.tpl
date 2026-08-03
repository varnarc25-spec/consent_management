___INFO___

{
  "displayName": "CMP Consent Mode v2",
  "description": "Listens for CMP consent events and updates Google Consent Mode v2 signals. Pair with the CMP script loaded before GTM.",
  "securityGroups": [],
  "id": "cvt_cmp_consent_mode_v2",
  "type": "TAG",
  "version": 1,
  "containerContexts": [
    "WEB"
  ]
}


___TEMPLATE_PARAMETERS___

[
  {
    "type": "GROUP",
    "name": "defaultGroup",
    "displayName": "Default consent",
    "groupStyle": "ZIPPY_CLOSED"
  },
  {
    "type": "SELECT",
    "name": "ad_storage",
    "displayName": "ad_storage",
    "macrosInSelect": false,
    "selectItems": [
      { "value": "denied", "displayValue": "denied" },
      { "value": "granted", "displayValue": "granted" }
    ],
    "simpleValueType": true,
    "defaultValue": "denied",
    "parentContainer": {
      "value": "defaultGroup",
      "displayName": "Default consent"
    }
  },
  {
    "type": "SELECT",
    "name": "analytics_storage",
    "displayName": "analytics_storage",
    "macrosInSelect": false,
    "selectItems": [
      { "value": "denied", "displayValue": "denied" },
      { "value": "granted", "displayValue": "granted" }
    ],
    "simpleValueType": true,
    "defaultValue": "denied",
    "parentContainer": {
      "value": "defaultGroup",
      "displayName": "Default consent"
    }
  },
  {
    "type": "SELECT",
    "name": "ad_user_data",
    "displayName": "ad_user_data",
    "macrosInSelect": false,
    "selectItems": [
      { "value": "denied", "displayValue": "denied" },
      { "value": "granted", "displayValue": "granted" }
    ],
    "simpleValueType": true,
    "defaultValue": "denied",
    "parentContainer": {
      "value": "defaultGroup",
      "displayName": "Default consent"
    }
  },
  {
    "type": "SELECT",
    "name": "ad_personalization",
    "displayName": "ad_personalization",
    "macrosInSelect": false,
    "selectItems": [
      { "value": "denied", "displayValue": "denied" },
      { "value": "granted", "displayValue": "granted" }
    ],
    "simpleValueType": true,
    "defaultValue": "denied",
    "parentContainer": {
      "value": "defaultGroup",
      "displayName": "Default consent"
    }
  },
  {
    "type": "TEXT",
    "name": "wait_for_update",
    "displayName": "wait_for_update (ms)",
    "simpleValueType": true,
    "defaultValue": "500",
    "parentContainer": {
      "value": "defaultGroup",
      "displayName": "Default consent"
    }
  },
  {
    "type": "TEXT",
    "name": "regional_defaults",
    "displayName": "Regional defaults JSON",
    "simpleValueType": true,
    "help": "Optional JSON map of region code to consent signals, e.g. {\"EU\":{\"analytics_storage\":\"denied\"}}",
    "parentContainer": {
      "value": "defaultGroup",
      "displayName": "Default consent"
    }
  }
]


___SANDBOXED_JS_FOR_WEB_TEMPLATE___

const setDefaultConsentState = require('setDefaultConsentState');
const updateConsentState = require('updateConsentState');
const copyFromWindow = require('copyFromWindow');
const addEventCallback = require('addEventCallback');
const JSON = require('JSON');
const log = require('logToConsole');

const defaultState = {
  ad_storage: data.ad_storage || 'denied',
  analytics_storage: data.analytics_storage || 'denied',
  ad_user_data: data.ad_user_data || 'denied',
  ad_personalization: data.ad_personalization || 'denied',
  functionality_storage: 'granted',
  personalization_storage: 'denied',
  security_storage: 'granted',
  wait_for_update: parseInt(data.wait_for_update, 10) || 500,
};

setDefaultConsentState(defaultState);

if (data.regional_defaults) {
  try {
    const regional = JSON.parse(data.regional_defaults);
    const keys = Object.keys(regional);
    for (let i = 0; i < keys.length; i++) {
      const region = keys[i];
      const overrides = regional[region];
      if (overrides && typeof overrides === 'object') {
        setDefaultConsentState({
          region: [region],
          ad_storage: overrides.ad_storage || defaultState.ad_storage,
          analytics_storage: overrides.analytics_storage || defaultState.analytics_storage,
          ad_user_data: overrides.ad_user_data || defaultState.ad_user_data,
          ad_personalization: overrides.ad_personalization || defaultState.ad_personalization,
          functionality_storage: overrides.functionality_storage || 'granted',
          personalization_storage: overrides.personalization_storage || 'denied',
          security_storage: overrides.security_storage || 'granted',
          wait_for_update: defaultState.wait_for_update,
        });
      }
    }
  } catch (e) {
    log('CMP Consent Mode: invalid regional_defaults JSON');
  }
}

const applySignals = function(signals) {
  if (!signals || typeof signals !== 'object') return;
  updateConsentState({
    ad_storage: signals.ad_storage || 'denied',
    analytics_storage: signals.analytics_storage || 'denied',
    ad_user_data: signals.ad_user_data || 'denied',
    ad_personalization: signals.ad_personalization || 'denied',
    functionality_storage: signals.functionality_storage || 'granted',
    personalization_storage: signals.personalization_storage || 'denied',
    security_storage: signals.security_storage || 'granted',
  });
};

addEventCallback('cmp_consent_update', function(eventData) {
  if (eventData && eventData.cmp_consent_signals) {
    applySignals(eventData.cmp_consent_signals);
  }
});

const dataLayer = copyFromWindow('dataLayer');
if (dataLayer && dataLayer.length) {
  for (let i = dataLayer.length - 1; i >= 0; i--) {
    const entry = dataLayer[i];
    if (entry && entry.event === 'cmp_consent_update' && entry.cmp_consent_signals) {
      applySignals(entry.cmp_consent_signals);
      break;
    }
  }
}

data.gtmOnSuccess();


___WEB_PERMISSIONS___

[
  {
    "instance": {
      "key": {
        "publicId": "access_consent",
        "versionId": "1"
      },
      "param": [
        {
          "key": "consentTypes",
          "value": {
            "type": 2,
            "listItem": [
              { "type": 1, "string": "ad_storage" },
              { "type": 1, "string": "analytics_storage" },
              { "type": 1, "string": "ad_user_data" },
              { "type": 1, "string": "ad_personalization" },
              { "type": 1, "string": "functionality_storage" },
              { "type": 1, "string": "personalization_storage" },
              { "type": 1, "string": "security_storage" }
            ]
          }
        }
      ]
    },
    "clientAnnotations": {
      "isEditedByUser": true
    },
    "isRequired": true
  },
  {
    "instance": {
      "key": {
        "publicId": "access_globals",
        "versionId": "1"
      },
      "param": [
        {
          "key": "keys",
          "value": {
            "type": 2,
            "listItem": [
              {
                "type": 3,
                "mapKey": [
                  { "type": 1, "string": "key" },
                  { "type": 1, "string": "read" },
                  { "type": 1, "string": "write" },
                  { "type": 1, "string": "execute" }
                ],
                "mapValue": [
                  { "type": 1, "string": "dataLayer" },
                  { "type": 8, "boolean": true },
                  { "type": 8, "boolean": false },
                  { "type": 8, "boolean": false }
                ]
              }
            ]
          }
        }
      ]
    },
    "clientAnnotations": {
      "isEditedByUser": true
    },
    "isRequired": true
  }
]


___TESTS___

[
  {
    "name": "Sets default denied consent state",
    "code": "runCode({ad_storage:'denied',analytics_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:'500'});\nassertApi('setDefaultConsentState').wasCalledWith({ad_storage:'denied',analytics_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',functionality_storage:'granted',personalization_storage:'denied',security_storage:'granted',wait_for_update:500});\nassertApi('gtmOnSuccess').wasCalled();"
  }
]
