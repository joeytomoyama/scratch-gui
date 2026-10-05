import {createPrivateAPI} from './private-project-api';
import {getAccountService} from './account/service';

export const courseIdFromURL = () => new URLSearchParams(location.search).get('course') || '';
export const editorCourseURL = (id, projectId) =>
    `editor.html?course=${encodeURIComponent(id)}${projectId ? `#${encodeURIComponent(projectId)}` : ''}`;
export const courseContext = () => {
    const id = courseIdFromURL();
    return id ? {course: id} : null;
};
export const selectCourses = (courses, search, sort) => {
    const query = search.trim().toLowerCase();
    const ranks = {beginner: 0, intermediate: 1, advanced: 2};
    return courses.filter(c => `${c.title} ${c.description}`.toLowerCase().includes(query))
        .sort((a, b) => (sort === 'title' ? 0 : (ranks[a.difficulty] - ranks[b.difficulty]) *
            (sort === 'hardest' ? -1 : 1)) || a.title.localeCompare(b.title));
};
export const createCourseAPI = (userId, options = {}) => {
    const api = createPrivateAPI({account: getAccountService(), userId, ...options});
    const root = id => `/v1/courses/${encodeURIComponent(id)}`;
    return {
        list: () => api.request('/v1/courses'),
        project: (id, demo = false) => api.request(`${root(id)}/${demo ? 'demo' : 'starter'}`,
            {binary: true, maxBytes: 50 * 1024 * 1024, timeout: 60000}),
        thumbnail: id => api.request(`${root(id)}/thumbnail`, {binary: true, maxBytes: 2 * 1024 * 1024}),
        complete: (id, completed) => api.request(`${root(id)}/completion`, {method: 'PUT', body: {completed}}),
        dispose: api.dispose
    };
};
