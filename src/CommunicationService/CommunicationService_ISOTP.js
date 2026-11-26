import ICommunicationService from "./ICommunicationService.js"

/**
 * Firmware-style normal-addressing ISO-TP over classic CAN (1..4095 bytes).
 * Construct via ICANService.GetISOTPService(listenId, transmitId, { timeout: 250 }).
 * Closing an endpoint releases its subscription, not the shared CAN transport.
 * Receive flow control advertises unlimited block size and zero separation time.
 * Transmit obeys the peer's block size and STmin; sub-ms STmin rounds up to 1ms.
 * CAN FD and ISO-TP extended/mixed addressing are outside this contract.
 */
export default class CommunicationService_ISOTP extends ICommunicationService {
    #can
    #callbackId
    #rx
    #rxTimer
    #tx
    #connecting
    #sending = false

    get diagnostics() {
        return { listenId: this.ListenId, transmitId: this.TransmitId,
            lastError: this.lastError,
            receive: this.#rx ? { received: this.#rx.offset, expected: this.#rx.bytes.length,
                nextSequence: this.#rx.sequence } : undefined,
            can: this.#can.diagnostics }
    }

    constructor(canService, listenId, transmitId, { timeout = 250 } = {}) {
        super()
        if(!Number.isFinite(timeout) || timeout <= 0) throw new RangeError(`Invalid ISO-TP timeout`)
        this.#can = canService
        this.ListenId = listenId
        this.TransmitId = transmitId
        this.timeout = timeout
        this.#subscribe()
    }

    #subscribe() {
        if(this.#callbackId === undefined)
            this.#callbackId = this.#can.RegisterReceiveCallBack(this.ListenId, (send, data) => this.#frame(data))
    }

    async Connect() {
        if(this.#connecting) return this.#connecting
        const connect = (async () => {
            // Subscribe before opening, since incoming frames can arrive immediately.
            this.#subscribe()
            try {
                await this.#can.Connect()
            } catch(error) {
                this.#can.UnRegisterReceiveCallBack(this.#callbackId)
                this.#callbackId = undefined
                throw error
            }
        })()
        this.#connecting = connect
        try { await connect }
        finally { this.#connecting = undefined }
    }

    Ready() {
        return this.#callbackId !== undefined && this.#can.Ready() && !this.#sending
    }

    #clearReceive() {
        clearTimeout(this.#rxTimer)
        this.#rx = undefined
    }

    #receiveTimer() {
        clearTimeout(this.#rxTimer)
        this.#rxTimer = setTimeout(() => {
            this.lastError = new Error(`ISO-TP consecutive frame timeout`)
            this.#clearReceive()
        }, this.timeout)
    }

    #frame(data) {
        if(!data.length) return
        const type = data[0] >> 4
        if(type === 3) {
            if(this.#tx && data.length >= 3) {
                this.#tx.flow.push(data.slice(0, 3))
                this.#tx.wake?.()
            }
        } else if(type === 0) {
            const length = data[0] & 15
            if(length < 1 || length > 7 || data.length < length + 1) return
            this.#clearReceive()
            this._ReceiveData(data.subarray(1, length + 1))
        } else if(type === 1) {
            if(data.length !== 8) return
            const length = ((data[0] & 15) << 8) | data[1]
            if(length <= 7) return
            this.#clearReceive()
            const rx = { bytes: new Uint8Array(length), offset: 6, sequence: 1 }
            rx.bytes.set(data.subarray(2))
            this.#rx = rx
            this.#receiveTimer()
            this.#can.Send(this.TransmitId, new Uint8Array([0x30, 0, 0])).catch(error => {
                this.lastError = error
                if(this.#rx === rx) this.#clearReceive()
            })
        } else if(type === 2 && this.#rx) {
            const rx = this.#rx
            const length = Math.min(7, rx.bytes.length - rx.offset)
            if((data[0] & 15) !== rx.sequence || data.length < length + 1) {
                this.lastError = new Error(`Invalid ISO-TP consecutive frame`)
                this.#clearReceive()
                return
            }
            rx.bytes.set(data.subarray(1, length + 1), rx.offset)
            rx.offset += length
            rx.sequence = (rx.sequence + 1) & 15
            if(rx.offset === rx.bytes.length) {
                this.#clearReceive()
                this._ReceiveData(rx.bytes)
            } else this.#receiveTimer()
        }
    }

    async #flowControl(tx) {
        let waits = 0
        while(true) {
            if(!tx.flow.length) await this.#wait(tx, this.timeout, true)
            if(tx.abort.signal.aborted) throw new Error(`ISO-TP transfer closed`)
            const frame = tx.flow.shift()
            const status = frame[0] & 15
            if(status === 1 && ++waits <= 8) continue
            if(status !== 0) throw new Error(`ISO-TP flow control rejected transfer`)
            const stmin = frame[2]
            if(stmin > 0x7f && (stmin < 0xf1 || stmin > 0xf9))
                throw new Error(`Invalid ISO-TP separation time`)
            return { block: frame[1], delay: stmin <= 0x7f ? stmin : 1 }
        }
    }

    #wait(tx, duration, flow = false) {
        return new Promise((resolve, reject) => {
            const finish = error => {
                clearTimeout(timer)
                tx.wake = undefined
                tx.abort.signal.removeEventListener(`abort`, abort)
                if(error) reject(error)
                else resolve()
            }
            const abort = () => finish(new Error(`ISO-TP transfer closed`))
            const timer = setTimeout(() => finish(flow ? new Error(`ISO-TP flow control timeout`) : undefined), duration)
            if(flow) tx.wake = () => finish()
            tx.abort.signal.addEventListener(`abort`, abort, { once: true })
            if(tx.abort.signal.aborted) abort()
        })
    }

    async Send(data) {
        const bytes = this._Bytes(data).slice()
        if(bytes.length < 1 || bytes.length > 4095) throw new RangeError(`ISO-TP payload must be 1..4095 bytes`)
        await this.Connect()
        if(this.#sending) throw new Error(`ISO-TP transmitter is busy`)
        this.#sending = true
        this.lastError = undefined
        const tx = { flow: [], abort: new AbortController() }
        this.#tx = tx
        try {
            if(bytes.length <= 7) {
                await this.#can.Send(this.TransmitId, new Uint8Array([bytes.length, ...bytes]))
                return
            }
            await this.#can.Send(this.TransmitId, new Uint8Array([
                0x10 | (bytes.length >> 8), bytes.length & 255, ...bytes.subarray(0, 6)
            ]))
            let offset = 6
            let sequence = 1
            let sentConsecutive = false
            while(offset < bytes.length) {
                const { block, delay } = await this.#flowControl(tx)
                for(let count = 0; offset < bytes.length && (block === 0 || count < block); count++) {
                    if(sentConsecutive && delay) await this.#wait(tx, delay)
                    if(tx.abort.signal.aborted) throw new Error(`ISO-TP transfer closed`)
                    const chunk = bytes.subarray(offset, offset + 7)
                    await this.#can.Send(this.TransmitId, new Uint8Array([0x20 | sequence, ...chunk]))
                    offset += chunk.length
                    sequence = (sequence + 1) & 15
                    sentConsecutive = true
                }
            }
        } catch(error) {
            this.lastError = error
            throw error
        } finally {
            if(this.#tx === tx) this.#tx = undefined
            this.#sending = false
        }
    }

    async Close() {
        await this.#connecting?.catch(() => {})
        this.#tx?.abort.abort()
        if(this.#callbackId !== undefined) this.#can.UnRegisterReceiveCallBack(this.#callbackId)
        this.#callbackId = undefined
        this.#clearReceive()
        this._ClearReceiveBuffer()
    }
}
