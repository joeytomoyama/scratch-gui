import {tutorProjection} from '../../../src/lib/tutor/projection';
test('compact projection orders block graphs, nests scripts, preserves IDs and omits serialization noise', () => {
    const project = {meta: {agent: 'SECRET_META'}, extensions: ['pen'], targets: [{name: 'Cat', x: 12,
        costumes: [{name: 'costume', md5ext: 'SECRET_HASH', assetId: 'SECRET_HASH'}],
        comments: {c: {text: 'Jump here', blockId: 'b', x: 12345}},
        variables: {v: ['score', 3]}, blocks: {
            a: {opcode: 'event_whenflagclicked', topLevel: true, x: 54321, next: 'b'},
            b: {opcode: 'control_repeat', inputs: {TIMES: [1, [4, 10]], SUBSTACK: [2, 'c']}},
            c: {opcode: 'motion_movesteps', inputs: {STEPS: [1, [4, 5]]}}
        }}]};
    const context = tutorProjection(project);
    expect(context.text).toContain('[a] when green flag clicked');
    expect(context.text).toContain('(opcode: event_whenflagclicked)');
    expect(context.text).toContain('[b] repeat'); expect(context.text).toContain('[c] move steps');
    expect(context.text).toContain('Jump here'); expect(context.text).toContain('score');
    for (const excluded of ['SECRET_HASH', 'SECRET_META', '54321', '12345', 'md5ext', 'assetId']) expect(context.text).not.toContain(excluded);
    expect(tutorProjection(JSON.parse(JSON.stringify(project)))).toEqual(context);
});
