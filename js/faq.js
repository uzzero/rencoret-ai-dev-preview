(() => {
    function initFaqAccordion() {
        const items = Array.from(document.querySelectorAll('[data-faq-item]'));
        if (!items.length) return;

        items.forEach((item, index) => {
            const trigger = item.querySelector('[data-faq-trigger]');
            const panelId = trigger ? trigger.getAttribute('aria-controls') : null;
            const panel = panelId ? document.getElementById(panelId) : null;
            if (!trigger || !panel) return;

            const isOpen = index === 0;
            trigger.setAttribute('aria-expanded', String(isOpen));
            panel.hidden = !isOpen;

            trigger.addEventListener('click', () => {
                const willOpen = trigger.getAttribute('aria-expanded') !== 'true';
                trigger.setAttribute('aria-expanded', String(willOpen));
                panel.hidden = !willOpen;
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFaqAccordion);
    } else {
        initFaqAccordion();
    }
})();
