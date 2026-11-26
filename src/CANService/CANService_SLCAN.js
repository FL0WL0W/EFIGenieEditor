import ICANService, { CANIdentifier, CANBytes } from "./ICANService.js"
import ICommunicationService from "../CommunicationService/ICommunicationService.js"

const bitRates = [10000, 20000, 50000, 100000, 125000, 250000, 500000, 800000, 1000000]
const hex = (value, width) => value.toString(16).toUpperCase().padStart(width, `0`)

/**
 * LAWICEL SLCAN over an injected ICommunicationService (serial or WebSocket).
 * Connect opens the transport, closes the CAN channel, sets its bitrate, then
 * opens it with C/Sn/O commands. Commands are serialized and await CR or z/Z ACKs;
 * BELL rejects the pending command. A timeout faults the session until Close().
 *
 * This instance owns one SLCAN channel, mapped to busNumber (default 0). Received
 * t/T data frames may include timestamps; RTR/status/version records are ignored.
 * Send resolves at adapter acknowledgement, which does not prove on-bus delivery.
 * Close detaches its byte callback, closes ISO-TP endpoints, and closes transport.
 * Protocol: https://www.canusb.com/docs/canusb_manual.pdf
 *
 * const can = new CANService_SLCAN(serialService, { bitRate: 500000 })
 * const communicationService = can.GetISOTPService(0x7e8, 0x7e0)
 * await communication.connect(communicationService)
 */
export default class CANService_SLCAN extends ICANService {
    #communication
    #callbackId
    #connecting
    #closing
    #ready = false
    #fault
    #operations = Promise.resolve()
    #waiter
    #line = ``
    #discardLine = false
    #encoder = new TextEncoder()

    constructor(communicationService, { bitRate = 500000, busNumber = 0, timeout = 1000 } = {}) {
        super()
        if(!(communicationService instanceof ICommunicationService))
            throw new TypeError(`SLCAN requires an ICommunicationService`)
        if(!bitRates.includes(bitRate)) throw new RangeError(`Unsupported SLCAN bit rate`)
        CANIdentifier({ CANIdentifier: 0, CANBusNumber: busNumber })
        if(!Number.isFinite(timeout) || timeout <= 0) throw new RangeError(`Invalid SLCAN timeout`)
        this.#communication = communicationService
        this.bitRate = bitRate
        this.busNumber = busNumber
        this.timeout = timeout
    }

    Ready() {
        return this.#ready && !this.#closing && !this.#fault && this.#communication.Ready()
    }

