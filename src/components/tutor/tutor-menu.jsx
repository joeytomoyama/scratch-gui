import TutorParts from './tutor-parts.jsx';
import React from 'react';
import {createPortal} from 'react-dom';
import EditorContext from '../editor-layout/editor-context';
import PropTypes from 'prop-types';
import {JsonView, collapseAllNested, defaultStyles} from 'react-json-view-lite';
import jsonStyles from 'react-json-view-lite/dist/index.css';
import Button from '../button/button.jsx';
import CloseButton from '../close-button/close-button.jsx';
import {getAccountService} from '../../lib/account/service';
import {accountProjectAPI, isProjectId} from '../../lib/private-project-api';
import {ManualTutor} from '../../lib/tutor/manual';
import {setTutorHighlights} from '../../lib/tutor/highlights';
import {VoiceRecorder} from '../../lib/tutor/voice-recorder';
import {classroomLocale} from '../../lib/classroom-locales';
import microphoneIcon from '../editor-layout/icons/microphone.svg';
import sendIcon from '../editor-layout/icons/send.svg';
import styles from './tutor-menu.css';
import toolbarStyles from '../menu-bar/toolbar-button.css';

// Dependency CSS is also compiled as CSS Modules in this editor.
const viewerStyles = Object.fromEntries(Object.entries(defaultStyles).map(([key, value]) => [key,
    typeof value === 'string' ? value.split(' ').map(name => jsonStyles[name] || name)
        .join(' ') : value]));

