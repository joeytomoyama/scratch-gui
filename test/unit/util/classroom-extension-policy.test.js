import {configureExtensionPolicy, isExtensionAvailable, HARDWARE_EXTENSIONS} from '../../../src/lib/classroom-extension-policy';

describe('classroom extension policy', () => {
    let vm;
    let load;
    beforeEach(() => {
        load = jest.fn(() => Promise.resolve());
        vm = {
            extensionManager: {
                loadExtensionURL: load,
                isBuiltinExtension: id => ['pen', 'music', ...HARDWARE_EXTENSIONS].includes(id),
                securityManager: {}
            },
            runtime: {cloudOptions: {}},
            setCloudProvider: jest.fn()
        };
        configureExtensionPolicy(vm);
    });
    test('retains course-friendly builtins', async () => {
        await vm.extensionManager.loadExtensionURL('pen');
        expect(load).toHaveBeenCalledWith('pen');
        expect(isExtensionAvailable({extensionId: 'music'})).toBe(true);
    });
    test.each([...HARDWARE_EXTENSIONS])('disables hardware %s without loading its implementation', async id => {
        expect(isExtensionAvailable({extensionId: id})).toBe(false);
        await expect(vm.extensionManager.loadExtensionURL(id)).rejects.toThrow('not available');
        expect(load).not.toHaveBeenCalled();
    });
    test.each(['https://extensions.turbowarp.org/test.js', 'data:text/javascript,alert(1)', 'unknown'])('rejects external or unknown extension %s', async url => {
        await expect(vm.extensionManager.loadExtensionURL(url)).rejects.toThrow('not available');
        expect(vm.extensionManager.securityManager.canLoadExtensionFromProject(url)).toBe(false);
        expect(load).not.toHaveBeenCalled();
    });
    test('hides custom extension and gallery entries', () => {
        expect(isExtensionAvailable({extensionId: 'custom_extension'})).toBe(false);
        expect(isExtensionAvailable({extensionId: 'faceSensing', extensionURL: 'https://example.com/ext.js'})).toBe(false);
    });
    test('disables cloud networking and installs only once', () => {
        const wrappedLoad = vm.extensionManager.loadExtensionURL;
        configureExtensionPolicy(vm);
        expect(vm.extensionManager.loadExtensionURL).toBe(wrappedLoad);
        expect(vm.setCloudProvider).toHaveBeenCalledWith(null);
        expect(vm.runtime.cloudOptions.limit).toBe(0);
    });
});
