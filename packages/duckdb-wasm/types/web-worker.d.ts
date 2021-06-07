declare module 'web-worker' {
    type ConstructorOf<C> = { new (...args: any[]): C };
    const _default: ConstructorOf<Worker>;
    export default _default;
}
