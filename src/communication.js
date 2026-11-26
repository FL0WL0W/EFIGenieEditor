import { gzip, ungzip } from "pako"
import VariableRegistry from "./VariableRegistry.js"
import ICommunicationService from "./CommunicationService/ICommunicationService.js"
import { typeLength, parseVariable, subscribeCommand, clearSubscriptionsCommand, SubscriptionDecoder, refreshRateInterval } from "./VariableSubscriptions.js"

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
    #disconnectTask
    #options = { variableMode: `poll`, auxiliaryServices: [], responsePrefixes: false }
    #auxiliaries = []
    #streamState = `command`
    #decoder
    #subscriptionReplyPrefix
    #subscribing = false
    #activeSubscriptionIds = []
    #variableRefreshRates = new Map()
    #activeSubscriptionIntervals = new Map()
    #latestSubscriptionRecords = new Map()
    #subscriptionTimeout = 1000
    #streamError
    #lastSample = 0
    #wakeLoop

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
        this.#options = { variableMode: `poll`, auxiliaryServices: [], responsePrefixes: false }
        this.#streamState = `command`
        this.#decoder = undefined
        this.#streamError = undefined
        this.#received = new Uint8Array()
        this.#communicationService = service
        this.#receiveCallbackId = service.RegisterReceiveCallBack((sender, data) => {
            if(this.#streamState !== `command`) {
                try { this.#decoder.receive(data) }
                catch(error) {
                    this.#streamError = error
                    this.#wakeRead?.()
                    this.#wakeLoop?.()
                }
                return data.byteLength
            }
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
        await this.#exclusive(async () => {
            await this.#retryCommand(() => this.#communicationService.Connect())
            await this.#stopSubscriptions()
            this.#received = new Uint8Array()
        })
    }

    async #read(numberOfBytes, timeout = 1000) {
        const timeoutError = () => {
            const error = new Error(`Timeout waiting for data (received ${this.#received.byteLength} of ${numberOfBytes} bytes)`)
            error.diagnostics = this.#communicationService.diagnostics
            return error
        }
        const deadline = Date.now() + timeout
        while(this.#received.byteLength < numberOfBytes) {
            if(this.#streamError && this.#streamState !== `command`) throw this.#streamError
            if(!this.#communicationService.Ready())
                throw this.#communicationService.lastError ?? new Error(`Communication service disconnected`)
            const remaining = deadline - Date.now()
            if(remaining <= 0) throw timeoutError()
            await new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    this.#wakeRead = undefined
                    reject(timeoutError())
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

    #exclusive(action) {
        const operation = this.#commands.then(action)
        this.#commands = operation.catch(() => {})
        return operation
    }

    async #retryCommand(operation) {
        const attempts = 3
        const retryDelay = 100
        const service = this.#communicationService
        const wasConnected = this.connected
        let lastError
        for(let attempt = 0; attempt < attempts; attempt++) {
            if(attempt && (service !== this.#communicationService || (wasConnected && !this.connected))) throw lastError
            this.#received = new Uint8Array()
            try {
                const result = await operation(attempt)
                if(attempt) {
                    // Let duplicate replies from a timed-out attempt drain before
                    // another command can reuse the same response prefix.
                    await new Promise(resolve => setTimeout(resolve, retryDelay))
                    this.#received = new Uint8Array()
                }
                return result
            } catch(error) {
                lastError = error instanceof Error ? error : new Error(String(error))
                lastError.attempts = attempt + 1
                if(attempt === attempts - 1 || (wasConnected && !this.connected)) throw lastError
                await new Promise(resolve => setTimeout(resolve, retryDelay))
            }
        }
    }

    #command(data, numberOfReceiveBytes, timeout = 1000, validate) {
        return this.#exclusive(async () => {
            await this.#stopSubscriptions()
            return this.#retryCommand(async () => {
                await this.#communicationService.Send(data)
                let response
                if(this.#options.responsePrefixes) {
                    const bytes = new Uint8Array(await this.#read(numberOfReceiveBytes + 1, timeout))
                    const prefix = new Uint8Array(data.buffer ?? data, data.byteOffset ?? 0, data.byteLength)[0]
                    if(bytes[0] !== prefix) throw new Error(`Unexpected response prefix: ${bytes[0]}, expected ${prefix}`)
                    response = bytes.slice(1).buffer
                } else response = await this.#read(numberOfReceiveBytes, timeout)
                validate?.(response)
                return response
            })
        })
    }

    #createSubscriptionDecoder() {
        return new SubscriptionDecoder(this.endian, (tick, records) => {
            // Updates already in flight can arrive while clearing or installing
            // a selection. Only complete frames from the active set become rows.
            if(this.#streamState !== `streaming` || this.#subscribing) return
            const ids = this.#activeSubscriptionIds
            if(!records.size || [...records.keys()].some(id => !ids.includes(id)))
                throw new Error(`Subscription sample does not match selected variables`)
            for(const [id, record] of records) this.#latestSubscriptionRecords.set(id, record)
            const tickId = this.#currentTickId()
            const tickRecord = new Uint8Array(5)
            tickRecord[0] = 3 // UINT32, retained in the existing saved-log format.
            new DataView(tickRecord.buffer).setUint32(1, tick, this.endian !== `big`)
            const values = { [tickId]: tick }
            const raw = [...tickRecord]
            for(const id of ids) {
                // Slower variables retain their last reading; before their
                // first update the saved-log record uses the existing VOID type.
                const record = this.#latestSubscriptionRecords.get(id) ?? new Uint8Array([0])
                raw.push(...record)
                if(record[0] !== 0) values[id] = parseVariable(record.buffer, this.endian)
            }
            this.#lastSample = Date.now()
            this.logBytes = this.logBytes.concatArray(new Uint8Array(raw).buffer)
            this.loggedVariableValues.push(values)
            this.dispatchEvent(new CustomEvent(`change`, { detail: this.#changeDetail }))
        }, (prefix, status) => {
            // Ignore late ACKs when no command is waiting, or when a previous
            // command's prefix differs from the current command.
            if(this.#subscriptionReplyPrefix === undefined || (prefix !== undefined && prefix !== this.#subscriptionReplyPrefix)) return
            const received = new Uint8Array(this.#received.length + 1)
            received.set(this.#received)
            received[this.#received.length] = status
            this.#received = received
            this.#wakeRead?.()
        })
    }

    async #subscriptionCommand(data, prefix) {
        this.#subscriptionReplyPrefix = prefix
        try {
            await this.#retryCommand(async attempt => {
                if(attempt) {
                    // Discard an incomplete/corrupt old frame before retrying.
                    this.#decoder = this.#createSubscriptionDecoder()
                    this.#streamError = undefined
                }
                await this.#communicationService.Send(data)
                const status = new Uint8Array(await this.#read(1))[0]
                if(status !== 6) throw new Error(`Subscription command ${String.fromCharCode(prefix)} rejected (NACK ${status})`)
            })
        } finally { this.#subscriptionReplyPrefix = undefined }
    }

    async #stopSubscriptions(force = false) {
        if(this.#options.variableMode !== `subscribe` || (!force && this.#streamState === `command`)) return
        this.#decoder ??= this.#createSubscriptionDecoder()
        this.#streamState = `draining`
        await this.#subscriptionCommand(clearSubscriptionsCommand(this.endian), 101)
        this.#streamState = `command`
        this.#decoder = undefined
    }

    #currentTickId() {
        return this.variableMetadata.GetVariableId({ name: `CurrentTick`, type: `tick` })
    }

    #selectedVariableIds() {
        const tick = this.#currentTickId()
        const ids = this.#options.variableMode === `subscribe` ? this.variablesToPoll.filter(id => id !== tick) : [tick, ...this.variablesToPoll]
        return [...new Set(ids.filter(id => id !== undefined && id !== null))]
    }

    #setLogLayout(ids) {
        if(ids.length !== this.loggedVariableIds.length || ids.some((id, index) => id !== this.loggedVariableIds[index])) {
            this.logBytes = new ArrayBuffer()
            this.loggedVariableValues = []
            this.loggedVariableIds = ids.slice()
            this.#latestSubscriptionRecords.clear()
        }
    }

    async #syncSubscriptions() {
        if(!this.connected) return
        if(this.#streamError) throw this.#streamError
        if(!this.#communicationService.Ready())
            throw this.#communicationService.lastError ?? new Error(`Communication service disconnected`)
        const ids = this.#selectedVariableIds()
        const logIds = [this.#currentTickId(), ...ids]
        const intervals = new Map(ids.map(id => [id, refreshRateInterval(this.#variableRefreshRates.get(id))]))
        const changed = logIds.length !== this.loggedVariableIds.length || logIds.some((id, i) => id !== this.loggedVariableIds[i]) ||
            ids.some(id => intervals.get(id) !== this.#activeSubscriptionIntervals.get(id))
        if(this.#streamState === `streaming` && !changed) {
            if(ids.length && Date.now() - this.#lastSample >= this.#subscriptionTimeout)
                throw new Error(`Timeout waiting for subscribed variables`)
            return
        }
        await this.#stopSubscriptions()
        this.#setLogLayout(logIds)
        if(!ids.length) return
        if(ids.some(id => !Number.isInteger(id) || id < 0 || id >= 0xffffffff))
            throw new Error(`Invalid subscription variable ID`)
        // Include d STX, the tick, and d ETX in the ISO-TP payload budget.
        if(8 + ids.length * 13 > 4095) throw new Error(`Too many subscribed variables for one ISO-TP sample`)
        this.#activeSubscriptionIds = ids.slice()
        this.#activeSubscriptionIntervals = intervals
        // Even a healthy 0.5 Hz subscription may be quiet for two seconds.
        this.#subscriptionTimeout = Math.max(1000, Math.min(...intervals.values()) * 2000 + 250)
        this.#decoder = this.#createSubscriptionDecoder()
        this.#streamState = `streaming`
        this.#subscribing = true
        try {
            // Waiting for each ACK also prevents overrunning the ECU's bounded
            // command queue and associates a bare queue-full NACK with its ID.
            for(const id of ids) {
                if(!this.connected) return
                await this.#subscriptionCommand(subscribeCommand(id, intervals.get(id), this.endian), 100)
            }
        } finally { this.#subscribing = false }
        this.#lastSample = Date.now()
    }

    async #subscriptionLoop() {
        await this.#exclusive(async () => {
            await this.#retryCommand(() => this.#communicationService.Connect())
            await this.#stopSubscriptions(true)
        })
        if(!this.connected) return
        await this.pollVariableMetadata()
        if(this.#currentTickId() === undefined) {
            // Older metadata may omit CurrentTick. Reserve a log-only ID for
            // the tick carried in each frame; this ID is never subscribed.
            this.variableMetadata.variableReferences = {
                ...this.variableMetadata.variableReferences, CurrentTick: { id: 0xffffffff, type: `tick` }
            }
        }
        this.dispatchEvent(new CustomEvent(`change`, { detail: this.#changeDetail }))
        while(this.connected) {
            await this.#exclusive(() => this.#syncSubscriptions())
            if(!this.connected) break
            await new Promise(resolve => {
                const timer = setTimeout(() => { this.#wakeLoop = undefined; resolve() }, 100)
                this.#wakeLoop = () => { clearTimeout(timer); this.#wakeLoop = undefined; resolve() }
            })
        }
    }

    async #openAuxiliaries() {
        for(const auxiliary of this.#options.auxiliaryServices) {
            const { service, onReceive } = auxiliary
            const id = service.RegisterReceiveCallBack((sender, data) => {
                onReceive(data)
                return data.byteLength
            })
            this.#auxiliaries.push({ ...auxiliary, id })
            await service.Connect()
        }
    }

    async #closeAuxiliaries() {
        const auxiliaries = this.#auxiliaries.splice(0)
        const results = await Promise.allSettled(auxiliaries.map(async ({ service, id, onClose }) => {
            service.UnRegisterReceiveCallBack(id)
            try { await service.Close() }
            finally { onClose?.() }
        }))
        const failed = results.find(result => result.status === `rejected`)
        if(failed) throw failed.reason
    }

    get saveValue() {
        return super.saveValue
    }
    set saveValue(saveValue) {
        super.saveValue = saveValue
        this.dispatchEvent(new CustomEvent(`change`, { detail: this.#changeDetail }))
    }

    variablesToPoll = []

    /** Apply the Logged Variables GUI's per-row Hz settings (Max = -1). */
    setLoggedVariables(variables) {
        const rates = new Map()
        for(const { id, refreshRate = 60 } of variables) {
            if(id === undefined || id === null) continue
            const interval = refreshRateInterval(refreshRate)
            // Multiple display units can refer to the same ECU variable.
            // Request the fastest selected rate once, with Max taking priority.
            if(!rates.has(id) || interval < refreshRateInterval(rates.get(id))) rates.set(id, refreshRate)
        }
        const ids = [...rates.keys()]
        const changed = ids.length !== this.variablesToPoll.length || ids.some((id, i) => id !== this.variablesToPoll[i]) ||
            ids.some(id => rates.get(id) !== this.#variableRefreshRates.get(id))
        this.variablesToPoll = ids
        this.#variableRefreshRates = rates
        if(changed) this.#wakeLoop?.()
    }

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

        const variableIds = this.#selectedVariableIds()
        if(variableIds.length < 1) {
            await new Promise(resolve => setTimeout(resolve, 100))
            return
        }
        this.#setLogLayout(variableIds)

        let data = new ArrayBuffer()
        for(let i = 0; i < variableIds.length; i++) {
            data = data.concatArray(numericArrayBuffer(103, 1, `setUint8`, this.endian).concatArray(numericArrayBuffer(variableIds[i], 4, `setUint32`, this.endian)))
        }

        const { bytes, variableValues } = await this.#exclusive(async () => {
            await this.#stopSubscriptions()
            return this.#retryCommand(async () => {
                await this.#communicationService.Send(data)
                let bytes = new ArrayBuffer()
                let variableValues = {}
                for(let i = 0; i < variableIds.length; i++) {
                    if(this.#options.responsePrefixes && new Uint8Array(await this.#read(1))[0] !== 103)
                        throw new Error(`Unexpected variable response prefix`)
                    let value = await this.#read(1)
                    if(value.byteLength !== 1) throw "Incorrect number of bytes returned when polling variables"
                    const tLen = typeLength(arrayBufferValue(value, 1, `getUint8`, this.endian)[0])
                    if(tLen === undefined) throw new Error(`Unsupported polled variable type: ${new Uint8Array(value)[0]}`)
                    if(tLen > 0) {
                        value = value.concatArray(await this.#read(tLen))
                        if(value.byteLength !== tLen + 1) throw "Incorrect number of bytes returned when polling variables"
                        variableValues[variableIds[i]] = parseVariable(value, this.endian)
                    }
                    bytes = bytes.concatArray(value)
                }
                return { bytes, variableValues }
            })
        })

        this.logBytes = this.logBytes.concatArray(bytes)
        this.loggedVariableValues.push(variableValues)

        this.dispatchEvent(new CustomEvent(`change`, { detail: this.#changeDetail }))
    }

    async #sendCommandAndWaitForAck(data, commandName, timeout = 1000) {
        await this.#command(data, 1, timeout, retData => {
            const ack = new Uint8Array(retData)[0]
            if(ack !== 6) throw new Error(`Ack not returned when ${commandName}, ${ack}`)
        })
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
            await this.#sendCommandAndWaitForAck(numericArrayBuffer(119, 1, `setUint8`, this.endian).concatArray(numericArrayBuffer(address + i, 4, `setUint32`, this.endian)).concatArray(numericArrayBuffer(sendSize, 4, `setUint32`, this.endian)).concatArray(data.slice(i, i + sendSize)), `writing data`, timeout)
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
        const reconnect = this.connected
        const reconnectOptions = service === this.#communicationService ? this.#options : {}
        await this.disconnect()
        await this.setCommunicationService(service)

        await this.stopExecution()
        const configAddress = await this.getConfigAddress()
        await this.writeToAddress(configAddress, bin)
        await this.startExecution()

        this.variableMetadata.Clear()
        this.variableMetadataValid = false

        if(reconnect)
            await this.connect(this.#communicationService, reconnectOptions)
    }

    /** Connect with polling by default; E78 opts into subscriptions and auxiliary ISO-TP services. */
    async connect(service = this.#communicationService, options = {}) {
        const { variableMode = `poll`, auxiliaryServices = [], responsePrefixes = variableMode === `subscribe` } = options
        if(![`poll`, `subscribe`].includes(variableMode)) throw new RangeError(`Invalid variable mode`)
        if(auxiliaryServices.some(({ service, onReceive }) => !(service instanceof ICommunicationService) || typeof onReceive !== `function`))
            throw new TypeError(`Invalid auxiliary communication service`)
        await this.#disconnectTask
        if(this.polling && !this.connected) await this.#pollTask
        await this.setCommunicationService(service)
        if(this.polling) return
        this.#options = { variableMode, auxiliaryServices, responsePrefixes }
        this.#streamError = undefined
        this.#streamState = `command`
        this.#latestSubscriptionRecords.clear()
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
            await this.#openAuxiliaries()
            if(this.#options.variableMode === `subscribe`) await this.#subscriptionLoop()
            else while(this.connected) await this.pollVariables()
        } catch(error) {
            if(!this.connected) return
            console.log(error)
            this.variableMetadata.Clear()
            this.variableMetadataValid = false
            this.connected = false
            this.connectionError = true
            this.dispatchEvent(new CustomEvent(`change`, { detail: this.#changeDetail }))
        } finally {
            try {
                // A failed clear has already exhausted its retries. Avoid
                // sending another three clear commands during error cleanup.
                if(this.#streamState !== `draining` && this.#communicationService.Ready())
                    await this.#exclusive(() => this.#stopSubscriptions())
            } catch(error) { console.warn(`Could not clear EFIGenie subscriptions`, error) }
            this.#streamState = `command`
            this.#decoder = undefined
            try { await this.#closeAuxiliaries() }
            catch(error) { console.warn(`Could not close auxiliary services`, error) }
            try { await this.#communicationService.Close() }
            catch(error) { console.warn(`Could not close communication service`, error) }
            this.polling = false
        }
    }

    async disconnect() {
        if(this.#disconnectTask) return this.#disconnectTask
        const task = this.#disconnect()
        this.#disconnectTask = task
        try { await task }
        finally { this.#disconnectTask = undefined }
    }

    async #disconnect() {
        this.connected = false
        this.#wakeLoop?.()
        await this.#pollTask
        await this.#commands
        await this.#communicationService?.Close()
        this.#received = new Uint8Array()
        this.dispatchEvent(new CustomEvent(`change`, { detail: this.#changeDetail }))
    }
}

export let communication = new EFIGenieCommunication()
