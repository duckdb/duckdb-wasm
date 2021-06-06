import { compose, createStore as createReduxStore } from 'redux';
import * as model from './';

function actionSanitizer(mutation: model.StateMutationVariant) {
    return mutation;
}

function stateSanitizer(state: model.AppStateMutation) {
    return {
        ...state,
    };
}

/* tslint:disable */
const windowIfDefined = typeof window === 'undefined' ? null : (window as any);
let composeEnhancers = compose;
if (windowIfDefined && typeof windowIfDefined.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ === 'function') {
    composeEnhancers =
        windowIfDefined.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({
            stateSanitizer: stateSanitizer,
            actionSanitizer: actionSanitizer,
        }) || compose;
}
const enhancer = composeEnhancers();
/* tslint:enable */

export default function createStore(): model.AppReduxStore {
    const store = createReduxStore<model.AppState, model.StateMutationVariant, any, any>(
        (state: model.AppState | undefined, variant: model.StateMutationVariant) => {
            if (!state) return model.createDefaultState();
            return model.AppStateMutation.reduce(state, variant);
        },
        enhancer,
    );

    // Return the store
    return store;
}
