import ICommunicationService from "./ICommunicationService.js"

export default class CommunicationService_Serial extends ICommunicationService {
    #port
    #reader
    #reading
    #connecting
    #closing = false
    #writes = Promise.resolve()

    constructor(options = { baudRate: 115200 }, filters = []) {
        super()
        this.options = options
        this.filters = filters
    }

    Ready() {
        return !this.#closing && !!this.#reader && !!this.#port?.writable
    }

    async Connect() {
        if(this.#closing) throw new Error(`Serial port is closing`)
        if(this.#connecting) return this.#connecting
        if(this.Ready()) return
        const connection = this.#open()
        this.#connecting = connection
        try {
            await connection
        } finally {
            if(this.#connecting === connection) this.#connecting = undefined
        }
    }

    async #open() {
        if(!globalThis.navigator?.serial)
            throw new Error(`Web Serial is not supported in this browser`)
        // Release a disconnected or failed session before opening another one.
        if(this.#port) await this.#releasePort()
        const serial = navigator.serial
        const ports = (await serial.getPorts()).filter(port => {
            const info = port.getInfo()
            return this.filters.length === 0 || this.filters.some(filter =>
                Object.entries(filter).every(([key, value]) => info[key] === value))
        })
        this.#port = ports.length === 1 ? ports[0] : await serial.requestPort({ filters: this.filters })
        try {
            await this.#port.open(this.options)
            this.#reader = this.#port.readable.getReader()
        } catch(error) {
            // Opening may have succeeded even if acquiring the reader failed.
            if(this.#port.readable || this.#port.writable) await this.#port.close()
            this.#port = undefined
            throw error
        }
        this.lastError = undefined
        this._ClearReceiveBuffer()
        this.#reading = this.#read()
    }

    async #read() {
        const reader = this.#reader
        try {
            while(!this.#closing) {
                const { value, done } = await reader.read()
                if(done) break
                if(value) this._ReceiveData(value)
            }
        } catch(error) {
            if(!this.#closing) this.lastError = error
        } finally {
            reader.releaseLock()
            if(this.#reader === reader) this.#reader = undefined
            this._ClearReceiveBuffer()
        }
    }

    async Send(data) {
        const bytes = this._Bytes(data).slice()
        await this.Connect()
        if(!this.Ready()) throw new Error(`Serial port is not open`)
        const port = this.#port
        const write = this.#writes.then(async () => {
            const writer = port.writable.getWriter()
            try {
                await writer.write(bytes)
            } finally {
                writer.releaseLock()
            }
        })
        this.#writes = write.catch(() => {})
        return write
    }

    async #releasePort() {
        if(this.#reader) await this.#reader.cancel()
        await this.#reading
        await this.#writes
        if(this.#port) await this.#port.close()
        this.#port = undefined
        this._ClearReceiveBuffer()
    }

    async Close() {
        this.#closing = true
        try {
            // A pending permission prompt/open must settle before cleanup.
            await this.#connecting?.catch(() => {})
            await this.#releasePort()
        } finally {
            this.#closing = false
        }
    }
}
