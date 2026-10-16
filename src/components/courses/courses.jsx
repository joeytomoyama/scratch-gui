import React, {useEffect, useState} from 'react';
import CoursesHeader from './courses-header.jsx';
import {getAccountService} from '../../lib/account/service';
import {createCourseAPI, selectCourses, editorCourseURL} from '../../lib/course-api';
import styles from './courses.css';
/* eslint-disable react/jsx-no-literals, react/jsx-no-bind, max-len, no-negated-condition */

const difficultyLabel = value => value.charAt(0).toUpperCase() + value.slice(1);
/**
 * Student course catalog and playable course details.
 * @returns {React.Element} Course page.
 */
export default function Courses () {
    const [account, setAccount] = useState({loading: true});
    const [courses, setCourses] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [api, setAPI] = useState(null);
    const [selected, setSelected] = useState(location.hash.slice(1));
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('easiest');
    const [pending, setPending] = useState('');
    const [thumbnails, setThumbnails] = useState({});
    useEffect(() => {
        const service = getAccountService();
        if (!service) {
            setAccount({loading: false}); return () => {};
        }
        return service.subscribe(setAccount);
    }, []);
    useEffect(() => {
        const change = () => setSelected(location.hash.slice(1));
        window.addEventListener('hashchange', change);
        return () => window.removeEventListener('hashchange', change);
    }, []);
    useEffect(() => {
        setCourses([]); setError(''); setThumbnails({}); setAPI(null);
        if (!account.user || account.loading) return () => {};
        const client = createCourseAPI(account.user.id);
        let active = true;
        const urls = [];
        setAPI(client); setLoading(true);
        client.list().then(async result => {
            if (!active) return;
            setCourses(result.courses);
            setLoading(false);
            for (const course of result.courses.filter(c => c.thumbnail)) {
                try {
                    const bytes = await client.thumbnail(course.id);
                    if (!active) return;
                    const url = URL.createObjectURL(new Blob([bytes], {type: bytes[0] === 137 ? 'image/png' : 'image/jpeg'}));
                    urls.push(url); setThumbnails(prev => ({...prev, [course.id]: url}));
                } catch (e) { /* Optional thumbnail falls back to the placeholder. */ }
            }
        })
            .catch(() => {
                if (active) {
                    setError('Courses could not be loaded. Please try refreshing.'); setLoading(false);
                }
            });
        return () => {
            active = false; client.dispose(); urls.forEach(url => URL.revokeObjectURL(url));
        };
    }, [account.user?.id, account.loading]);
    const complete = async course => {
        setPending(course.id); setError('');
        try {
            const result = await api.complete(course.id, !course.completed);
            setCourses(prev => prev.map(c => (c.id === course.id ? {...c, completed: result.completed} : c)));
        } catch (e) {
            setError('Completion could not be saved. Please try again.');
        } finally {
            setPending('');
        }
    };
    const thumbnail = course => (thumbnails[course.id] ?
        <img
            className={styles.thumbnail}
            src={thumbnails[course.id]}
            alt=""
        /> :
        <div
            className={styles.placeholder}
            aria-label="Course thumbnail placeholder"
        >▶</div>);
    const course = courses.find(c => c.id === selected);
    return (
        <div className={styles.page}>
            <CoursesHeader />
            <main className={styles.content}>
                <h1>{selected && course ? course.title : 'Courses'}</h1>
                {account.loading ? <p>Restoring your session…</p> : !account.user ? <p>Sign in to explore courses.</p> : null}
                {error && <p role="alert">{error}</p>}
                {loading && <p>Loading courses…</p>}
                {account.user && !account.loading && !loading && (selected ? course ? (
                    <React.Fragment>
                        <a href="#">← All courses</a>
                        <p>{course.description}</p>
                        <p>Difficulty: {difficultyLabel(course.difficulty)}</p>
                        {course.concepts.length > 0 && <React.Fragment>
                            <h2>What you’ll learn</h2>
                            <ul>{course.concepts.map(concept => <li key={concept}>{concept}</li>)}</ul>
                        </React.Fragment>}
                        <div className={styles.actions}>
                            {course.resumeProjectId && <a
                                className={styles.button}
                                href={editorCourseURL(course.id, course.resumeProjectId)}
                            >Continue course</a>}
                            <a
                                className={styles.button}
                                href={editorCourseURL(course.id)}
                            >{course.resumeProjectId ? 'Start again' : 'Start course'}</a>
                            <button
                                className={styles.completionButton}
                                disabled={pending === course.id}
                                onClick={() => complete(course)}
                            >
                                {course.completed ? 'Mark as not completed' : 'Mark completed'}
                            </button>
                            {course.completed && <span>✓ Completed</span>}
                        </div>
                        <h2>Try the game</h2>
                        <p>Press the green flag to start. Click inside the preview to use keyboard controls.</p>
                        <iframe
                            key={course.id}
                            className={styles.preview}
                            title={`${course.title} playable demo`}
                            src={`course-player.html?course=${encodeURIComponent(course.id)}`}
                            allow="autoplay; fullscreen"
                        />
                    </React.Fragment>
                ) : <p>Course not found. <a href="#">Back to courses</a></p> : (
                    <React.Fragment>
                        <div className={styles.filters}>
                            <label>Search courses <input
                                className={styles.control}
                                type="search"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            /></label>
                            <label>Sort by <select
                                className={styles.control}
                                value={sort}
                                onChange={e => setSort(e.target.value)}
                            >
                                <option value="easiest">Difficulty: easiest first</option>
                                <option value="hardest">Difficulty: hardest first</option>
                                <option value="title">Title</option>
                            </select></label>
                        </div>
                        <div className={styles.grid}>
                            {selectCourses(courses, search, sort).map(c => (
                                <article
                                    className={styles.card}
                                    key={c.id}
                                >
                                    <a href={`#${encodeURIComponent(c.id)}`}>
                                        {thumbnail(c)}
                                        <h2>{c.title}</h2>
                                    </a>
                                    <p>{difficultyLabel(c.difficulty)}{c.completed ? ' · ✓ Completed' : ''}</p>
                                    <p>{c.description}</p>
                                    <div className={styles.actions}>
                                        {c.resumeProjectId && <a
                                            className={styles.button}
                                            href={editorCourseURL(c.id, c.resumeProjectId)}
                                        >Continue course</a>}
                                        <a
                                            className={styles.button}
                                            href={`#${encodeURIComponent(c.id)}`}
                                        >{c.resumeProjectId ? 'Course details' : 'Start course'}</a>
                                        <button
                                            className={styles.completionButton}
                                            disabled={pending === c.id}
                                            onClick={() => complete(c)}
                                        >
                                            {c.completed ? 'Mark as not completed' : 'Mark completed'}
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                        {selectCourses(courses, search, sort).length === 0 && <p>No courses found.</p>}
                    </React.Fragment>
                ))}
            </main>
        </div>
    );
}
