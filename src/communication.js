import { gzip, ungzip } from "pako"
import VariableRegistry from "./VariableRegistry.js"
import ICommunicationService from "./CommunicationService/ICommunicationService.js"

function numericArrayBuffer(value, byteLength, setter, endian, bigint = false) {
    const values = Array.isArray(value) ? value : [value]
    const buffer = new ArrayBuffer(values.length * byteLength)
    const view = new DataView(buffer)
    values.forEach((item, index) => {
        view[setter](index * byteLength, bigint ? BigInt(item) : item, endian !== `big`)
    })
    return buffer
}

function arrayBufferValue(buffer, byteLength, getter, endian, bigint = false) {
    const view = new DataView(buffer)
    const values = []
    for(let i = 0; i < buffer.byteLength; i += byteLength) {
        values.push(view[getter](i, endian !== `big`))
    }
    return values
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
function parseVariable(arrayBuffer, endian = `little`) {
    let type = arrayBufferValue(arrayBuffer, 1, `getUint8`, endian)[0]
    switch(type) {
        case 0: return
        case 1: return arrayBufferValue(arrayBuffer.slice(1), 1, `getUint8`, endian)[0]
        case 2: return arrayBufferValue(arrayBuffer.slice(1), 2, `getUint16`, endian)[0]
        case 3: return arrayBufferValue(arrayBuffer.slice(1), 4, `getUint32`, endian)[0]
        case 4: return arrayBufferValue(arrayBuffer.slice(1), 8, `getBigUint64`, endian, true)[0]
        case 5: return arrayBufferValue(arrayBuffer.slice(1), 1, `getInt8`, endian)[0]
        case 6: return arrayBufferValue(arrayBuffer.slice(1), 2, `getInt16`, endian)[0]
        case 7: return arrayBufferValue(arrayBuffer.slice(1), 4, `getInt32`, endian)[0]
        case 8: return arrayBufferValue(arrayBuffer.slice(1), 8, `getBigInt64`, endian, true)[0]
        case 9: return arrayBufferValue(arrayBuffer.slice(1), 4, `getFloat32`, endian)[0]
        case 10: return arrayBufferValue(arrayBuffer.slice(1), 8, `getFloat64`, endian)[0]
        case 11: return arrayBufferValue(arrayBuffer.slice(1), 1, `getUint8`, endian)[0] == 1
    }
}

export function getLogTimestamps(records, currentTickId, startedLoggingTime, ticksPerSecond) {
    let elapsedTicks = 0
    let previousTick
    return records.map(record => {
        const tick = record[currentTickId]
        // Subtract in raw uint32 ticks before converting to milliseconds.
        if(previousTick !== undefined)
            elapsedTicks += (tick - previousTick) >>> 0
        previousTick = tick
        return startedLoggingTime + elapsedTicks * 1000 / ticksPerSecond
    })
}

class EFIGenieLog extends EventTarget { 
    endian = `little`
    ticksPerSecond = 1_000_000
    startedLoggingTime = Date.now()
    variableMetadata = new VariableRegistry()
    variableMetadataValid = false
    logBytes = new ArrayBuffer()
    loggedVariableIds = []
    loggedVariableValues = []

    get saveValue() {
        const metadata = {
            variableReferences: this.variableMetadata.variableReferences,
            endian: this.endian,
            ticksPerSecond: this.ticksPerSecond,
            startedLoggingTime: this.startedLoggingTime
        }
        let objectArray = gzip(new TextEncoder().encode(JSON.stringify(metadata))).buffer
        return (new Uint32Array([objectArray.byteLength]).buffer)
            .concatArray(objectArray)
            .concatArray(new Uint32Array([this.loggedVariableIds.length]).buffer)
            .concatArray(new Uint32Array(this.loggedVariableIds).buffer)
            .concatArray(this.logBytes)
    }
    set saveValue(saveValue) {
        const variableMetadataLength = new Uint32Array(saveValue.slice(0, 4))[0]
        const metadata = JSON.parse(ungzip(new Uint8Array(saveValue.slice(4, variableMetadataLength + 4)), { to: 'string' }))
        this.variableMetadata.Clear()
        // Older logs stored only the variable registry; use the selected target's
        // byte order and tick frequency when that information is absent.
        this.variableMetadata.variableReferences = metadata.variableReferences ?? metadata
        this.endian = metadata.endian ?? this.endian
        this.ticksPerSecond = metadata.ticksPerSecond ?? this.ticksPerSecond
        this.startedLoggingTime = metadata.startedLoggingTime ?? Date.now()
        this.variableMetadataValid = true
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
                    variableValues[this.loggedVariableIds[i]] = parseVariable(value, this.endian)
                }
            }
            this.loggedVariableValues.push(variableValues)
        }
    }
}

