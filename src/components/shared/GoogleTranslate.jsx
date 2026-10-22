import React, { useEffect } from 'react';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { SUPPORTED_LANGUAGES, getLanguageConfig, getAllLanguageCodes } from '../../utils/languageUtils';

const GoogleTranslate = () => {
    const { salonConfig } = useAuth();
    const language = salonConfig?.language;

    useEffect(() => {
        // Function to set the cookie
        const setGoogleTranslateCookie = () => {
            const config = getLanguageConfig(language);
            const targetCode = config.code;

            if (targetCode !== 'en') {
                // Check if the cookie already exists and is correct
                const cookies = document.cookie.split('; ');
                const expectedValue = `googtrans=/en/${targetCode}`;
                const hasCorrectCookie = cookies.some(cookie => cookie.trim() === expectedValue);

                if (!hasCorrectCookie) {
                    // Set the cookie to force English to target language translation
                    document.cookie = `${expectedValue}; path=/; domain=${window.location.hostname}`;
                    document.cookie = `${expectedValue}; path=/`;
                    window.location.reload();
                }
            } else {
                // If language is English, we should remove the cookie
                const cookies = document.cookie.split('; ');
                const hasCookie = cookies.some(cookie => cookie.trim().startsWith('googtrans='));

                if (hasCookie) {
                    document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" + window.location.hostname;
                    document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
                    window.location.reload();
                }
            }
        };

        // Initialize Google Translate
        window.googleTranslateElementInit = () => {
            new window.google.translate.TranslateElement(
                {
                    pageLanguage: 'en',
                    includedLanguages: getAllLanguageCodes(), // Include all supported languages
                    layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
                    autoDisplay: false, // Don't show the banner
                },
                'google_translate_element'
            );
        };

        // Load the script
        const addScript = () => {
            if (document.getElementById('google-translate-script')) return;

            const script = document.createElement('script');
            script.id = 'google-translate-script';
            script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
            script.async = true;
            document.body.appendChild(script);
        };

        if (language) {
            setGoogleTranslateCookie();
            addScript();

            // Aggressive JS-based hiding using MutationObserver
            const observer = new MutationObserver(() => {
                const icon = document.querySelector('.goog-te-gadget-icon');
                const gadget = document.querySelector('.goog-te-gadget-simple');
                const brand = document.querySelector('.goog-logo-link');

                if (icon) {
                    icon.style.setProperty('display', 'none', 'important');
                    icon.style.setProperty('visibility', 'hidden', 'important');
                    icon.style.setProperty('width', '0', 'important');
                    icon.style.setProperty('height', '0', 'important');
                }
                if (gadget) {
                    gadget.style.setProperty('display', 'none', 'important');
                    gadget.style.setProperty('visibility', 'hidden', 'important');
                    gadget.style.setProperty('width', '0', 'important');
                    gadget.style.setProperty('height', '0', 'important');
                }
                if (brand) {
                    brand.style.setProperty('display', 'none', 'important');
                    brand.style.setProperty('visibility', 'hidden', 'important');
                }
            });

            // Start observing the body for changes
            observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });

            return () => observer.disconnect();
        }

    }, [language]);

    return (
        <div
            id="google_translate_element"
            style={{ display: 'none' }} // Hide the element itself
        ></div>
    );
};

export default GoogleTranslate;
