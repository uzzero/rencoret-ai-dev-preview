/**
 * Anchor-Navigation für die Hauptseite
 * 
 * Dieses Skript stellt sicher, dass die Navigation über den Header korrekt funktioniert
 * und zum entsprechenden Bereich scrollt, wobei der Header-Offset berücksichtigt wird.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log("Navigation-Skript geladen");
    
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
    
    // Initiale Berechnung
    setViewportHeight();
    
    // Bei Fenstergrößenänderung neu berechnen
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', setViewportHeight);
    
    // Alle Navigation-Links im Header
    const navLinks = document.querySelectorAll('header nav a[href^="#"]');
    const homeLink = document.querySelector('header nav a[href="/"]');
    console.log("Navigation-Links gefunden:", navLinks.length);

    function refreshMotion() {
        if (window.ScrollTrigger) {
            window.ScrollTrigger.refresh();
            window.ScrollTrigger.update();
        }
    }

    function scrollToPosition(top, behavior = 'smooth') {
        window.scrollTo({ top, behavior: behavior === 'auto' ? 'auto' : 'smooth' });

        if (window.rencoretLenis && typeof window.rencoretLenis.scrollTo === 'function') {
            window.rencoretLenis.scrollTo(top, { immediate: true, force: true });
        }

        setTimeout(refreshMotion, 120);
        setTimeout(refreshMotion, 700);
    }

    function scrollToElement(targetElement, behavior = 'smooth') {
        const headerHeight = document.querySelector('header')?.offsetHeight || 80;
        const windowY = window.pageYOffset;
        const targetPosition = targetElement.getBoundingClientRect().top + windowY;
        const offsetPosition = Math.max(0, targetPosition - headerHeight - 28);

        scrollToPosition(offsetPosition, behavior);
    }

    window.rencoretScrollToElement = scrollToElement;
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Hole die Ziel-ID
            const targetId = this.getAttribute('href');
            
            // Überspringe leere oder # Links
            if (!targetId || targetId === '#') return;
            
            // Finde das Zielelement
            const targetElementId = targetId.substring(1); // Entferne das führende #
            const targetElement = document.getElementById(targetElementId);
            
            if (targetElement) {
                e.preventDefault();

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
                this.setAttribute('aria-current', 'page');
                this.classList.add('scrolled-active');

                scrollToElement(targetElement);
            }
        });
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
        // Alle Abschnitte mit IDs
        const sections = document.querySelectorAll('section[id]');
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
            const visiblePercent = visibleHeight / rect.height;
            
            // Gewichteter sichtbarer Bereich (bevorzugt Abschnitte, die mehr sichtbar sind)
            const weightedVisibleArea = visibleHeight * visiblePercent;
            
            // Wenn dieser Abschnitt mehr sichtbaren Bereich hat als bisher gefunden
            if (visibleHeight > 0 && weightedVisibleArea > maxVisibleArea) {
                currentSection = sectionId;
                maxVisibleArea = weightedVisibleArea;
            }
        });
        
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
            const targetElement = document.getElementById(targetId);
            
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
            const targetElement = document.getElementById(targetId);
            
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
