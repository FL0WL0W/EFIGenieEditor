import pako from "pako"
import VariableRegistry from "./VariableRegistry"

async function waitForFunctionToReturnFalse(f, timeout = 1000) {
    let trys = 0
    while(f() && trys++ < Math.max(1, timeout / Math.max(timeout / 10, 10)))
        await new Promise(r => setTimeout(r, Math.max(timeout / 10, 10)))
    if(f())
        return false
    return true
}

export class Serial {
    #options
    #filters
    #serialPort
    #cummulativeValue = new ArrayBuffer()
    #commandLock

    async #readWithTimeout(stream, timeout) {
        if(!await waitForFunctionToReturnFalse(function() { return stream.locked }))
            return { value: undefined, done: false }
        
        const readStream = new TransformStream()
        stream.pipeThrough(readStream, { preventClose: true, preventCancel: true })

        const reader = readStream.readable.getReader();
        let cancelResult
        let start = Date.now()
        const timer = setTimeout(() => {
            cancelResult = { value: undefined, done: false }
            reader.cancel()
        }, timeout)
        const result = await reader.read()
        clearTimeout(timer)
        reader.cancel()
        return cancelResult ?? result
    }
    
    get options() { return this.#options }
    set options(options) { 
        this.#options = options
        this.#serialPort = undefined
    }
    get filters() { return this.#filters }
    set filters(filters) { 
        this.#filters = filters
        this.#serialPort = undefined
    }
    constructor(options, filters) {
        this.options = options ?? { baudRate: 115200 }
        this.filters = filters
    }

    async #connect() {
        if(!("serial" in navigator))
            throw `WebSerial not supported. please open in a supported browser`

        if(this.#serialPort === undefined) {
            let ports = await navigator.serial.getPorts({ filter: this.filters })
            if(ports.length !== 1)
                this.#serialPort = await navigator.serial.requestPort({ filter: this.filters })
            else
                this.#serialPort = ports[0]
        }

        if(this.#serialPort.readable && this.#serialPort.writable)
            return

        await this.#serialPort.open(this.options)
    }

    async flush() {
        this.#cummulativeValue = new ArrayBuffer()
        await this.#connect()

        while(true) {
            const { value, done } = await this.#readWithTimeout(this.#serialPort.readable, 10)
            if (done)
                throw "Serial closed"
            if(!value || (value?.byteLength ?? 0) <= 0) {
                break;
            }
        }
    }

    async read(numberOfBytes, timeout = 1000) {
        await this.#connect()

        let trys = 0
        while(numberOfBytes == undefined || this.#cummulativeValue.byteLength < numberOfBytes) {
            const { value, done } = await this.#readWithTimeout(this.#serialPort.readable, timeout / 10)
            if (done)
                throw "Serial closed"
            if (!value && trys++ > 10)
                break
            if(value) {
                trys = 0
                this.#cummulativeValue = this.#cummulativeValue.concatArray(value)
            }
            if(numberOfBytes == undefined)
                break
        }
        let retBytes = numberOfBytes == undefined? this.#cummulativeValue : this.#cummulativeValue.slice(0, numberOfBytes)
        this.#cummulativeValue = numberOfBytes == undefined? new ArrayBuffer() : this.#cummulativeValue.slice(numberOfBytes)
        return retBytes
    }
    async write(sendBytes) {
        await this.#connect()

        const writable = this.#serialPort.writable
        if(!await waitForFunctionToReturnFalse(function() { return writable.locked }))
            return

        const writer = writable.getWriter()
        await writer.write(sendBytes)
        writer.releaseLock()
    }
    async command(sendBytes, numberOfReceiveBytes, timeout = 1000) {
        const thisClass = this
        if(!await waitForFunctionToReturnFalse(function() { return thisClass.#commandLock }))
            throw `Serial locked`
        this.#commandLock = true
        let retBytes
        try {
            await this.write(sendBytes)
            retBytes = this.read(numberOfReceiveBytes, timeout)
        } catch(e) {
            throw e
        } finally {
            this.#commandLock = false
        }
        return retBytes ?? new ArrayBuffer()
    }
}

export class Socket {
    #commandLock = false
    #webSocket
    #uri

    constructor(uri) {
        this.#uri = uri
    }

    async #connect() {
        if(this.#webSocket != undefined && this.#webSocket.readyState === WebSocket.OPEN)
            return

        this.#webSocket = new WebSocket(`ws://${window.location.host}/${this.#uri}`)

        // Buffer for incoming messages
        this.incomingMessages = []
        this.#webSocket.onmessage = event => {
            if (event.data instanceof Blob) {
                // Handle binary data as needed
                event.data.arrayBuffer().then(buffer => this.incomingMessages.push(buffer))
            } else {
                this.incomingMessages.push(event.data)
            }
        };

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error("WebSocket connection timed out"));
            }, 1000);

            this.#webSocket.onopen = () => {
                clearTimeout(timer);
                resolve();
            };

            this.#webSocket.onerror = (error) => {
                clearTimeout(timer);
                reject(error);
            };
        });
    }

    async flush() {
        this.incomingMessages = []
        await this.#connect()
    }

    async read(numberOfBytes, timeout = 1000) {
        await this.#connect()

        if(numberOfBytes === 0)
            return []

        const startTime = Date.now()
        while (this.incomingMessages.length === 0) {
            if (Date.now() - startTime > timeout) {
                throw new Error("Timeout waiting for data.");
            }
            await new Promise(r => setTimeout(r, 10))
        }

        // Extract the first available message
        const data = this.incomingMessages.shift()

        // Handle partial reads
        if (data instanceof ArrayBuffer && data.byteLength > numberOfBytes) {
            const result = data.slice(0, numberOfBytes)
            const remaining = data.slice(numberOfBytes)
            this.incomingMessages.unshift(remaining) // Put the remainder back into the queue
            return result
        }

        return data
    }

    async write(sendBytes, timeout = 1000) {
        await this.#connect()

        if (this.#webSocket.readyState !== WebSocket.OPEN) {
            throw new Error("WebSocket is not open.")
        }

        // Wrap the send operation in a promise to handle timeouts
        const promise = new Promise((resolve, reject) => {
            this.#webSocket.send(sendBytes);
            resolve();
        })

        // Enforce timeout
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error("Write timeout")), timeout))
        ])
    }
    
    async command(sendBytes, numberOfReceiveBytes, timeout = 1000) {
        const thisClass = this
        if(!await waitForFunctionToReturnFalse(function() { return thisClass.#commandLock }))
            throw `Socket locked`
        this.#commandLock = true
        let retBytes
        try {
            await this.write(sendBytes, timeout)
            retBytes = this.read(numberOfReceiveBytes, timeout)
        } catch(e) {
            throw e
        } finally {
            this.#commandLock = false
        }
        return retBytes ?? new ArrayBuffer()
    }

    close() {
        this.#webSocket.close()
    }
}

function typeLength(type) {
    switch(type) {
        case 0: return 0
        case 1: return 1
        case 2: return 2
        case 3: return 4
        case 4: return 8
        case 5: return 1
        case 6: return 2
        case 7: return 4
        case 8: return 8
        case 9: return 4
        case 10: return 8
        case 11: return 1
    }
}
function parseVariable(arrayBuffer) {
    let type = new Uint8Array(arrayBuffer)[0]
    switch(type) {
        case 0: return
        case 1: return new Uint8Array(arrayBuffer.slice(1))[0]
        case 2: return new Uint16Array(arrayBuffer.slice(1))[0]
        case 3: return new Uint32Array(arrayBuffer.slice(1))[0]
        // case 4: return new Uint64Array(arrayBuffer.slice(1))[0]
        case 5: return new Int8Array(arrayBuffer.slice(1))[0]
        case 6: return new Int16Array(arrayBuffer.slice(1))[0]
        case 7: return new Int32Array(arrayBuffer.slice(1))[0]
        // case 8: return new Int64Array(arrayBuffer.slice(1))[0]
        case 9: return new Float32Array(arrayBuffer.slice(1))[0]
        case 10: return new Float64Array(arrayBuffer.slice(1))[0]
        case 11: return new Uint8Array(arrayBuffer.slice(1))[0] === 1
    }
}

class EFIGenieLog { 
    variableMetadata = undefined
    logBytes = new ArrayBuffer()
    loggedVariableIds = []
    loggedVariableValues = []

    get saveValue() {
        let objectArray = pako.gzip(new TextEncoder().encode(JSON.stringify(this.variableMetadata.GetVariableReferenceList()))).buffer
        return (new Uint32Array([objectArray.byteLength]).buffer)
            .concatArray(objectArray)
            .concatArray(new Uint32Array([this.loggedVariableIds.length]).buffer)
            .concatArray(new Uint32Array(this.loggedVariableIds).buffer)
            .concatArray(this.logBytes)
    }
    set saveValue(saveValue) {
        const variableMetadataLength = new Uint32Array(saveValue.slice(0, 4))[0]
        this.variableMetadata = new VariableRegistry(JSON.parse(pako.ungzip(new Uint8Array(saveValue.slice(4, variableMetadataLength + 4)), { to: 'string' })))
        const loggedVariableIdsLength = new Uint32Array(saveValue.slice(variableMetadataLength + 4, variableMetadataLength + 8))[0]
        this.loggedVariableIds = [ ...(new Uint32Array(saveValue.slice(variableMetadataLength + 8, variableMetadataLength + 8 + loggedVariableIdsLength * 4))) ]
        this.logBytes = saveValue.slice(variableMetadataLength + 8 + loggedVariableIdsLength * 4)

        let index = 0
        this.loggedVariableValues = []
        while(index < this.logBytes.byteLength) {
            let variableValues = {}
            for(let i = 0; i < this.loggedVariableIds.length; i++) {
                let value = this.logBytes.slice(index, index+1)
                index++
                if(value.byteLength !== 1) throw "Incorrect number of bytes returned when polling variables"
                const tLen = typeLength(new Uint8Array(value)[0])
                if(tLen > 0) {
                    value = value.concatArray(this.logBytes.slice(index, index+tLen))
                    if(value.byteLength !== tLen + 1) throw "Incorrect number of bytes returned when polling variables"
                    index += tLen
                    variableValues[this.loggedVariableIds[i]] = parseVariable(value)
                }
            }
            this.loggedVariableValues.push(variableValues)
        }
    }
}

class EFIGenieCommunication extends EFIGenieLog {
    get saveValue() {
        return super.saveValue
    }
    set saveValue(saveValue) {
        //need to save this date and recall it when loading saveValue
        this.startedLoggingTime = Date.now()
        super.saveValue = saveValue
        const thisClass = this
        let u = async function() { thisClass.updateLiveUpdateEvents() }
        u()
    }

    variablesToPoll = []
    liveUpdateEvents = []

    async pollVariableMetadata() {
        if(this.variableMetadata != undefined)
            return

        await this._serial.flush();

        let metadataData = new ArrayBuffer()
        let length = 1
        for(let i = 0; i < Math.ceil(length); i++) {
            const data = new Uint8Array([109]).buffer.concatArray(new Uint32Array([i]).buffer) // get metadata
            let retData = await this._serial.command(data, 64)
            if(retData.byteLength !== 64) throw `Incorrect number of bytes returned when requesting metadata`
            
            if(i === 0) {
                length = (new Uint32Array(retData.slice(0, 4))[0] + 4) / 64
                if(length > 1000)throw `Incorrect length returned when requesting metadata`
            }
            metadataData = metadataData.concatArray(retData)
        }

        if(length == 0)
            throw `engine errored`
            
        length = new Uint32Array(metadataData.slice(0,4))[0]
        metadataData = metadataData.slice(4, length + 4)
        const metadataString = pako.ungzip(new Uint8Array(metadataData), { to: 'string' })

        this.variableMetadata = new VariableRegistry(JSON.parse(metadataString))
        b.RegisterVariables()
    }

    async pollVariables() {
        await this.pollVariableMetadata()

        await this._serial.flush();

        let variableIds = []
        const currentTickId = this.variableMetadata.GetVariableId({name: `CurrentTick`, type: `tick`})
        if(currentTickId)
            variableIds.push(currentTickId)
        for (let variableReference in this.variablesToPoll) {
            const variableId = this.variableMetadata.GetVariableId(this.variablesToPoll[variableReference])
            if(variableId != undefined && variableIds.indexOf(variableId) === -1)
                variableIds.push(variableId)
        }
        if(variableIds.length < 1)
            return

        if(variableIds.length != this.loggedVariableIds?.length) {
            this.logBytes = new ArrayBuffer()
            this.loggedVariableValues = []
            this.loggedVariableIds = variableIds
        } else {
            for(var i = 0; i < variableIds.length; i++){
                if(variableIds[i] !== this.loggedVariableIds[i]){
                    this.logBytes = new ArrayBuffer()
                    this.loggedVariableValues = []
                    this.loggedVariableIds = variableIds
                    break
                }
            }
        }

        let data = new ArrayBuffer()
        for(let i = 0; i < variableIds.length; i++) {
            data = data.concatArray(new Uint8Array([103]).buffer.concatArray(new Uint32Array([variableIds[i]]).buffer))
        }

        await this._serial.write(data)
        let bytes = new ArrayBuffer()
        let variableValues = {}
        for(let i = 0; i < variableIds.length; i++) {
            let value = await this._serial.read(1)
            if(value.byteLength !== 1) throw "Incorrect number of bytes returned when polling variables"
            const tLen = typeLength(new Uint8Array(value)[0])
            if(tLen > 0) {
                value = value.concatArray(await this._serial.read(tLen))
                if(value.byteLength !== tLen + 1) throw "Incorrect number of bytes returned when polling variables"
                variableValues[variableIds[i]] = parseVariable(value)
            }
            bytes = bytes.concatArray(value)
        }

        this.logBytes = this.logBytes.concatArray(bytes)
        this.loggedVariableValues.push(variableValues)

        const thisClass = this
        let u = async function() { thisClass.updateLiveUpdateEvents() }
        u()
    }

    updateLiveUpdateEvents() {
        Object.entries(this.liveUpdateEvents).filter(function(value, index, self) { return self.indexOf(value) === index }).forEach(([elementname, element]) => {
            element?.(this.variableMetadata, this.loggedVariableValues[this.loggedVariableValues.length - 1])
        })
    }

    async #sendCommandAndWaitForAck(data, commandName) {
        const retData = await this._serial.command(data, 1)
        if(retData.byteLength !== 1)  throw `Incorrect number of bytes returned when ${commandName}`
        if(new Uint8Array(retData)[0] !== 6) throw `Ack not returned when ${commandName}, ${new Uint8Array(retData)[0]}`
    }

    async stopExecution() {
        await this._serial.flush();
        await this.#sendCommandAndWaitForAck(new Uint8Array([113]).buffer, `stopping execution`)
    }

    async startExecution() {
        await this._serial.flush();
        await this.#sendCommandAndWaitForAck(new Uint8Array([115]).buffer, `starting execution`)
    }

    async writeToAddress(address, data, chunks = 52, timeout = 1000) {
        let left = data.byteLength
        let i = 0
        while(left > 0) {
            let sendSize = Math.min(chunks, left)
            await this.#sendCommandAndWaitForAck(new Uint8Array([119]).buffer.concatArray(new Uint32Array([ address + i, sendSize]).buffer).concatArray(data.slice(i, i + sendSize)), `writing data`)
            left -= sendSize
            i += sendSize
        }
    }

    async getConfigAddress() {
        const retData = await this._serial.command(new Uint8Array([99]).buffer, 4)
        if(retData.byteLength !== 4) throw "Incorrect number of bytes returned when requesting config address"
        return new Uint32Array(retData)[0]
    }

    async burnBin(bin) {
        let reconnect = this.connected
        await this.disconnect()

        await this.stopExecution()
        const configAddress = await this.getConfigAddress()
        await this.writeToAddress(configAddress, bin)
        await this.startExecution()

        this.variableMetadata = undefined

        if(reconnect)
            this.connect()
    }

    connect() {
        if(this.polling)
            return
        this.polling = true
        if(!this.connected) {
            this.variableMetadata = undefined
            this.logBytes = new ArrayBuffer()
            this.loggedVariableValues = []
            this.startedLoggingTime = Date.now()
        }
        this.connected = true
        this.connectionError = false;
        const thisClass = this
        this.pollVariables().then(function() {
            thisClass.polling = false
            if(thisClass.connected)
                thisClass.connect()
        }).catch(function(e) {
            console.log(e)
            thisClass.variableMetadata = undefined
            thisClass.polling = false
            thisClass.connected = false
            thisClass.connectionError = true;
            let u = async function() { thisClass.updateLiveUpdateEvents() }
            u()
        })
    }
    async disconnect() {
        this.connected = false
        const thisClass = this
        await waitForFunctionToReturnFalse(function() { return thisClass.polling || thisClass.connected })
        
    }
}

export let communication = new EFIGenieCommunication()