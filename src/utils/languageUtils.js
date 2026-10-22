export const SUPPORTED_LANGUAGES = [
    { value: 'English', label: 'English', code: 'en', dir: 'ltr' },
    { value: 'Arabic', label: 'العربية (Arabic)', code: 'ar', dir: 'rtl' },
    { value: 'Hindi', label: 'हिन्दी (Hindi)', code: 'hi', dir: 'ltr' },
    { value: 'Malayalam', label: 'മലയാളം (Malayalam)', code: 'ml', dir: 'ltr' },
    { value: 'Tamil', label: 'தமிழ் (Tamil)', code: 'ta', dir: 'ltr' },
    { value: 'Urdu', label: 'اردو (Urdu)', code: 'ur', dir: 'rtl' },
    { value: 'French', label: 'Français (French)', code: 'fr', dir: 'ltr' },
    { value: 'Spanish', label: 'Español (Spanish)', code: 'es', dir: 'ltr' },
    { value: 'German', label: 'Deutsch (German)', code: 'de', dir: 'ltr' },
    { value: 'Bengali', label: 'বাংলা (Bengali)', code: 'bn', dir: 'ltr' },
    { value: 'Telugu', label: 'తెలుగు (Telugu)', code: 'te', dir: 'ltr' },
    { value: 'Kannada', label: 'ಕನ್ನಡ (Kannada)', code: 'kn', dir: 'ltr' },
    { value: 'Marathi', label: 'మరాఠీ (Marathi)', code: 'mr', dir: 'ltr' },
    { value: 'Gujarati', label: 'ગુજરાતી (Gujarati)', code: 'gu', dir: 'ltr' },
    { value: 'Punjabi', label: 'ਪੰਜਾਬੀ (Punjabi)', code: 'pa', dir: 'ltr' }
];

export const getLanguageConfig = (languageName) => {
    return SUPPORTED_LANGUAGES.find(l => l.value === languageName) || SUPPORTED_LANGUAGES[0];
};

export const isRTL = (languageName) => {
    return getLanguageConfig(languageName).dir === 'rtl';
};

export const getAllLanguageCodes = () => {
    return SUPPORTED_LANGUAGES.map(l => l.code).join(',');
};
