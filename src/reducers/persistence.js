const UPDATE = 'scratch-gui/persistence/UPDATE';
export const initialState = {status: 'Sign in to save', generation: 0, committed: 0, saving: null};
export const updatePersistence = value => ({type: UPDATE, value});
export default (state = initialState, action) => (action.type === UPDATE ? {...state, ...action.value} : state);
