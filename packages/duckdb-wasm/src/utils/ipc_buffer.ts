import * as arrow from 'apache-arrow';

export class IPCBuffer extends arrow.AsyncByteQueue<Uint8Array> {
    /// Flush the buffer
    flush(): Uint8Array {
        const buffer = super.toUint8Array(true);
        this._values.length = 0;
        return buffer;
    }
}
