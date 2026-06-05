(() => {
    const doc = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canAnimate = !reduceMotion && 'IntersectionObserver' in window;

    if (canAnimate) {
        doc.classList.add('motion-ready');
    }

    function markVisible(elements) {
        elements.forEach((el) => el.classList.add('is-visible'));
    }

    function initFallbackMotion() {
        const revealTargets = Array.from(document.querySelectorAll('[data-motion="reveal"]'));
        const staggerTargets = Array.from(document.querySelectorAll('[data-motion="stagger"]'))
            .flatMap((container) => Array.from(container.children)
                .filter((child) => !child.classList.contains('timeline-tracker')));

        markVisible(revealTargets.concat(staggerTargets));
    }

    function initTilt() {
        if (window.matchMedia('(pointer: coarse)').matches) return;

        document.querySelectorAll('[data-tilt]').forEach((el) => {
            let raf = null;
            const strength = Number(el.getAttribute('data-tilt-strength') || 5);

            const move = (event) => {
                const rect = el.getBoundingClientRect();
                const x = (event.clientX - rect.left) / rect.width - 0.5;
                const y = (event.clientY - rect.top) / rect.height - 0.5;

                cancelAnimationFrame(raf);
                raf = requestAnimationFrame(() => {
                    el.style.transform = `perspective(1400px) rotateX(${(-y * strength).toFixed(2)}deg) rotateY(${(x * strength).toFixed(2)}deg) translateY(-4px)`;
                });
            };

            const reset = () => {
                cancelAnimationFrame(raf);
                el.style.transform = '';
            };

            el.addEventListener('mousemove', move);
            el.addEventListener('mouseleave', reset);
        });
    }

    function initGsapMotion() {
        const gsap = window.gsap;
        const ScrollTrigger = window.ScrollTrigger;

        if (!gsap || !ScrollTrigger) {
            initFallbackMotion();
            initTilt();
            return;
        }

        gsap.registerPlugin(ScrollTrigger);

        if (window.Lenis) {
            const lenis = new window.Lenis({
                lerp: 0.08,
                smoothWheel: true,
                syncTouch: false
            });

            lenis.on('scroll', ScrollTrigger.update);
            gsap.ticker.add((time) => lenis.raf(time * 1000));
            gsap.ticker.lagSmoothing(0);
            window.rencoretLenis = lenis;
        }

        gsap.utils.toArray('[data-motion="reveal"]').forEach((el) => {
            gsap.to(el, {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                duration: 0.9,
                ease: 'power3.out',
                onStart: () => el.classList.add('is-visible'),
                scrollTrigger: {
                    trigger: el,
                    start: 'top 86%',
                    once: true
                }
            });
        });

        gsap.utils.toArray('[data-motion="stagger"]').forEach((container) => {
            const targets = Array.from(container.children)
                .filter((child) => !child.classList.contains('timeline-tracker'));

            gsap.to(targets, {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                duration: 0.85,
                ease: 'power3.out',
                stagger: 0.14,
                onStart: () => targets.forEach((el) => el.classList.add('is-visible')),
                scrollTrigger: {
                    trigger: container,
                    start: 'top 82%',
                    once: true
                }
            });
        });

        gsap.utils.toArray('[data-motion="parallax"]').forEach((el) => {
            const depth = Number(el.getAttribute('data-depth') || 0.1);
            gsap.to(el, {
                yPercent: depth * 100,
                ease: 'none',
                scrollTrigger: {
                    trigger: el.closest('section') || document.body,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: true
                }
            });
        });

        ScrollTrigger.matchMedia({
            '(min-width: 992px)': () => {
                gsap.utils.toArray('[data-motion="pin"]').forEach((el) => {
                    const isHero = el.classList.contains('hero');
                    ScrollTrigger.create({
                        trigger: el,
                        start: 'top top',
                        end: isHero ? '+=38%' : '+=70%',
                        pin: true,
                        pinSpacing: true,
                        scrub: true
                    });
                });

                gsap.utils.toArray('.feature-block').forEach((block) => {
                    const visual = block.querySelector('.feature-block__visual-frame');
                    if (!visual) return;

                    gsap.fromTo(visual,
                        { yPercent: 8, rotateX: 3 },
                        {
                            yPercent: -5,
                            rotateX: 0,
                            ease: 'none',
                            scrollTrigger: {
                                trigger: block,
                                start: 'top bottom',
                                end: 'bottom top',
                                scrub: true
                            }
                        }
                    );
                });
            }
        });

        initTilt();
        ScrollTrigger.refresh();
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (!canAnimate) {
            initFallbackMotion();
            return;
        }

        initGsapMotion();
    });
})();
