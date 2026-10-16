// Languages supported by both Deepgram Nova-3 transcription and Aura-2 playback.
export const classroomLocales = Object.freeze(['en', 'de', 'es', 'ja', 'fr', 'it', 'nl']);

export const classroomLocale = locale => {
    const language = typeof locale === 'string' ? locale.toLowerCase().split('-')[0] : '';
    return classroomLocales.includes(language) ? language : 'en';
};
