/**
 * Universal Carousel für Team-Fotos
 * Automatisches Durchlaufen und Touch-Navigation für alle Bildschirmgrößen
 */

// Globale Carousel-Instanz
let carouselInstance = {
    initialized: false,
    container: null,
    track: null,
    photos: null,
    dots: null,
    currentSlide: 0,
    autoPlayInterval: null,
    isUserInteracting: false,
    carouselObserver: null,
    eventController: null,
    resizeTimeout: null
};

// Carousel zerstören und aufräumen
function destroyCarousel() {
    if (!carouselInstance.initialized) return;
    
    // AutoPlay stoppen
    if (carouselInstance.autoPlayInterval) {
        clearInterval(carouselInstance.autoPlayInterval);
        carouselInstance.autoPlayInterval = null;
    }
    
    // Observer disconnecten
    if (carouselInstance.carouselObserver) {
        carouselInstance.carouselObserver.disconnect();
        carouselInstance.carouselObserver = null;
    }
    
    // Event-Listener entfernen mit AbortController
    if (carouselInstance.eventController) {
        carouselInstance.eventController.abort();
        carouselInstance.eventController = null;
    }
    
    carouselInstance.initialized = false;
}

function initMobileCarousel() {
    // Verhindere mehrfache Initialisierung
    if (carouselInstance.initialized) return;
    
    const container = document.querySelector('.team-photos-container');
    const track = document.querySelector('.carousel-track');
    const photos = document.querySelectorAll('.team-photo');
    const dots = document.querySelectorAll('.dot');
    
    if (!container || !track || photos.length === 0) return;
    
    // Carousel-Instanz initialisieren
    carouselInstance.container = container;
    carouselInstance.track = track;
    carouselInstance.photos = photos;
    carouselInstance.dots = dots;
    carouselInstance.currentSlide = 0;
    carouselInstance.isUserInteracting = false;
    carouselInstance.eventController = new AbortController();
    
    const signal = carouselInstance.eventController.signal;
    
    // Auto-play alle 4 Sekunden
    function startAutoPlay() {
        // Verhindere mehrfaches Starten
        if (carouselInstance.autoPlayInterval) clearInterval(carouselInstance.autoPlayInterval);
        
        carouselInstance.autoPlayInterval = setInterval(() => {
            if (!carouselInstance.isUserInteracting) {
                carouselInstance.currentSlide = (carouselInstance.currentSlide + 1) % carouselInstance.photos.length;
                updateCarousel();
            }
        }, 4000);
    }
    
    // Auto-play stoppen
    function stopAutoPlay() {
        if (carouselInstance.autoPlayInterval) {
            clearInterval(carouselInstance.autoPlayInterval);
            carouselInstance.autoPlayInterval = null;
        }
    }
    
    // Carousel Update
    function updateCarousel() {
        // Jedes Bild ist 100% breit, also verschieben wir um currentSlide * 100%
        carouselInstance.track.style.transform = `translateX(-${carouselInstance.currentSlide * 100}%)`;
        
        // Update dots
        carouselInstance.dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === carouselInstance.currentSlide);
        });
    }
    
    // Touch/Swipe Support
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    
    container.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isDragging = true;
        carouselInstance.isUserInteracting = true;
    }, { signal });
    
    container.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        currentX = e.touches[0].clientX;
    }, { signal });
    
    container.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;
        
        const diff = startX - currentX;
        const threshold = container.offsetWidth / 4; // 25% der Container-Breite
        
        if (Math.abs(diff) > threshold) {
            if (diff > 0) {
                // Swipe nach links - nächstes Bild
                carouselInstance.currentSlide = (carouselInstance.currentSlide + 1) % carouselInstance.photos.length;
            } else {
                // Swipe nach rechts - vorheriges Bild
                carouselInstance.currentSlide = (carouselInstance.currentSlide - 1 + carouselInstance.photos.length) % carouselInstance.photos.length;
            }
            updateCarousel();
        }
        
        // Auto-play nach Interaktion neu starten
        setTimeout(() => {
            carouselInstance.isUserInteracting = false;
            startAutoPlay();
        }, 1000);
    }, { signal });
    
    // Mouse Support für Desktop-Testing
    let mouseStartX = 0;
    let isMouseDragging = false;
    
    container.addEventListener('mousedown', (e) => {
        mouseStartX = e.clientX;
        isMouseDragging = true;
        carouselInstance.isUserInteracting = true;
        e.preventDefault();
    }, { signal });
    
    container.addEventListener('mousemove', (e) => {
        if (!isMouseDragging) return;
        e.preventDefault();
    }, { signal });
    
    container.addEventListener('mouseup', (e) => {
        if (!isMouseDragging) return;
        isMouseDragging = false;
        
        const diff = mouseStartX - e.clientX;
        const threshold = container.offsetWidth / 4;
        
        if (Math.abs(diff) > threshold) {
            if (diff > 0) {
                carouselInstance.currentSlide = (carouselInstance.currentSlide + 1) % carouselInstance.photos.length;
            } else {
                carouselInstance.currentSlide = (carouselInstance.currentSlide - 1 + carouselInstance.photos.length) % carouselInstance.photos.length;
            }
            updateCarousel();
        }
        
        setTimeout(() => {
            carouselInstance.isUserInteracting = false;
            startAutoPlay();
        }, 1000);
    }, { signal });
    
    // Prevent dragging outside container
    container.addEventListener('mouseleave', () => {
        isMouseDragging = false;
    }, { signal });
    
    // Dot Navigation
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            carouselInstance.currentSlide = index;
            updateCarousel();
            carouselInstance.isUserInteracting = true;
            
            // Auto-play nach Klick neu starten
            setTimeout(() => {
                carouselInstance.isUserInteracting = false;
                startAutoPlay();
            }, 1000);
        }, { signal });
    });
    
    // Keyboard Navigation (für Accessibility)
    document.addEventListener('keydown', (e) => {
        if (!container.matches(':hover')) return;
        
        if (e.key === 'ArrowLeft') {
            carouselInstance.currentSlide = (carouselInstance.currentSlide - 1 + carouselInstance.photos.length) % carouselInstance.photos.length;
            updateCarousel();
            carouselInstance.isUserInteracting = true;
            setTimeout(() => { carouselInstance.isUserInteracting = false; }, 1000);
        } else if (e.key === 'ArrowRight') {
            carouselInstance.currentSlide = (carouselInstance.currentSlide + 1) % carouselInstance.photos.length;
            updateCarousel();
            carouselInstance.isUserInteracting = true;
            setTimeout(() => { carouselInstance.isUserInteracting = false; }, 1000);
        }
    }, { signal });
    
    // Pause bei Tab-Wechsel
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopAutoPlay();
        } else {
            // Nur starten wenn Carousel im Viewport ist
            const rect = container.getBoundingClientRect();
            const isInViewport = rect.top < window.innerHeight && rect.bottom > 0;
            if (isInViewport) {
                startAutoPlay();
            }
        }
    }, { signal });
    
    // Initial setup
    updateCarousel();
    
    // IntersectionObserver für Viewport-Erkennung
    const observerOptions = {
        threshold: 0.3, // Startet wenn 30% des Carousels sichtbar sind
        rootMargin: '0px'
    };
    
    carouselInstance.carouselObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Carousel ist im Viewport - Auto-Play starten
                startAutoPlay();
            } else {
                // Carousel ist außerhalb des Viewports - Auto-Play stoppen
                stopAutoPlay();
            }
        });
    }, observerOptions);
    
    // Container beobachten
    carouselInstance.carouselObserver.observe(container);
    
    // Markiere als initialisiert
    carouselInstance.initialized = true;
}

// Init on load
document.addEventListener('DOMContentLoaded', initMobileCarousel);

// Bei Fenstergrößenänderung nichts tun - Carousel ist responsive durch CSS
// Wenn später spezifische Updates bei Resize nötig sind, können sie hier ergänzt werden
window.addEventListener('resize', () => {
    // Nur initialisieren falls noch nicht geschehen (z.B. wenn Elemente dynamisch geladen wurden)
    if (!carouselInstance.initialized) {
        clearTimeout(carouselInstance.resizeTimeout);
        carouselInstance.resizeTimeout = setTimeout(() => {
            initMobileCarousel();
        }, 250);
    }
    // Ansonsten keine Aktion nötig - CSS handles responsiveness
});