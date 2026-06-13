(function () {
    'use strict';

    var STORAGE_KEY = 'rencoret_lead_attribution';
    var LEGACY_STORAGE_KEY = 'campaign_data';
    var ATTRIBUTION_FIELDS = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_content',
        'utm_term',
        'landing_page',
        'referrer',
        'first_seen_at'
    ];
    var UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

    function safeSessionGet(key) {
        try {
            return window.sessionStorage ? window.sessionStorage.getItem(key) : '';
        } catch (error) {
            return '';
        }
    }

    function safeSessionSet(key, value) {
        try {
            if (window.sessionStorage) {
                window.sessionStorage.setItem(key, value);
            }
        } catch (error) {
            // Attribution must never block form usage.
        }
    }

    function parseJson(value) {
        if (!value) return null;

        try {
            return JSON.parse(value);
        } catch (error) {
            return null;
        }
    }

    function normalizeValue(value) {
        return value == null ? '' : String(value).trim();
    }

    function normalizeAttribution(data) {
        var normalized = {};

        ATTRIBUTION_FIELDS.forEach(function (fieldName) {
            normalized[fieldName] = normalizeValue(data && data[fieldName]);
        });

        if (!normalized.first_seen_at && data && data.timestamp) {
            normalized.first_seen_at = normalizeValue(data.timestamp);
        }

        return normalized;
    }

    function hasAttributionValue(data) {
        return ATTRIBUTION_FIELDS.some(function (fieldName) {
            return Boolean(data && data[fieldName]);
        });
    }

    function getCurrentAttribution() {
        var params = new URLSearchParams(window.location.search);
        var data = {
            landing_page: window.location.pathname + window.location.search,
            referrer: document.referrer || '',
            first_seen_at: new Date().toISOString()
        };

        UTM_FIELDS.forEach(function (fieldName) {
            data[fieldName] = params.get(fieldName) || '';
        });

        return normalizeAttribution(data);
    }

    function persistAttribution(data) {
        var normalized = normalizeAttribution(data);
        var serialized = JSON.stringify(normalized);

        safeSessionSet(STORAGE_KEY, serialized);
        safeSessionSet(LEGACY_STORAGE_KEY, serialized);

        return normalized;
    }

    function captureAttribution() {
        var stored = normalizeAttribution(parseJson(safeSessionGet(STORAGE_KEY)));

        if (hasAttributionValue(stored)) {
            return stored;
        }

        var legacy = normalizeAttribution(parseJson(safeSessionGet(LEGACY_STORAGE_KEY)));

        if (hasAttributionValue(legacy)) {
            return persistAttribution(legacy);
        }

        return persistAttribution(getCurrentAttribution());
    }

    function getAttribution() {
        return captureAttribution();
    }

    function populateForm(form) {
        if (!form || !form.elements) return getAttribution();

        var attribution = getAttribution();

        ATTRIBUTION_FIELDS.forEach(function (fieldName) {
            var field = form.elements[fieldName];
            if (field && typeof field.value !== 'undefined') {
                field.value = attribution[fieldName] || '';
            }
        });

        return attribution;
    }

    function populateAllForms(root) {
        var scope = root || document;
        var forms = scope.querySelectorAll ? scope.querySelectorAll('form.pageclip-form') : [];

        Array.prototype.forEach.call(forms, populateForm);

        return getAttribution();
    }

    window.rencoretLeadAttribution = {
        fields: ATTRIBUTION_FIELDS.slice(),
        capture: captureAttribution,
        get: getAttribution,
        populateForm: populateForm,
        populateAllForms: populateAllForms
    };

    captureAttribution();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            populateAllForms(document);
        }, { once: true });
    } else {
        populateAllForms(document);
    }
})();
