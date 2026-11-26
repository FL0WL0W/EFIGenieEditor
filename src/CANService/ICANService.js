import CommunicationService_ISOTP from "../CommunicationService/CommunicationService_ISOTP.js"

/** Normalize a firmware-style CANIdentifier_t, or a numeric identifier on bus 0. */
export function CANIdentifier(identifier) {
    const value = typeof identifier === `number` ? { CANIdentifier: identifier } : identifier
    const id = value?.CANIdentifier
    const bus = value?.CANBusNumber ?? 0
    const extended = value?.Extended ?? (id > 0x7ff)
    if(!Number.isInteger(id) || id < 0 || id > 0x1fffffff ||
        !Number.isInteger(bus) || bus < 0 || bus > 7 ||
        typeof extended !== `boolean` || (!extended && id > 0x7ff))
        throw new RangeError(`Invalid CAN identifier or bus number`)
    return Object.freeze({ CANIdentifier: id, CANBusNumber: bus, Extended: extended })
}

export function CANBytes(data) {
    let bytes
    if(data instanceof ArrayBuffer) bytes = new Uint8Array(data)
    else if(ArrayBuffer.isView(data)) bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    else throw new TypeError(`CAN data must be an ArrayBuffer or ArrayBuffer view`)
    if(bytes.byteLength > 8) throw new RangeError(`Classic CAN frames hold at most 8 bytes`)
    return bytes
}

const key = id => `${id.CANBusNumber}:${id.CANIdentifier}:${id.Extended}`

/**
 * Classic CAN service, following EmbeddedIOServices.ICANService.
 * Identifiers are numbers (bus 0) or { CANIdentifier, CANBusNumber, Extended }.
 * Extended defaults to true for IDs above 0x7ff; set it for low extended IDs.
 * Data is a Uint8Array (its byteLength replaces the firmware length argument).
 *
 * RegisterReceiveCallBack(identifier, callback): callback(send, data).
 * RegisterReceiveCallBack(identifier, mask, callback): callback(send, identifier, data).
 * As in firmware, CAN callbacks receive a send(identifier, data) function.
 * Masks contain CANIdentifier and CANBusNumber bit masks; omitted bus mask = 7.
 * UnRegisterReceiveCallBack accepts a registration ID, an identifier object for
 * all exact matches, or an identifier and mask for all matching masked entries.
 *
 * Implement async Connect(), Close(), Send(identifier, data, completion), Ready().
 * Send copies its bytes before awaiting and resolves when the implementation has
 * released its transmit resource, then invokes the optional completion callback.
 * GetISOTPService returns a cached ICommunicationService for a listen/transmit pair.
 */
export default class ICANService {
    #callbacks = new Map()
    #nextId = 0
    #isotp = new Map()
    lastError = undefined

    RegisterReceiveCallBack(identifier, mask, callback) {
        const id = CANIdentifier(identifier)
        if(typeof mask === `function`) { callback = mask; mask = undefined }
        if(typeof callback !== `function`) throw new TypeError(`CAN callback must be a function`)
        if(mask !== undefined) mask = this.#mask(mask)
        const registration = this.#nextId++
        this.#callbacks.set(registration, { id, mask, callback })
        return registration
    }

    #mask(mask) {
        const id = typeof mask === `number` ? mask : mask?.CANIdentifier
        const bus = typeof mask === `number` ? 7 : mask?.CANBusNumber ?? 7
        if(!Number.isInteger(id) || id < 0 || id > 0x1fffffff ||
            !Number.isInteger(bus) || bus < 0 || bus > 7)
            throw new RangeError(`Invalid CAN identifier mask`)
        return { CANIdentifier: id, CANBusNumber: bus }
    }

    UnRegisterReceiveCallBack(identifier, mask) {
        if(typeof identifier === `number` && mask === undefined) {
            this.#callbacks.delete(identifier)
            return
        }
        const id = CANIdentifier(identifier)
        const filter = mask === undefined ? undefined : this.#mask(mask)
        for(const [registration, entry] of this.#callbacks) {
            if(key(id) === key(entry.id) &&
                (filter === undefined ? entry.mask === undefined :
                    entry.mask?.CANIdentifier === filter.CANIdentifier &&
                    entry.mask?.CANBusNumber === filter.CANBusNumber))
                this.#callbacks.delete(registration)
        }
    }

    Receive(identifier, data) {
        const id = CANIdentifier(identifier)
        const bytes = CANBytes(data)
        const send = (identifier, data) => this.Send(identifier, data)
        for(const [registration, entry] of [...this.#callbacks]) {
            if(!this.#callbacks.has(registration)) continue
            if(entry.mask) {
                if((id.CANIdentifier & entry.mask.CANIdentifier) === (entry.id.CANIdentifier & entry.mask.CANIdentifier) &&
                    (id.CANBusNumber & entry.mask.CANBusNumber) === (entry.id.CANBusNumber & entry.mask.CANBusNumber))
                    entry.callback(send, id, bytes)
            } else if(key(id) === key(entry.id)) entry.callback(send, bytes)
        }
    }

    GetISOTPService(listenId, transmitId, options = {}) {
        const listen = CANIdentifier(listenId)
        const transmit = CANIdentifier(transmitId)
        const pair = `${key(listen)}/${key(transmit)}`
        if(!this.#isotp.has(pair))
            this.#isotp.set(pair, new CommunicationService_ISOTP(this, listen, transmit, options))
        return this.#isotp.get(pair)
    }

    async _CloseISOTPServices() {
        await Promise.all([...this.#isotp.values()].map(service => service.Close()))
    }

    async Connect() { throw new Error(`Connect must be implemented`) }
    async Close() { throw new Error(`Close must be implemented`) }
    async Send(identifier, data, completion) { throw new Error(`Send must be implemented`) }
    Ready() { return true }
}
