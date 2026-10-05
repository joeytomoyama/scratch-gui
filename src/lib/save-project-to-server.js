// Host-replaceable transport boundary: no Scratch cookies, URLs, or thumbnails.
export default (adapter, projectId, snapshot, files) => adapter.save(projectId, snapshot, files);