export class EFIGenieCommunication extends EFIGenieLog {
    #communicationService
    #receiveCallbackId
    #received = new Uint8Array()
    #wakeRead
    #commands = Promise.resolve()
    #pollTask

    get communicationService() { return this.#communicationService }

    /** Replace the injected ICommunicationService after stopping the old session. */
    async setCommunicationService(service) {
        if(!(service instanceof ICommunicationService))
            throw new TypeError(`Expected an ICommunicationService`)
        if(service === this.#communicationService) return
        if(this.connected || this.polling) await this.disconnect()
        await this.#commands
        if(this.#communicationService) {
            this.#communicationService.UnRegisterReceiveCallBack(this.#receiveCallbackId)
            await this.#communicationService.Close()
        }
        this.#received = new Uint8Array()
        this.#communicationService = service
        this.#receiveCallbackId = service.RegisterReceiveCallBack((sender, data) => {
            const received = new Uint8Array(this.#received.byteLength + data.byteLength)
            received.set(this.#received)
            received.set(data, this.#received.byteLength)
            this.#received = received
            this.#wakeRead?.()
            return data.byteLength
        })
    }

    async #flush() {
        if(!this.#communicationService) throw new Error(`No communication service configured`)
        await this.#communicationService.Connect()
        this.#received = new Uint8Array()
    }

    async #read(numberOfBytes, timeout = 1000) {
        const deadline = Date.now() + timeout
        while(this.#received.byteLength < numberOfBytes) {
            if(!this.#communicationService.Ready())
                throw this.#communicationService.lastError ?? new Error(`Communication service disconnected`)
            const remaining = deadline - Date.now()
            if(remaining <= 0) throw new Error(`Timeout waiting for data`)
            await new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    this.#wakeRead = undefined
                    reject(new Error(`Timeout waiting for data`))
                }, remaining)
                this.#wakeRead = () => {
                    clearTimeout(timer)
                    this.#wakeRead = undefined
                    resolve()
                }
            })
        }
        const result = this.#received.slice(0, numberOfBytes).buffer
        this.#received = this.#received.slice(numberOfBytes)
        return result
    }

    #command(data, numberOfReceiveBytes, timeout = 1000) {
        const command = this.#commands.then(async () => {
            await this.#communicationService.Send(data)
            return this.#read(numberOfReceiveBytes, timeout)
        })
        // Keep the queue usable after a failed command; the caller gets the error.
        this.#commands = command.catch(() => {})
        return command
    }

    get saveValue() {
        return super.saveValue
    }
    set saveValue(saveValue) {
        super.saveValue = saveValue
        this.dispatchEvent(new CustomEvent(`change`, { detail: this.#changeDetail }))
    }

    variablesToPoll = []

    get #changeDetail() {
        return {
            currentVariableValues: this.loggedVariableValues.length > 0? this.loggedVariableValues[this.loggedVariableValues.length - 1] : {},
            variableMetadata: this.variableMetadata,
            loggedVariableValues: this.loggedVariableValues,
            startedLoggingTime: this.startedLoggingTime,
            ticksPerSecond: this.ticksPerSecond,
            connectionError: this.connectionError,
            connected: this.connected
        }
    }

    async pollVariableMetadata() {
        if(this.variableMetadataValid === true)
            return

        await this.#flush();

        let metadataData = new ArrayBuffer()
        let length = 1
        for(let i = 0; i < Math.ceil(length); i++) {
            const data = numericArrayBuffer(109, 1, `setUint8`, this.endian).concatArray(numericArrayBuffer(i, 4, `setUint32`, this.endian)) // get metadata
            let retData = await this.#command(data, 64)
            if(retData.byteLength !== 64) throw `Incorrect number of bytes returned when requesting metadata`
            
            if(i === 0) {
                length = (arrayBufferValue(retData, 4, `getUint32`, this.endian)[0] + 4) / 64
                if(length > 1000)throw `Incorrect length returned when requesting metadata`
            }
            metadataData = metadataData.concatArray(retData)
        }

        if(length == 0)
            throw `engine errored`
            
        length = arrayBufferValue(metadataData, 4, `getUint32`, this.endian)[0]
        metadataData = metadataData.slice(4, length + 4)
        const metadataString = ungzip(new Uint8Array(metadataData), { to: 'string' })

        this.variableMetadata.Clear()
        this.variableMetadata.variableReferences = JSON.parse(metadataString)
        this.variableMetadataValid = true
    }

    async pollVariables() {
        await this.pollVariableMetadata()

        await this.#flush();

        let variableIds = []
        const currentTickId = this.variableMetadata.GetVariableId({name: `CurrentTick`, type: `tick`})
        if(currentTickId)
            variableIds.push(currentTickId)
        for (let variablesToPollIndex in this.variablesToPoll) {
            const variableId = this.variablesToPoll[variablesToPollIndex]
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
            data = data.concatArray(numericArrayBuffer(103, 1, `setUint8`, this.endian).concatArray(numericArrayBuffer(variableIds[i], 4, `setUint32`, this.endian)))
        }

        await this.#communicationService.Send(data)
        let bytes = new ArrayBuffer()
        let variableValues = {}
        for(let i = 0; i < variableIds.length; i++) {
            let value = await this.#read(1)
            if(value.byteLength !== 1) throw "Incorrect number of bytes returned when polling variables"
            const tLen = typeLength(arrayBufferValue(value, 1, `getUint8`, this.endian)[0])
            if(tLen > 0) {
                value = value.concatArray(await this.#read(tLen))
                if(value.byteLength !== tLen + 1) throw "Incorrect number of bytes returned when polling variables"
                variableValues[variableIds[i]] = parseVariable(value, this.endian)
            }
            bytes = bytes.concatArray(value)
        }

        this.logBytes = this.logBytes.concatArray(bytes)
        this.loggedVariableValues.push(variableValues)

        this.dispatchEvent(new CustomEvent(`change`, { detail: this.#changeDetail }))
    }

    async #sendCommandAndWaitForAck(data, commandName) {
        const retData = await this.#command(data, 1)
        if(retData.byteLength !== 1)  throw `Incorrect number of bytes returned when ${commandName}`
        const ack = arrayBufferValue(retData, 1, `getUint8`, this.endian)[0]
        if(ack !== 6) throw `Ack not returned when ${commandName}, ${ack}`
    }

    async stopExecution() {
        await this.#flush();
        await this.#sendCommandAndWaitForAck(numericArrayBuffer(113, 1, `setUint8`, this.endian), `stopping execution`)
    }

    async startExecution() {
        await this.#flush();
        await this.#sendCommandAndWaitForAck(numericArrayBuffer(115, 1, `setUint8`, this.endian), `starting execution`)
    }

    async writeToAddress(address, data, chunks = 52, timeout = 1000) {
        let left = data.byteLength
        let i = 0
        while(left > 0) {
            let sendSize = Math.min(chunks, left)
            await this.#sendCommandAndWaitForAck(numericArrayBuffer(119, 1, `setUint8`, this.endian).concatArray(numericArrayBuffer(address + i, 4, `setUint32`, this.endian)).concatArray(numericArrayBuffer(sendSize, 4, `setUint32`, this.endian)).concatArray(data.slice(i, i + sendSize)), `writing data`)
            left -= sendSize
            i += sendSize
        }
    }

    async getConfigAddress() {
        const retData = await this.#command(numericArrayBuffer(99, 1, `setUint8`, this.endian), 4)
        if(retData.byteLength !== 4) throw "Incorrect number of bytes returned when requesting config address"
        return arrayBufferValue(retData, 4, `getUint32`, this.endian)[0]
    }

    async burnBin(bin, service = this.#communicationService) {
        let reconnect = this.connected
        await this.disconnect()
        await this.setCommunicationService(service)

        await this.stopExecution()
        const configAddress = await this.getConfigAddress()
        await this.writeToAddress(configAddress, bin)
        await this.startExecution()

        this.variableMetadata.Clear()
        this.variableMetadataValid = false

        if(reconnect)
            this.connect()
    }

    async #pollVariablesWithRetry() {
        const retries = 3
        for(let attempt = 0; attempt <= retries && this.connected; attempt++) {
            try {
                // Each poll flushes stale bytes before issuing its read queries.
                await this.pollVariables()
                return
            } catch(error) {
                if(!this.connected) return
                if(attempt === retries) throw error
                await new Promise(resolve => setTimeout(resolve, 10))
            }
        }
    }

    /** Start polling with the supplied ICommunicationService, or resume the current one. */
    async connect(service = this.#communicationService) {
        await this.setCommunicationService(service)
        if(this.polling) return
        this.variableMetadata.Clear()
        this.variableMetadataValid = false
        this.logBytes = new ArrayBuffer()
        this.loggedVariableValues = []
        this.startedLoggingTime = Date.now()
        this.connected = true
        this.connectionError = false
        this.polling = true
        this.#pollTask = this.#pollLoop()
    }

    async #pollLoop() {
        try {
            while(this.connected)
                await this.#pollVariablesWithRetry()
        } catch(error) {
            console.log(error)
            this.variableMetadata.Clear()
            this.variableMetadataValid = false
            this.connected = false
            this.connectionError = true
            this.dispatchEvent(new CustomEvent(`change`, { detail: this.#changeDetail }))
        } finally {
            this.polling = false
        }
    }

    async disconnect() {
        this.connected = false
        await this.#pollTask
        this.dispatchEvent(new CustomEvent(`change`, { detail: this.#changeDetail }))
    }
}

export let communication = new EFIGenieCommunication()
