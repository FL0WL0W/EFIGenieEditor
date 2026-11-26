const types = [
    [0], [1, 'getUint8'], [2, 'getUint16'], [4, 'getUint32'], [8, 'getBigUint64'],
    [1, 'getInt8'], [2, 'getInt16'], [4, 'getInt32'], [8, 'getBigInt64'],
    [4, 'getFloat32'], [8, 'getFloat64'], [1, 'getUint8']
]

export const typeLength = type => types[type]?.[0]
export function parseVariable(buffer, endian = 'little') {
    const view = new DataView(buffer)
    const type = view.getUint8(0)
    if(type === 0) return undefined
    const getter = types[type]?.[1]
    if(!getter) throw new Error(`Unsupported variable type: ${type}`)
    const value = view[getter](1, endian !== 'big')
    return type === 11 ? value === 1 : value
}

// Match the Logged Variables GUI: missing values default to 60 Hz; Max is -1.
export function refreshRateInterval(refreshRate = 60) {
    if(refreshRate === -1) return 0
    if(!Number.isFinite(refreshRate) || refreshRate <= 0)
        throw new RangeError(`Invalid logged variable refresh rate: ${refreshRate}`)
    return 1 / refreshRate
}

export function subscribeCommand(id, interval, endian) {
    const bytes = new Uint8Array(9)
    const view = new DataView(bytes.buffer)
    bytes[0] = 100 // d: subscribe, interval in seconds
    view.setFloat32(1, interval, endian !== 'big')
    view.setUint32(5, id, endian !== 'big')
    return bytes
}

export function clearSubscriptionsCommand(endian) {
    const bytes = new Uint8Array(5)
    bytes[0] = 101 // e + reserved ID: clear this service's subscriptions and ACK
    new DataView(bytes.buffer).setUint32(1, 0xffffffff, endian !== 'big')
    return bytes
}

/** Decode d ACK / e ACK and d STX + tick + typed records + d ETX.
 * Markers are recognized only between records, never inside binary values.
 */
export class SubscriptionDecoder {
    #pending = new Uint8Array()
    #frame
    #frameSize = 0
    constructor(endian, onSample, onAck) {
        this.endian = endian
        this.onSample = onSample
        this.onAck = onAck
    }
    receive(bytes) {
        const pending = new Uint8Array(this.#pending.length + bytes.length)
        pending.set(this.#pending)
        pending.set(bytes, this.#pending.length)
        const view = new DataView(pending.buffer)
        let offset = 0
        while(offset < pending.length) {
            const remaining = pending.length - offset
            if(!this.#frame) {
                // Current firmware sends a bare NACK when its command queue is full.
                if(pending[offset] === 21) {
                    offset++
                    this.onAck(undefined, 21)
                    continue
                }
                if(remaining < 2) break
                const prefix = pending[offset], kind = pending[offset + 1]
                if((prefix === 100 || prefix === 101) && (kind === 6 || kind === 21)) {
                    offset += 2
                    this.onAck(prefix, kind)
                    continue
                }
                if(prefix !== 100 || kind !== 2) throw new Error(`Unexpected subscription response: ${prefix}, ${kind}`)
                if(remaining < 6) break
                this.#frame = { tick: view.getUint32(offset + 2, this.endian !== 'big'), records: new Map() }
                this.#frameSize = 6
                offset += 6
            } else {
                if(remaining < 2) break
                if(pending[offset] === 100 && pending[offset + 1] === 3) {
                    const { tick, records } = this.#frame
                    this.#frame = undefined
                    offset += 2
                    this.onSample(tick, records)
                    continue
                }
                if(remaining < 5) break
                const id = view.getUint32(offset, this.endian !== 'big')
                const length = typeLength(pending[offset + 4])
                if(length === undefined) throw new Error(`Unsupported subscription variable type: ${pending[offset + 4]}`)
                if(remaining < 5 + length) break
                if(this.#frame.records.has(id)) throw new Error(`Repeated subscription variable ID: ${id}`)
                this.#frameSize += 5 + length
                if(this.#frameSize + 2 > 4095) throw new Error(`Subscription frame exceeds ISO-TP payload limit`)
                this.#frame.records.set(id, pending.slice(offset + 4, offset + 5 + length))
                offset += 5 + length
            }
        }
        this.#pending = pending.slice(offset)
    }
}
