/**
 * Byte-oriented communication contract matching EmbeddedIOServices.
 *
 * Receive callbacks are synchronous: (service, data: Uint8Array) => bytesConsumed.
 * Return 0 when a message is incomplete or belongs to another handler. After a
 * callback consumes bytes, dispatch restarts with the first registered callback.
 * The service argument is this ICommunicationService instance. Handlers may
 * inspect service.Ready() and reply using service.Send(data), whose returned
 * Promise must be handled separately from the synchronous bytesConsumed result.
 * Data passed to callbacks is borrowed; copy it before retaining or modifying it.
 *
 * Transports implement async Connect(), Close(), Send(data), and Ready(): boolean.
 * Send accepts an ArrayBuffer or any ArrayBuffer view and copies it before waiting.
 * Background transport failures are available as lastError.
 */
export default class ICommunicationService {
    #receiveCallbacks = new Map()
    #nextId = 0
    #pending = new Uint8Array()
    lastError = undefined

    RegisterReceiveCallBack(callback) {
        if(typeof callback !== `function`)
            throw new TypeError(`Receive callback must be a function`)
        const id = this.#nextId++
        this.#receiveCallbacks.set(id, callback)
        return id
    }

    UnRegisterReceiveCallBack(id) {
        this.#receiveCallbacks.delete(id)
    }

    /** Dispatch bytes and return the number consumed, without retaining leftovers. */
    Receive(data) {
        const bytes = this._Bytes(data)
        const callbacks = [...this.#receiveCallbacks.entries()]
        let handled = 0
        let index = 0
        while(handled < bytes.byteLength && index < callbacks.length) {
            const [id, callback] = callbacks[index++]
            if(!this.#receiveCallbacks.has(id)) continue
            const remaining = bytes.subarray(handled)
            const consumed = callback(this, remaining)
            if(!Number.isInteger(consumed) || consumed < 0 || consumed > remaining.byteLength)
                throw new RangeError(`Receive callback must return a valid number of bytes consumed`)
            if(consumed > 0) {
                handled += consumed
                index = 0
            }
        }
        return handled
    }

    /** Transport helper: preserve incomplete messages between incoming chunks. */
    _ReceiveData(data) {
        const bytes = this._Bytes(data)
        const pending = new Uint8Array(this.#pending.byteLength + bytes.byteLength)
        pending.set(this.#pending)
        pending.set(bytes, this.#pending.byteLength)
        this.#pending = pending
        this.#pending = pending.slice(this.Receive(pending))
    }

    _ClearReceiveBuffer() {
        this.#pending = new Uint8Array()
    }

    _Bytes(data) {
        if(data instanceof ArrayBuffer) return new Uint8Array(data)
        if(ArrayBuffer.isView(data))
            return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
        throw new TypeError(`Communication data must be an ArrayBuffer or ArrayBuffer view`)
    }

    async Connect() { throw new Error(`Connect must be implemented`) }
    async Close() { throw new Error(`Close must be implemented`) }
    async Send(data) { throw new Error(`Send must be implemented`) }
    Ready() { return true }
}