    async Connect() {
        if(this.#closing) throw new Error(`SLCAN service is closing`)
        if(this.#connecting) return this.#connecting
        if(this.Ready()) return
        if(this.#fault) throw new Error(`Close the faulted SLCAN session before reconnecting`, { cause: this.#fault })
        const connect = this.#open()
        this.#connecting = connect
        try { await connect }
        finally { this.#connecting = undefined }
    }

    async #open() {
        this.#ready = false
        this.lastError = undefined
        this.#line = ``
        this.#discardLine = false
        if(this.#callbackId === undefined)
            this.#callbackId = this.#communication.RegisterReceiveCallBack((service, data) => this.#receive(data))
        try {
            await this.#communication.Connect()
            // Already-closed adapters may reject C; the subsequent S command
            // still verifies that the channel is closed before configuring it.
            try { await this.#queue(`C`) }
            catch(error) { if(error.code !== `SLCAN_REJECTED`) throw error }
            await this.#queue(`S${bitRates.indexOf(this.bitRate)}`)
            await this.#queue(`O`)
            this.#ready = true
            this.lastError = undefined
        } catch(error) {
            this.lastError = error
            this.#fault = error
            throw error
        }
    }

    #queue(command) {
        const operation = this.#operations.then(() => this.#request(command))
        this.#operations = operation.catch(() => {})
        return operation
    }

    async #request(command) {
        if(this.#fault) throw this.#fault
        let timer
        const reply = new Promise((resolve, reject) => {
            this.#waiter = { resolve, reject }
            timer = setTimeout(() => {
                const error = new Error(`SLCAN command timed out: ${command}`)
                this.#fault = error
                this.#ready = false
                reject(error)
            }, this.timeout)
        })
        try {
            // Register the ACK waiter before sending; replies may arrive during Send.
            await Promise.all([this.#communication.Send(this.#encoder.encode(`${command}\r`)), reply])
        } catch(error) {
            this.lastError = error
            if(error.code !== `SLCAN_REJECTED`) {
                this.#fault = error
                this.#ready = false
            }
            throw error
        } finally {
            clearTimeout(timer)
            this.#waiter = undefined
        }
    }

    #receive(data) {
        for(const byte of data) {
            if(byte === 7) {
                this.#line = ``
                this.#discardLine = false
                const error = new Error(`SLCAN adapter rejected command`)
                error.code = `SLCAN_REJECTED`
                this.lastError = error
                this.#waiter?.reject(error)
            } else if(byte === 13) {
                const line = this.#line
                this.#line = ``
                if(!this.#discardLine) {
                    try { this.#record(line) }
                    catch(error) { this.lastError = error }
                }
                this.#discardLine = false
            } else if(byte !== 10 && !this.#discardLine) {
                if(byte < 32 || byte > 126 || this.#line.length >= 64) {
                    this.#line = ``
                    this.#discardLine = true
                } else this.#line += String.fromCharCode(byte)
            }
        }
        return data.byteLength
    }

    #record(line) {
        if(line === `` || line === `z` || line === `Z`) {
            this.#waiter?.resolve()
            return
        }
        if(line[0] !== `t` && line[0] !== `T`) return
        const extended = line[0] === `T`
        const digits = extended ? 8 : 3
        if(!/^[a-fA-F0-9]+$/.test(line.slice(1)) || line.length < digits + 2) return
        const identifier = parseInt(line.slice(1, digits + 1), 16)
        const length = parseInt(line[digits + 1], 16)
        const end = digits + 2 + length * 2
        if(length > 8 || (line.length !== end && line.length !== end + 4)) return
        if(identifier > (extended ? 0x1fffffff : 0x7ff)) return
        const bytes = new Uint8Array(length)
        for(let i = 0; i < length; i++) bytes[i] = parseInt(line.slice(digits + 2 + i * 2, digits + 4 + i * 2), 16)
        this.Receive({ CANIdentifier: identifier, CANBusNumber: this.busNumber, Extended: extended }, bytes)
    }

    async Send(identifier, data, completion) {
        const id = CANIdentifier(identifier)
        const bytes = CANBytes(data).slice()
        if(id.CANBusNumber !== this.busNumber) throw new RangeError(`CAN identifier is on another SLCAN bus`)
        if(completion !== undefined && typeof completion !== `function`)
            throw new TypeError(`Completion must be a function`)
        const command = `${id.Extended ? `T` : `t`}${hex(id.CANIdentifier, id.Extended ? 8 : 3)}${bytes.length}` +
            [...bytes].map(byte => hex(byte, 2)).join(``)
        await this.Connect()
        if(this.#closing) throw new Error(`SLCAN service is closing`)
        await this.#queue(command)
        completion?.()
    }

    async Close() {
        if(this.#closing) return this.#closing
        const close = this.#close()
        this.#closing = close
        try { await close }
        finally { this.#closing = undefined }
    }

    async #close() {
        try {
            await this.#connecting?.catch(() => {})
            await this._CloseISOTPServices()
            await this.#operations
            if(this.#ready && !this.#fault && this.#communication.Ready()) await this.#queue(`C`)
        } finally {
            this.#ready = false
            if(this.#callbackId !== undefined) this.#communication.UnRegisterReceiveCallBack(this.#callbackId)
            this.#callbackId = undefined
            this.#line = ``
            this.#discardLine = false
            await this.#communication.Close()
            this.#fault = undefined
        }
    }
}
