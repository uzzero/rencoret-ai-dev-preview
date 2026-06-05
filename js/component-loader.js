/**
 * Component Loader for RENCORET AI Website
 * 
 * This script provides a simple component loading system for breaking down
 * the monolithic index.html into manageable components.
 * 
 * Usage:
 * ComponentLoader.load('componentName', targetElement, options);
 */

(function () {
    'use strict';

    // Component registry and cache
    const componentCache = new Map();
    const componentRegistry = {
        // Layout components
        'header': 'components/layout/header.html',
        'footer': 'components/layout/footer.html',
        'navigation': 'components/layout/navigation.html',

        // Section components
        'hero': 'components/sections/hero.html',
        'services': 'components/sections/services.html',
        'deliverables': 'components/sections/deliverables.html',
        'tech-stack': 'components/sections/tech-stack.html',
        'about': 'components/sections/about.html',
        'process': 'components/sections/process.html',
        'trust': 'components/sections/trust.html',
        'offers': 'components/sections/offers.html',
        'projects': 'components/sections/projects.html',
        'testimonials': 'components/sections/testimonials.html',
        'faq': 'components/sections/faq.html',
        'contact': 'components/sections/contact.html',

        // Shared components
        'client-logos': 'components/shared/client-logos.html',
        'cta-button': 'components/shared/cta-button.html',
        'service-card': 'components/shared/service-card.html',
        'testimonial-card': 'components/shared/testimonial-card.html'
    };

    // Main ComponentLoader object
    window.ComponentLoader = {
        /**
         * Load a component into a target element
         * @param {string} componentName - Name of the component to load
         * @param {HTMLElement|string} target - Target element or selector
         * @param {Object} options - Loading options
         * @returns {Promise} Promise that resolves when component is loaded
         */
        load: async function (componentName, target, options = {}) {
            try {
                // Get target element
                const targetElement = typeof target === 'string'
                    ? document.querySelector(target)
                    : target;

                if (!targetElement) {
                    throw new Error(`Target element not found: ${target}`);
                }

                // Get component path
                const componentPath = componentRegistry[componentName];
                if (!componentPath) {
                    throw new Error(`Component not registered: ${componentName}`);
                }

                // Load component HTML
                const html = await this.fetchComponent(componentPath);

                // Process component HTML (replace variables, etc.)
                const processedHtml = this.processComponent(html, options.data || {});

                // Insert into DOM
                if (options.append) {
                    targetElement.insertAdjacentHTML('beforeend', processedHtml);
                } else {
                    targetElement.innerHTML = processedHtml;
                }

                // Initialize component JavaScript if needed
                if (options.init) {
                    this.initializeComponent(componentName, targetElement);
                }

                // Dispatch loaded event
                targetElement.dispatchEvent(new CustomEvent('componentLoaded', {
                    detail: { componentName, options }
                }));

                return targetElement;
            } catch (error) {
                console.error(`Error loading component ${componentName}:`, error);
                throw error;
            }
        },

        /**
         * Load multiple components
         * @param {Array} components - Array of component configurations
         * @returns {Promise} Promise that resolves when all components are loaded
         */
        loadMultiple: async function (components) {
            const promises = components.map(config =>
                this.load(config.name, config.target, config.options)
            );
            return Promise.all(promises);
        },

        /**
         * Fetch component HTML from file
         * @param {string} path - Component file path
         * @returns {Promise<string>} Component HTML
         */
        fetchComponent: async function (path) {
            // Check cache first
            if (componentCache.has(path)) {
                return componentCache.get(path);
            }

            // Fetch component
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to fetch component: ${path}`);
            }

            const html = await response.text();

            // Cache the component
            componentCache.set(path, html);

            return html;
        },

        /**
         * Process component HTML with data
         * @param {string} html - Raw component HTML
         * @param {Object} data - Data to inject
         * @returns {string} Processed HTML
         */
        processComponent: function (html, data) {
            // Simple template replacement
            // Replace {{variable}} with data.variable
            return html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
                return data[key] || match;
            });
        },

        /**
         * Initialize component-specific JavaScript
         * @param {string} componentName - Component name
         * @param {HTMLElement} element - Component element
         */
        initializeComponent: function (componentName, element) {
            // Component-specific initialization
            switch (componentName) {
                case 'navigation':
                    // Re-initialize navigation if needed
                    if (window.initNavigation) {
                        window.initNavigation();
                    }
                    break;

                case 'contact':
                    // Initialize contact form
                    this.initContactForm(element);
                    break;

                // Add more component initializations as needed
            }

            // Re-run global initializations
            this.reinitializeGlobalFeatures(element);
        },

        /**
         * Initialize contact form functionality
         * @param {HTMLElement} element - Contact section element
         */
        initContactForm: function (element) {
            const form = element.querySelector('form');
            if (form) {
                form.addEventListener('submit', function (e) {
                    e.preventDefault();
                    // Handle form submission
                    console.log('Contact form submitted');
                });
            }
        },

        /**
         * Reinitialize global features for new components
         * @param {HTMLElement} element - New component element
         */
        reinitializeGlobalFeatures: function (element) {
            // Reinitialize scroll animations for new elements
            if (window.initScrollAnimations) {
                window.initScrollAnimations();
            }

            // Reinitialize translations for new elements
            if (window.updateTranslations) {
                const currentLang = localStorage.getItem('language') || 'de';
                window.updateTranslations(currentLang);
            }
        },

        /**
         * Register a new component
         * @param {string} name - Component name
         * @param {string} path - Component file path
         */
        registerComponent: function (name, path) {
            componentRegistry[name] = path;
        },

        /**
         * Get all registered components
         * @returns {Object} Component registry
         */
        getRegistry: function () {
            return { ...componentRegistry };
        },

        /**
         * Clear component cache
         */
        clearCache: function () {
            componentCache.clear();
        },

        /**
         * Preload components for better performance
         * @param {Array<string>} componentNames - Components to preload
         * @returns {Promise} Promise that resolves when all components are preloaded
         */
        preload: async function (componentNames) {
            const promises = componentNames.map(name => {
                const path = componentRegistry[name];
                return path ? this.fetchComponent(path) : Promise.resolve();
            });
            return Promise.all(promises);
        }
    };

    // Auto-initialize components with data-component attribute
    document.addEventListener('DOMContentLoaded', function () {
        const componentElements = document.querySelectorAll('[data-component]');

        componentElements.forEach(element => {
            const componentName = element.getAttribute('data-component');
            const options = {
                init: element.hasAttribute('data-init'),
                append: element.hasAttribute('data-append'),
                data: element.dataset
            };

            ComponentLoader.load(componentName, element, options);
        });
    });

    // Expose for testing and debugging
    if (window.DEBUG) {
        window.ComponentLoaderDebug = {
            cache: componentCache,
            registry: componentRegistry
        };
    }

})();

/**
 * Example Usage:
 * 
 * 1. Load a single component:
 * ComponentLoader.load('hero', '#hero-section');
 * 
 * 2. Load with data:
 * ComponentLoader.load('cta-button', '#cta-container', {
 *     data: {
 *         text: 'Get Started',
 *         link: '#contact'
 *     }
 * });
 * 
 * 3. Load multiple components:
 * ComponentLoader.loadMultiple([
 *     { name: 'header', target: 'header' },
 *     { name: 'footer', target: 'footer' },
 *     { name: 'hero', target: '#hero-section' }
 * ]);
 * 
 * 4. HTML attribute-based loading:
 * <div data-component="services" data-init></div>
 * 
 * 5. Preload components:
 * ComponentLoader.preload(['header', 'footer', 'hero']);
 */
