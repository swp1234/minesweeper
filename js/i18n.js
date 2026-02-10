class I18n {
    constructor() {
        this.translations = {};
        this.supportedLanguages = ['ko', 'en', 'ja', 'zh', 'es', 'pt', 'id', 'tr', 'de', 'fr', 'hi', 'ru'];
        this.currentLang = this.detectLanguage();
    }

    detectLanguage() {
        // Check localStorage first
        const savedLang = localStorage.getItem('language');
        if (savedLang && this.supportedLanguages.includes(savedLang)) {
            return savedLang;
        }

        // Check browser language
        const browserLang = navigator.language.split('-')[0];
        if (this.supportedLanguages.includes(browserLang)) {
            return browserLang;
        }

        // Default to English
        return 'en';
    }

    async loadTranslations(lang) {
        if (this.translations[lang]) {
            return;
        }

        try {
            const response = await fetch(`js/locales/${lang}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load translations for ${lang}`);
            }
            this.translations[lang] = await response.json();
        } catch (error) {
            console.error(`Error loading translations for ${lang}:`, error);
            if (lang !== 'en') {
                // Fall back to English
                await this.loadTranslations('en');
            }
        }
    }

    t(key) {
        const keys = key.split('.');
        let value = this.translations[this.currentLang];

        for (const k of keys) {
            if (value && typeof value === 'object') {
                value = value[k];
            } else {
                return key; // Return key if translation not found
            }
        }

        return value || key;
    }

    async setLanguage(lang) {
        if (!this.supportedLanguages.includes(lang)) {
            console.error(`Language ${lang} not supported`);
            return;
        }

        this.currentLang = lang;
        localStorage.setItem('language', lang);
        await this.loadTranslations(lang);
        this.updateUI();
    }

    updateUI() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const text = this.t(key);

            if (element.tagName === 'INPUT' && element.type === 'placeholder') {
                element.placeholder = text;
            } else {
                element.textContent = text;
            }
        });
    }

    getCurrentLanguage() {
        return this.currentLang;
    }

    getLanguageName(lang) {
        const names = {
            'ko': '한국어',
            'en': 'English',
            'ja': '日本語',
            'zh': '中文',
            'es': 'Español',
            'pt': 'Português',
            'id': 'Bahasa Indonesia',
            'tr': 'Türkçe',
            'de': 'Deutsch',
            'fr': 'Français',
            'hi': 'हिन्दी',
            'ru': 'Русский'
        };
        return names[lang] || lang;
    }

    getSupportedLanguages() {
        return this.supportedLanguages;
    }
}

// Global i18n instance
const i18n = new I18n();

// Initialize i18n when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await i18n.loadTranslations(i18n.currentLang);
        i18n.updateUI();

        const langOptions = document.querySelectorAll('.lang-option');
        langOptions.forEach(option => {
            option.addEventListener('click', async (e) => {
                const lang = e.target.getAttribute('data-lang');
                await i18n.setLanguage(lang);
                langOptions.forEach(opt => opt.classList.remove('active'));
                e.target.classList.add('active');
                document.getElementById('lang-menu').classList.add('hidden');
            });
        });

        document.querySelector(`.lang-option[data-lang="${i18n.currentLang}"]`)?.classList.add('active');

        const langToggle = document.getElementById('lang-toggle');
        const langMenu = document.getElementById('lang-menu');

        langToggle.addEventListener('click', () => {
            langMenu.classList.toggle('hidden');
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.language-selector')) {
                langMenu.classList.add('hidden');
            }
        });
    } catch (e) {
        console.warn('i18n init failed:', e);
    }
});
