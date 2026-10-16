import JSZip from '@turbowarp/jszip';
import {getAccountService} from './account/service';
/* eslint-disable max-len */


export const isProjectId = id => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id || '');
const assetName = name => /^[a-f0-9]{32}\.[a-z0-9]{1,10}$/i.test(name);
export const createPrivateAPI = ({account, userId, baseURL = process.env.BACKEND_BASE_URL, fetcher = fetch}) => {
    const controllers = new Set();
    let disposed = false;
    const request = async (path, {method = 'GET', body, binary = false, contentType, outputBinary = binary, speech = false, timeout = 10000, maxBytes = 20 * 1024 * 1024} = {}) => {
        const controller = new AbortController();
        controllers.add(controller);
        const timer = setTimeout(() => controller.abort(), timeout);
        try {
            if (disposed || account.getState().user?.id !== userId) throw new Error('Sign in to your account.');
            const token = await account.getAccessToken();
            if (disposed || account.getState().user?.id !== userId) throw new Error('Account changed.');
            const response = await fetcher(`${baseURL.replace(/\/$/, '')}${path}`, {
                method,
                credentials: 'omit',
                redirect: 'error',
                signal: controller.signal,
                headers: {Authorization: `Bearer ${token}`,
                    ...(body ? {
                        'Content-Type': contentType || (binary ? 'application/octet-stream' : 'application/json')
                    } : {})},
                ...(body ? {body: binary ? body : JSON.stringify(body)} : {})
            });
            if (disposed || account.getState().user?.id !== userId) throw new Error('Account changed.');
            if (!response.ok) {
                const codes = {no_speech: 'No speech detected. Hold to talk again or type your question.',
                    recording_too_long: 'Please keep your question under 60 seconds.',
                    transcript_too_long: 'Your question is too long. Please try a shorter question.',
                    speech_unconfigured: 'Voice is not configured on the server. You can type your question.',
                    speech_expired: 'This voice request expired. Please ask again.',
                    unsupported_language: 'Please use English, German, Spanish, Japanese, French, Italian or Dutch.',
                    rate_limited: 'Too many voice requests. Please wait a minute.'};
                let voiceMessage;
                if (speech) {
                    try {
                        voiceMessage = codes[(await response.json()).error?.code];
                    } catch (_) { /* Use safe fallback. */ }
                }
                const error = new Error(response.status === 409 ? (speech ? 'Voice request changed. Please ask again.' : 'Save conflict. Reload before editing in another tab.') :
                    response.status === 401 ? 'Sign in again.' : voiceMessage ||
                        (speech ? 'Voice request failed. Please try again or type your question.' : 'Request failed. Your unsaved work can be retried.'));
                error.status = response.status;
                throw error;
            }
            if (response.status === 204) return null;
            if (outputBinary) {
                const bytes = await response.arrayBuffer();
                if (bytes.byteLength > maxBytes) throw new Error('Asset too large.');
                return bytes;
            }
            const json = await response.json();
            return json;
        } finally {
            clearTimeout(timer); controllers.delete(controller);
        }
    };
    const root = id => `/v1/projects/${encodeURIComponent(id)}`;
    return {
        request,
        save: async (id, snapshot, files) => {
            const result = await request(`${root(id)}/revisions/${snapshot.revision}`, {method: 'PUT', body: snapshot});
            if (result.revision !== snapshot.revision || !Array.isArray(result.missingAssets)) throw new Error('Invalid save acknowledgement.');
            for (const name of result.missingAssets) {
                if (!assetName(name) || !files.has(name)) throw new Error('Required asset unavailable.');
                await request(`${root(id)}/assets/${encodeURIComponent(name)}`, {method: 'PUT', body: files.get(name), binary: true});
            }
            return result;
        },
        load: async id => {
            const saved = await request(root(id));
            if (!Number.isSafeInteger(saved.revision) || !saved.project || !Array.isArray(saved.assets)) throw new Error('Invalid project.');
            const zip = new JSZip();
            zip.file('project.json', JSON.stringify(saved.project));
            for (const asset of saved.assets) {
                if (!assetName(asset.fileName)) throw new Error('Invalid asset name.');
                const bytes = await request(`${root(id)}/assets/${asset.fileName}`, {binary: true});
                if (bytes.byteLength !== asset.byteLength) throw new Error('Incomplete asset.');
                zip.file(asset.fileName, bytes);
            }
            const data = await zip.generateAsync({type: 'uint8array'});
            return {...saved, data};
        },
        ask: body => request('/v1/tutor/help', {method: 'POST', body, timeout: 60000}),
        transcribe: (id, audio, language = 'auto') => request(`/v1/tutor/transcriptions/${encodeURIComponent(id)}?language=${encodeURIComponent(language)}`,
            {method: 'POST', body: audio, binary: true, outputBinary: false, contentType: audio.type, speech: true, timeout: 40000}),
        tutorAudio: id => request(`/v1/tutor/requests/${encodeURIComponent(id)}/audio`,
            {method: 'POST', outputBinary: true, speech: true, timeout: 40000, maxBytes: 512 * 1024}),
        dispose: () => {
            disposed = true; controllers.forEach(c => c.abort());
        }
    };
};
export const accountProjectAPI = userId => createPrivateAPI({account: getAccountService(), userId});
