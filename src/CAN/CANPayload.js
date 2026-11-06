export function getCANBaseBytes(value) {
    if(!Array.isArray(value)) {
        let data = 0n
        try {
            // JSON stores uint64 values as strings; never round them through Number.
            if(typeof value === `bigint` ||
                (typeof value === `string` && /^(?:0x[0-9a-f]+|[0-9]+)$/i.test(value.trim())) ||
                (typeof value === `number` && Number.isSafeInteger(value)))
                data = BigInt(value)
        } catch { }
        if(data < 0n || data > 0xFFFFFFFFFFFFFFFFn)
            data = 0n
        value = Array.from({ length: 8 }, (_, index) => Number(data >> BigInt((7 - index) * 8) & 0xFFn))
    }
    const bytes = Array.from({ length: 8 }, (_, index) => {
        const byte = value?.[index]
        return Number.isInteger(byte) && byte >= 0 && byte <= 255 ? byte : 0
    })
    return bytes
}

export function getCANBaseValue(value) {
    return getCANBaseBytes(value).reduce((data, byte) => (data << 8n) | BigInt(byte), 0n)
}
