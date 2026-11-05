import { getCANBaseBytes } from "./CANPayload"

export default class CANBaseData extends HTMLDivElement {
    #bytes = Array(8).fill(0)
    #inputs = []

    constructor() {
        super()
        this.className = `can-base-data`
        this.setAttribute(`role`, `group`)
        this.setAttribute(`aria-label`, `Base data`)
        const caption = document.createElement(`span`)
        caption.className = `can-base-data-caption`
        caption.textContent = `Base data`
        const inputs = document.createElement(`div`)
        inputs.className = `can-base-data-bytes`
        for(let index = 0; index < 8; index++) {
            const input = document.createElement(`input`)
            input.className = `ui text can-base-byte`
            input.type = `text`
            input.maxLength = 4
            input.pattern = `(?:0[xX][0-9A-Fa-f]{1,2}|[0-9]{1,3})`
            input.required = true
            input.spellcheck = false
            input.autocomplete = `off`
            input.value = this.#format(0)
            input.setAttribute(`aria-label`, `Base data byte ${index}`)
            input.title = `Byte ${index} · bits ${index * 8}–${index * 8 + 7}. Enter decimal (0–255) or 0x-prefixed hex. Paste eight bytes to set the full payload.`
            input.addEventListener(`change`, event => {
                event.stopPropagation()
                const byte = this.#parseByte(input.value.trim())
                if(byte !== undefined) {
                    const bytes = this.value
                    bytes[index] = byte
                    this.value = bytes
                }
                input.value = this.#format(this.#bytes[index])
            })
            input.addEventListener(`paste`, event => {
                const text = event.clipboardData?.getData(`text`).trim()
                if(!text)
                    return
                const tokens = text.split(/[\s,]+/)
                let bytes
                if(tokens.length === 8 && tokens.every(token => this.#parseByte(token) !== undefined))
                    bytes = tokens.map(token => this.#parseByte(token))
                else if(/^0x[0-9a-f]{16}$/i.test(text))
                    bytes = text.slice(2).match(/../g).map(token => parseInt(token, 16))
                if(bytes) {
                    event.preventDefault()
                    this.value = bytes
                } else if(this.#parseByte(text) === undefined) {
                    // Do not turn a malformed payload into a partial byte paste.
                    event.preventDefault()
                }
            })
            this.#inputs.push(input)
            inputs.append(input)
        }
        this.append(inputs, caption)
    }

    #format(byte) { return `0x${byte.toString(16).toUpperCase().padStart(2, `0`)}` }

    #parseByte(text) {
        if(!/^(?:0x[0-9a-f]{1,2}|[0-9]{1,3})$/i.test(text))
            return
        const byte = parseInt(text, /^0x/i.test(text) ? 16 : 10)
        return byte <= 255 ? byte : undefined
    }

    get value() { return [...this.#bytes] }
    set value(value) {
        const bytes = getCANBaseBytes(value)
        const changed = bytes.some((byte, index) => byte !== this.#bytes[index])
        this.#bytes = bytes
        this.#inputs.forEach((input, index) => { input.value = this.#format(bytes[index]) })
        if(changed)
            this.dispatchEvent(new Event(`change`))
    }

    get saveValue() { return this.value }
    set saveValue(value) { this.value = value }
}
customElements.define(`can-base-data`, CANBaseData, { extends: `div` })
