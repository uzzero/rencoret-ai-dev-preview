/**
 * Analytics & Tracking Module
 * Handles consent-gated marketing tracking configuration, cookie consent, and campaign attribution.
 */

(function () {
    'use strict';

    const CONSENT_DEFAULTS = {
        'ad_storage': 'denied',
        'ad_user_data': 'denied',
        'ad_personalization': 'denied',
        'analytics_storage': 'denied'
    };
    const CONSENT_GRANTED = {
        'ad_storage': 'granted',
        'ad_user_data': 'granted',
        'ad_personalization': 'granted',
        'analytics_storage': 'granted'
    };
    const BUILD_TRACKING_CONFIG = '{"googleTagManager":{"containerId":""},"ga4":{"measurementId":""},"googleAds":{"conversionId":"","conversionLabel":""},"linkedin":{"partnerId":"","conversionId":""}}';

    function hasExistingGoogleConsentDefault() {
        return Array.isArray(window.dataLayer) && window.dataLayer.some((entry) => (
            entry
            && entry[0] === 'consent'
            && entry[1] === 'default'
        ));
    }

    function ensureGoogleConsentDefaults() {
        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function () {
            window.dataLayer.push(arguments);
        };

        if (!window.__rencoretConsentDefaulted) {
            if (!hasExistingGoogleConsentDefault()) {
                window.gtag('consent', 'default', CONSENT_DEFAULTS);
            }
            window.__rencoretConsentDefaulted = true;
        }
    }

    function updateGoogleConsent(accepted) {
        ensureGoogleConsentDefaults();
        window.gtag('consent', 'update', accepted ? CONSENT_GRANTED : CONSENT_DEFAULTS);
    }

    function parseBuildTrackingConfig() {
        if (!BUILD_TRACKING_CONFIG || BUILD_TRACKING_CONFIG.charAt(0) !== '{') {
            return {};
        }

        try {
            return JSON.parse(BUILD_TRACKING_CONFIG);
        } catch (error) {
            return {};
        }
    }

    function normalizeValue(value) {
        return value == null ? '' : String(value).trim();
    }

    function normalizeTrackingConfig(rawConfig) {
        const raw = rawConfig || {};

        return {
            googleTagManager: {
                containerId: normalizeValue(raw.googleTagManager && raw.googleTagManager.containerId)
            },
            ga4: {
                measurementId: normalizeValue(raw.ga4 && raw.ga4.measurementId)
            },
            googleAds: {
                conversionId: normalizeValue(raw.googleAds && raw.googleAds.conversionId),
                conversionLabel: normalizeValue(raw.googleAds && raw.googleAds.conversionLabel)
            },
            linkedin: {
                partnerId: normalizeValue(raw.linkedin && raw.linkedin.partnerId),
                conversionId: normalizeValue(raw.linkedin && raw.linkedin.conversionId)
            }
        };
    }

    function isValidGtmContainerId(value) {
        return /^GTM-[A-Z0-9]+$/.test(value);
    }

    function isValidGa4MeasurementId(value) {
        return /^G-[A-Z0-9]+$/.test(value);
    }

    function isValidGoogleAdsConversionId(value) {
        return /^AW-\d+$/.test(value);
    }

    function isValidConversionLabel(value) {
        return /^[A-Za-z0-9_-]+$/.test(value);
    }

    function isValidNumericId(value) {
        return /^\d+$/.test(value);
    }

    const MARKETING_EVENT_NAMES = [
        'primary_cta_click',
        'secondary_cta_click',
        'landing_page_cta_click',
        'case_study_click',
        'form_start',
        'form_submit_success',
        'form_submit_error',
        'calendar_cta_click',
        'outbound_link_click'
    ];
    const MARKETING_EVENT_NAME_SET = new Set(MARKETING_EVENT_NAMES);
    const MARKETING_PAYLOAD_FIELDS = new Set([
        'event_id',
        'event_name',
        'page_path',
        'landing_page_type',
        'traffic_source',
        'section',
        'cta_type',
        'cta_variant',
        'destination_host',
        'destination_path',
        'link_type',
        'offer_type',
        'case_study_slug',
        'form_id',
        'form_name',
        'form_state',
        'first_field_type'
    ]);
    const LOCAL_EVENT_LIMIT = 100;

    function getSafeString(value, fallback = '') {
        if (value == null) return fallback;
        const normalized = String(value).replace(/\s+/g, ' ').trim();
        return normalized.slice(0, 160) || fallback;
    }

    function getSanitizedPath(rawValue) {
        const value = getSafeString(rawValue);
        if (!value) return '';

        try {
            const url = new URL(value, window.location.href);
            return `${url.pathname}${url.hash || ''}`.slice(0, 160);
        } catch (error) {
            return value.charAt(0) === '#' ? value : '';
        }
    }

    function getDestinationHost(rawValue) {
        const value = getSafeString(rawValue);
        if (!value || value.charAt(0) === '#') return '';

        try {
            const url = new URL(value, window.location.href);
            if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
            return isInternalHost(url.hostname) ? '' : url.hostname;
        } catch (error) {
            return '';
        }
    }

    function isInternalHost(hostname) {
        const host = getSafeString(hostname).toLowerCase();
        if (!host) return true;

        const currentHost = window.location.hostname.toLowerCase();
        return host === currentHost || host === 'rencoret.ai' || host === 'www.rencoret.ai';
    }

    function isExternalHttpLink(link) {
        if (!link || !link.href) return false;

        try {
            const url = new URL(link.href, window.location.href);
            return (url.protocol === 'http:' || url.protocol === 'https:') && !isInternalHost(url.hostname);
        } catch (error) {
            return false;
        }
    }

    function getLinkType(link) {
        const href = getSafeString(link && link.getAttribute('href'));
        if (href.startsWith('mailto:')) return 'email';
        if (href.startsWith('tel:')) return 'phone';
        if (href.includes('wa.me') || href.includes('whatsapp')) return 'messaging';
        return isExternalHttpLink(link) ? 'external_url' : 'internal';
    }

    function getSectionName(element) {
        const section = element && element.closest('section, header, footer, nav, .modal-container, .success-calendar');
        if (!section) return 'page';
        if (section.id) return getSafeString(section.id, 'page');
        if (section.classList.contains('success-calendar')) return 'success_calendar';
        if (section.classList.contains('modal-container')) return getSafeString(section.id, 'project_modal');
        if (section.classList && section.classList.length) return getSafeString(section.classList[0], 'page');
        return section.tagName ? section.tagName.toLowerCase() : 'page';
    }

    function getPageOfferType() {
        const field = document.querySelector('input[name="offer_type"]');
        if (field && field.value) return getSafeString(field.value);

        const pageType = campaignTracker.getLandingPageType();
        return pageType === 'main' ? '' : pageType;
    }

    function getFormOfferType(form) {
        if (!form || !form.elements) return getPageOfferType();

        const offerField = form.elements.offer_type;
        if (offerField && offerField.value) return getSafeString(offerField.value);

        return getPageOfferType();
    }

    function getFormTrackingPayload(form, extraPayload = {}) {
        return {
            form_id: getSafeString(form && form.id, 'contact-form'),
            form_name: getSafeString(form && (form.getAttribute('name') || form.dataset.formName), 'contact'),
            offer_type: getFormOfferType(form),
            section: getSectionName(form),
            ...extraPayload
        };
    }

    function getCaseStudySlug(link) {
        const href = getSafeString(link && link.getAttribute('href'));
        const match = href.match(/case-study-([a-z0-9-]+)\.html/i);
        return match ? match[1].toLowerCase() : '';
    }

    function isServiceLandingPage() {
        return /\/(ki-mvp-entwickeln-lassen|ai-mvp-development|internal-ai-assistant-rag|ai-automation-sprint|founder|mittelstand)\.html$/.test(window.location.pathname);
    }

    function getCtaVariant(element) {
        if (!element) return 'default';
        if (element.classList.contains('nav-cta')) return 'nav';
        if (element.classList.contains('sticky-cta__button')) return 'sticky';
        if (element.classList.contains('mobile-menu-cta')) return 'mobile_menu';
        if (element.classList.contains('modal-anchor-cta')) return 'project_modal';
        if (element.classList.contains('offer-card__cta')) return 'offer_card';
        if (element.closest('.hero, .campaign-hero, #top')) return 'hero';
        if (element.closest('.pre-contact-cta')) return 'pre_contact';
        if (element.closest('.case-next')) return 'case_next';
        return 'default';
    }

    function isMarketingCta(element) {
        if (!element) return false;
        if (element.matches('#accept-cookies, #reject-cookies, #cookie-settings, .mobile-menu-toggle, .mobile-menu-close, .modal-close')) return false;
        if (element.matches('button[type="submit"], .pageclip-form__submit, .details-button')) return false;

        return element.matches('.cta-button, .btn-primary, .btn-ghost, .nav-cta, [data-track="cta"]');
    }

    function getCtaEventName(element) {
        if (isServiceLandingPage()) return 'landing_page_cta_click';
        if (element.classList.contains('btn-ghost')) return 'secondary_cta_click';
        return 'primary_cta_click';
    }

    function sanitizeMarketingPayload(payload) {
        const source = payload || {};
        const sanitized = {};

        MARKETING_PAYLOAD_FIELDS.forEach((field) => {
            if (source[field] == null) return;
            sanitized[field] = getSafeString(source[field]);
        });

        sanitized.page_path = sanitized.page_path || window.location.pathname;
        sanitized.landing_page_type = sanitized.landing_page_type || campaignTracker.getLandingPageType();
        sanitized.traffic_source = sanitized.traffic_source || getTrafficSource();

        return sanitized;
    }

    function storeLocalMarketingEvent(eventRecord) {
        window.__rencoretMarketingEvents = window.__rencoretMarketingEvents || [];
        window.__rencoretMarketingEvents.push(eventRecord);

        if (window.__rencoretMarketingEvents.length > LOCAL_EVENT_LIMIT) {
            window.__rencoretMarketingEvents.shift();
        }

        try {
            window.dispatchEvent(new CustomEvent('rencoret:marketing-event', { detail: eventRecord }));
        } catch (error) {
            // CustomEvent can fail in unusual embedded contexts; local storage is enough.
        }

        try {
            const params = new URLSearchParams(window.location.search);
            const debugEnabled = params.get('debug_events') === '1' || localStorage.getItem('rencoret_debug_events') === '1';
            if (debugEnabled && window.console && typeof window.console.info === 'function') {
                window.console.info('[RENCORET marketing event]', eventRecord);
            }
        } catch (error) {
            // Debug logging is optional.
        }
    }

    function trackMarketingEvent(eventName, payload = {}) {
        if (!MARKETING_EVENT_NAME_SET.has(eventName)) return null;

        const sanitizedPayload = sanitizeMarketingPayload({
            ...payload,
            event_name: eventName
        });
        const eventRecord = {
            ...sanitizedPayload,
            event_id: `${eventName}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`
        };

        storeLocalMarketingEvent(eventRecord);

        if (cookieConsent.hasConsent() && hasEnabledTrackingPlatform()) {
            trackEvent(eventName, sanitizedPayload);
        }

        return eventRecord;
    }

    ensureGoogleConsentDefaults();

    const configuredTracking = normalizeTrackingConfig(parseBuildTrackingConfig());

    // Configuration
    const config = {
        googleTagManager: {
            containerId: configuredTracking.googleTagManager.containerId,
            enabled: false,
            loaded: false
        },
        ga4: {
            measurementId: configuredTracking.ga4.measurementId,
            enabled: false,
            loaded: false
        },
        googleAds: {
            conversionId: configuredTracking.googleAds.conversionId,
            conversionLabel: configuredTracking.googleAds.conversionLabel,
            enabled: false
        },
        linkedin: {
            partnerId: configuredTracking.linkedin.partnerId,
            conversionId: configuredTracking.linkedin.conversionId,
            enabled: false,
            loaded: false
        },
        cookieConsent: {
            cookieName: 'rencoret_cookie_consent',
            cookieExpiry: 365 // days
        }
    };

    // Campaign Attribution Tracker
    const campaignTracker = {
        // Capture and store UTM parameters
        captureUTMParams() {
            if (window.rencoretLeadAttribution && typeof window.rencoretLeadAttribution.capture === 'function') {
                const attribution = window.rencoretLeadAttribution.capture();

                return {
                    ...attribution,
                    landing_page_type: this.getLandingPageType(),
                    timestamp: attribution.first_seen_at
                };
            }

            const params = new URLSearchParams(window.location.search);
            const utmData = {
                utm_source: params.get('utm_source'),
                utm_medium: params.get('utm_medium'),
                utm_campaign: params.get('utm_campaign'),
                utm_content: params.get('utm_content'),
                utm_term: params.get('utm_term'),
                li_fat_id: params.get('li_fat_id'), // LinkedIn Click ID
                landing_page: window.location.pathname,
                landing_page_type: this.getLandingPageType(),
                first_seen_at: new Date().toISOString(),
                timestamp: new Date().toISOString(),
                referrer: document.referrer
            };

            try {
                if (!sessionStorage.getItem('campaign_data')) {
                    sessionStorage.setItem('campaign_data', JSON.stringify(utmData));
                }
            } catch (error) {
                // Attribution storage is best-effort and must not block the page.
            }

            try {
                if (utmData.utm_source && !localStorage.getItem('first_touch_campaign')) {
                    localStorage.setItem('first_touch_campaign', JSON.stringify(utmData));
                }
            } catch (error) {
                // Cross-session analytics attribution is optional.
            }

            return utmData;
        },

        // Get landing page type for segmentation
        getLandingPageType() {
            const path = window.location.pathname;
            if (path.includes('/ki-mvp-entwickeln-lassen')) return 'ki_mvp_development';
            if (path.includes('/ai-mvp-development')) return 'ai_mvp_development';
            if (path.includes('/internal-ai-assistant-rag')) return 'internal_ai_assistant_rag';
            if (path.includes('/ai-automation-sprint')) return 'ai_automation_sprint';
            if (path.includes('/founder')) return 'founder';
            if (path.includes('/mittelstand')) return 'mittelstand';
            if (path.includes('/case-study-')) return 'case_study';
            return 'main';
        },

        // Get attribution data for conversions
        getAttributionData() {
            if (window.rencoretLeadAttribution && typeof window.rencoretLeadAttribution.get === 'function') {
                const attribution = window.rencoretLeadAttribution.get();

                return {
                    session: attribution,
                    firstTouch: attribution,
                    current: {
                        landing_page: window.location.pathname,
                        landing_page_type: this.getLandingPageType()
                    }
                };
            }

            let sessionData = null;
            let firstTouch = null;

            try {
                sessionData = sessionStorage.getItem('campaign_data');
            } catch (error) {
                sessionData = null;
            }

            try {
                firstTouch = localStorage.getItem('first_touch_campaign');
            } catch (error) {
                firstTouch = null;
            }

            let parsedSession = null;
            let parsedFirstTouch = null;

            try {
                parsedSession = sessionData ? JSON.parse(sessionData) : null;
            } catch (error) {
                parsedSession = null;
            }

            try {
                parsedFirstTouch = firstTouch ? JSON.parse(firstTouch) : null;
            } catch (error) {
                parsedFirstTouch = null;
            }

            return {
                session: parsedSession,
                firstTouch: parsedFirstTouch,
                current: {
                    landing_page: window.location.pathname,
                    landing_page_type: this.getLandingPageType()
                }
            };
        },

        // Get LinkedIn account from campaign
        getLinkedInAccount(campaign) {
            return '';
        },

        // Clear attribution data (e.g., after conversion)
        clearSessionData() {
            try {
                sessionStorage.removeItem('campaign_data');
            } catch (error) {
                // Storage may be unavailable; attribution cleanup is optional.
            }
        }
    };

    // Cookie Consent Manager
    const cookieConsent = {
        hasConsent() {
            return document.cookie.includes(`${config.cookieConsent.cookieName}=accepted`);
        },

        setConsent(accepted) {
            const date = new Date();
            date.setTime(date.getTime() + (config.cookieConsent.cookieExpiry * 24 * 60 * 60 * 1000));
            const expires = `expires=${date.toUTCString()}`;
            const value = accepted ? 'accepted' : 'rejected';
            document.cookie = `${config.cookieConsent.cookieName}=${value};${expires};path=/;SameSite=Strict`;

            if (accepted) {
                this.enableTracking();
            } else {
                this.disableTracking();
            }
        },

        enableTracking() {
            updateGoogleConsent(true);

            config.googleTagManager.enabled = isValidGtmContainerId(config.googleTagManager.containerId);
            config.ga4.enabled = isValidGa4MeasurementId(config.ga4.measurementId);
            config.googleAds.enabled = isValidGoogleAdsConversionId(config.googleAds.conversionId)
                && isValidConversionLabel(config.googleAds.conversionLabel);
            config.linkedin.enabled = isValidNumericId(config.linkedin.partnerId);

            if (config.ga4.measurementId) {
                window['ga-disable-' + config.ga4.measurementId] = false;
            }
            if (config.googleAds.conversionId) {
                window['ga-disable-' + config.googleAds.conversionId] = false;
            }

            loadGoogleTagManager();
            loadGoogleTag();
            initializeLinkedIn();
            trackPageView();
        },

        disableTracking() {
            updateGoogleConsent(false);

            config.googleTagManager.enabled = false;
            config.ga4.enabled = false;
            config.googleAds.enabled = false;
            config.linkedin.enabled = false;
            if (config.ga4.measurementId) {
                window['ga-disable-' + config.ga4.measurementId] = true;
            }
            if (config.googleAds.conversionId) {
                window['ga-disable-' + config.googleAds.conversionId] = true;
            }
            // Remove cookies
            document.cookie.split(";").forEach(function (c) {
                if (c.includes('_ga') || c.includes('_gid')) {
                    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date(0).toUTCString() + ";path=/");
                }
            });
        },

        showBanner() {
            // Small delay to give the browser time to read cookies from previous page
            setTimeout(() => {
                const banner = document.getElementById('cookie-banner');
                if (banner && !this.hasConsent() && !document.cookie.includes(`${config.cookieConsent.cookieName}=rejected`)) {
                    // Ensure banner is correctly positioned
                    banner.style.cssText = 'display: block !important; position: fixed !important; bottom: 0 !important; left: 0 !important; right: 0 !important; width: 100% !important; transform: none !important;';
                    // Add class after animation completes
                    setTimeout(() => {
                        banner.classList.add('visible');
                    }, 400);
                }
            }, 200);
        },

        hideBanner() {
            const banner = document.getElementById('cookie-banner');
            if (banner) {
                // Override the !important styles from showBanner
                banner.style.cssText = 'display: none !important;';
                banner.classList.remove('visible');
            }
        },

        showPreferences() {
            const banner = document.getElementById('cookie-banner');
            if (!banner) return;

            banner.style.cssText = 'display: block !important; position: fixed !important; bottom: 0 !important; left: 0 !important; right: 0 !important; width: 100% !important; transform: none !important;';
            window.requestAnimationFrame(() => {
                banner.classList.add('visible');
                const rejectBtn = document.getElementById('reject-cookies');
                const acceptBtn = document.getElementById('accept-cookies');
                (rejectBtn || acceptBtn || banner).focus?.({ preventScroll: true });
            });
        }
    };

    function loadGoogleTagManager() {
        if (!config.googleTagManager.enabled || !isValidGtmContainerId(config.googleTagManager.containerId)) return;
        if (config.googleTagManager.loaded || document.querySelector('script[data-rencoret-gtm]')) {
            config.googleTagManager.loaded = true;
            return;
        }

        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            'gtm.start': new Date().getTime(),
            event: 'gtm.js'
        });

        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(config.googleTagManager.containerId)}`;
        script.dataset.rencoretGtm = 'true';
        document.head.appendChild(script);

        config.googleTagManager.loaded = true;
    }

    function getPrimaryGoogleTagId() {
        if (config.ga4.enabled && isValidGa4MeasurementId(config.ga4.measurementId)) {
            return config.ga4.measurementId;
        }

        if (config.googleAds.enabled && isValidGoogleAdsConversionId(config.googleAds.conversionId)) {
            return config.googleAds.conversionId;
        }

        return '';
    }

    function loadGoogleTag() {
        const primaryGoogleTagId = getPrimaryGoogleTagId();
        if (!primaryGoogleTagId) return;

        if (config.ga4.measurementId) {
            window['ga-disable-' + config.ga4.measurementId] = false;
        }
        if (config.googleAds.conversionId) {
            window['ga-disable-' + config.googleAds.conversionId] = false;
        }

        if (!config.ga4.loaded && !document.querySelector('script[data-rencoret-google-tag]')) {
            const script = document.createElement('script');
            script.async = true;
            script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(primaryGoogleTagId)}`;
            script.dataset.rencoretGoogleTag = 'true';
            document.head.appendChild(script);
        }

        config.ga4.loaded = true;

        if (window.gtag) {
            gtag('js', new Date());

            if (config.ga4.enabled) {
                gtag('config', config.ga4.measurementId, {
                    anonymize_ip: true,
                    cookie_flags: 'SameSite=Strict;Secure'
                });
            }

            if (config.googleAds.enabled) {
                gtag('config', config.googleAds.conversionId);
            }
        }
    }

    // Initialize LinkedIn Insight Tag
    function initializeLinkedIn() {
        if (!config.linkedin.enabled || !isValidNumericId(config.linkedin.partnerId)) return;
        if (config.linkedin.loaded || document.querySelector('script[data-rencoret-linkedin]')) {
            config.linkedin.loaded = true;
            return;
        }

        window._linkedin_partner_id = config.linkedin.partnerId;
        window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
        if (!window._linkedin_data_partner_ids.includes(window._linkedin_partner_id)) {
            window._linkedin_data_partner_ids.push(window._linkedin_partner_id);
        }

        (function (l) {
            if (!l) {
                window.lintrk = function (a, b) { window.lintrk.q.push([a, b]) };
                window.lintrk.q = [];
            }
            const s = document.getElementsByTagName("script")[0];
            const b = document.createElement("script");
            b.type = "text/javascript";
            b.async = true;
            b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
            b.dataset.rencoretLinkedin = 'true';
            s.parentNode.insertBefore(b, s);
        })(window.lintrk);

        config.linkedin.loaded = true;
    }

    function getPageEventParams(extraParams = {}) {
        const attribution = campaignTracker.getAttributionData();
        const sessionData = attribution.session || {};

        return {
            ...extraParams,
            page_title: document.title,
            page_location: window.location.href,
            page_path: window.location.pathname,
            traffic_source: getTrafficSource(),
            landing_page_type: campaignTracker.getLandingPageType(),
            utm_source: sessionData.utm_source || '',
            utm_medium: sessionData.utm_medium || '',
            utm_campaign: sessionData.utm_campaign || '',
            utm_content: sessionData.utm_content || ''
        };
    }

    function pushDataLayerEvent(eventName, eventParams) {
        if (!config.googleTagManager.enabled) return;

        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            event: eventName,
            ...eventParams
        });
    }

    function hasEnabledTrackingPlatform() {
        return config.googleTagManager.enabled
            || config.ga4.enabled
            || config.googleAds.enabled
            || config.linkedin.enabled;
    }

    // Track page views with campaign attribution
    function trackPageView() {
        if (!cookieConsent.hasConsent() || !hasEnabledTrackingPlatform()) return;

        const eventParams = getPageEventParams();
        pushDataLayerEvent('page_view', eventParams);

        if (config.ga4.enabled && window.gtag) {
            window.gtag('event', 'page_view', eventParams);
        }
    }

    // Get traffic source with enhanced detection
    function getTrafficSource() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('utm_source')) {
            return urlParams.get('utm_source');
        }

        if (window.rencoretLeadAttribution && typeof window.rencoretLeadAttribution.get === 'function') {
            const attribution = window.rencoretLeadAttribution.get();
            if (attribution.utm_source) return attribution.utm_source;
        }

        // Check sessionStorage for previously captured source
        try {
            const sessionData = sessionStorage.getItem('campaign_data');
            if (sessionData) {
                const data = JSON.parse(sessionData);
                if (data.utm_source) return data.utm_source;
            }
        } catch (error) {
            // Storage may be unavailable; fall back to referrer/direct.
        }

        // Check referrer
        if (document.referrer.includes('linkedin.com')) {
            return 'linkedin_organic';
        } else if (document.referrer.includes('google.')) {
            return 'google_organic';
        }

        return 'direct';
    }

    // Track Events - Fix TypeScript error by using window['trackEvent']
    const trackEvent = function (eventName, parameters = {}) {
        if (!cookieConsent.hasConsent() || !hasEnabledTrackingPlatform()) return;

        const canSendGa4Event = config.ga4.enabled && window.gtag;
        const canSendGoogleAdsLead = eventName === 'generate_lead' && config.googleAds.enabled && window.gtag;
        const canSendLinkedInLead = eventName === 'generate_lead'
            && config.linkedin.enabled
            && isValidNumericId(config.linkedin.conversionId)
            && window.lintrk;
        const canPushGtmEvent = config.googleTagManager.enabled;

        if (!canPushGtmEvent && !canSendGa4Event && !canSendGoogleAdsLead && !canSendLinkedInLead) return;

        // Add default parameters
        const eventParams = getPageEventParams({
            ...parameters,
            timestamp: new Date().toISOString()
        });

        pushDataLayerEvent(eventName, eventParams);

        if (canSendGa4Event) {
            window.gtag('event', eventName, eventParams);
        }

        // Ad-platform conversions fire only on confirmed leads (success overlay),
        // not on submit attempts, to avoid double counting
        if (eventName === 'generate_lead') {
            if (canSendGoogleAdsLead) {
                window.gtag('event', 'conversion', {
                    send_to: `${config.googleAds.conversionId}/${config.googleAds.conversionLabel}`
                });
            }

            if (canSendLinkedInLead) {
                window.lintrk('track', { conversion_id: config.linkedin.conversionId });
            }
        }
    };

    // Make trackEvent globally available
    window['trackEvent'] = trackEvent;

    // Track scroll depth
    let scrollDepthTracked = { 25: false, 50: false, 75: false, 100: false };

    function trackScrollDepth() {
        const scrollPercent = Math.round((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100);

        Object.keys(scrollDepthTracked).forEach(depth => {
            if (scrollPercent >= depth && !scrollDepthTracked[depth]) {
                scrollDepthTracked[depth] = true;
                trackEvent('scroll_depth', {
                    percent_scrolled: depth,
                    page_height: document.documentElement.scrollHeight
                });
            }
        });
    }

    // Track contact form interactions
    function setupFormTracking() {
        document.querySelectorAll('form.pageclip-form, form.contact-form').forEach((form) => {
            if (form.dataset.marketingFormTracked === 'true') return;
            form.dataset.marketingFormTracked = 'true';

            let formStarted = false;
            let lastSubmitState = '';

            form.addEventListener('focusin', (event) => {
                const target = event.target;
                const isInput = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

                if (!formStarted && isInput && target.type !== 'hidden') {
                    formStarted = true;
                    trackMarketingEvent('form_start', getFormTrackingPayload(form, {
                        first_field_type: getSafeString(target.type || target.tagName.toLowerCase(), 'field')
                    }));
                }
            });

            if ('MutationObserver' in window) {
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.type !== 'attributes' || mutation.attributeName !== 'class') return;

                        let nextState = '';
                        if (form.classList.contains('pageclip-form--success')) {
                            nextState = 'success';
                        } else if (form.classList.contains('pageclip-form--error') || form.classList.contains('pageclip-form--failure')) {
                            nextState = 'error';
                        }

                        if (!nextState || nextState === lastSubmitState) return;

                        lastSubmitState = nextState;
                        trackMarketingEvent(nextState === 'success' ? 'form_submit_success' : 'form_submit_error', getFormTrackingPayload(form, {
                            form_state: nextState
                        }));
                    });
                });

                observer.observe(form, {
                    attributes: true,
                    attributeFilter: ['class']
                });
            }
        });
    }

    function trackMarketingClick(element) {
        if (!element) return;

        if (element.matches('[data-calendar-link]')) {
            trackMarketingEvent('calendar_cta_click', {
                section: getSectionName(element),
                cta_type: 'calendar',
                cta_variant: 'success_overlay',
                destination_host: getDestinationHost(element.href),
                destination_path: getSanitizedPath(element.href),
                offer_type: getPageOfferType()
            });
            return;
        }

        const caseStudySlug = getCaseStudySlug(element);
        if (caseStudySlug) {
            trackMarketingEvent('case_study_click', {
                section: getSectionName(element),
                case_study_slug: caseStudySlug,
                destination_path: getSanitizedPath(element.href),
                cta_variant: getCtaVariant(element)
            });
            return;
        }

        if (element.tagName === 'A' && (isExternalHttpLink(element) || getLinkType(element) !== 'internal')) {
            const linkType = getLinkType(element);
            trackMarketingEvent('outbound_link_click', {
                section: getSectionName(element),
                link_type: linkType,
                destination_host: getDestinationHost(element.href),
                destination_path: linkType === 'external_url' ? getSanitizedPath(element.href) : '',
                cta_variant: getCtaVariant(element)
            });
            return;
        }

        if (isMarketingCta(element)) {
            const eventName = getCtaEventName(element);
            trackMarketingEvent(eventName, {
                section: getSectionName(element),
                cta_type: eventName.replace('_click', ''),
                cta_variant: getCtaVariant(element),
                destination_host: getDestinationHost(element.href || element.getAttribute('href')),
                destination_path: getSanitizedPath(element.href || element.getAttribute('href')),
                offer_type: getPageOfferType()
            });
        }
    }

    // Track CTA, case-study, calendar, and outbound clicks from one delegated path.
    function setupCTATracking() {
        document.addEventListener('click', (event) => {
            const element = event.target && event.target.closest ? event.target.closest('a, button') : null;
            if (!element || !document.documentElement.contains(element)) return;

            trackMarketingClick(element);
        });
    }

    // Track communication links
    function setupCommunicationTracking() {
        // Communication links are handled by the delegated outbound_link_click path.
    }

    // Track project modal interactions
    function setupProjectTracking() {
        // Track modal opens
        document.querySelectorAll('[data-modal], .project-card, .details-button[data-project]').forEach(element => {
            element.addEventListener('click', function () {
                const projectTitle = this.querySelector('h3')?.textContent ||
                    this.getAttribute('data-project') ||
                    'unknown';
                trackEvent('project_view', {
                    project_name: projectTitle,
                    project_type: this.getAttribute('data-type') || 'portfolio'
                });
            });
        });
    }

    // Track language switches
    function setupLanguageTracking() {
        const langSelector = document.getElementById('language-selector');
        if (langSelector) {
            langSelector.addEventListener('change', function () {
                trackEvent('language_switch', {
                    from_language: document.documentElement.lang,
                    to_language: this.value
                });
            });
        }
    }

    // Setup all tracking
    function setupTracking() {
        // Setup event tracking
        setupFormTracking();
        setupCTATracking();
        setupCommunicationTracking();
        setupProjectTracking();
        setupLanguageTracking();

        // Setup scroll tracking (throttled)
        let scrollTimer;
        window.addEventListener('scroll', () => {
            if (scrollTimer) clearTimeout(scrollTimer);
            scrollTimer = setTimeout(trackScrollDepth, 100);
        });

        // Track engagement time
        let startTime = Date.now();
        window.addEventListener('beforeunload', () => {
            const timeOnPage = Math.round((Date.now() - startTime) / 1000);
            trackEvent('page_engagement', {
                time_on_page: timeOnPage,
                page_title: document.title
            });
        });
    }

    // Initialize cookie banner
    function initializeCookieBanner() {
        const acceptBtn = document.getElementById('accept-cookies');
        const rejectBtn = document.getElementById('reject-cookies');
        const settingsBtn = document.getElementById('cookie-settings');

        if (acceptBtn) {
            acceptBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                cookieConsent.setConsent(true);
                cookieConsent.hideBanner();
                trackEvent('cookie_consent', { consent_type: 'accepted' });
            });
        }

        if (rejectBtn) {
            rejectBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                cookieConsent.setConsent(false);
                cookieConsent.hideBanner();
            });
        }

        if (settingsBtn) {
            settingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                cookieConsent.showPreferences();
            });
        }

        // Show banner if needed
        cookieConsent.showBanner();
    }

    // Initialize everything when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        // Capture UTM parameters immediately (before consent - just storing, not tracking)
        campaignTracker.captureUTMParams();

        // Check for consent
        if (cookieConsent.hasConsent()) {
            cookieConsent.enableTracking();
        }

        // Initialize cookie banner
        initializeCookieBanner();

        // Setup tracking hooks; live platform sends remain consent/config gated.
        setupTracking();
    }

    // Expose tracking functions globally
    window.RencoretAnalytics = {
        trackEvent: window['trackEvent'],
        trackMarketingEvent: trackMarketingEvent,
        getMarketingEvents: () => (window.__rencoretMarketingEvents || []).slice(),
        clearMarketingEvents: () => {
            window.__rencoretMarketingEvents = [];
        },
        marketingEventNames: MARKETING_EVENT_NAMES.slice(),
        cookieConsent: cookieConsent,
        campaignTracker: campaignTracker,
        hasTrackingConsent: () => cookieConsent.hasConsent(),
        getTrackingStatus: () => ({
            consentGranted: cookieConsent.hasConsent(),
            googleTagManagerConfigured: isValidGtmContainerId(config.googleTagManager.containerId),
            ga4Configured: isValidGa4MeasurementId(config.ga4.measurementId),
            googleAdsConfigured: isValidGoogleAdsConversionId(config.googleAds.conversionId) && isValidConversionLabel(config.googleAds.conversionLabel),
            linkedinConfigured: isValidNumericId(config.linkedin.partnerId),
            googleTagManagerLoaded: config.googleTagManager.loaded,
            googleTagLoaded: config.ga4.loaded,
            linkedinLoaded: config.linkedin.loaded
        }),
        config: config,
        getAttribution: () => campaignTracker.getAttributionData()
    };

})();
