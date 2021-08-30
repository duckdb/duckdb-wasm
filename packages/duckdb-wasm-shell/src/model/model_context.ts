export type Action<T, P> = {
    readonly type: T;
    readonly data: P;
};

export type Dispatch<ActionVariant> = (action: ActionVariant) => void;

export type ProviderProps = { children: React.ReactElement };
