/**
 * Analytics & Tracking Module
 * Handles Google Analytics 4, LinkedIn Insight Tag, Cookie Consent, and Campaign Attribution
 * 
 * Enhanced for LinkedIn A/B Campaign Testing
 */

(function () {
    'use strict';

    // Configuration
    const config = {
        ga4: {
            measurementId: 'G-BG44F505XG', // Production GA4 Measurement ID
            enabled: false,
            loaded: false
        },
        linkedin: {
            partnerId: '7724138', // Production LinkedIn Partner ID
            conversionId: '22644914', // Production LinkedIn Conversion ID
            enabled: false,
            // Multi-Account mapping for reporting (UTM campaign -> LinkedIn Account)
            accountMapping: {
                'founder_2024': '515466143',
                'mittelstand_2024': '517413489'
            }
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
                timestamp: new Date().toISOString(),
                referrer: document.referrer
            };

            // Only store if we have UTM params (don't overwrite existing data with empty)
            if (utmData.utm_source) {
                sessionStorage.setItem('campaign_data', JSON.stringify(utmData));
                // Also store in localStorage for cross-session attribution (first touch)
                if (!localStorage.getItem('first_touch_campaign')) {
                    localStorage.setItem('first_touch_campaign', JSON.stringify(utmData));
                }
            }

            return utmData;
        },

        // Get landing page type for segmentation
        getLandingPageType() {
            const path = window.location.pathname;
            if (path.includes('/ai-mvp-development')) return 'ai_mvp_development';
            if (path.includes('/internal-ai-assistant-rag')) return 'internal_ai_assistant_rag';
            if (path.includes('/ai-automation-sprint')) return 'ai_automation_sprint';
            if (path.includes('/founder')) return 'founder';
            if (path.includes('/mittelstand')) return 'mittelstand';
            return 'main';
        },

        // Get attribution data for conversions
        getAttributionData() {
            const sessionData = sessionStorage.getItem('campaign_data');
            const firstTouch = localStorage.getItem('first_touch_campaign');

            return {
                session: sessionData ? JSON.parse(sessionData) : null,
                firstTouch: firstTouch ? JSON.parse(firstTouch) : null,
                current: {
                    landing_page: window.location.pathname,
                    landing_page_type: this.getLandingPageType()
                }
            };
        },

        // Get LinkedIn account from campaign
        getLinkedInAccount(campaign) {
            return config.linkedin.accountMapping[campaign] || 'unknown';
        },

        // Clear attribution data (e.g., after conversion)
        clearSessionData() {
            sessionStorage.removeItem('campaign_data');
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

            // Update Google Consent Mode v2
            if (window.gtag) {
                if (accepted) {
                    gtag('consent', 'update', {
                        'analytics_storage': 'granted',
                        'ad_storage': 'granted',
                        'ad_user_data': 'granted',
                        'ad_personalization': 'granted'
                    });
                } else {
                    gtag('consent', 'update', {
                        'analytics_storage': 'denied',
                        'ad_storage': 'denied',
                        'ad_user_data': 'denied',
                        'ad_personalization': 'denied'
                    });
                }
            }

            if (accepted) {
                this.enableTracking();
            } else {
                this.disableTracking();
            }
        },

        enableTracking() {
            config.ga4.enabled = true;
            config.linkedin.enabled = true;

            loadGA4();
            initializeLinkedIn();
            trackPageView();
        },

        disableTracking() {
            config.ga4.enabled = false;
            config.linkedin.enabled = false;
            // Disable GA4
            window['ga-disable-' + config.ga4.measurementId] = true;
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

    function loadGA4() {
        if (!config.ga4.enabled) return;
        if (!config.ga4.measurementId.match(/^G-[A-Z0-9]+$/)) return;

        window['ga-disable-' + config.ga4.measurementId] = false;

        if (config.ga4.loaded) return;

        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.ga4.measurementId)}`;
        document.head.appendChild(script);

        if (window.gtag) {
            gtag('js', new Date());
            gtag('config', config.ga4.measurementId, {
                anonymize_ip: true,
                cookie_flags: 'SameSite=Strict;Secure'
            });
        }

        config.ga4.loaded = true;
    }

    // Initialize LinkedIn Insight Tag
    function initializeLinkedIn() {
        if (!config.linkedin.enabled || !config.linkedin.partnerId.match(/^\d+$/)) return;

        window._linkedin_partner_id = config.linkedin.partnerId;
        window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
        window._linkedin_data_partner_ids.push(window._linkedin_partner_id);

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
            s.parentNode.insertBefore(b, s);
        })(window.lintrk);
    }

    // Track page views with campaign attribution
    function trackPageView() {
        if (config.ga4.enabled && window.gtag) {
            const attribution = campaignTracker.getAttributionData();
            const sessionData = attribution.session || {};

            gtag('event', 'page_view', {
                page_title: document.title,
                page_location: window.location.href,
                page_path: window.location.pathname,
                traffic_source: getTrafficSource(),
                landing_page_type: campaignTracker.getLandingPageType(),
                utm_source: sessionData.utm_source || '',
                utm_medium: sessionData.utm_medium || '',
                utm_campaign: sessionData.utm_campaign || '',
                utm_content: sessionData.utm_content || '',
                li_account: sessionData.utm_campaign ? campaignTracker.getLinkedInAccount(sessionData.utm_campaign) : ''
            });
        }
    }

    // Get traffic source with enhanced detection
    function getTrafficSource() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('utm_source')) {
            return urlParams.get('utm_source');
        }

        // Check sessionStorage for previously captured source
        const sessionData = sessionStorage.getItem('campaign_data');
        if (sessionData) {
            const data = JSON.parse(sessionData);
            if (data.utm_source) return data.utm_source;
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
        if (!config.ga4.enabled || !window.gtag) return;

        // Add default parameters
        const eventParams = {
            ...parameters,
            timestamp: new Date().toISOString(),
            page_path: window.location.pathname,
            traffic_source: getTrafficSource()
        };

        gtag('event', eventName, eventParams);

        // Ad-platform conversions fire only on confirmed leads (success overlay),
        // not on submit attempts, to avoid double counting
        if (eventName === 'generate_lead') {
            if (config.linkedin.enabled && window.lintrk) {
                window.lintrk('track', { conversion_id: config.linkedin.conversionId });
            }
            // Meta Pixel hook: fires automatically once the pixel is installed
            if (window.fbq) {
                window.fbq('track', 'Lead');
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
        const contactForm = document.getElementById('contact-form') || document.getElementById('contactForm');
        if (!contactForm) return;

        let formStarted = false;

        // Track form view
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        trackEvent('form_view', {
                            form_name: 'contact_form',
                            form_location: 'contact_section'
                        });
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.5 });

            observer.observe(contactForm);
        }

        // Track form start
        contactForm.addEventListener('focus', (event) => {
            const target = event.target;
            if (!formStarted && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
                formStarted = true;
                trackEvent('form_start', {
                    form_name: 'contact_form',
                    first_field: target.name
                });
            }
        }, true);

        // Track form submit attempt (GA only - the lead conversion fires
        // via 'generate_lead' once the success overlay is shown)
        contactForm.addEventListener('submit', () => {
            trackEvent('form_submit', {
                form_name: 'contact_form',
                form_id: 'contact-form',
                value: 1
            });
        });
    }

    // Track CTA button clicks
    function setupCTATracking() {
        // Track all CTA buttons
        document.querySelectorAll('.cta-button, .btn-primary, [data-track="cta"]').forEach(button => {
            button.addEventListener('click', function () {
                trackEvent('cta_click', {
                    button_text: this.textContent.trim(),
                    button_location: this.closest('section')?.id || 'unknown',
                    button_url: this.href || 'no_url'
                });
            });
        });

        // Track "Projekt starten" buttons specifically
        document.querySelectorAll('a[href="#kontakt"], a[href="#lead-form"], a[href="#contact"], button[onclick*="contact"], button[onclick*="kontakt"]').forEach(button => {
            button.addEventListener('click', function () {
                trackEvent('start_project_click', {
                    button_text: this.textContent.trim(),
                    button_location: this.closest('section')?.id || 'unknown'
                });
            });
        });
    }

    // Track communication links
    function setupCommunicationTracking() {
        // Phone links
        document.querySelectorAll('a[href^="tel:"]').forEach(link => {
            link.addEventListener('click', function () {
                trackEvent('phone_click', {
                    phone_number: this.href.replace('tel:', ''),
                    link_location: this.closest('section')?.id || 'footer'
                });
            });
        });

        // Email links
        document.querySelectorAll('a[href^="mailto:"]').forEach(link => {
            link.addEventListener('click', function () {
                trackEvent('email_click', {
                    email_address: this.href.replace('mailto:', ''),
                    link_location: this.closest('section')?.id || 'footer'
                });
            });
        });

        // WhatsApp links
        document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp"]').forEach(link => {
            link.addEventListener('click', function () {
                trackEvent('whatsapp_click', {
                    link_location: this.closest('section')?.id || 'contact'
                });
            });
        });
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

        // Setup tracking (events are only sent if consent is given)
        setupTracking();
    }

    // Expose tracking functions globally
    window.RencoretAnalytics = {
        trackEvent: window['trackEvent'],
        cookieConsent: cookieConsent,
        campaignTracker: campaignTracker,
        config: config,
        getAttribution: () => campaignTracker.getAttributionData()
    };

})();
