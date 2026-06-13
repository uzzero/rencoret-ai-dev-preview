(function () {
    'use strict';

    document.documentElement.setAttribute('data-theme', 'dark');

    function onReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback, { once: true });
            return;
        }

        callback();
    }

    function initLoadedState() {
        window.requestAnimationFrame(function () {
            document.documentElement.classList.add('loaded');
        });
    }

    function initScrollLock() {
        if (window.rencoretLockScroll && window.rencoretUnlockScroll) return;

        var lockCount = 0;
        var lockedScrollY = 0;

        function restoreScrollPosition(scrollY) {
            var htmlScrollBehavior = document.documentElement.style.scrollBehavior;
            var bodyScrollBehavior = document.body.style.scrollBehavior;

            document.documentElement.style.scrollBehavior = 'auto';
            document.body.style.scrollBehavior = 'auto';
            window.scrollTo({ top: scrollY, left: 0, behavior: 'auto' });

            if (window.rencoretLenis && typeof window.rencoretLenis.scrollTo === 'function') {
                window.rencoretLenis.scrollTo(scrollY, { immediate: true, force: true });
            }

            window.requestAnimationFrame(function () {
                document.documentElement.style.scrollBehavior = htmlScrollBehavior;
                document.body.style.scrollBehavior = bodyScrollBehavior;
            });
        }

        window.rencoretRestoreScrollPosition = restoreScrollPosition;

        window.rencoretLockScroll = function () {
            lockCount += 1;
            if (lockCount > 1) return;

            lockedScrollY = window.scrollY || window.pageYOffset || 0;
            document.documentElement.classList.add('rencoret-scroll-locked');
            document.body.classList.add('rencoret-scroll-locked');
            document.body.style.top = '-' + lockedScrollY + 'px';
        };

        window.rencoretUnlockScroll = function (restoreScrollY) {
            lockCount = Math.max(0, lockCount - 1);
            if (lockCount > 0) return;

            var shouldRestoreScroll = restoreScrollY !== false;
            var scrollY = typeof restoreScrollY === 'number' ? restoreScrollY : lockedScrollY;
            document.documentElement.classList.remove('rencoret-scroll-locked');
            document.body.classList.remove('rencoret-scroll-locked');
            document.body.style.removeProperty('top');

            if (!shouldRestoreScroll) return;

            restoreScrollPosition(scrollY);
            window.requestAnimationFrame(function () {
                restoreScrollPosition(scrollY);
            });
        };
    }

    function initMobileMenu() {
        var mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
        var mobileMenu = document.querySelector('.mobile-menu');
        var mobileMenuOverlay = document.querySelector('.mobile-menu-overlay');
        var mobileMenuLinks = document.querySelectorAll('.mobile-menu a');
        var mobileMenuClose = document.querySelector('.mobile-menu-close');

        if (!mobileMenuToggle || !mobileMenu || !mobileMenuOverlay) return;

        function closeMobileMenu(options) {
            if (!mobileMenu.classList.contains('active')) return;

            var shouldRestoreScroll = !(options && options.restoreScroll === false);
            mobileMenuToggle.classList.remove('active');
            mobileMenu.classList.remove('active');
            mobileMenuOverlay.classList.remove('active');
            mobileMenuToggle.setAttribute('aria-expanded', 'false');

            if (window.rencoretUnlockScroll) {
                window.rencoretUnlockScroll(shouldRestoreScroll ? undefined : false);
            }
        }

        window.rencoretCloseMobileMenu = closeMobileMenu;

        mobileMenuToggle.addEventListener('click', function () {
            var isOpen = mobileMenu.classList.contains('active');
            if (isOpen) {
                closeMobileMenu();
                return;
            }

            mobileMenuToggle.classList.add('active');
            mobileMenu.classList.add('active');
            mobileMenuOverlay.classList.add('active');
            mobileMenuToggle.setAttribute('aria-expanded', 'true');

            if (window.rencoretLockScroll) {
                window.rencoretLockScroll();
            }
        });

        mobileMenuOverlay.addEventListener('click', function () {
            closeMobileMenu();
        });

        if (mobileMenuClose) {
            mobileMenuClose.addEventListener('click', function () {
                closeMobileMenu();
            });
        }

        mobileMenuLinks.forEach(function (link) {
            link.addEventListener('click', function () {
                var href = link.getAttribute('href') || '';
                var isPageAnchor = href.charAt(0) === '#' && href.length > 1;
                closeMobileMenu({ restoreScroll: !isPageAnchor });
            });
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && mobileMenu.classList.contains('active')) {
                closeMobileMenu();
            }
        });
    }

    function initEnhancementLoader() {
        var enhancementScripts = [
            'vendor/gsap/gsap.min.js',
            'vendor/gsap/ScrollTrigger.min.js',
            'vendor/lenis/lenis.min.js',
            'js/motion.js?v=campaign-20260612',
            'js/scroll-animations.js',
            'js/carousel.js'
        ];
        var enhancementPromise = null;

        function loadScript(src) {
            return new Promise(function (resolve, reject) {
                var script = document.createElement('script');
                script.src = src;
                script.async = false;
                script.onload = resolve;
                script.onerror = reject;
                document.body.appendChild(script);
            });
        }

        function loadEnhancements() {
            if (enhancementPromise) return enhancementPromise;

            enhancementPromise = enhancementScripts.reduce(function (chain, src) {
                return chain.then(function () {
                    return loadScript(src);
                });
            }, Promise.resolve());

            return enhancementPromise;
        }

        ['pointerdown', 'touchstart', 'keydown', 'scroll'].forEach(function (eventName) {
            window.addEventListener(eventName, loadEnhancements, { once: true, passive: true });
        });

        window.addEventListener('load', function () {
            window.setTimeout(loadEnhancements, 6000);
        }, { once: true });

        window.rencoretLoadEnhancements = loadEnhancements;
    }

    function initForm() {
        var form = document.querySelector('.pageclip-form');
        var overlay = document.getElementById('formSuccessOverlay');
        var successTitle = document.getElementById('successTitle');
        var formErrorMessage = document.getElementById('formErrorMessage');
        if (!form) return;

        var params = new URLSearchParams(window.location.search);
        var hiddenFieldValues = {
            landing_page: window.location.pathname + window.location.search,
            utm_source: params.get('utm_source') || '',
            utm_medium: params.get('utm_medium') || '',
            utm_campaign: params.get('utm_campaign') || '',
            utm_content: params.get('utm_content') || '',
            utm_term: params.get('utm_term') || '',
            referrer: document.referrer || ''
        };

        Object.keys(hiddenFieldValues).forEach(function (fieldName) {
            var field = document.getElementById(fieldName);
            if (field) {
                field.value = hiddenFieldValues[fieldName];
            }
        });

        var formDetails = form.querySelector('.form-details');
        if (formDetails) {
            formDetails.open = false;
        }

        form.addEventListener('submit', function () {
            hideSubmissionError();

            if (window.rencoretLoadPageclip) {
                window.rencoretLoadPageclip();
            }

            var nameInput = document.getElementById('name');
            var nameValue = nameInput ? nameInput.value.split(' ')[0] : '';
            if (nameValue) {
                sessionStorage.setItem('formSubmitterName', nameValue);
            }
        });

        if (!window.MutationObserver) return;

        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.type !== 'attributes' || mutation.attributeName !== 'class') return;

                if (form.classList.contains('pageclip-form--success')) {
                    showSuccessOverlay();
                    return;
                }

                if (form.classList.contains('pageclip-form--error') || form.classList.contains('pageclip-form--failure')) {
                    showSubmissionError();
                }
            });
        });

        observer.observe(form, {
            attributes: true,
            attributeFilter: ['class']
        });

        function showSuccessOverlay() {
            var submitterName = sessionStorage.getItem('formSubmitterName') || '';
            hideSubmissionError();

            if (window.trackEvent) {
                window.trackEvent('generate_lead', {
                    form_name: 'campaign_contact_form',
                    form_id: 'contact-form',
                    value: 1
                });
            }

            if (successTitle) {
                successTitle.textContent = submitterName
                    ? 'Vielen Dank, ' + submitterName + '!'
                    : 'Vielen Dank!';
            }

            if (overlay) {
                overlay.setAttribute('aria-hidden', 'false');
                overlay.classList.add('active');

                var focusTarget = overlay.querySelector('.form-success-content');
                if (focusTarget) {
                    focusTarget.setAttribute('tabindex', '-1');
                    window.requestAnimationFrame(function () {
                        focusTarget.focus({ preventScroll: true });
                    });
                }
            }

            if (window.trackEvent) {
                window.trackEvent('form_success', {
                    event_category: 'contact',
                    event_label: 'campaign_request'
                });
            }

            sessionStorage.removeItem('formSubmitterName');
        }

        function showSubmissionError() {
            if (!formErrorMessage) return;

            formErrorMessage.hidden = false;
            formErrorMessage.classList.add('active');
            formErrorMessage.focus({ preventScroll: true });
        }

        function hideSubmissionError() {
            if (!formErrorMessage) return;

            formErrorMessage.hidden = true;
            formErrorMessage.classList.remove('active');
        }
    }

    function initPageclipLazyLoad() {
        var pageclipPromise = null;

        function loadPageclip() {
            if (pageclipPromise) return pageclipPromise;

            pageclipPromise = new Promise(function (resolve, reject) {
                var existingScript = document.querySelector('script[data-pageclip-script]');
                if (existingScript) {
                    existingScript.addEventListener('load', resolve, { once: true });
                    existingScript.addEventListener('error', reject, { once: true });
                    return;
                }

                var script = document.createElement('script');
                script.src = 'https://s.pageclip.co/v1/pageclip.js';
                script.charset = 'utf-8';
                script.async = true;
                script.dataset.pageclipScript = 'true';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });

            return pageclipPromise;
        }

        function attachLazyLoad() {
            var form = document.querySelector('.pageclip-form');
            if (!form) return;

            form.addEventListener('focusin', loadPageclip, { once: true });
            form.addEventListener('pointerenter', loadPageclip, { once: true });

            if ('IntersectionObserver' in window) {
                var observer = new IntersectionObserver(function (entries) {
                    if (entries.some(function (entry) { return entry.isIntersecting; })) {
                        observer.disconnect();
                        loadPageclip();
                    }
                }, { rootMargin: '900px 0px' });

                observer.observe(form);
            }
        }

        window.rencoretLoadPageclip = loadPageclip;
        attachLazyLoad();
    }

    function initStickyCta() {
        var stickyCta = document.getElementById('sticky-cta');
        var hero = document.querySelector('.hero, .ki-mvp-hero');
        var contact = document.querySelector('.contact');
        if (!stickyCta || !hero || !('IntersectionObserver' in window)) return;

        var stickyCtaButton = stickyCta.querySelector('.sticky-cta__button');
        var heroVisible = true;
        var contactVisible = false;
        var updateRaf = null;

        function isMobileCta() {
            return window.innerWidth < 768;
        }

        function setStickyCtaVisibility(show) {
            stickyCta.classList.toggle('visible', show);
            stickyCta.setAttribute('aria-hidden', show ? 'false' : 'true');

            if (show) {
                stickyCta.removeAttribute('inert');
                if (stickyCtaButton) stickyCtaButton.removeAttribute('tabindex');
                return;
            }

            stickyCta.setAttribute('inert', '');
            if (stickyCtaButton) stickyCtaButton.setAttribute('tabindex', '-1');
        }

        function update() {
            updateRaf = null;
            setStickyCtaVisibility(!heroVisible && !contactVisible && isMobileCta());
        }

        function scheduleUpdate() {
            if (updateRaf) return;
            updateRaf = window.requestAnimationFrame(update);
        }

        new IntersectionObserver(function (entries) {
            heroVisible = entries[entries.length - 1].isIntersecting;
            scheduleUpdate();
        }, { threshold: 0.05 }).observe(hero);

        if (contact) {
            new IntersectionObserver(function (entries) {
                contactVisible = entries[entries.length - 1].isIntersecting;
                scheduleUpdate();
            }, { threshold: 0.05 }).observe(contact);
        }

        window.addEventListener('resize', scheduleUpdate, { passive: true });
        scheduleUpdate();
    }

    function initCaseDetails() {
        var details = document.querySelectorAll('details.mvp-case-details');
        if (!details.length) return;

        function openCaseDetails(id) {
            if (!id) return;

            var target = document.getElementById(id);
            if (!target || !target.matches('details.mvp-case-details')) return;

            target.open = true;
        }

        document.querySelectorAll('a[href^="#case-"]').forEach(function (link) {
            link.addEventListener('click', function () {
                openCaseDetails((link.getAttribute('href') || '').substring(1));
            });
        });

        window.addEventListener('hashchange', function () {
            openCaseDetails(window.location.hash.substring(1));
        });

        if (window.location.hash) {
            openCaseDetails(window.location.hash.substring(1));
        }
    }

    function initMobileOverflowGuard() {
        function applyGuard() {
            document.documentElement.style.overflowX = 'hidden';
            document.body.style.overflowX = 'hidden';
            document.body.style.maxWidth = '100%';
            document.documentElement.style.maxWidth = '100%';
        }

        applyGuard();
        window.addEventListener('orientationchange', function () {
            window.setTimeout(applyGuard, 120);
        }, { passive: true });
    }

    onReady(function () {
        initLoadedState();
        initScrollLock();
        initMobileMenu();
        initEnhancementLoader();
        initForm();
        initPageclipLazyLoad();
        initStickyCta();
        initCaseDetails();
        initMobileOverflowGuard();
    });
})();
