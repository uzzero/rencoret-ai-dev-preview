/**
 * Scrollgesteuerte Einblendeffekte mit IntersectionObserver
 *
 * Diese Datei implementiert einen eleganten Einblendeffekt für Elemente,
 * die mit der Klasse 'fade-in' markiert sind, sobald sie im Viewport sichtbar werden.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Alle Elemente mit der Klasse 'fade-in' auswählen
  const fadeElements = document.querySelectorAll('.fade-in');

  // IntersectionObserver konfigurieren
  const options = {
    // Element als sichtbar betrachten, wenn es zu mindestens 10% im Viewport ist
    threshold: 0.1,
    // Optional: Offset für früheres/späteres Auslösen der Animation
    rootMargin: '0px 0px -50px 0px'
  };

  // IntersectionObserver erstellen
  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      // Prüfen, ob das Element im Viewport sichtbar ist
      if (entry.isIntersecting) {
        // Die Klasse 'visible' hinzufügen, um die Animation auszulösen
        entry.target.classList.add('visible');

        // Optional: Beobachtung für dieses Element beenden,
        // da es nur einmal eingeblendet werden soll
        observer.unobserve(entry.target);
      }
    });
  }, options);

  // Alle fade-in Elemente beobachten
  fadeElements.forEach(element => {
    observer.observe(element);
  });
});

// Optional: Animation beim ersten Laden verzögert starten
window.addEventListener('load', () => {
  // Kurze Verzögerung hinzufügen, damit die Seite erst vollständig geladen ist
  setTimeout(() => {
    // Elemente im ersten Viewport direkt sichtbar machen
    document.querySelectorAll('.fade-in.initial-visible').forEach(element => {
      element.classList.add('visible');
    });
  }, 300);
});

document.addEventListener('DOMContentLoaded', function() {
    // Prüfen, ob wir uns auf einem mobilen Gerät befinden (vereinfachte Erkennung)
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
        // Alle Service-Karten auswählen
        const serviceCards = document.querySelectorAll('.service-card');

        // Observer erstellen, der prüft, ob Elemente im Viewport sind
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                // Sanften Übergang berechnen
                // Diese Formel sorgt für eine natürlichere Animation
                let visibilityRatio = 0;

                if (entry.intersectionRatio > 0) {
                    // Exponentielles Mapping für ein sanfteres Gefühl
                    // Diese Funktion macht die Animation zu Beginn langsamer und am Ende schneller
                    visibilityRatio = Math.pow(entry.intersectionRatio, 0.7);

                    // Wenn mehr als 15% sichtbar, füge Klasse hinzu
                    if (entry.intersectionRatio > 0.15 && !entry.target.classList.contains('is-visible')) {
                        entry.target.classList.add('is-visible');

                        // Kleine Verzögerung zwischen den aufeinanderfolgenden Karten hinzufügen
                        const cards = Array.from(serviceCards);
                        const currentIndex = cards.indexOf(entry.target);

                        // Finde alle sichtbaren Karten mit niedrigerem Index
                        const visibleCardsBelow = cards.slice(0, currentIndex).filter(card =>
                            card.classList.contains('is-visible'));

                        // Nur verzögern, wenn es Karten davor gibt
                        if (visibleCardsBelow.length > 0) {
                            // Setze kurz ein niedriges Verhältnis und erhöhe es dann
                            entry.target.style.setProperty('--visibility', '0.1');
                            setTimeout(() => {
                                entry.target.style.setProperty('--visibility', visibilityRatio.toString());
                            }, 100);
                        } else {
                            entry.target.style.setProperty('--visibility', visibilityRatio.toString());
                        }
                    } else {
                        entry.target.style.setProperty('--visibility', visibilityRatio.toString());
                    }
                } else if (entry.intersectionRatio <= 0.15 && entry.target.classList.contains('is-visible')) {
                    // Sanftes Ausblenden beim Herausscrollen
                    const currentVisibility = parseFloat(entry.target.style.getPropertyValue('--visibility') || '0');
                    // Sanft von aktuellem Wert auf 0 reduzieren
                    const fadeSteps = 3;
                    for(let i = 1; i <= fadeSteps; i++) {
                        setTimeout(() => {
                            const newValue = currentVisibility * (1 - (i / fadeSteps));
                            entry.target.style.setProperty('--visibility', newValue.toString());

                            // Klasse nur beim letzten Schritt entfernen
                            if (i === fadeSteps) {
                                entry.target.classList.remove('is-visible');
                            }
                        }, i * 50);
                    }
                }
            });
        }, {
            root: null, // Im Bezug auf den Viewport
            rootMargin: '-5% 0px', // Erst starten, wenn die Karte zu 5% im Viewport ist
            threshold: Array.from({ length: 21 }, (_, i) => i * 0.05) // 21 Schritte von 0 bis 1 in 0.05-Schritten
        });

        // Jede Karte überwachen
        serviceCards.forEach(card => {
            // Initialisierung der CSS-Variable
            card.style.setProperty('--visibility', '0');
            observer.observe(card);
        });
    }

    // Reagiere auf Fenstergrößenänderungen
    window.addEventListener('resize', function() {
        const currentIsMobile = window.innerWidth < 768;

        // Wenn sich der Status ändert (von mobile zu desktop oder umgekehrt)
        if (currentIsMobile !== isMobile) {
            // Seite neu laden, um Observer zu aktualisieren
            location.reload();
        }
    });

    // Animation der Zahlen im Über uns-Bereich
    // Funktion zur Animation der Zahlen
    function animateNumbers() {
        const statItems = document.querySelectorAll('.stat-number');
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        statItems.forEach(item => {
            const finalValue = item.getAttribute('data-final');
            if (finalValue) {
                item.textContent = finalValue;
            }
        });

        if (reduceMotion || !('IntersectionObserver' in window)) {
            return;
        }

        // Erstelle einen Observer für die Statistik-Elemente
        const statsObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
                    // Markiere als bereits animiert
                    entry.target.classList.add('animated');

                    // Zielwert aus dem data-target Attribut holen
                    const target = parseInt(entry.target.getAttribute('data-target'), 10);
                    const finalValue = entry.target.getAttribute('data-final') || entry.target.textContent;

                    if (!Number.isFinite(target)) {
                        return;
                    }

                    // Aktuelle Zahl (startet bei 0)
                    let current = 0;

                    // Formatierungsfunktion für große Zahlen
                    const formatNumber = (num) => {
                        if (num >= 1000000) {
                            return (num / 1000000).toFixed(1) + ' Mio';
                        } else if (num >= 1000) {
                            return (num / 1000).toFixed(0) + 'k';
                        }
                        return num.toString();
                    };

                    // Spezielle Behandlung für verschiedene Zahlengrößen
                    let step, interval;
                    if (target >= 100000) {
                        // Für sehr große Zahlen wie 500.000
                        step = Math.ceil(target / 50); // In ca. 50 Schritten erhöhen
                        interval = 20; // Schneller aktualisieren (alle 20ms)
                    } else if (target >= 1000) {
                        // Für große Zahlen wie 1.000
                        step = Math.ceil(target / 40);
                        interval = 30;
                    } else {
                        // Für kleinere Zahlen wie 50 oder 95
                        step = 1;
                        interval = 50; // Langsamer aktualisieren (alle 50ms)
                    }

                    // Animation starten
                    const counter = setInterval(() => {
                        current += step;

                        // Nicht über den Zielwert hinaus
                        if (current >= target) {
                            current = target;
                            clearInterval(counter);
                            entry.target.textContent = finalValue;
                            return;
                        }

                        // Anzeige aktualisieren - speziell formatiert für große Zahlen
                        if (target >= 10000) {
                            entry.target.textContent = formatNumber(current);
                        } else {
                            entry.target.textContent = current;
                        }
                    }, interval);
                }
            });
        }, {
            root: null,
            rootMargin: '-10% 0px',
            threshold: 0.3 // Animation starten, wenn 30% des Elements sichtbar sind
        });

        // Alle Zahlen-Elemente beobachten
        statItems.forEach(item => {
            statsObserver.observe(item);
        });
    }

    // Zahlenanimation initialisieren
    animateNumbers();

    // Timeline-Animation für den Prozess-Bereich
    function animateTimeline() {
        const timelineItems = document.querySelectorAll('.timeline-item');
        const timelineDecorations = document.querySelectorAll('.timeline-decoration');
        const timelineSection = document.querySelector('.process');
        const timelineTracker = document.querySelector('.timeline-tracker');
        const trackerDot = document.querySelector('.tracker-dot');

        // Wenn keine Timeline-Items vorhanden sind, beenden
        if (timelineItems.length === 0) return;

        // Observer für Timeline-Items
        const timelineObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.classList.contains('visible')) {
                    // Verzögerung basierend auf der Position des Elements
                    const items = Array.from(timelineItems);
                    const currentIndex = items.indexOf(entry.target);

                    // Verzögerung für sequentielle Animation
                    setTimeout(() => {
                        entry.target.classList.add('visible');
                    }, currentIndex * 200); // 200ms Verzögerung zwischen den Elementen
                }
            });
        }, {
            root: null,
            rootMargin: '-10% 0px',
            threshold: 0.2 // Animation starten, wenn 20% des Elements sichtbar sind
        });

        // Observer für Dekorationen (Glühbirne und Rakete)
        const decorationObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.classList.contains('visible')) {
                    // Verzögerung für die Dekorationen
                    setTimeout(() => {
                        entry.target.classList.add('visible');
                    }, 500); // Kurze Verzögerung für besseren visuellen Effekt
                }
            });
        }, {
            root: null,
            rootMargin: '0px',
            threshold: 0.5 // Animation starten, wenn 50% des Elements sichtbar sind
        });

        // Alle Timeline-Items beobachten
        timelineItems.forEach(item => {
            timelineObserver.observe(item);
        });

        // Alle Dekorationen beobachten
        timelineDecorations.forEach(decoration => {
            decorationObserver.observe(decoration);
        });

        // Timeline-Sektion beobachten für den Tracker-Punkt
        if (timelineSection && timelineTracker && trackerDot) {
            const timelineSectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        // Tracker-Punkt sofort sichtbar machen und am Anfang positionieren
                        trackerDot.style.top = '0%';
                        trackerDot.classList.add('visible');

                        // Nach kurzer Verzögerung die Position aktualisieren
                        setTimeout(() => {
                            updateTrackerPosition();
                        }, 100);
                    } else {
                        // Ausblenden, wenn die Timeline nicht mehr sichtbar ist
                        trackerDot.classList.remove('visible');
                    }
                });
            }, {
                threshold: 0.1 // Aktivieren, wenn mindestens 10% der Timeline sichtbar sind
            });

            timelineSectionObserver.observe(timelineSection);
        }

        // Funktion zur Aktualisierung der Position des Tracker-Punkts
        function updateTrackerPosition() {
            if (!timelineSection || !timelineTracker || !trackerDot) return;

            const timelineBounds = timelineSection.getBoundingClientRect();
            const timelineHeight = timelineTracker.offsetHeight;

            // Berechne, wie weit der Benutzer durch die Timeline gescrollt hat
            let scrollPercentage = 0;

            // Wenn die Timeline im Viewport ist
            if (timelineBounds.top <= window.innerHeight && timelineBounds.bottom >= 0) {
                // Vereinfachte und robustere Berechnung
                // Berechne, wie weit die Timeline bereits aus dem Viewport gescrollt wurde
                const timelineTopRelativeToViewport = timelineBounds.top;
                const timelineBottomRelativeToViewport = timelineBounds.bottom;
                const viewportHeight = window.innerHeight;

                // Wenn die Timeline gerade beginnt, in den Viewport zu scrollen
                if (timelineBottomRelativeToViewport <= viewportHeight && timelineTopRelativeToViewport >= viewportHeight) {
                    scrollPercentage = 0; // Anfang der Timeline
                }
                // Wenn die Timeline gerade den Viewport verlässt
                else if (timelineBottomRelativeToViewport <= 0 && timelineTopRelativeToViewport >= 0) {
                    scrollPercentage = 1; // Ende der Timeline
                }
                // Wenn die Timeline teilweise im Viewport ist
                else {
                    // Berechne den Prozentsatz basierend auf der Position der Timeline
                    const totalScrollDistance = timelineHeight + viewportHeight;
                    const scrolledDistance = viewportHeight - timelineTopRelativeToViewport;

                    scrollPercentage = scrolledDistance / totalScrollDistance;
                    scrollPercentage = Math.max(0, Math.min(1, scrollPercentage));
                }

                // Position des Punktes aktualisieren
                trackerDot.style.top = (scrollPercentage * 100) + '%';

                // Punkt sichtbar machen, wenn die Timeline im Viewport ist
                trackerDot.classList.add('visible');
            } else {
                // Punkt ausblenden, wenn die Timeline nicht im Viewport ist
                trackerDot.classList.remove('visible');
            }
        }

        // Initialisiere die Position des Tracker-Punkts
        updateTrackerPosition();

        // Aktualisiere die Position beim Scrollen
        window.addEventListener('scroll', updateTrackerPosition);
        window.addEventListener('resize', updateTrackerPosition);

        // Stelle sicher, dass der Tracker-Punkt initial sichtbar ist, wenn die Timeline im Viewport ist
        setTimeout(() => {
            updateTrackerPosition();
        }, 100);

        // Zusätzlicher Timer für verzögerte Initialisierung, um sicherzustellen, dass der Punkt sichtbar ist
        setTimeout(() => {
            if (trackerDot && timelineSection.getBoundingClientRect().top <= window.innerHeight) {
                trackerDot.classList.add('visible');
            }
        }, 500);
    }

    // Timeline-Animation initialisieren
    animateTimeline();
});
