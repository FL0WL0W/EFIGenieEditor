import ICommunicationService from "./ICommunicationService.js"

export default class CommunicationService_WebSocket extends ICommunicationService {
    #socket
    #connecting

    /** Accepts a ws(s) URL or a path relative to the current page's host. */
    constructor(uri = `EFIGenieCommunication`, timeout = 1000) {
        super()
        this.uri = uri
        this.timeout = timeout
    }

    Ready() {
        return this.#socket?.readyState === 1
    }

    async Connect() {
        if(this.#connecting) return this.#connecting
        if(this.Ready()) return
        const url = new URL(this.uri, globalThis.location?.href)
        if(url.protocol === `http:`) url.protocol = `ws:`
        if(url.protocol === `https:`) url.protocol = `wss:`
        const socket = new WebSocket(url.href)
        socket.binaryType = `arraybuffer`
        this.#socket = socket
        this.lastError = undefined
        this._ClearReceiveBuffer()
        const connection = new Promise((resolve, reject) => {
            let opened = false
            const fail = error => {
                this.lastError = error
                clearTimeout(timer)
                reject(error)
            }
            const timer = setTimeout(() => {
                fail(new Error(`WebSocket connection timed out`))
                socket.close()
            }, this.timeout)
            socket.onopen = () => {
                opened = true
                clearTimeout(timer)
                resolve()
            }
            socket.onerror = () => fail(new Error(`WebSocket connection failed`))
            socket.onclose = () => {
                if(this.#socket === socket) this._ClearReceiveBuffer()
                if(!opened) fail(new Error(`WebSocket closed before connecting`))
            }
            socket.onmessage = event => {
                if(this.#socket !== socket) return
                try {
                    this._ReceiveData(event.data)
                } catch(error) {
                    this.lastError = error
                    socket.close()
                }
            }
        })
        this.#connecting = connection
        try {
            await connection
        } catch(error) {
            socket.close()
            throw error
        } finally {
            if(this.#connecting === connection) this.#connecting = undefined
        }
    }

    async Send(data) {
        const bytes = this._Bytes(data).slice()
        await this.Connect()
        if(!this.Ready()) throw new Error(`WebSocket is not open`)
        this.#socket.send(bytes)
    }

    async Close() {
        const socket = this.#socket
        if(socket && socket.readyState !== 3) {
            await new Promise(resolve => {
                socket.addEventListener(`close`, resolve, { once: true })
                socket.close()
            })
        }
        if(this.#socket === socket) this.#socket = undefined
        this._ClearReceiveBuffer()
    }
}
