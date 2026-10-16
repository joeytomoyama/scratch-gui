import {TutorHistory} from '../../../src/lib/tutor/history';

const project = blocks => ({targets: [{name: 'Motorcycle', blocks}]});
const block = value => ({opcode: 'motion_movesteps', inputs: {STEPS: [1, [4, value]]}, fields: {}, x: 0, y: 0});

test('history ignores layout but captures edits, removals and caps at forty', () => {
    const history = new TutorHistory(project({a: block(10)}), () => '2026-10-09T12:00:00Z');
    history.observe(project({a: {...block(10), x: 100}}));
    expect(history.context().recentChanges).toEqual([]);
    history.observe(project({a: block(20), b: block(10)}));
    expect(history.context().recentChanges.map(change => change.action)).toEqual(['modified', 'added']);
    history.observe(project({b: block(10)}));
    expect(history.context().recentChanges[2]).toMatchObject({sprite: 'Motorcycle', id: 'a', action: 'removed'});
    for (let i = 0; i < 50; i++) history.observe(project({b: block(i)}));
    expect(history.context().recentChanges).toHaveLength(40);
});

test('shadow input changes modify the owner and conversation retries do not duplicate', () => {
    const withShadow = value => project({a: {...block(10), inputs: {STEPS: [1, 'shadow']}},
        shadow: {shadow: true, opcode: 'math_number', fields: {NUM: [value]}}});
    const history = new TutorHistory(withShadow(10));
    history.observe(withShadow(20));
    expect(history.context().recentChanges).toHaveLength(1);
    expect(history.context().recentChanges[0]).toMatchObject({id: 'a', action: 'modified'});
    for (let i = 0; i < 5; i++) history.remember(String(i), `Question ${i}`, 'Reply');
    history.remember('4', 'duplicate', 'duplicate');
    expect(history.context().recentConversation).toHaveLength(4);
    expect(history.context().recentConversation[3].question).toBe('Question 4');
});
