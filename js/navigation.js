/**
 * Anchor-Navigation für die Hauptseite
 * 
 * Dieses Skript stellt sicher, dass die Navigation über den Header korrekt funktioniert
 * und zum entsprechenden Bereich scrollt, wobei der Header-Offset berücksichtigt wird.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log("Navigation-Skript geladen");
    let lastViewportWidth = window.innerWidth;
    let viewportHeightRaf = null;
    
    // Dynamische Viewport-Höhe für mobile Browser
    function setViewportHeight() {
        let vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        
        // Verhindere Scrollbar durch präzise Höhenberechnung
        const hero = document.querySelector('.hero');
        if (hero) {
            if (hero.classList.contains('hero--apple')) {
                hero.style.removeProperty('min-height');
                hero.style.removeProperty('height');
                return;
            }

            const headerHeight = document.querySelector('header')?.offsetHeight || 140;
            const exactHeight = window.innerHeight - headerHeight;
            hero.style.minHeight = `${exactHeight}px`;
            hero.style.height = `${exactHeight}px`;
        }
    }

    function shouldSkipViewportHeightResize() {
        const currentWidth = window.innerWidth;
        const isTouchLayout = window.matchMedia('(pointer: coarse)').matches || currentWidth <= 768;
        const widthChanged = Math.abs(currentWidth - lastViewportWidth) >= 2;

        if (!isTouchLayout || widthChanged) {
            lastViewportWidth = currentWidth;
            return false;
        }

        return true;
    }

    function scheduleViewportHeightUpdate(force) {
        if (!force && shouldSkipViewportHeightResize()) return;

        if (force) {
            lastViewportWidth = window.innerWidth;
        }

        if (viewportHeightRaf) return;

        viewportHeightRaf = window.requestAnimationFrame(() => {
            viewportHeightRaf = null;
            setViewportHeight();
        });
    }
    
    // Initiale Berechnung
    setViewportHeight();
    
    // Bei Touch-Geräten keine Neuberechnung auf reine Safari-Toolbar-Höhenänderungen.
    window.addEventListener('resize', function() {
        scheduleViewportHeightUpdate(false);
    }, { passive: true });

    window.addEventListener('orientationchange', function() {
        window.setTimeout(function() {
            scheduleViewportHeightUpdate(true);
        }, 120);
    }, { passive: true });
    
    // Alle Navigation-Links im Header und mobilen Menü
    const navLinks = document.querySelectorAll('header nav a[href^="#"], .mobile-menu a[href^="#"]');
    const scrollLinks = document.querySelectorAll('a[href^="#"]');
    const homeLink = document.querySelector('header nav a[href="/"]');
    console.log("Navigation-Links gefunden:", navLinks.length);

    function refreshMotion() {
        if (window.ScrollTrigger) {
            if (!window.matchMedia('(max-width: 768px)').matches) {
                window.ScrollTrigger.refresh();
            }
            window.ScrollTrigger.update();
        }
    }

    function scrollToPosition(top, behavior = 'smooth') {
        const nextTop = Math.max(0, Math.round(top));

        if (window.rencoretLenis && typeof window.rencoretLenis.scrollTo === 'function') {
            window.rencoretLenis.scrollTo(nextTop, {
                immediate: true,
                force: true
            });
        } else {
            window.scrollTo({
                top: nextTop,
                behavior: behavior === 'auto' ? 'auto' : 'smooth'
            });
        }

        setTimeout(refreshMotion, 120);
        setTimeout(refreshMotion, 700);
    }

    function getAnchorViewportOffset() {
        const header = document.querySelector('header');
        if (!header) return 104;

        const headerRect = header.getBoundingClientRect();
        const extraGap = window.matchMedia('(max-width: 768px)').matches ? 18 : 24;
        return Math.max(header.offsetHeight, headerRect.bottom) + extraGap;
    }

    function getAnchorTarget(targetId) {
        if (targetId === 'kontakt') {
            return document.querySelector('.contact-card__details')
                || document.querySelector('.contact-card--ceo')
                || document.getElementById('kontakt');
        }

        return document.getElementById(targetId);
    }

    function correctScrollToElement(targetElement, desiredViewportTop) {
        const correction = targetElement.getBoundingClientRect().top - desiredViewportTop;

        if (Math.abs(correction) > 2) {
            scrollToPosition(window.pageYOffset + correction, 'auto');
        }
    }

    function getCorrectionDelays(behavior, targetElement) {
        const isMobileViewport = window.matchMedia('(max-width: 768px)').matches;
        const isLeadForm = targetElement && targetElement.id === 'lead-form';

        if (behavior === 'auto') {
            return isMobileViewport && isLeadForm
                ? [80, 300, 900, 1800, 3200]
                : [80, 300];
        }

        if (isMobileViewport && isLeadForm) {
            return [350, 900, 1600, 2600, 4200];
        }

        if (isMobileViewport) {
            return [650, 1150, 1800];
        }

        return [650, 1150];
    }

    function scheduleScrollCorrections(targetElement, desiredViewportTop, behavior) {
        getCorrectionDelays(behavior, targetElement).forEach(delay => {
            setTimeout(() => correctScrollToElement(targetElement, desiredViewportTop), delay);
        });
    }

    function scrollToElement(targetElement, behavior = 'smooth') {
        refreshMotion();

        const windowY = window.pageYOffset;
        const targetPosition = targetElement.getBoundingClientRect().top + windowY;
        const desiredViewportTop = getAnchorViewportOffset();
        const offsetPosition = Math.max(0, targetPosition - desiredViewportTop);

        scrollToPosition(offsetPosition, behavior);
        scheduleScrollCorrections(targetElement, desiredViewportTop, behavior);
    }

    window.rencoretScrollToElement = scrollToElement;
    window.rencoretGetAnchorTarget = getAnchorTarget;

    function getTargetIdFromHref(href) {
        if (!href || href === '#') return null;

        try {
            const url = new URL(href, window.location.href);
            const currentPath = window.location.pathname || '/';

            if (url.origin !== window.location.origin || url.pathname !== currentPath) {
                return null;
            }

            return url.hash ? decodeURIComponent(url.hash.substring(1)) : null;
        } catch (error) {
            if (href.charAt(0) === '#') {
                return decodeURIComponent(href.substring(1));
            }
        }

        return null;
    }

    function isNavigationLink(link) {
        return Boolean(link.closest('header nav') || link.closest('.mobile-menu'));
    }
    
    function handleAnchorClick(link, event) {
        const targetElementId = getTargetIdFromHref(link.getAttribute('href'));
        const targetElement = targetElementId ? getAnchorTarget(targetElementId) : null;

        if (!targetElement) return false;

        event.preventDefault();
        event.rencoretAnchorHandled = true;

        if (isNavigationLink(link)) {
            // Aktive Klasse für alle Links zurücksetzen
            navLinks.forEach(l => {
                l.removeAttribute('aria-current');
                l.classList.remove('scrolled-active');
            });

            if (homeLink) {
                homeLink.removeAttribute('aria-current');
                homeLink.classList.remove('scrolled-active');
            }

            // Aktive Klasse für den geklickten Link setzen
            link.setAttribute('aria-current', 'page');
            link.classList.add('scrolled-active');
        }

        scrollToElement(targetElement);
        return true;
    }

    scrollLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            handleAnchorClick(this, e);
        });
    });

    document.addEventListener('click', function(e) {
        if (e.rencoretAnchorHandled) return;

        const link = e.target.closest ? e.target.closest('a[href^="#"]') : null;
        if (!link || !document.contains(link)) return;

        handleAnchorClick(link, e);
    });

    // Home-Link-Klick-Handler
    if (homeLink) {
        homeLink.addEventListener('click', function(event) {
            // Prüfen, ob wir uns auf einer internen Seite befinden (index.html)
            const isInternalPage = window.location.pathname.includes('index.html') || 
                                   window.location.pathname === '/' || 
                                   window.location.pathname.endsWith('/');
            
            if (isInternalPage) {
                event.preventDefault();

                // Bei internen Seiten zum Seitenanfang scrollen
                scrollToPosition(0);
                
                // Aktive Klasse für alle Links zurücksetzen
                navLinks.forEach(l => {
                    l.removeAttribute('aria-current');
                    l.classList.remove('scrolled-active');
                });
                
                // Aktiviere nur den Home-Link
                this.setAttribute('aria-current', 'page');
                this.classList.add('scrolled-active');
            }
            // Bei externen Seiten den Standard-Link-Verhalten lassen
            // Kein preventDefault, damit die Navigation normal funktioniert
        });
    }

    // Aktive Navigation-Items basierend auf der Scroll-Position aktualisieren
    function updateActiveNavigation() {
        // Alle navigierbaren Abschnitte mit IDs
        const sections = document.querySelectorAll('section[id], [data-nav-section][id]');
        const headerHeight = document.querySelector('header').offsetHeight;
        const scrollY = window.pageYOffset;
        const viewportHeight = window.innerHeight;
        
        // Setze alle Links zurück
        navLinks.forEach(link => {
            link.removeAttribute('aria-current');
            link.classList.remove('scrolled-active');
        });
        
        if (homeLink) {
            homeLink.removeAttribute('aria-current');
            homeLink.classList.remove('scrolled-active');
        }
        
        // Wenn wir ganz oben auf der Seite sind, nur dann Home-Link aktivieren
        if (scrollY < 100) {
            if (homeLink) {
                homeLink.setAttribute('aria-current', 'page');
                homeLink.classList.add('scrolled-active');
                console.log("Home-Link aktiviert (oben auf der Seite)");
            }
            return; // Rest der Funktion überspringen, wenn wir oben auf der Seite sind
        }
        
        // Finde den aktuell sichtbaren Abschnitt
        let currentSection = null;
        let maxVisibleArea = 0;
        
        sections.forEach(section => {
            const rect = section.getBoundingClientRect();
            const sectionId = section.getAttribute('id');
            
            // Berechne den sichtbaren Bereich des Abschnitts
            const visibleTop = Math.max(0, rect.top);
            const visibleBottom = Math.min(viewportHeight, rect.bottom);
            const visibleHeight = Math.max(0, visibleBottom - visibleTop);
            
            // Prozentsatz des sichtbaren Bereichs
            const visiblePercent = rect.height > 0 ? visibleHeight / rect.height : 0;
            
            // Gewichteter sichtbarer Bereich (bevorzugt Abschnitte, die mehr sichtbar sind)
            const weightedVisibleArea = visibleHeight * visiblePercent;
            
            // Wenn dieser Abschnitt mehr sichtbaren Bereich hat als bisher gefunden
            if (visibleHeight > 0 && weightedVisibleArea > maxVisibleArea) {
                currentSection = sectionId;
                maxVisibleArea = weightedVisibleArea;
            }
        });

        // Bei geklickten Ankern hat das Ziel nahe am Header Vorrang vor großen sichtbaren Bereichen.
        const desiredViewportTop = getAnchorViewportOffset();
        let closestAnchor = null;
        let closestDistance = Infinity;

        navLinks.forEach(link => {
            const targetId = getTargetIdFromHref(link.getAttribute('href'));
            const targetElement = targetId ? getAnchorTarget(targetId) : null;
            if (!targetElement) return;

            const rect = targetElement.getBoundingClientRect();
            const isInViewport = rect.bottom >= 0 && rect.top <= viewportHeight;
            if (!isInViewport) return;

            const distance = Math.abs(rect.top - desiredViewportTop);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestAnchor = targetId;
            }
        });

        if (closestAnchor && closestDistance <= 180) {
            currentSection = closestAnchor;
        }
        
        // Wenn ein sichtbarer Abschnitt gefunden wurde, aktiviere den entsprechenden Link
        if (currentSection) {
            console.log("Aktiver Bereich:", currentSection);
            
            navLinks.forEach(link => {
                if (link.getAttribute('href') === '#' + currentSection) {
                    link.setAttribute('aria-current', 'page');
                    link.classList.add('scrolled-active');
                    
                    // Hinzufügen einer Animation für einen sanften Übergang
                    link.style.transition = 'all 0.3s ease-in-out';
                    
                    // Kurze Hervorhebungs-Animation beim Aktivieren
                    link.animate([
                        { transform: 'scale(1.05)', offset: 0.3 },
                        { transform: 'scale(1)', offset: 1 }
                    ], {
                        duration: 500,
                        easing: 'ease-out'
                    });
                }
            });
        }
    }

    // Scroll-Event-Listener für aktive Navigation
    window.addEventListener('scroll', function() {
        // Verzögerung für bessere Performance und um Flackern zu vermeiden
        clearTimeout(window.scrollUpdateTimer);
        window.scrollUpdateTimer = setTimeout(updateActiveNavigation, 100);
    });

    // Resize-Event-Handler für Navigation anpassen
    window.addEventListener('resize', function() {
        clearTimeout(window.resizeUpdateTimer);
        window.resizeUpdateTimer = setTimeout(updateActiveNavigation, 200);
    });

    // Initial ausführen
    updateActiveNavigation();
    
    // Für Direktlinks mit Hashes
    function handleHashScroll() {
        if (window.location.hash) {
            const targetId = window.location.hash.substring(1);
            const targetElement = getAnchorTarget(targetId);
            
            if (targetElement) {
                setTimeout(function() {
                    scrollToElement(targetElement);
                    
                    // Aktiven Link aktualisieren
                    navLinks.forEach(link => {
                        link.removeAttribute('aria-current');
                        link.classList.remove('scrolled-active');
                        
                        if (link.getAttribute('href') === '#' + targetId) {
                            link.setAttribute('aria-current', 'page');
                            link.classList.add('scrolled-active');
                        }
                    });
                    
                    if (homeLink) {
                        homeLink.removeAttribute('aria-current');
                        homeLink.classList.remove('scrolled-active');
                    }
                }, 100);
            }
        }
    }
    
    // Hash-Scroll beim Laden ausführen
    handleHashScroll();
});

// Direkter Scroll beim Laden mit Hash
window.addEventListener('load', function() {
    if (window.location.hash) {
        // Mit setTimeout warten, um sicherzustellen, dass die Seite vollständig geladen ist
        setTimeout(() => {
            const targetId = window.location.hash.substring(1);
            const targetElement = window.rencoretGetAnchorTarget
                ? window.rencoretGetAnchorTarget(targetId)
                : document.getElementById(targetId);
            
            if (targetElement) {
                if (window.rencoretScrollToElement) {
                    window.rencoretScrollToElement(targetElement, 'auto');
                } else {
                    const headerHeight = document.querySelector('header').offsetHeight || 100;
                    const offsetPosition = Math.max(0, targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight - 28);
                    window.scrollTo({ top: offsetPosition, behavior: 'auto' });
                }
                
                // Aktiven Link aktualisieren
                const navLinks = document.querySelectorAll('header nav a[href^="#"]');
                const homeLink = document.querySelector('header nav a[href="/"]');
                
                navLinks.forEach(link => {
                    link.removeAttribute('aria-current');
                    link.classList.remove('scrolled-active');
                    
                    if (link.getAttribute('href') === '#' + targetId) {
                        link.setAttribute('aria-current', 'page');
                        link.classList.add('scrolled-active');
                    }
                });
                
                if (homeLink) {
                    homeLink.removeAttribute('aria-current');
                    homeLink.classList.remove('scrolled-active');
                }
            }
        }, 300);
    }
});
