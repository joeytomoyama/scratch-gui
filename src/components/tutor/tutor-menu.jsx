import React from 'react';
import PropTypes from 'prop-types';
import {JsonView, collapseAllNested, defaultStyles} from 'react-json-view-lite';
import jsonStyles from 'react-json-view-lite/dist/index.css';
import {getAccountService} from '../../lib/account/service';
import {accountProjectAPI, isProjectId} from '../../lib/private-project-api';
import {ManualTutor} from '../../lib/tutor/manual';
import {setTutorHighlights} from '../../lib/tutor/highlights';
import styles from './tutor-menu.css';

// This editor treats dependency CSS as CSS modules too, so map the viewer's class names.
const viewerStyles = Object.fromEntries(Object.entries(defaultStyles).map(([key, value]) => [key,
    typeof value === 'string' ? value.split(' ').map(name => jsonStyles[name] || name)
        .join(' ') : value]));

/* eslint-disable react/jsx-no-literals, react/jsx-no-bind, react/jsx-handler-names, max-len, react/sort-comp */
class TutorMenu extends React.Component {
    constructor (props) {
        super(props);
        this.state = {open: false, user: null, question: '', busy: false, status: '', error: '', feedback: null, debugInput: null, replyCollapsed: false};
    }
    componentDidMount () {
        this.mounted = true;
        this.account = getAccountService();
        this.loaded = () => this.reset(this.state.user);
        this.props.vm.runtime.on('PROJECT_LOADED', this.loaded);
        this.unsubscribe = this.account?.subscribe(({user}) => {
            if (user?.id !== this.state.user?.id) this.reset(user);
        });
    }
    reset (user) {
        setTutorHighlights(this.props.vm, null);
        this.tutor?.dispose();
        this.tutor = user && process.env.BACKEND_BASE_URL ? new ManualTutor({vm: this.props.vm, api: accountProjectAPI(user.id)}) : null;
        this.setState({user, question: '', busy: false, status: '', error: '', feedback: null, debugInput: null, replyCollapsed: false});
    }
    componentWillUnmount () {
        setTutorHighlights(this.props.vm, null);
        this.mounted = false; this.tutor?.dispose(); this.unsubscribe?.();
        this.props.vm.runtime.off('PROJECT_LOADED', this.loaded);
    }
    async ask (retry = false) {
        if (!this.tutor || this.state.busy) return;
        const current = this.tutor;
        setTutorHighlights(this.props.vm, null);
        this.setState({open: false, busy: true, status: '', error: '', feedback: null, debugInput: null, replyCollapsed: false});
        try {
            const result = await (retry ? current.retry() : current.ask(this.state.question, this.props.course,
                isProjectId(this.props.projectId) ? this.props.projectId : null));
            if (!this.mounted || current !== this.tutor) return;
            setTutorHighlights(this.props.vm, result.feedback || null, current.snapshot);
            this.setState({feedback: result.feedback || null,
                debugInput: result.debugInput || null,
                status: result.status === 'acknowledged' ?
                    'Request received. No AI provider is configured yet.' : result.status === 'failed' ?
                        'The tutor request failed. Retrying this request checks its status without sending it again.' : result.status === 'processing' ?
                            'Analysis is pending. Retry this request to check its result.' : 'Tutor replied.'});
        } catch (error) {
            if (this.mounted && current === this.tutor) this.setState({error: error.message});
        } finally {
            if (this.mounted && current === this.tutor) this.setState({busy: false});
        }
    }
    render () {
        const s = this.state;
        return (<div className={styles.root}>
            <button
                type="button"
                aria-expanded={s.open}
                onClick={() => this.setState({open: !s.open})}
            >Ask AI Tutor</button>
            {s.open && <section
                className={styles.panel}
                aria-label="AI tutor"
            >
                <strong>AI tutor</strong><button
                    type="button"
                    onClick={() => this.setState({open: false})}
                >Close</button>
                <p>Only pressing Ask sends your question and a reduced project description to DeepSeek, together with your course’s completed reference. Project files and images are not sent. You can experiment without asking.</p>
                {!s.user && <p>Sign in using Account to ask the tutor.</p>}
                <label>Your question (optional)<textarea
                    maxLength={2000}
                    value={s.question}
                    disabled={!s.user || s.busy}
                    onChange={event => this.setState({question: event.target.value})}
                /></label>
                <p>Leave the question blank to get a suggested next step.</p>
                <button
                    type="button"
                    disabled={!this.tutor || !this.props.ready || s.busy}
                    onClick={() => this.ask()}
                > {s.busy ? 'Waiting for tutor…' : 'Ask now'}</button>
                {this.tutor?.pending && <button
                    type="button"
                    disabled={s.busy}
                    onClick={() => this.ask(true)}
                >Retry same request</button>}
                <p role="status">{s.status}</p>{s.error && <p role="alert">{s.error}</p>}
            </section>}
            {s.feedback && <div className={styles.reply}>
                <button
                    type="button"
                    aria-expanded={!s.replyCollapsed}
                    aria-controls="tutor-reply-text"
                    onClick={() => this.setState({replyCollapsed: !s.replyCollapsed})}
                >{s.replyCollapsed ? 'Expand tutor reply' : 'Collapse tutor reply'}</button>
                <div
                    id="tutor-reply-text"
                    className={styles.json}
                    aria-label="Tutor reply"
                    role="status"
                    hidden={s.replyCollapsed}
                >
                    <JsonView
                        key={s.feedback.id || this.tutor?.pending?.requestId}
                        data={{request: s.debugInput, response: s.feedback}}
                        shouldExpandNode={collapseAllNested}
                        style={viewerStyles}
                    />
                </div>
            </div>}
            {!s.feedback && (s.busy || s.error || s.status) && <div className={styles.reply}>
                {s.error && <p role="alert">{s.error}</p>}
                {!s.error && <p role="status">{s.busy ? 'Waiting for tutor…' : s.status}</p>}
            </div>}
        </div>);
    }
}
TutorMenu.propTypes = {
    vm: PropTypes.object.isRequired,
    ready: PropTypes.bool.isRequired,
    course: PropTypes.object,
    projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};
export default TutorMenu;
