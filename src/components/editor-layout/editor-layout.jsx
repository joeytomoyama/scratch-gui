/* eslint-disable react/jsx-no-literals, react/jsx-no-bind, react/jsx-handler-names, max-len */
import React, {useContext, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import PropTypes from 'prop-types';
import Controls from '../../containers/controls.jsx';
import {editorGeometry, MOBILE_EDITOR_MAX_WIDTH, MIN_CODE_HEIGHT} from '../../lib/editor-layout';
import Context from './editor-context';
import EditorIcon from './editor-icon.jsx';
import styles from './editor-layout.css';

export const EditorPanel = ({name, children}) => {
    const layout = useContext(Context);
    return (<div
        data-editor-region={name}
        role={layout.mobile ? 'dialog' : null}
        aria-label={name === 'menu' ? 'Project menu' : 'Sprites'}
        aria-modal={layout.mobile ? true : null}
        tabIndex={layout.mobile ? -1 : null}
    >
        {layout.mobile && <header className={styles.panelHeading}>
            <strong>{name === 'menu' ? 'Project' : 'Sprites'}</strong>
            <button
                type="button"
                aria-label="Close panel"
                onClick={() => (name === 'menu' ? layout.setMenuOpen(false) : layout.setPanel(null))}
            >×</button>
        </header>}
        {children}
    </div>);
};
EditorPanel.propTypes = {name: PropTypes.string.isRequired, children: PropTypes.node};

const viewport = () => ({width: window.innerWidth,
    height: window.visualViewport ? window.visualViewport.height : window.innerHeight});
const palette = open => window.dispatchEvent(new CustomEvent('classroom-palette-toggle', {detail: {open}}));

// One shell and one mounted editor for all widths. Changing panels never replaces
// Blockly, the renderer, or the VM with separate mobile instances.
const EditorLayout = ({children, vm, customStageSize, isFullScreen, onActivateTab}) => {
    const [size, setSize] = useState(viewport);
    const [panel, setPanel] = useState('code');
    const [menuOpen, setMenuOpen] = useState(false);
    const [preview, setPreview] = useState('compact');
    const [drawerHeight, setDrawerHeight] = useState(null);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const shell = useRef(null);
    const drag = useRef(null);
    const mobile = size.width <= MOBILE_EDITOR_MAX_WIDTH && !isFullScreen;
    const geometry = useMemo(() => editorGeometry({...size,
        nativeWidth: customStageSize.width,
        nativeHeight: customStageSize.height,
        panel,
        preview,
        drawerHeight}),
    [size.width, size.height, customStageSize.width, customStageSize.height, panel, preview, drawerHeight]);
    const context = useMemo(() => ({mobile,
        panel,
        setPanel,
        menuOpen,
        setMenuOpen,
        viewportHeight: size.height,
        stageViewport: mobile ? geometry.stage : null}), [mobile, panel, menuOpen, geometry]);

    useEffect(() => {
        const resize = () => setSize(viewport());
        const paletteChange = event => setPaletteOpen(event.detail.open);
        window.addEventListener('resize', resize);
        window.visualViewport?.addEventListener('resize', resize);
        window.addEventListener('classroom-palette-change', paletteChange);
        return () => {
            window.removeEventListener('resize', resize);
            window.visualViewport?.removeEventListener('resize', resize);
            window.removeEventListener('classroom-palette-change', paletteChange);
        };
    }, []);
    useLayoutEffect(() => {
        // Blockly and the renderer have their own resize listeners. Run after
        // committing the shell's new geometry, including a hidden/reopened drawer.
        window.dispatchEvent(new Event('resize'));
    }, [mobile, panel, preview, drawerHeight]);
    useEffect(() => {
        if (panel !== 'code' || !mobile) palette(false);
    }, [panel, mobile]);
    useEffect(() => {
        if (!mobile) return;
        const modal = menuOpen ? shell.current.querySelector('[data-editor-region="menu"]') :
            panel === 'sprites' ? shell.current.querySelector('[data-editor-region="targets"]') :
                panel === 'tutor' ? document.getElementById('tutor-chat') : null;
        const previous = document.activeElement;
        if (modal) modal.focus({preventScroll: true});
        const keydown = event => {
            if (document.body.classList.contains('ReactModal__Body--open')) return;
            if (event.key === 'Escape') {
                if (paletteOpen) palette(false);
                else if (menuOpen) setMenuOpen(false);
                else if (panel && !paletteOpen) setPanel(null);
            }
            if (event.key !== 'Tab' || !modal) return;
            const nodes = Array.from(modal.querySelectorAll('button, a[href], input, select, textarea, [tabindex="0"]'))
                .filter(n => !n.disabled && n.getClientRects().length && getComputedStyle(n).visibility !== 'hidden');
            const first = nodes[0];
            const last = nodes[nodes.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === modal)) {
                event.preventDefault(); last?.focus({preventScroll: true});
            } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === modal)) {
                event.preventDefault(); first?.focus({preventScroll: true});
            }
        };
        document.addEventListener('keydown', keydown);
        return () => {
            document.removeEventListener('keydown', keydown);
            if (modal && previous?.isConnected) previous.focus({preventScroll: true});
        };
    }, [mobile, menuOpen, panel, paletteOpen]);

    const toggle = next => {
        setMenuOpen(false);
        if (next === 'code') onActivateTab(0);
        setPanel(panel === next ? null : next);
    };
    return (<Context.Provider value={context}>
        <div
            className={styles.shell}
            data-editor-shell
            data-mobile={mobile}
            data-compact-height={size.height < 520}
            data-short-preview={geometry.previewHeight < 172}
            data-panel={panel || 'play'}
            data-menu-open={menuOpen}
            data-preview={preview}
            data-palette-open={paletteOpen}
            ref={shell}
            style={{'--editor-height': `${size.height}px`,
                '--code-height': `${geometry.codeHeight}px`,
                '--preview-height': `${geometry.previewHeight}px`}}
        >
            {children}
            {mobile && <React.Fragment>
                {(menuOpen || panel === 'sprites' || panel === 'tutor') && <button
                    className={styles.scrim}
                    aria-label="Close panel"
                    onClick={() => {
                        setMenuOpen(false); if (panel === 'sprites' || panel === 'tutor') setPanel(null);
                    }}
                />}
                <button
                    className={styles.burger}
                    type="button"
                    aria-label="Open project menu"
                    aria-expanded={menuOpen}
                    onClick={() => {
                        if (panel === 'sprites' || panel === 'tutor') setPanel(null);
                        setMenuOpen(!menuOpen);
                    }}
                >
                    <EditorIcon name="menu" />
                </button>
                <div className={styles.playback}><Controls vm={vm} /></div>
                {panel === 'code' && <div className={styles.previewActions}>
                    <button
                        type="button"
                        onClick={() => {
                            setDrawerHeight(null); setPreview(preview === 'hidden' ? 'compact' : 'hidden');
                        }}
                    >
                        <EditorIcon name="collapse" />{preview === 'hidden' ? 'Show' : 'Hide'}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setPanel(null);
                        }}
                    >
                        <EditorIcon name="expand" />Expand
                    </button>
                </div>}
                <div
                    className={styles.drawerControls}
                    hidden={panel !== 'code'}
                >
                    <button
                        type="button"
                        className={styles.handle}
                        aria-label="Resize Code drawer"
                        onPointerDown={event => {
                            if (event.button !== 0) return;
                            drag.current = {y: event.clientY, height: geometry.codeHeight};
                            event.currentTarget.setPointerCapture(event.pointerId);
                        }}
                        onPointerMove={event => {
                            if (!drag.current) return;
                            setDrawerHeight(Math.min(size.height - 136, Math.max(MIN_CODE_HEIGHT,
                                drag.current.height + drag.current.y - event.clientY)));
                        }}
                        onPointerUp={() => {
                            drag.current = null;
                        }}
                        onPointerCancel={() => {
                            drag.current = null;
                        }}
                        onLostPointerCapture={() => {
                            drag.current = null;
                        }}
                        onKeyDown={event => {
                            if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
                            event.preventDefault();
                            setDrawerHeight(Math.min(size.height - 136, Math.max(MIN_CODE_HEIGHT,
                                geometry.codeHeight + (event.key === 'ArrowUp' ? 40 : -40))));
                        }}
                    ><span /></button>
                    <button
                        className={styles.blocks}
                        type="button"
                        aria-label="Choose blocks"
                        aria-expanded={paletteOpen}
                        onClick={() => {
                            onActivateTab(0); palette(!paletteOpen);
                        }}
                    >
                        <EditorIcon name="blocks" />
                    </button>
                </div>
                <nav
                    className={styles.navigation}
                    aria-label="Editor panels"
                >
                    {['code', 'sprites', 'tutor'].map(name => (<button
                        key={name}
                        type="button"
                        aria-expanded={panel === name}
                        onClick={() => toggle(name)}
                    >
                        <span><EditorIcon name={name} /></span>
                        {name === 'code' ? 'Code' : name === 'sprites' ? 'Sprites' : 'Tutor'}
                    </button>))}
                </nav>
            </React.Fragment>}
        </div>
    </Context.Provider>);
};
EditorLayout.propTypes = {children: PropTypes.node,
    vm: PropTypes.object.isRequired,
    customStageSize: PropTypes.shape({width: PropTypes.number, height: PropTypes.number}).isRequired,
    isFullScreen: PropTypes.bool,
    onActivateTab: PropTypes.func.isRequired};
export default EditorLayout;