/* eslint-disable react/jsx-no-literals, react/jsx-no-bind, react/jsx-handler-names, max-len, react/sort-comp */
class TutorMenu extends React.Component {
    constructor (props) {
        super(props);
        this.state = {open: false,
            user: null,
            question: '',
            busy: false,
            exchanges: [],
            view: 'chat',
            selected: null,
            recording: 'idle',
            voiceError: ''};
        this.nextExchange = 0;
        this.audioURLs = new Set(); this.players = new Map();
    }
    componentDidMount () {
        this.mounted = true;
        this.recorder = new VoiceRecorder({onAudio: audio => {
            this.holding = false;
            this.setState({recording: 'idle'}, () => this.ask(false, audio, this.recordingLanguage));
        },
        onState: recording => {
            if (this.mounted) this.setState({recording});
        },
        onError: voiceError => {
            if (this.mounted) this.setState({voiceError});
        }});
        this.cancelRecording = () => {
            this.holding = false; this.recorder.cancel();
        };
        this.visibilityChanged = () => {
            if (document.hidden) this.cancelRecording();
        };
        window.addEventListener('blur', this.cancelRecording);
        document.addEventListener('visibilitychange', this.visibilityChanged);
        this.account = getAccountService();
        this.loaded = () => this.reset(this.state.user);
        this.props.vm.runtime.on('PROJECT_LOADED', this.loaded);
        this.unsubscribe = this.account?.subscribe(({user}) => {
            if (user?.id !== this.state.user?.id) this.reset(user);
        });
    }
    componentDidUpdate (prevProps, prevState) {
        const open = this.isOpen();
        if (this.context.mobile && this.wasOpen && !open) {
            if (this.holding) this.cancelRecording?.();
            this.stopAudio();
        }
        const justOpened = open && !this.wasOpen;
        this.wasOpen = open;
        if (justOpened && !this.composer?.disabled) this.composer?.focus({preventScroll: true});
        if (this.chatLog && open && this.state.view === 'chat' &&
            (prevState.exchanges !== this.state.exchanges || justOpened || prevState.view !== 'chat')) {
            // Instant scrolling also respects reduced-motion preferences.
            this.chatLog.scrollTop = this.chatLog.scrollHeight;
        }
    }
    reset (user) {
        this.cancelRecording?.(); this.clearAudio();
        setTutorHighlights(this.props.vm, null);
        this.tutor?.dispose();
        this.activeExchange = null;
        this.tutor = user && process.env.BACKEND_BASE_URL ? new ManualTutor({vm: this.props.vm, api: accountProjectAPI(user.id)}) : null;
        this.setState({user, question: '', busy: false, exchanges: [], view: 'chat', selected: null, voiceError: ''});
    }
    componentWillUnmount () {
        setTutorHighlights(this.props.vm, null);
        this.mounted = false; this.tutor?.dispose(); this.unsubscribe?.();
        this.cancelRecording?.(); this.clearAudio();
        window.removeEventListener('blur', this.cancelRecording);
        document.removeEventListener('visibilitychange', this.visibilityChanged);
        this.props.vm.runtime.off('PROJECT_LOADED', this.loaded);
    }
    isOpen () {
        return this.context.mobile ? this.context.panel === 'tutor' : this.state.open;
    }
    close () {
        if (this.context.mobile) this.context.setPanel(null);
        this.cancelRecording?.(); this.stopAudio();
        this.setState({open: false}, () => this.trigger?.focus({preventScroll: true}));
    }
    updateExchange (id, changes) {
        this.setState(state => ({exchanges: state.exchanges.map(exchange =>
            (exchange.id === id ? {...exchange, ...changes} : exchange))}));
    }
    stopAudio () {
        this.players.forEach(player => player.pause());
    }
    clearAudio () {
        this.stopAudio(); this.players.clear();
        this.audioURLs.forEach(url => URL.revokeObjectURL(url)); this.audioURLs.clear();
    }
    startRecording () {
        if (!this.tutor || !this.props.ready || this.state.busy || this.holding) return;
        this.recordingLanguage = classroomLocale(this.props.locale);
        this.holding = true; this.stopAudio(); this.setState({voiceError: ''}); this.recorder.start();
    }
    stopRecording () {
        this.holding = false; this.recorder.stop();
    }
    async ask (retry = false, audio = null, language = classroomLocale(this.props.locale)) {
        if (!this.tutor || !this.props.ready || this.state.busy || this.holding || this.state.recording !== 'idle' || (retry && !this.tutor.pending)) return;
        const current = this.tutor;
        const question = this.state.question;
        const id = retry ? this.activeExchange : ++this.nextExchange;
        this.activeExchange = id;
        this.stopAudio();
        setTutorHighlights(this.props.vm, null);
        if (retry) {
            this.updateExchange(id, {status: 'waiting', error: ''});
            this.setState({open: true, busy: true});
        } else {
            this.setState(state => ({open: true,
                busy: true,
                question: audio ? state.question : '',
                view: 'chat',
                selected: id,
                exchanges: [...state.exchanges, {id,
                    question: audio ? '' : question.trim(),
                    status: audio ? 'transcribing' : 'waiting',
                    voice: Boolean(audio),
                    error: '',
                    feedback: null,
                    debugInput: null,
                    response: null}]}));
        }
        let transcribing = Boolean(audio);
        try {
            const projectId = isProjectId(this.props.projectId) ? this.props.projectId : null;
            if (audio) {
                const transcript = await current.transcribe(audio, this.props.course, projectId, language);
                if (!this.mounted || current !== this.tutor) return;
                this.updateExchange(id, {question: transcript.question, status: 'waiting'});
                transcribing = false;
            }
            const result = await (retry || audio ? current.retry() : current.ask(question, this.props.course,
                projectId, language));
            if (!this.mounted || current !== this.tutor) return;
            setTutorHighlights(this.props.vm, result.feedback || null, current.snapshot);
            this.updateExchange(id, {feedback: result.feedback || null,
                previews: current.previews,
                response: result,
                // Cached retries can omit debug input; retain this session's original provider data.
                ...(result.debugInput ? {debugInput: result.debugInput} : {}),
                ...(result.debugHighlights ? {debugHighlights: result.debugHighlights} : {}),
                status: result.status,
                error: ''});
            if (result.status === 'complete' && result.feedback?.text && current.api.tutorAudio) {
                try {
                    const bytes = await current.api.tutorAudio(result.requestId);
                    if (!this.mounted || current !== this.tutor) return;
                    const audioURL = URL.createObjectURL(new Blob([bytes], {type: 'audio/mpeg'}));
                    this.audioURLs.add(audioURL);
                    this.updateExchange(id, {audioURL, audioError: ''});
                    // The native player is available after React commits. Autoplay may be blocked by the browser.
                    this.setState({}, () => {
                        if (!this.isOpen()) return;
                        this.players.get(id)?.play()
                            ?.catch(() => {
                                if (this.mounted && current === this.tutor) this.updateExchange(id, {audioError: 'Press play to hear the tutor.'});
                            });
                    });
                } catch (error) {
                    if (this.mounted && current === this.tutor) {
                        this.updateExchange(id,
                            {audioError: 'Spoken reply unavailable. You can still read the tutor’s answer.'});
                    }
                }
            }
        } catch (error) {
            if (transcribing && current === this.tutor) {
                current.pending = null; current.snapshot?.dispose(); current.snapshot = null;
            }
            if (this.mounted && current === this.tutor) this.updateExchange(id, {error: error.message, status: 'error'});
        } finally {
            if (this.mounted && current === this.tutor) this.setState({busy: false});
        }
    }
    renderExchange (exchange) {
        const statusText = {
            transcribing: 'Transcribing your question…',
            waiting: 'Waiting for tutor…',
            acknowledged: 'Request received. No AI provider is configured yet.',
            processing: 'Analysis is pending. Retry this request to check its result.',
            failed: 'The tutor request failed. Retrying this request checks its status without sending it again.'
        };
        return (<article
            className={styles.exchange}
            key={exchange.id}
        >
            <div className={`${styles.message} ${styles.student}`}>
                <strong>{exchange.voice ? 'You · voice' : 'You'}</strong><p>{exchange.question || (exchange.voice ? 'Voice question' : 'Suggest a next step.')}</p>
            </div>
            <div className={`${styles.message} ${styles.tutor}`}>
                <strong>Tutor</strong>
                {exchange.feedback?.text && (Array.isArray(exchange.feedback.parts) ?
                    <TutorParts
                        feedback={exchange.feedback}
                        capture={exchange.previews}
                    /> : <p>{exchange.feedback.text}</p>)}
                {exchange.error ? <p role="alert">{exchange.error}</p> :
                    statusText[exchange.status] ? <p>{statusText[exchange.status]}</p> :
                        !exchange.feedback?.text && <p>The tutor returned no text. You can inspect the JSON.</p>}
                {exchange.audioURL && <audio
                    className={styles.audio}
                    controls
                    preload="none"
                    src={exchange.audioURL}
                    aria-label="Spoken tutor reply"
                    ref={node => {
                        if (node) this.players.set(exchange.id, node);
                        else this.players.delete(exchange.id);
                    }}
                    onPlay={event => this.players.forEach(player => {
                        if (player !== event.target) player.pause();
                    })}
                    onError={() => this.updateExchange(exchange.id, {audioError: 'Audio playback failed. You can still read the tutor’s answer.'})}
                />}
                {exchange.audioError && <p role="status">{exchange.audioError}</p>}
            </div>
        </article>);
    }
    renderDebug () {
        const s = this.state;
        const exchange = s.exchanges.find(item => item.id === s.selected) || s.exchanges[s.exchanges.length - 1];
        return (<div className={styles.debug}>
            {s.exchanges.length > 1 && <label className={styles.debugSelector}>Exchange
                <select
                    aria-label="Inspect exchange"
                    value={exchange.id}
                    onChange={event => this.setState({selected: Number(event.target.value)})}
                >
                    {s.exchanges.map((item, index) => (<option
                        key={item.id}
                        value={item.id}
                    >
                        {index + 1}. {item.question || 'Suggest a next step.'}
                    </option>))}
                </select>
            </label>}
            {exchange ? <div
                className={styles.json}
                aria-label="Tutor JSON"
            >
                <JsonView
                    key={exchange.id}
                    data={{
                        request: exchange.debugInput,
                        response: exchange.feedback || exchange.response,
                        ...(exchange.debugHighlights ? {highlightDiagnostics: exchange.debugHighlights} : {})}}
                    shouldExpandNode={collapseAllNested}
                    style={viewerStyles}
                />
            </div> : <p className={styles.empty}>Send a message to inspect its request and response.</p>}
        </div>);
    }
    renderPanel (panel) {
        return this.context.mobile ? createPortal(panel, document.body) : panel;
    }
    render () {
        const s = this.state;
        const latest = s.exchanges[s.exchanges.length - 1];
        const mobile = this.context.mobile;
        const open = this.isOpen();
        const sendText = s.busy ? 'Waiting...' : 'Send';
        const sendLabel = mobile ? (<img
            src={sendIcon}
            alt={sendText}
        />) : sendText;
        return (<div
            className={styles.root}
            data-mobile-tutor={mobile}
            data-has-message={Boolean(s.question.trim())}
        >
            <button
                className={toolbarStyles.button}
                type="button"
                aria-expanded={open}
                aria-controls="tutor-chat"
                ref={node => {
                    this.trigger = node;
                }}
                onClick={() => (s.open ? this.close() : this.setState({open: true}))}
            >Ask Tutor</button>
            {open && this.renderPanel(<section
                id="tutor-chat"
                data-mobile-tutor={mobile}
                data-has-message={Boolean(s.question.trim())}
                style={mobile ? {'--editor-height': `${this.context.viewportHeight}px`} : null}
                className={styles.panel}
                aria-label="Tutor chat"
                role={mobile ? 'dialog' : null}
                aria-modal={mobile ? true : null}
                tabIndex={-1}
                onKeyDown={event => {
                    if (event.key === 'Escape') {
                        event.stopPropagation(); this.close();
                    }
                }}
            >
                <header className={styles.header}>
                    <strong>Tutor</strong>
                    <div className={styles.headerActions}>
                        <button
                            className={styles.actionButton}
                            type="button"
                            aria-label={s.view === 'chat' ? 'Show JSON' : 'Show chat'}
                            aria-pressed={s.view === 'json'}
                            onClick={() => {
                                this.stopAudio(); this.setState({view: s.view === 'chat' ? 'json' : 'chat'});
                            }}
                        >{s.view === 'chat' ? 'JSON' : 'Chat'}</button>
                        <CloseButton
                            className={styles.closeButton}
                            onClick={() => this.close()}
                        />
                    </div>
                </header>
                {s.view === 'json' && this.renderDebug()}
                <div
                    className={styles.conversation}
                    hidden={s.view !== 'chat'}
                    role="log"
                    aria-label="Tutor conversation"
                    aria-live="polite"
                    aria-relevant="additions text"
                    ref={node => {
                        this.chatLog = node;
                    }}
                >
                    {s.exchanges.length ? s.exchanges.map(exchange => this.renderExchange(exchange)) : (
                        <p className={styles.empty}>Ask about your game, or send without a question for a next-step hint.</p>
                    )}
                </div>
                <form
                    className={styles.composer}
                    onSubmit={event => {
                        event.preventDefault(); this.ask();
                    }}
                >
                    {!s.user && <p>Sign in using Account to ask the tutor.</p>}
                    <div className={styles.messageRow}>
                        <label className={styles.question}>Your message (optional)
                            <textarea
                                maxLength={2000}
                                rows={2}
                                value={s.question}
                                placeholder="What would you like help with?"
                                disabled={!this.tutor || !this.props.ready || s.recording !== 'idle'}
                                ref={node => {
                                    this.composer = node;
                                }}
                                onChange={event => this.setState({question: event.target.value})}
                                onKeyDown={event => {
                                    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
                                        event.preventDefault(); this.ask();
                                    }
                                }}
                            />
                        </label>
                        <div className={styles.composerActions}>
                            <button
                                className={`${styles.actionButton} ${styles.microphone}`}
                                type="button"
                                aria-label="Hold to talk"
                                aria-pressed={s.recording === 'recording'}
                                disabled={!this.tutor || !this.props.ready || s.busy || !this.recorder?.supported}
                                onPointerDown={event => {
                                    if (event.button !== 0) return;
                                    event.preventDefault(); event.currentTarget.setPointerCapture?.(event.pointerId);
                                    this.startRecording();
                                }}
                                onPointerUp={() => this.stopRecording()}
                                onPointerCancel={() => this.cancelRecording()}
                                onLostPointerCapture={() => {
                                    if (this.holding) this.cancelRecording();
                                }}
                                onKeyDown={event => {
                                    if ([' ', 'Enter'].includes(event.key)) {
                                        event.stopPropagation?.();
                                        event.preventDefault(); if (!event.repeat) this.startRecording();
                                    }
                                }}
                                onKeyUp={event => {
                                    if ([' ', 'Enter'].includes(event.key)) {
                                        event.stopPropagation?.();
                                        event.preventDefault(); this.stopRecording();
                                    }
                                }}
                                onBlur={() => this.cancelRecording()}
                            >
                                <img
                                    src={microphoneIcon}
                                    alt=""
                                />
                                {!mobile && (s.recording === 'recording' ? 'Recording…' : 'Hold to talk')}
                            </button>
                            <Button
                                className={styles.sendButton}
                                type="submit"
                                disabled={!this.tutor || !this.props.ready || s.busy || s.recording !== 'idle'}
                                onMouseDown={event => event.preventDefault()}
                            >{sendLabel}</Button>
                        </div>
                    </div>
                    <p className={styles.voiceNotice}>{this.recorder?.supported ?
                        'Hold to record. Release to send to Deepgram (up to 60 seconds).' :
                        'Voice recording is unavailable in this browser. You can type instead.'}</p>
                    {mobile && !s.question.trim() && <button
                        type="submit"
                        className={styles.hintButton}
                        disabled={!this.tutor || !this.props.ready || s.busy || s.recording !== 'idle'}
                    >Get a next-step hint</button>}
                    {s.voiceError && <p role="alert">{s.voiceError}</p>}
                    {s.recording !== 'idle' && <p role="status">{s.recording === 'permission' ?
                        'Allow microphone access, then hold again if needed.' : 'Recording… Release to send.'}</p>}
                    {this.tutor?.pending && latest?.status !== 'complete' && <button
                        className={styles.actionButton}
                        type="button"
                        disabled={s.busy || !this.props.ready}
                        onClick={() => this.ask(true)}
                    >Retry same request</button>}
                </form>
            </section>)}
        </div>);
    }
}
TutorMenu.contextType = EditorContext;
TutorMenu.propTypes = {
    locale: PropTypes.string,
    vm: PropTypes.object.isRequired,
    ready: PropTypes.bool.isRequired,
    course: PropTypes.object,
    projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};
export default TutorMenu;
